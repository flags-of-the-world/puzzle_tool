var Application = function () {
  var canvas = document.getElementById("canvas");
  var regionsDiv = document.getElementById("regions");
  var mergeButton = document.getElementById("merge");
  var saveButton = document.getElementById("save");

  $.urlParam = function(name){
    var results = new RegExp('[\?&]' + name + '=([^&]*)').exec(window.location.href);
    return results[1] || 0;
  }

  var image = new RawImage("assets/images/flags/" + $.urlParam("flag") + ".svg");
  var white = { red: 255, green: 255, blue: 255, alpha: 255 };
  var black = { red: 0, green: 0, blue: 0, alpha: 255 };
  var transparent = { red: 0, green: 0, blue: 0, alpha: 0 };
  var regions = [];
  var selected = [];

  image.onload = function () {
    image.render(canvas);
  }

  canvas.addEventListener("click", function (event) {
    var result = floodFill({
      getter: image.get,
      seed: coordinates(event),
      equals: equalColors
    });

    addRegion(result);

    setBulk(result.flooded, white);
    setBulk(result.boundaries, black);

    image.render(canvas);
  });

  var coordinates = function (event) {
    var x, y;

    if (event.pageX || event.pageY) {
      x = event.pageX;
      y = event.pageY;
    }
    else {
      x = event.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
      y = event.clientY + document.body.scrollTop + document.documentElement.scrollTop;
    }

    x -= canvas.offsetLeft;
    y -= canvas.offsetTop;

    return [x, y];
  };


  var setBulk = function (array, color) {
    for (var i = 0; i < array.length; i++) {
      var x = array[i][0];
      var y = array[i][1];

      image.set(x, y, color);
    }
  };

  var equalColors = function (a, b) {
    return a.red   === b.red   &&
           a.green === b.green &&
           a.blue  === b.blue  &&
           a.alpha === b.alpha
  };

  var addRegion = function (result) {
    var cells = result.flooded;
    var color = image.get(cells[0][0], cells[0][1]);
    var hex = rgbToHex(color.red, color.green, color.blue);

    regions.push({ hex: hex, result: result });
    selected = [];
    updateRegionDisplay();
  };

  var rgbToHex = function (r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
  }

  var componentToHex = function (c) {
    var hex = c.toString(16).toUpperCase();
    return hex.length == 1 ? "0" + hex : hex;
  }

  var updateRegionDisplay = function () {
    var html = "<h2>Regions</h2><ul>";

    for (var i = 0; i < regions.length; i++) {
      var hex = regions[i].hex;
      var count = regions[i].result.flooded.length;
      html = html + "<li data-region='" + i + "'";
      html = html + "style='background-color: " + hex;

      if (hex === "#000000") {
        html = html + "; color: white";
      }

      html = html + "'><span>" + hex + "</span>";
      html = html + "<div class='side'>" + count + " pixels</div></li>";
    }

    html = html + "</ul>";

    regionsDiv.innerHTML = html;
    addRegionHandlers();
  };

  var addRegionHandlers = function () {
    var ul = regionsDiv.children[1];
    var lis = ul.children;

    for (var i = 0; i < lis.length; i++) {
      lis[i].addEventListener("click", selectRegion);
    }
  };

  var selectRegion = function () {
    var li = this;
    var region = regionForLi(li);
    var klass = li.getAttribute("class");

    if (klass === "selected") {
      li.setAttribute("class", "");
      var index = selected.indexOf(region);
      selected.splice(index, 1);
    }
    else {
      li.setAttribute("class", "selected");
      selected.push(region);
    }

    updateMergeButton();
  };

  var regionForLi = function (li) {
    var index = parseInt(li.getAttribute("data-region"));
    return regions[index];
  };

  var updateMergeButton = function () {
    var region = selected[0];
    var hex = "none";

    if (region) {
      hex = region.hex;
    }

    var valid = true;
    for (var i = 0; i < selected.length; i++) {
      if (selected[i].hex !== hex) {
        valid = false;
      }
    }

    if (selected.length < 2) {
      valid = false;
    }

    if (valid) {
      mergeButton.removeAttribute("disabled");
    }
    else {
      mergeButton.setAttribute("disabled", "disabled");
    }
  };

  mergeButton.addEventListener("click", function () {
    var flooded = [];
    var boundaries = [];
    var hex = selected[0].hex;

    for (var i = 0; i < selected.length; i++) {
      var region = selected[i];

      flooded = flooded.concat(region.result.flooded);
      boundaries = boundaries.concat(region.result.boundaries);

      var index = regions.indexOf(region);
      regions.splice(index, 1);
    }

    selected = [];

    var result = { flooded: flooded, boundaries: boundaries };
    regions.push({ hex: hex, result: result });

    updateRegionDisplay();
    updateMergeButton();
  });

  var upload = function (filename) {
    var data = canvas.toDataURL("image/png");

    var body = {
      data: data,
      filename: filename
    }

    $.post('/upload', body, function () {
      console.log("upload successful");
    });
  };

  var package = function (flagName) {
    $.post("/package", { directory: flagName }, function () {
      console.log("package successful");
    });
  }

  saveButton.addEventListener("click", function () {
    upload("0-template.png");

    for (var i = 0; i < regions.length; i++) {
      var region = regions[i];

      for (var y = 0; y < image.height; y++) {
        for (var x = 0; x < image.width; x++) {
          image.set(x, y, transparent);
        }
      }

      var flooded = region.result.flooded;
      for (var j = 0; j < flooded.length; j++) {
        var f = flooded[j];
        image.set(f[0], f[1], white);
      }

      var boundaries = region.result.boundaries;
      for (var j = 0; j < boundaries.length; j++) {
        var b = boundaries[j];
        image.set(b[0], b[1], black);
      }

      image.render(canvas);

      var hex = region.hex.replace("#", "");
      upload("" + (i + 1) + "-" + hex + ".png");
    }

    package($.urlParam("flag"));
    window.location = "/";
  });


};

new Application();

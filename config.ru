require "sinatra"
require "zip"
require "base64"

module Foo
  def self.exists?(flag)
    `ls public/flags`.split.include?(flag)
  end
end

get "/" do
  flags = `ls public/assets/images/flags`.split.map { |s| s.split(".").first }
  lis = flags.map { |f| "<li class='#{Foo.exists?(f)}'><a href='/index.html?flag=#{f}'>#{f}</a></li>" }
  "<style>.true { background-color: #aaffaa }</style>" + "<a href='/flags.zip'>Download flags</a><br/><br/><a href='/reset'>Reset</a><br/><br/>" + lis.join
end

post '/upload' do
  data = params[:data]
  data = data['data:image/png;base64,'.length..-1]
  data = Base64.decode64(data)

  filename = params[:filename]
  path     = "public/flags/#{filename}"

  File.open(path, "wb") { |f| f.write data }

  "uploaded"
end

post "/package" do
  dir = params[:directory]
  `rm -rf public/flags/#{dir}`
  `mkdir public/flags/#{dir}`

  `ls public/flags/*.png`.split.each do |f|
    `mv #{f} public/flags/#{dir}/`
  end
end

get "/flags.zip" do
  `rm -f public/flags.zip`

  directory = "public/flags/"
  zipfile_name = "public/flags.zip"

  Zip::File.open(zipfile_name, Zip::File::CREATE) do |zipfile|
    Dir[File.join(directory, '**', '**')].each do |file|
      zipfile.add(file.sub(directory, ''), file)
    end
  end

  send_file "public/flags.zip"
end

get "/reset" do
  `rm -rf public/flags/*`
  `rm -f public/flags.zip`
  redirect "/"
end

run Sinatra::Application

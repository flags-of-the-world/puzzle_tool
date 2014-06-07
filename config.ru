require "sinatra"
require "base64"
require "pry"

module Foo
  def self.exists?(flag)
    `ls public/flags`.split.include?(flag)
  end
end

get "/" do
  flags = `ls public/assets/images/flags`.split.map { |s| s.split(".").first }
  lis = flags.map { |f| "<li class='#{Foo.exists?(f)}'><a href='/index.html?flag=#{f}'>#{f}</a></li>" }
  "<style>.true { background-color: #aaffaa }</style>" + lis.join
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

run Sinatra::Application

let path = require("path")

module.exports = {
  devtool: false,
  context: path.resolve(__dirname),
  entry: path.resolve(__dirname, 'src/client.js'),
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, "public")
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel-loader',
        query: {
          presets: ['env']
        }
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader'
        ]
      }
    ]
  }
}

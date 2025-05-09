const path = require('path')
const webpack = require('webpack')

module.exports = {
	devtool: 'inline-source-map',
	output: {
		libraryTarget: 'umd',
		umdNamedDefine: true,
	},
	resolve: {
		alias: {
			three: path.resolve('./node_modules/three'),
		},
		extensions: ['.tsx', '.ts', '.js'],
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},
			{
				test: /\.css$/,
				use: ['style-loader', 'css-loader'],
			},
		],
	},
	plugins: [new webpack.ProgressPlugin()],
}

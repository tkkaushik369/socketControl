const common = require("./webpack.common.base.js")
const { merge } = require("webpack-merge")
const path = require("path")
const CopyPlugin = require("copy-webpack-plugin")
const HtmlWebpackPlugin = require('html-webpack-plugin');

const common_client = merge(common, {
	target: "web",
	entry: "./src/client/client.ts",
	output: {
		library: 'AppClient',
		filename: "client.js",
		publicPath: "../client",
		path: path.resolve(__dirname, "../dist/client"),
	},
	plugins: [
		new HtmlWebpackPlugin({
			filename: 'index.html',
			template: path.resolve(__dirname, "./client/index.html")
		}),
		new CopyPlugin({
			patterns: [
				/* {
					from: path.resolve(__dirname, "./client/index.html"),
					to: path.resolve(__dirname, "../dist/client_window"),
				}, */
				{
					from: path.resolve(__dirname, "./client/images"),
					to: path.resolve(__dirname, "../dist/client/images"),
				},
				{
					from: path.resolve(__dirname, "./client/models"),
					to: path.resolve(__dirname, "../dist/client/models"),
				},
				{
					from: path.resolve(__dirname, "./client/audios"),
					to: path.resolve(__dirname, "../dist/client/audios"),
				},
			],
		}),
	],
})

module.exports = common_client

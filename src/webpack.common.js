const path = require("path")
const CopyPlugin = require("copy-webpack-plugin")

module.exports = {
	entry: "./src/client/client.ts",
	output: {
		filename: "bundle.js",
		library: 'Game',
		libraryTarget: 'umd',
		path: path.resolve(__dirname, "../dist/client"),
	},
	resolve: {
		alias: {
			three: path.resolve("./node_modules/three"),
		},
		extensions: [".tsx", ".ts", ".js"],
	},
	module: {
		rules: [{
			test: /\.tsx?$/,
			use: "ts-loader",
			exclude: /node_modules/,
		},
		{
			test: /\.css$/,
			use: [
				'style-loader',
				'css-loader'
			]
		},
		],
	},
	plugins: [
		new CopyPlugin({
			patterns: [{
				from: path.resolve(__dirname, "./client/index.html"),
				to: path.resolve(__dirname, "../dist/client"),
			},
			{
				from: path.resolve(__dirname, "./client/images"),
				to: path.resolve(__dirname, "../dist/client/images"),
			},
			],
		}),
	],
}
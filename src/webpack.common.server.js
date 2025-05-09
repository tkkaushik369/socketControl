const common = require("./webpack.common.base.js")
const { merge } = require("webpack-merge")
const path = require("path")

module.exports = merge(common, {
	target: ['node', 'electron-renderer'],
	entry: "./src/server/server.ts",
	output: {
		library: 'AppServer',
		filename: "server.js",
		path: path.resolve(__dirname, "../dist/server"),
	},
	externalsPresets: {
		node: true,
	},
	externals: [
		'canvas',
	],
	module: {
		exprContextCritical: false,
		unknownContextCritical: false,
	},
})

const path = require("path")
const { merge } = require("webpack-merge")
const common = require("./webpack.common.server.js")
const dev = require("./webpack.dev.base.js")

module.exports = merge(common, dev, {
	devServer: {
		static: {
			directory: path.resolve(__dirname, "../dist/server"),
		},
		port: 8081,
	},
})

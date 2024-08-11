const { merge } = require("webpack-merge")
const common = require("./webpack.common.js")
const path = require("path");

var isHosted = false

module.exports = merge(common, {
	mode: "development",
	devtool: "eval-source-map",
	devServer: {
		static: {
			directory: path.join(__dirname, "../dist/client"),
		},
		hot: true,
		proxy: [{
			context: "/socket.io",
			target: isHosted ? "https://socketcontrol.onrender.com" : "http://127.0.0.1:3000",
			ws: true,
		},],
	},
})
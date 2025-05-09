const { merge } = require("webpack-merge")
const common = require("./webpack.common.server.js")
const prod = require("./webpack.prod.base.js")

module.exports = merge(common, prod, {})

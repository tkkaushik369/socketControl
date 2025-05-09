const { merge } = require("webpack-merge")
const common = require("./webpack.common.client.js")
const prod = require("./webpack.prod.base.js")

module.exports = merge(common, prod, {})

const prod_server = require('./webpack.prod.server.js')
const prod_client = require('./webpack.prod.client.js')

module.exports = [prod_client, prod_server]

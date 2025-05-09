const path = require('path')
const { merge } = require('webpack-merge')
const common = require('./webpack.common.client.js')
const dev = require('./webpack.dev.base.js')

module.exports = merge(common, dev, {
	devServer: {
		static: {
			directory: path.resolve(__dirname, '../dist/client'),
		},
		proxy: [
			{
				context: '/socket.io',
				target: 'http://127.0.0.1:3000',
				changeOrigin: true,
				ws: true,
			},
			{
				context: '*',
				target: 'ws://127.0.0.1:3000',
				changeOrigin: true,
				ws: true,
			},
		],
		port: 8080,
	},
})

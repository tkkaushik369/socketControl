import path from 'path'
import { merge } from 'webpack-merge'
import common from './webpack.common.client'
import { config_dev } from './webpack.dev.base'

export const config_client_dev = {
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
		port: 8081,
	},
}
export default merge(common, config_dev, config_client_dev)

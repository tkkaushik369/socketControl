import path from 'path'
import { merge } from 'webpack-merge'
import common from './webpack.common.server'
import { config_dev } from './webpack.dev.base'

export const config_server_dev = {
	devServer: {
		static: {
			directory: path.resolve(__dirname, '../dist/server'),
		},
		port: 8082,
	},
}
export default merge(common, config_dev, config_server_dev)

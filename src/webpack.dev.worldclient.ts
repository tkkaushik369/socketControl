import path from 'path'
import { merge } from 'webpack-merge'
import common from './webpack.common.worldclient'
import { config_dev } from './webpack.dev.base'

export const config_worldclient_dev = {
	devServer: {
		static: {
			directory: path.resolve(__dirname, '../dist/@WorldClient'),
		},
		port: 8084,
	},
}
export default merge(common, config_dev, config_worldclient_dev)

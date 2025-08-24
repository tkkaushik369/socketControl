import path from 'path'
import { merge } from 'webpack-merge'
import common from './webpack.common.worldserver'
import { config_dev } from './webpack.dev.base'

export const config_worldserver_dev = {
	devServer: {
		static: {
			directory: path.resolve(__dirname, '../dist/@WorldServer'),
		},
		port: 8085,
	},
}
export default merge(common, config_dev, config_worldserver_dev)

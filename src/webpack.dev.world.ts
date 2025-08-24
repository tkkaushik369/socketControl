import path from 'path'
import { merge } from 'webpack-merge'
import common from './webpack.common.world'
import { config_dev } from './webpack.dev.base'

export const config_world_dev = {
	devServer: {
		static: {
			directory: path.resolve(__dirname, '../dist/@World'),
		},
		port: 8080,
	},
}
export default merge(common, config_dev, config_world_dev)

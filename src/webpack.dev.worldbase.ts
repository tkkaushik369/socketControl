import path from 'path'
import { merge } from 'webpack-merge'
import common from './webpack.common.worldbase'
import { config_dev } from './webpack.dev.base'

export const config_worldbase_dev = {
	devServer: {
		static: {
			directory: path.resolve(__dirname, '../dist/server'),
		},
		port: 8080,
	},
}
export default merge(common, config_dev, config_worldbase_dev)

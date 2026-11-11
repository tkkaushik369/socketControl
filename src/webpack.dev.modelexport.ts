import path from 'path'
import { merge } from 'webpack-merge'
import common from './webpack.common.modelexport'
import { config_dev } from './webpack.dev.base'

export const config_modelexport_dev = {
	devServer: {
		static: {
			directory: path.resolve(__dirname, '../dist/ModelExport'),
		},
		port: 8086,
	},
}
export default merge(common, config_dev, config_modelexport_dev)

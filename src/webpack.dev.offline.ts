import path from 'path'
import type { Configuration as WebpackConfiguration } from 'webpack';
import type { Configuration as DevServerConfiguration } from 'webpack-dev-server';
import { merge } from 'webpack-merge'
import common from './webpack.common.offline'
import { config_dev } from './webpack.dev.base'

interface Configuration extends WebpackConfiguration {
  devServer?: DevServerConfiguration;
}

export const config_offline_dev = {
	devServer: {
		static: {
			directory: path.resolve(__dirname, '../dist/offline'),
		},
		port: 8083,
	},
}
export default merge(common, config_dev, config_offline_dev) as Configuration

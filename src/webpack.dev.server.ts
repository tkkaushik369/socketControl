import path from 'path'
import type { Configuration as WebpackConfiguration } from 'webpack';
import type { Configuration as DevServerConfiguration } from 'webpack-dev-server';
import { merge } from 'webpack-merge'
import common from './webpack.common.server'
import { config_dev } from './webpack.dev.base'

interface Configuration extends WebpackConfiguration {
  devServer?: DevServerConfiguration;
}

export const config_server_dev = {
	devServer: {
		static: {
			directory: path.resolve(__dirname, '../dist/server'),
		},
		port: 8082,
	},
}
export default merge(common, config_dev, config_server_dev) as Configuration

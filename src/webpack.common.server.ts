import { Configuration } from 'webpack'
import { config_common } from './webpack.common.base'
import { merge } from 'webpack-merge'
import path from 'path'

export const config_server_common: Configuration = {
	target: ['node', 'electron-renderer'],
	entry: './src/server/server.ts',
	output: {
		library: {
			// type: 'umd',
			type: 'this',
			name: 'AppServer',
		},
		filename: 'server.js',
		path: path.resolve(__dirname, '../dist/server'),
	},
	externalsPresets: {
		node: true,
	},
	externals: { canvas: 'cannonjs2 canvas', '@WorldBase': '@WorldBase' },
	module: {
		exprContextCritical: false,
		unknownContextCritical: false,
	},
}
export default merge(config_common, config_server_common)

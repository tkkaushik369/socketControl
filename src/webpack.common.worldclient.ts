import { config_common } from './webpack.common.base'
import { merge } from 'webpack-merge'
import path from 'path'

export const config_worldclient_common = {
	target: 'web',
	entry: './src/worldclient/ts/World/WorldClient.ts',
	output: {
		library: {
			// type: 'umd',
			type: 'global',
			name: '@WorldClient'
		},
		filename: 'index.js',
		publicPath: '../@WorldClient',
		path: path.resolve(__dirname, '../dist/@WorldClient'),
	},
	externals: { '@World': 'window @World' }
}

export default merge(config_common, config_worldclient_common)

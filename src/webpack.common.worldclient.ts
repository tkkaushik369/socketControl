import { config_common } from './webpack.common.base'
import { merge } from 'webpack-merge'
import path from 'path'

export const config_worldclient_common = {
	target: 'web',
	entry: {
		WorldClient: './src/worldclient/ts/World/WorldClient.ts',
		WorkerClient: './src/worldclient/ts/World/WorkerClient.ts',
	},
	output: {
		library: {
			// type: 'umd',
			type: 'global',
			name: '@WorldClient',
		},
		filename: '[name].js',
		publicPath: '../@WorldClient',
		path: path.resolve(__dirname, '../dist/@WorldClient'),
	},
	resolve: {
		alias: {
			'@WorkerBase': path.resolve(__dirname, 'world/ts/WorkerBase'),
		},
	},
	externals: { '@World': 'window @World' },
}

export default merge(config_common, config_worldclient_common)

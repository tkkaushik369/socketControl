import { config_common } from './webpack.common.base'
import { merge } from 'webpack-merge'
import path from 'path'

export const config_worldbase_common = {
	target: 'web',
	entry: './src/server/ts/World/WorldBase.ts',
	output: {
		library: {
			// type: 'umd',
			type: 'this',
			name: '@WorldBase'
		},
		// libraryTarget: 'this',
		filename: 'index.js',
		path: path.resolve(__dirname, '../dist/@WorldBase'),
	},
}

export default merge(config_common, config_worldbase_common)

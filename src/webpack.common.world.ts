import { config_common } from './webpack.common.base'
import { merge } from 'webpack-merge'
import path from 'path'

export const config_world_common = {
	target: 'web',
	entry: './src/world/ts/World.ts',
	output: {
		library: {
			// type: 'umd',
			type: 'global',
			name: '@World'
		},
		filename: 'index.js',
		path: path.resolve(__dirname, '../dist/@World'),
	},
}

export default merge(config_common, config_world_common)

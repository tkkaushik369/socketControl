import { config_common } from './webpack.common.base'
import { merge } from 'webpack-merge'
import path from 'path'

export const config_world_common = {
	target: 'web',
	entry: {
		World: './src/world/ts/World.ts',
		// offscreen: './src/world/ts/Worldentities/GridCity/offscreen.ts'
	},
	output: {
		library: {
			// type: 'umd',
			type: 'global',
			name: '@[name]',
		},
		filename: '[name].js',
		path: path.resolve(__dirname, '../dist/@World'),
	},
	// externals: {}
}

export default merge(config_common, config_world_common)

import { Configuration } from 'webpack'
import { config_common } from './webpack.common.base'
import { merge } from 'webpack-merge'
import path from 'path'

export const config_modelexport_common: Configuration = {
	target: ['node'],
	entry: './src/ModelExport/ModelExport.ts',
	output: {
		library: {
			// type: 'umd',
			type: 'global',
			name: 'ModelExport',
		},
		filename: 'ModelExport.js',
		path: path.resolve(__dirname, '../dist/ModelExport'),
	},
	externalsPresets: {
		node: true,
	},
	resolve: {
		alias: {
			'@World': path.resolve(__dirname, 'world/ts/World.ts'),
			'@WorldServer': path.resolve(__dirname, 'worldserver/ts/World/WorldServer.ts'),
		},
	},
	externals: {
		three: 'commonjs2 three',
		jsdom: 'commonjs2 jsdom',
		canvas: 'commonjs2 canvas',
		'node:fs': 'commonjs2 node:fs',
		'node:path': 'commonjs2 node:path',
		'node:http': 'commonjs2 node:http',
		// '@World': 'this @World',
		// '@WorldServer': 'this @WorldServer',
	},
	module: {
		exprContextCritical: false,
		unknownContextCritical: false,
	},
}
export default merge(config_common, config_modelexport_common)

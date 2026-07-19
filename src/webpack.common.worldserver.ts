import { config_common } from './webpack.common.base'
import { merge } from 'webpack-merge'
import path from 'path'

export const config_worldserver_common = {
	target: 'node',
	entry: {
		WorldServer: './src/worldserver/ts/World/WorldServer.ts',
		WorkerServer: './src/worldserver/ts/World/WorkerServer.ts',
	},
	output: {
		library: {
			// type: 'umd',
			type: 'global',
			name: '@WorldServer',
		},
		filename: '[name].js',
		publicPath: '../@WorldServer',
		path: path.resolve(__dirname, '../dist/@WorldServer'),
	},
	resolve: {
		alias: {
			'@WorkerBase': path.resolve(__dirname, 'world/ts/WorkerBase'),
		},
	},
	externals: {
		express: 'commonjs2 express',
		ws: 'commonjs2 ws',
		three: 'commonjs2 three',
		jsdom: 'commonjs2 jsdom',
		canvas: 'commonjs2 canvas',
		'node:fs': 'commonjs2 node:fs',
		'node:path': 'commonjs2 node:path',
		'node:http': 'commonjs2 node:http',
		'node:worker_threads': 'commonjs2 node:worker_threads',
		'socket.io': 'commonjs2 socket.io',
		'socket.io-msgpack-parser': 'commonjs2 socket.io-msgpack-parser',
		'@socket.io/admin-ui': 'commonjs2 @socket.io/admin-ui',
		'@World': 'this @World',
	},
}

export default merge(config_common, config_worldserver_common)

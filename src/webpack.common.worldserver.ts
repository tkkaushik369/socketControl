import { config_common } from './webpack.common.base'
import { merge } from 'webpack-merge'
import path from 'path'

export const config_worldserver_common = {
	target: 'web',
	entry: './src/worldserver/ts/World/WorldServer.ts',
	output: {
		library: {
			// type: 'umd',
			type: 'global',
			name: '@WorldServer'
		},
		filename: 'index.js',
		publicPath: '../@WorldServer',
		path: path.resolve(__dirname, '../dist/@WorldServer'),
	},
	externals: {
		express: 'commonjs2 express',
		ws: 'commonjs2 ws',
		three: 'commonjs2 three',
		jsdom: 'commonjs2 jsdom',
		canvas: 'commonjs2 canvas',
		"node:fs": 'commonjs2 node:fs',
		"node:path": 'commonjs2 node:path',
		"node:http": 'commonjs2 node:http',
		"socket.io": 'commonjs2 socket.io',
		"socket.io-msgpack-parser": 'commonjs2 socket.io-msgpack-parser',
		"@socket.io/admin-ui": 'commonjs2 @socket.io/admin-ui',
		'@World': 'this @World',
	},
}

export default merge(config_common, config_worldserver_common)

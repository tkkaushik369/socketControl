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
			type: 'global',
			name: 'AppServer',
		},
		filename: 'server.js',
		path: path.resolve(__dirname, '../dist/server'),
	},
	externalsPresets: {
		node: true,
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
		'@WorldServer': 'this @WorldServer'
	},
	module: {
		exprContextCritical: false,
		unknownContextCritical: false,
	},
}
export default merge(config_common, config_server_common)

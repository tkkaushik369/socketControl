import type { Configuration } from 'webpack'
import path from 'node:path'
import { rules } from './webpack.rules'
import { plugins } from './webpack.plugins'

rules.push({
	test: /\.css$/,
	use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
})

export const rendererConfig: Configuration = {
	output: {
		libraryTarget: 'umd',
		umdNamedDefine: true,
		library: {
			type: 'global',
			name: '[name]',
		},
	},
	experiments: { asyncWebAssembly: true },
	module: {
		rules,
		exprContextCritical: false,
		unknownContextCritical: false,
	},
	plugins,
	resolve: {
		alias: {
			three: path.resolve(__dirname, '../../node_modules/three'),
			'socket.io': path.resolve(__dirname, '../../node_modules/socket.io/client-dist/socket.io.min.js'),
			'@server/server': path.resolve(__dirname, '../../dist/server/server'),
			'@client/client': path.resolve(__dirname, '../../dist/client/client'),
		},
		extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json', '.wasm'],
	},
	externals: [
		'canvas', // jsdom dependency not needed
	],
	stats: {
		warningsFilter: [/Critical dependency:/],
	},
}

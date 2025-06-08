import type { Configuration } from 'webpack'
import path from 'node:path'
import { rules } from './webpack.rules'
import { plugins } from './webpack.plugins'
import { WEBPACK_USE_BUNDLE } from '../LoaderMode'

rules.push({
	test: /\.css$/,
	use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
})

export const rendererConfig: Configuration = {
	output: {
		library: {
			type: 'this',
			name: '[name]',
			umdNamedDefine: true,
		},
		globalObject: 'this',
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
			'@WorldBase': path.resolve(
				__dirname,
				WEBPACK_USE_BUNDLE
					? '../../dist/@WorldBase/index.js'
					: '../../.webpack/renderer/@WorldBase/index.js'
			),
		},
		extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json', '.wasm'],
	},
	externals: {
		canvas: 'commonjs2 canvas', // jsdom dependency not needed,
		'@WorldBase': '@WorldBase',
	},
	stats: {
		warningsFilter: [/Critical dependency:/],
	},
}

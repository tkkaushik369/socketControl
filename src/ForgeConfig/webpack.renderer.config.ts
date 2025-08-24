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
			type: 'global',
			name: '[name]',
			umdNamedDefine: true,
		},
		globalObject: 'globalThis',
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
			'@World': path.resolve(
				__dirname,
				WEBPACK_USE_BUNDLE
					? '../../dist/@World/index.js'
					: '../../.webpack/renderer/@World/index.js'
			),
			'@WorldClient': path.resolve(
				__dirname,
				WEBPACK_USE_BUNDLE
					? '../../dist/@WorldClient/index.js'
					: '../../.webpack/renderer/@WorldClient/index.js'
			),
			'@WorldServer': path.resolve(
				__dirname,
				WEBPACK_USE_BUNDLE
					? '../../dist/@WorldServer/index.js'
					: '../../.webpack/renderer/@WorldServer/index.js'
			),
		},
		extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json', '.wasm'],
	},
	externals: {
		canvas: 'commonjs2 canvas', // jsdom dependency not needed,
		'@World': '@World',
		'@WorldClient': '@WorldClient',
		'@WorldServer': '@WorldServer',
	},
	/* stats: {
		warningsFilter: [/Critical dependency:/],
	}, */
}

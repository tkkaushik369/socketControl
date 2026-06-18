import path from 'path'
import Webpack, { Configuration } from 'webpack'
import SimpleProgressWebpackPlugin from 'simple-progress-webpack-plugin'

export const config_common: Configuration = {
	output: {
		library: {
			// type: 'umd',
			type: 'global',
			name: '[name]',
			umdNamedDefine: true,
		},
		globalObject: 'globalThis',
	},
	resolve: {
		alias: {
			three: path.resolve('./node_modules/three'),
			'@World': path.resolve('./dist/@World/World.js'),
			'@WorldClient': path.resolve('./dist/@WorldClient/index.js'),
			'@WorldServer': path.resolve('./dist/@WorldServer/index.js'),
		},
		extensions: ['.tsx', '.ts', '.js'],
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},
			{
				test: /\.css$/,
				use: ['style-loader', 'css-loader'],
			},
		],
	},
	externalsType: 'this',
	plugins: [new SimpleProgressWebpackPlugin({ format: 'compact' })],
	cache: {
		type: 'filesystem',
		allowCollectingMemory: true,
		cacheDirectory: path.resolve(__dirname, '../.webpack_cache'),
	},
}

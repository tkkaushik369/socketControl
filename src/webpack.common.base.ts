import path from 'path'
import Webpack, { Configuration } from 'webpack'

export const config_common: Configuration = {
	output: {
		library: {
			// type: 'umd',
			type: 'this',
			umdNamedDefine: true,
		},
		globalObject: "this",
	},
	resolve: {
		alias: {
			three: path.resolve('./node_modules/three'),
			'@WorldBase': path.resolve('./dist/@WorldBase/index.js'),
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
	plugins: [new Webpack.ProgressPlugin()],
}

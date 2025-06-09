import path from 'path'
import Webpack, { Configuration } from 'webpack'

export const config_common: Configuration = {
	output: {
		library: {
			// type: 'umd',
			type: 'this',
			name: "[name]",
			umdNamedDefine: true,
		},
		globalObject: "this",
	},
	resolve: {
		alias: {
			three: path.resolve('./node_modules/three'),
			'@World': path.resolve('./dist/@World/index.js'),
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

import { config_common } from './webpack.common.base'
import { merge } from 'webpack-merge'
import { Configuration } from 'webpack'
import path from 'path'
import CopyPlugin from 'copy-webpack-plugin'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import HtmlWebpackInjectPlugin from 'html-webpack-inject-plugin'

export const config_client_common: Configuration = {
	target: 'web',
	entry: './src/client/client.ts',
	output: {
		library: {
			// type: 'umd',
			type: 'this',
			name: 'AppClient',
		},
		filename: 'client.js',
		publicPath: '../client',
		path: path.resolve(__dirname, '../dist/client'),
	},
	externals: { '@World': '@World' },
	plugins: [
		new HtmlWebpackPlugin({
			filename: 'index.html',
			template: path.resolve(__dirname, './client/index.html'),
		}),
		new CopyPlugin({
			patterns: [
				/* {
					from: path.resolve(__dirname, "./client/index.html"),
					to: path.resolve(__dirname, "../dist/client_window"),
				}, */
				{
					from: path.resolve(__dirname, './client/images'),
					to: path.resolve(__dirname, '../dist/client/images'),
				},
				{
					from: path.resolve(__dirname, './client/models'),
					to: path.resolve(__dirname, '../dist/client/models'),
				},
				{
					from: path.resolve(__dirname, './client/audios'),
					to: path.resolve(__dirname, '../dist/client/audios'),
				},
			],
		}),
		new HtmlWebpackInjectPlugin({
			externals: [
				{
					tagName: 'script',
					attributes: {
						defer: true,
						src: '../@World/index.js',
						type: 'text/javascript',
					},
				},
			],
			prepend: true,
		}),
	],
}

export default merge(config_common, config_client_common)

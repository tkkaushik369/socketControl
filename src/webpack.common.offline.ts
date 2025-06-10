import { config_common } from './webpack.common.base'
import { merge } from 'webpack-merge'
import { Configuration } from 'webpack'
import path from 'path'
import CopyPlugin from 'copy-webpack-plugin'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import HtmlWebpackInjectPlugin from 'html-webpack-inject-plugin'

export const config_offline_common: Configuration = {
	target: 'web',
	entry: './src/electronApp/offline_window/renderer.tsx',
	output: {
		library: {
			// type: 'umd',
			type: 'this',
			name: 'AppOffline',
		},
		filename: 'offline.js',
		publicPath: '../offline',
		path: path.resolve(__dirname, '../dist/offline'),
	},
	externals: { '@World': '@World' },
	plugins: [
		new HtmlWebpackPlugin({
			filename: 'index.html',
			template: path.resolve(__dirname, './electronApp/common/index.html'),
		}),
		new CopyPlugin({
			patterns: [
				/* {
					from: path.resolve(__dirname, "./client/index.html"),
					to: path.resolve(__dirname, "../dist/client_window"),
				}, */
				{
					from: path.resolve(__dirname, './index.html'),
					to: path.resolve(__dirname, '../dist'),
				},
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

export default merge(config_common, config_offline_common)

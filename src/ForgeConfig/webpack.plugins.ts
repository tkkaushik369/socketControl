import type IForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin'
import { EnvironmentPlugin } from 'webpack'
import path from 'node:path'
import CopyPlugin from 'copy-webpack-plugin'
import { WEBPACK_USE_BUNDLE } from '../LoaderMode'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ForkTsCheckerWebpackPlugin: typeof IForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')

const renderer_client_dirname = '../renderer/client'
const renderer_server_dirname = '../renderer/server'

const copyPlugin: CopyPlugin.Pattern[] = []

if (WEBPACK_USE_BUNDLE) {
	copyPlugin.push(
		{
			from: path.resolve(__dirname, '../../dist/client'),
			to: renderer_client_dirname,
		},
		{
			from: path.resolve(__dirname, '../../dist/server'),
			to: renderer_server_dirname,
		}
	)
} else {
	copyPlugin.push(
		{
			from: path.resolve(__dirname, '../../src/client/images'),
			to: path.join(renderer_client_dirname, 'images'),
		},
		{
			from: path.resolve(__dirname, '../../src/client/audios'),
			to: path.join(renderer_client_dirname, 'audios'),
		},
		{
			from: path.resolve(__dirname, '../../src/client/models'),
			to: path.join(renderer_client_dirname, 'models'),
		}
	)
}

export const plugins: any = [
	new ForkTsCheckerWebpackPlugin({
		logger: 'webpack-infrastructure',
	}),
	new EnvironmentPlugin({
		PORT: 3000,
	}),
]

if (copyPlugin.length > 0) {
	plugins.push(
		new CopyPlugin({
			patterns: copyPlugin,
		})
	)
}

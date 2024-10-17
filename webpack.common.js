import path from "path"
import { fileURLToPath } from 'url';
import { merge } from "webpack-merge"
import webpack from 'webpack'
import CopyPlugin from "copy-webpack-plugin"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const common = {
	output: {
		library: {
			type: 'module',
		},
		chunkFormat: 'module',
		module: true,
	},
	experiments: {
		outputModule: true,
	},
	resolve: {
		alias: {
			three: path.resolve(__dirname, "./node_modules/three"),
		},
		extensions: [".tsx", ".ts", ".js"],
	},
	module: {
		rules: [{
			test: /\.tsx?$/,
			use: "ts-loader",
			exclude: /node_modules/,
		},
		{
			test: /\.css$/,
			use: [
				'style-loader',
				'css-loader'
			]
		},
		],
	},
}

const client = {
	entry: path.resolve(__dirname, "./src/client/client.ts"),
	output: {
		path: path.resolve(__dirname, "./dist/client"),
		filename: "bundle.client.mjs",
	},
	target: 'web',
	plugins: [
		new CopyPlugin({
			patterns: [
				{
					from: path.resolve(__dirname, "./src/client/index.html"),
					to: path.resolve(__dirname, "./dist/client"),
				},
				{
					from: path.resolve(__dirname, "./src/client/images"),
					to: path.resolve(__dirname, "./dist/client/images"),
				},
				{
					from: path.resolve(__dirname, "./src/client/models"),
					to: path.resolve(__dirname, "./dist/client/models"),
				},
				{
					from: path.resolve(__dirname, "./src/client/audios"),
					to: path.resolve(__dirname, "./dist/client/audios"),
				},
			],
		}),
	],
}

const server = {
	entry: path.resolve(__dirname, "./src/server/server.ts"),
	output: {
		path: path.resolve(__dirname, "./dist/server"),
		filename: "bundle.server.mjs",
	},
	target: 'node',
	node: {
		__dirname: true,
		__filename: true,
	},
	plugins: [
		new webpack.DefinePlugin({
			__dirname: JSON.stringify(path.resolve(__dirname, 'dist/server')),
		}),
		new webpack.IgnorePlugin({
			resourceRegExp: /canvas/,
			contextRegExp: /jsdom$/,
		}),
	],
	externals: {
		fs: 'module fs',
		path: 'module path',
		express: 'express',
	},
}

const electron = {
	entry: path.resolve(__dirname, "./src/electronApp/main.ts"),
	output: {
		path: path.resolve(__dirname, "./dist/electronApp"),
		filename: "bundle.electron.mjs",
	},
	target: 'electron-main',
	node: {
		__dirname: true,
		__filename: true,
	},
	externals: {
		fs: 'module fs',
		path: 'module path',
	},
	plugins: [
		new webpack.DefinePlugin({
			__dirname: JSON.stringify(path.resolve(__dirname, 'dist/electronApp')),
		}),
	],
}

export default {
	client: merge(common, client),
	server: merge(common, server),
	electron: merge(common, electron),
}
import { merge } from "webpack-merge"
import common from "./webpack.common.js"
import path from "path"
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const proxy = [
	{
		context: "/socket.io",
		target: "http://127.0.0.1:3000",
		changeOrigin: true,
		ws: true,
	},
	{
		context: '*',
		target: 'ws://127.0.0.1:3000',
		changeOrigin: true,
		ws: true,
	},
]

const comm = {
	mode: "development",
	devtool: "eval-source-map",
	devServer: {
		hot: true,
	},
}

const client = {
	devServer: {
		static: {
			directory: path.join(__dirname, "./dist/client"),
		},
		proxy: proxy,
	},
}

const server = {
	devServer: {
		static: {
			directory: path.join(__dirname, "../dist/server"),
		},
	}
}

const electron = {
	devServer: {
		static: {
			directory: path.join(__dirname, "../dist/electronApp"),
		},
	},
}

export default [
	merge(common.client, merge(comm, client)),
	merge(common.server, merge(comm, server)),
	// merge(common.electron, merge(comm, electron)),
]
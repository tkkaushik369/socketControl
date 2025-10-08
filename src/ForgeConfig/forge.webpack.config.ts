import { WebpackPluginConfig, WebpackPluginEntryPoint } from '../PluginWebpack/Config'
import { merge } from 'webpack-merge'
import { MainConfig } from './webpack.main.config'
import { rendererConfig } from './webpack.renderer.config'
import { RendererTargetType } from '../PluginWebpack/Config'
import { SINGLE_PLAYER } from '../LoaderMode'

const entryPoints: WebpackPluginEntryPoint[] = []

if (SINGLE_PLAYER) {
	entryPoints.push({
		name: 'offline_window',
		html: './src/electronApp/common/index.html',
		js: './src/electronApp/offline_window/renderer.tsx',
		nodeIntegration: false,
	})
} else {
	entryPoints.push(
		{
			name: 'main_window',
			html: './src/electronApp/common/index.html',
			js: './src/electronApp/main_window/renderer.tsx',
			// prefixedEntries: ['./src/electronApp/main_window/serverLoader.ts'],
		},
		{
			name: 'client_window',
			html: './src/electronApp/common/index.html',
			js: './src/electronApp/client_window/renderer.tsx',
			// prefixedEntries: ['./src/electronApp/client_window/clientLoader.ts'],
			nodeIntegration: false,
		}
	)
}

var config: WebpackPluginConfig = {
	mainConfig: merge(MainConfig, {
		/**
		 * This is the main entry point for your application, it's the first file
		 * that runs in the main process.
		 */
		entry: './src/electronApp/index.ts',
	}),
	renderer: {
		config: rendererConfig,
		nodeIntegration: RendererTargetType.ElectronRendererNode,
		entryPoints: entryPoints,
	},
	port: 3001,
	devContentSecurityPolicy:
		"default-src 'self'; connect-src 'self' ws://localhost:3000 ws://localhost:8080 ws://localhost:8081 http://localhost:3000 blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' 'unsafe-inline' blob: data:;",
	devServer: {
		hot: true,
		proxy: [
			{
				context: '/socket.io',
				target: 'http://127.0.0.1:3000',
				changeOrigin: true,
				ws: true,
			},
			{
				context: '*',
				target: 'ws://127.0.0.1:3000',
				changeOrigin: true,
				ws: true,
			},
		],
	},
}
export default config

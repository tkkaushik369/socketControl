import path from 'path'
import Webpack, { Configuration } from 'webpack'
import forgeConfig from './forge.webpack.config'
import { merge as webpackMerge } from 'webpack-merge'
import HtmlWebpackPlugin from 'html-webpack-plugin'

const outDirName = 'dist'
const electronConfig: Configuration[] = []
const defineEntries: { [id: string]: string } = {
	__VERSION__Test: JSON.stringify('1.0.0.' + Date.now()),
}
const entryPoints = (forgeConfig.renderer as any).entryPoints

for (let i = 0; i < entryPoints.length; i++) {
	const entries = (entryPoints[i].prefixedEntries || []).concat([entryPoints[i].js])
	const outPath = path.resolve(__dirname, `../../${outDirName}/renderer/${entryPoints[i].name}`)
	defineEntries[`${entryPoints[i].name.toUpperCase()}_WEBPACK_ENTRY`] = JSON.stringify(`${outPath}/index.html`)

	const plugins: any = [
		new HtmlWebpackPlugin({
			title: `${entryPoints[i].name}`,
			template: path.resolve(__dirname, '../electronApp/common/index.html'),
		}),
	]

	const externals = ['electron', 'electron/renderer', 'electron/common', 'events', 'timers', 'url']
	if ((entryPoints[i].target = 'electronRendererNode'))
		plugins.push(new Webpack.ExternalsPlugin('commonjs2', externals))

	const configEntry = {
		name: entryPoints[i].name,
		entry: entries,
		output: {
			clean: true,
			library: { type: 'global', name: entryPoints[i].name, umdNamedDefine: true },
			globalObject: 'globalThis',
			publicPath: `../${entryPoints[i].name}`,
			filename: `${entryPoints[i].name}.js`,
			path: outPath,
		},
		target: entryPoints[i].target == 'electronRenderer' ? 'electron-renderer' : 'node',
		plugins: plugins,
		cache: {
			type: 'filesystem',
			allowCollectingMemory: true,
			cacheDirectory: path.resolve(__dirname, '../../.webpack_cache'),
		},
	}

	electronConfig.push(webpackMerge((forgeConfig.renderer as any).config, configEntry))
}
electronConfig.push(
	webpackMerge(forgeConfig.mainConfig as Configuration, {
		output: {
			clean: true,
			library: { type: 'global', name: 'main', umdNamedDefine: true },
			globalObject: 'globalThis',
			filename: 'main.js',
			path: path.resolve(__dirname, `../../${outDirName}/main`),
		},
		plugins: [new Webpack.DefinePlugin(defineEntries)],
		cache: {
			type: 'filesystem',
			allowCollectingMemory: true,
			cacheDirectory: path.resolve(__dirname, '../../.webpack_cache'),
		},
	})
)

// console.log(JSON.stringify(electronConfig))
// console.log(JSON.stringify(defineEntries))
// console.log(new Webpack.DefinePlugin(defineEntries))
export default electronConfig

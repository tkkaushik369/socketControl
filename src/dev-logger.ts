import webpack from 'webpack'
import AllConfigs from './webpack.dev'
import Logger, { Tab } from '@electron-forge/web-multi-logger'

async function Start() {
	const port = 9000
	const logger = new Logger(port)
	await logger.start()

	console.log(globalThis)

	console.log(`Dev Logger Started at http://localhost:${port}`)

	AllConfigs.forEach((Config) => {
		const Name = (Config.output as unknown as any).library.name
		console.log(`Logging: ${Name}`)
		if(Config.plugins !== undefined) {
			Config.plugins.shift() // remove webpack Progress plugin
		}
		const Tab = logger.createTab(Name);
		watchBuild(Config, Tab, Name);
	})
}

function watchBuild(config: webpack.Configuration, tab: Tab, name: string) {
	const compiler = webpack(config)

	// tab.clear();
	tab.log(`[${name}] Starting watch mode...`)

	compiler.watch({}, (err, stats: webpack.Stats | undefined) => {
		if (err) {
			tab.log(`[${name}] Fatal error:\n${err.stack || err.message}`)
			return
		}

		if (stats === undefined) {
			tab.log(`[${name}] No stats`)
			return
		}

		const info = stats.toString({
			colors: false,
			modules: false,
			children: false,
			chunks: false,
			chunkModules: false,
		})

		if (stats.hasErrors()) {
			tab.log(`[${name}] Build failed:\n${info}`)
		} else if (stats.hasWarnings()) {
			tab.log(`[${name}] Build completed with warnings:\n${info}`)
		} else {
			tab.log(`[${name}] Build successful:\n${info}`)
		}
	})
}

Start()

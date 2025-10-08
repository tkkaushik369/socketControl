import webpack from 'webpack'
import AllConfigs from './webpack.dev'
import Logger, { Tab } from './web-multi-logger/Logger'

const colors = [
	'\u001b[0m', // 	RESET
	'\u001b[31m', // 	RED
	'\u001b[32m', // 	GREEN
	'\u001b[33m', // 	YELLOW
	'\u001b[34m', // 	BLUE
	'\u001b[35m', // 	PURPLE
	'\u001b[36m', // 	CYAN
]

// Keep track of running watchers
const watchers = new Map<string, ReturnType<webpack.Compiler['watch']>>()

async function Start() {
	const port = 9000
	const logger = new Logger(port)
	await logger.start()

	// console.log(globalThis)

	console.log(`Dev Logger Started at http://localhost:${port}\n`)

	let colorInx = 1

	AllConfigs.forEach((Config) => {
		const Name = (Config.output as unknown as any).library.name

		if (Config.plugins !== undefined) {
			Config.plugins.shift() // remove webpack Progress plugin
		}

		const start = () => {
			startWatch(Config, tab, Name, colorInx)
			logger.statusUpdate(Name, true)
		}

		const stop = () => {
			stopWatch(Name)
			logger.statusUpdate(Name, false)
		}

		// initially not started
		const tab = logger.createTab(Name, start, stop)
		tab.log('Ready. Click start to begin building.')

		colorInx += 1
		if (colorInx >= colors.length) colorInx = 1
	})
}

function startWatch(config: webpack.Configuration, tab: Tab, name: string, colorInx: number) {
	const compiler = webpack(config)

	const log = (event: string | null = null, data: string | null = null) => {
		let colorName = `[${colors[colorInx]}${name}${colors[0]}]`
		let colorName1 = `[${colors[2]}${name}${colors[0]}]`

		let datas = ''
		let line = ''

		if (event !== null) {
			datas += `${colorName} ${colors[colorInx]}${event}${colors[0]}`
			line += `${colorName1} ${colors[2]}${event}${colors[0]}`
		}

		if (data !== null) {
			datas += data
				.split('\n')
				.map((i) => `${colorName} ${i} \n`)
				.join('')
			line += `${colorName1} ${data}`
		}
		tab.log(line)
		console.log(datas)
	}

	// tab.clear();
	log(`Starting watch mode...`)

	const watching = compiler.watch({}, (err, stats: webpack.Stats | undefined) => {
		if (err) {
			log(`Fatal error:\n`, `${err.stack || err.message}`)
			return
		}

		if (stats === undefined) {
			log(`No stats`)
			return
		}

		let info = stats.toString({
			colors: true,
			modules: false,
			children: false,
			chunks: false,
			chunkModules: false,
		})

		if (stats.hasErrors()) {
			log(`Build failed:\n`, `${info}`)
		} else if (stats.hasWarnings()) {
			log(`Build completed with warnings:\n`, `${info}`)
		} else {
			log(`Build successful:\n`, `${info}`)
		}
	})

	watchers.set(name, watching)
}

function stopWatch(name: string) {
	const watching = watchers.get(name)
	if (watching) {
		watching.close(() => {
			console.log(`[${name}] stopped watching.`)
		})
		watchers.delete(name)
	}
}

Start()

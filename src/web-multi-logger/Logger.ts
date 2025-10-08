import http from 'node:http'
import path from 'node:path'

import express from 'express'
import ews from 'express-ws'

import Tab from './Tab'

export { Tab }

export default class Logger {
	private app = express()

	private ws!: ews.Instance

	private tabs: { [id: string]: Tab } = {}

	private server: http.Server | null = null

	constructor(private port = 9000) {
		this.registerRoutes()
	}

	private registerRoutes() {
		this.ws = ews(this.app)
		this.app.get('/rest/tabs', (_req, res) =>
			res.json(
				Object.keys(this.tabs).map((name) => (this.tabs[name].toJSON()))
			)
		)

		this.app.post('/rest/start/:name', (req, res) => {
			const ctrl = this.tabs[req.params.name]
			console.log(req.params)
			if (!ctrl) return res.status(404).json({ error: 'Tab not found' })
			ctrl.start()
			res.json({ status: 'started', name: req.params.name })
		})

		this.app.post('/rest/stop/:name', (req, res) => {
			const ctrl = this.tabs[req.params.name]
			if (!ctrl) return res.status(404).json({ error: 'Tab not found' })
			ctrl.stop()
			res.json({ status: 'stopped', name: req.params.name })
		})

		console.log(path.dirname(require.resolve('xterm-addon-fit')))

		this.app.use('/xterm/addons/fit', express.static(path.dirname(require.resolve('xterm-addon-fit'))))
		this.app.use('/xterm/addons/search', express.static(path.dirname(require.resolve('xterm-addon-search'))))
		this.app.use('/xterm', express.static(path.resolve(require.resolve('xterm'), '../..')))
		this.app.use(express.static(path.resolve(__dirname, 'static')))
		this.ws.app.ws('/sub', () => {
			// I assume this endpoint is just a no-op needed for some reason.
		})
	}

	/**
	 * Creates a new tab with the given name, the name should be human readable
	 * it will be used as the tab title in the front end.
	 */
	createTab(name: string, startFn: () => void = () => {}, stopFn: () => void = () => {}): Tab {
		const tab = new Tab(name, startFn, stopFn, this.ws)
		this.tabs[name] = tab
		return tab
	}

	/**
	 * Start the HTTP server hosting the web UI.
	 *
	 * @returns the port number
	 */
	start(): Promise<number> {
		return new Promise<number>((resolve) => {
			this.server = this.app.listen(this.port, () => resolve(this.port))
		})
	}

	/**
	 * Stop the HTTP server hosting the web UI
	 */
	stop(): void {
		if (this.server) this.server.close()
	}

	/**
	 * Broadcast a message to all connected clients
	 */
	statusUpdate(Name: string, running: boolean) {
		const status = { type: 'status', name: Name, tab: this.tabs[Name].id, running: running }
		this.tabs[Name].running = running
		const msg = JSON.stringify(status)
		this.ws.getWss().clients.forEach((client) => {
			if (client.readyState === 1) {
				client.send(msg)
			}
		})
	}
}

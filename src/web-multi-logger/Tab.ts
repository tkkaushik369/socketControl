import ews from 'express-ws'

import Log from './Log'

let idCounter = 1

export default class Tab {
	public logs: Log[] = []
	public id: number

	public running: boolean
	public start: () => void
	public stop: () => void

	constructor(public name: string, start: () => void, stop: () => void, private ws: ews.Instance) {
		this.id = idCounter
		idCounter += 1

		this.start = start
		this.stop = stop
		this.running = false
	}

	/**
	 * Log a line to the web UI, a new line is automatically appended to the line
	 */
	public log(line: string): void {
		const log = new Log(line, new Date())
		this.logs.push(log)

		for (const client of this.ws.getWss().clients) {
			client.send(
				JSON.stringify({
					tab: this.id,
					payload: log,
				})
			)
		}
	}

	public toJSON() {
		return {
			id: this.id,
			name: this.name,
			logs: this.logs,
			running: this.running,
		}
	}
}

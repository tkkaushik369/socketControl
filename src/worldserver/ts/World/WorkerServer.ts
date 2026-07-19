// import { processData } from "@WorkerBase";
import { processData } from '../../../world/ts/Worldentities/GridCity/offscreen'
import { parentPort } from 'node:worker_threads'

// Node.js Worker
try {
	if (parentPort !== null) {
		parentPort.on('message', (m) => {
			processData(m, (data: any) => {
				if (parentPort === null) return
				parentPort.postMessage(data)
			})
		})
	}
} catch {
	console.log('Not running in Node worker')
}

// import { processData } from "@WorkerBase";
import { processData } from '../../../world/ts/Worldentities/GridCity/offscreen'

// Browser Worker
if (typeof self !== 'undefined' && typeof window === 'undefined') {
	self.onmessage = (m) => {
		processData(m.data, (data: any) => {
			self.postMessage(data)
		})
	}
}

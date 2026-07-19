import { processData as processDataOffScreen } from './Worldentities/GridCity/offscreen'

export function processData(message: any, callback: (res: any) => void) {
	// console.log(message)
	const mtype = message.mtype
	const msg = message.data
	switch (mtype) {
		case 'OffScreen': {
			processDataOffScreen(message, callback)
			break
		}
		default: {
			callback(msg)
			break
		}
	}
}

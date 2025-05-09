import type * as AppClientType from '@client/client'

declare global {
	interface Window {
		AppClientLoaded: boolean
		AppClient: typeof AppClientType
	}
}

var appClient: AppClientType.default | null = null

function initClient() {
	var myInterval: ReturnType<typeof setInterval> | undefined = setInterval(() => {
		if (window.AppClientLoaded === true) {
			console.log(window.AppClientLoaded, window.AppClientLoaded)
			launchClient()
			clearInterval(myInterval)
			console.info('Client Loaded')
			myInterval = undefined
		}
	}, 100)
	setTimeout(() => {
		if (myInterval !== undefined) {
			clearInterval(myInterval)
			console.info('Client Not Loaded')
			myInterval = undefined
		}
	}, 1000 * 10 /* seconds */)
}

function launchClient() {
	appClient = new window.AppClient.default()
}

initClient()

import { WEBPACK_USE_BUNDLE } from '../../LoaderMode'
/* import type * as AppClient from '../../client/client'

declare global {
	interface Window {
		client: typeof AppClient
	}
}

function launchClient() {
	const appClient = new window.client.default()
}

document.body.onload = () => {
	launchClient()
	console.log('Client Runner started')
} */

// import fs from 'node:fs'

console.log('client runner started')

/* declare global {
	interface Window {
		AppClientLoaded: boolean
	}
} */

function loadFile() {
	if (WEBPACK_USE_BUNDLE) {
		const sc_import = document.createElement('script')
		sc_import.id = 'sc_import'
		sc_import.defer = true
		sc_import.src = '../client/client.js'
		document.head.appendChild(sc_import)

		sc_import.onload = () => {
			window.AppClientLoaded = true
		}

		/* fs.watchFile('./dist/client', () => {
			location.reload()
		}) */

		/* fs.readdirSync('./dist/client').forEach((file) => {
			console.log(file)
		}) */
	} else {
		import('../../client/client').then((AppClient) => {
			;(window as unknown as any)['AppClient'] = AppClient
			window.AppClientLoaded = true
		}).catch((err) => {
			console.error(err)
		})
	}
}

loadFile()

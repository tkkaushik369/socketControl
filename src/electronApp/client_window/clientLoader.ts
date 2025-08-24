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
	console.log('react loaded', WEBPACK_USE_BUNDLE)
	if (WEBPACK_USE_BUNDLE) {
		const sc_import_1 = document.createElement('script')
		sc_import_1.id = 'sc_import_1'
		sc_import_1.defer = true
		sc_import_1.src = '../@WorldClient/index.js'
		document.head.appendChild(sc_import_1)

		const sc_import_2 = document.createElement('script')
		sc_import_2.id = 'sc_import_2'
		sc_import_2.defer = true
		sc_import_2.src = '../client/client.js'
		document.head.appendChild(sc_import_2)

		sc_import_2.onload = () => {
			window.AppClientLoaded = true
		}

		/* fs.watchFile('./dist/client', () => {
			location.reload()
		}) */

		/* fs.readdirSync('./dist/client').forEach((file) => {
			console.log(file)
		}) */
	} else {
		eval(`import('../../@WorldClient/index.js')`)
			.then(() => {
				import('../../client/client')
					.then((AppClient) => {
						;(window as unknown as any)['AppClient'] = AppClient
						window.AppClientLoaded = true
					})
					.catch((err) => {
						console.log('Error: ', err)
					})
			})
			.catch((err: any) => {
				console.log('Error: ', err)
			})
	}
}

loadFile()

import fs from 'node:fs'
import { WEBPACK_USE_BUNDLE } from '../../LoaderMode'

console.log('server runner started')

declare global {
	interface Window {
		AppServerLoaded: boolean
	}
}

function loadFile() {
	if (WEBPACK_USE_BUNDLE) {
		const sc_import = document.createElement('script')
		sc_import.id = 'sc_import'
		sc_import.defer = true
		sc_import.src = '../server/server.js'
		document.head.appendChild(sc_import)

		sc_import.onload = () => {
			window.AppServerLoaded = true
		}

		fs.watchFile('./dist/server', () => {
			location.reload()
		})

		/* fs.readdirSync('./dist/server').forEach((file) => {
			console.log(file)
		}) */
	} else {
		import('../../server/server').then((AppServer) => {
			;(window as unknown as any)['AppServer'] = AppServer
			window.AppServerLoaded = true
		})
	}
}

loadFile()

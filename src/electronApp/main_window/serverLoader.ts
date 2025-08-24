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
		const sc_import_1 = document.createElement('script')
		sc_import_1.id = 'sc_import_1'
		sc_import_1.defer = true
		sc_import_1.src = '../@WorldServer/index.js'
		document.head.appendChild(sc_import_1)

		const sc_import_2 = document.createElement('script')
		sc_import_2.id = 'sc_import_2'
		sc_import_2.defer = true
		sc_import_2.src = '../server/server.js'
		document.head.appendChild(sc_import_2)

		sc_import_2.onload = () => {
			window.AppServerLoaded = true
		}

		fs.watchFile('./dist/server', () => {
			location.reload()
		})

		/* fs.readdirSync('./dist/server').forEach((file) => {
			console.log(file)
		}) */
	} else {
		eval(`import('../../@WorldServer/index.js')`).then(() => {
			import('../../server/server').then((AppServer) => {
				;(window as unknown as any)['AppServer'] = AppServer
				window.AppServerLoaded = true
			})
		})
	}
}

loadFile()

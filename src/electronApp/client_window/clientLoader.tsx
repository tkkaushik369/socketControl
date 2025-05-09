import '../../client/css/main.css'
import '../../client/css/titleBar.css'
import { WEBPACK_USE_BUNDLE } from '../../LoaderMode'
import React from 'react'
import ReactDOM from 'react-dom/client'

import { App } from '../common/App'

const rootElement = document.getElementById('root')
console.log(rootElement)
if (rootElement !== null) {
	const root = ReactDOM.createRoot(rootElement)

	root.render(
		// <React.StrictMode>
		<App callBack={ReactLoaded}>
			<h2 id="titleBar">
				<a id="ton"></a>
				<a id="grab" className="on"></a>
				<a id="toff"></a>
			</h2>
			<div id="pingStats" className="noBorder">
				No Ping
			</div>
			<div id="controls">f</div>
			<div id="work">
				<div id="controls-main"></div>
			</div>
			<div id="chat">
				<center style={{ fontWeight: 'bold' }}>Chat</center>
				<div id="chat-messages-log"></div>
				<form id="chat-input">
					<input id="chat-message" type="text" name="chat-message" />
				</form>
			</div>
			<div id="all-audios"></div>
			<div id="gui-menu">
				<div id="gui-menu-container">
					<div id="gui-menu-users"></div>

					<button>s</button>
					<button>p</button>
				</div>
			</div>
		</App>
		// </React.StrictMode>
	)
}
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

function ReactLoaded() {
	console.log('react loaded')
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
		import('../../client/client')
			.then((AppClient) => {
				;(window as unknown as any)['AppClient'] = AppClient
				window.AppClientLoaded = true
			})
			.catch((err) => {
				console.log('Error: ', err)
			})
	}
}

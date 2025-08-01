import '../../client/css/main.css'
import '../../client/css/titleBar.css'
import { FRAME_VISBLE } from '../../LoaderMode'
import type * as AppClientType from '@client/client'
import React from 'react'
import ReactDOM from 'react-dom/client'

import { App } from '../common/App'

declare global {
	interface Window {
		AppClientLoaded: boolean
		AppClient: typeof AppClientType
	}
}

if (FRAME_VISBLE) document.body.className = 'bodyTransparent'

const rootElement = document.getElementById('root')

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

var appClient: AppClientType.default | null = null

function ReactLoaded() {
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
	fetch('../client/models/MapConfig.json')
		.then((response) => response.json())
		.then((data) => {
			appClient = new window.AppClient.default(data.maps, window.AppClient.initClient())
		})
		.catch((error) => console.error('Error fetching JSON:', error))
}

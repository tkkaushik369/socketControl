// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { ipcRenderer } from 'electron'
import { FRAME_VISBLE } from '../../LoaderMode'

export async function SetLightMode() {
	await ipcRenderer.invoke('dark-mode:light').then((data) => {
		console.log(`dark-mode:light = ${data}`)
	})
}
export async function SetDarkMode() {
	await ipcRenderer.invoke('dark-mode:dark').then((data) => {
		console.log(`dark-mode:dark = ${data}`)
	})
}

export function initPreload() {
	ipcRenderer.invoke('ping').then((pong) => console.log(pong))
	// SetLightMode().then(SetDarkMode)
	const lbl = document.getElementById('titleBar')
	const grab = document.getElementById('grab')
	const ton = document.getElementById('ton')
	const toff = document.getElementById('toff')

	if (lbl !== null) {
		ipcRenderer.invoke('titlebar').then((data) => {
			console.log(`titlebar:${data}`)
		})
		if (FRAME_VISBLE) lbl.style.display = 'none'
	}

	if (ton !== null) {
		ton.addEventListener('mouseenter', () => {
			if (grab !== null) grab.className = 'on'
			ipcRenderer.send('set-ignore-mouse-events', false)
		})
	}
	if (toff !== null) {
		toff.addEventListener('mouseenter', () => {
			if (grab !== null) grab.className = 'off'
			ipcRenderer.send('set-ignore-mouse-events', true, {
				forward: true,
			})
		})
	}
}

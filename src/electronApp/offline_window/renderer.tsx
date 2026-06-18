import '../../client/css/main.css'
import '../../client/css/titleBar.css'
import '../../client/css/animate.css'
import '../../client/css/cubeLoader.css'
import '../../client/css/loadingScreen.css'
// import React from 'react'
// import ReactDOM from 'react-dom/client'
// import { App } from '../common/App'

import { FRAME_VISBLE } from '../../LoaderMode'
import * as THREE from 'three'
import { VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper'
import { Utility, PlayerAttachmentType, ControlsTypes, MessageTypes, MapConfigType, AttachModels } from '@World'
import { WorldClient, PlayerClient } from '@WorldClient'
// import { PlayerClient } from '../../worldclient/ts/Core/PlayerClient'
// import { AttachModels } from '../../worldclient/ts/Utils/AttachModels'

THREE.Cache.enabled = true

const rootElement = document.getElementById('root')

class AppOffline {
	private workBox: HTMLDivElement
	private worldClient: WorldClient
	private sID: string
	private lastUpdate: number
	private isWorld: boolean = false

	constructor(maps: MapConfigType[], controls: HTMLDivElement, workBox: HTMLDivElement) {
		// bind functions
		this.ForControls = this.ForControls.bind(this)
		this.ForLoopCallback = this.ForLoopCallback.bind(this)
		this.GetLatestWorldData = this.GetLatestWorldData.bind(this)
		this.ForLaunchMap = this.ForLaunchMap.bind(this)
		this.OnMap = this.OnMap.bind(this)
		this.MapLoader = this.MapLoader.bind(this)
		this.ForLaunchScenario = this.ForLaunchScenario.bind(this)
		this.OnScenario = this.OnScenario.bind(this)
		this.ForMessage = this.ForMessage.bind(this)

		// init
		this.workBox = workBox
		this.lastUpdate = Date.now()

		try {
			if (!FRAME_VISBLE) {
				document.body.className = 'bodyTransparent'
				workBox.classList.add('Hide')
			}
		} catch {
			//
		}

		this.worldClient = new WorldClient(
			maps,
			controls,
			this.workBox,
			this.ForLoopCallback,
			this.ForLaunchMap,
			this.ForLaunchScenario
		)

		{
			this.worldClient.loadingManager.addEventListener('user_interface', (evt: any) => {
				// console.log('user_interface', evt.detail)
				const work_ele = document.getElementById('work')
				if (work_ele !== null) work_ele.style.display = evt.detail.visible ? 'block' : 'none'
			})
			this.worldClient.loadingManager.addEventListener('loading_screen', (evt: any) => {
				// console.log('loading_screen', evt.detail)
				const loading_ele = document.getElementById('loading-screen')
				if (loading_ele !== null) loading_ele.style.display = evt.detail.visible ? 'flex' : 'none'
			})
			this.worldClient.loadingManager.addEventListener('loading_progress', (evt: any) => {
				// console.log('loading_progress', evt.detail)
				const loading_percent_ele = document.getElementById('loading-text-percent')
				if (loading_percent_ele !== null)
					loading_percent_ele.innerText =
						evt.detail.progress !== 1 ? `${Number(evt.detail.progress * 100).toFixed(2)}%` : '100%'
			})
		}

		{
			const UID: string = 'Player_Offline'
			const SID: string = 'offline_player'

			this.worldClient.player = new PlayerClient(
				SID,
				this.worldClient.camera,
				this.worldClient.renderer.domElement,
				true
			)

			this.worldClient.player.setUID(UID)
			this.sID = this.worldClient.player.sID

			// Initialization
			this.worldClient.player.inputManager.controlsCallBack = this.ForControls
			this.worldClient.player.cameraOperator.camera.add(AttachModels.makeCamera())
			this.worldClient.player.attachments.push({
				obj: this.worldClient.player.cameraOperator.camera,
				addTo: PlayerAttachmentType.AddToWorld,
			})

			this.worldClient.player.cameraOperator.camera.visible = false
			this.worldClient.addSceneObject(this.worldClient.player.cameraOperator.camera)

			let playerPosition: THREE.Vector3 | null = null
			let isPlayerPositionNearVehicle: boolean = false
			this.worldClient.scenarios.forEach((scenario) => {
				if (scenario.name === this.worldClient.lastScenarioID) {
					playerPosition = scenario.playerPosition
					isPlayerPositionNearVehicle = scenario.isPlayerPositionNearVehicle
				}
			})
			if (playerPosition !== null) this.worldClient.player.setSpawn(playerPosition, isPlayerPositionNearVehicle)
			this.worldClient.player.addUser(this.worldClient)

			console.log(`Username: ${UID}`)
			this.worldClient.users[this.worldClient.player.sID] = this.worldClient.player

			this.worldClient.launchMap(Object.keys(this.worldClient.maps)[0], false, true)
			this.MapLoader()
			this.worldClient.mapLoadFinishCallBack = null
		}
	}

	private ForControls(controls: { sID: string; type: ControlsTypes; data: { [id: string]: any } }) {
		if (this.worldClient.player === null) return
		controls.sID = this.worldClient.player.sID

		if (!this.worldClient.settings.SyncInputs) this.worldClient.player.inputManager.setControls(controls)
	}

	private ForLoopCallback(inx: number) {
		// console.log('ForLoopCallback')
	}

	private GetLatestWorldData() {
		let alldata: { [id: string]: any } = {}
		// All World Id
		{
			const users: string[] = []
			Object.keys(this.worldClient.users).forEach((sID) => {
				if (this.worldClient.users[sID] !== undefined && this.worldClient.users[sID].uID !== null) {
					users.push(this.worldClient.users[sID].uID)
				}
			})
			alldata[String(this.worldClient.worldId)] = {
				uID: this.worldClient.worldId,
				msgType: MessageTypes.World,
				users: users,
			}
		}

		// All Player Data
		{
			if (this.worldClient.player !== null && this.worldClient.player.uID != null) {
				if (this.worldClient.player.world !== null) {
					this.worldClient.player.data.timeScaleTarget = this.worldClient.player.world.timeScaleTarget
					this.worldClient.player.data.sun.elevation = this.worldClient.player.world.sunConf.elevation
					this.worldClient.player.data.sun.azimuth = this.worldClient.player.world.sunConf.azimuth
				} else {
					this.worldClient.player.data.timeScaleTarget = 1
					this.worldClient.player.data.sun.elevation = 60
					this.worldClient.player.data.sun.azimuth = 45
				}
				let dataClient = this.worldClient.player.Out()
				alldata[this.worldClient.player.sID] = dataClient
			}
		}

		// Chracter Data
		{
			this.worldClient.characters.forEach((char) => {
				char.ping = Date.now() - char.timeStamp
				char.timeStamp = Date.now()
				if (char.uID !== null) alldata[char.uID] = char.Out()
			})
		}

		// Vehicle Data
		{
			this.worldClient.vehicles.forEach((vehi) => {
				vehi.ping = Date.now() - vehi.timeStamp
				vehi.timeStamp = Date.now()
				if (vehi.uID !== null) alldata[vehi.uID] = vehi.Out()
			})
		}

		// World Water Data
		{
			this.worldClient.waters.forEach((water) => {
				water.ping = Date.now() - water.timeStamp
				water.timeStamp = Date.now()
				if (water.uID !== null) alldata[water.uID] = water.Out()
			})
		}

		return alldata
	}

	private ForLaunchMap(mapName: string) {
		// console.log('ForLaunchMap', mapName)
		if (this.worldClient.player === null) return
		if (this.worldClient.worldId === null) {
			this.OnMap(mapName)
			return
		}
	}

	private OnMap(mapName: string) {
		console.log('ForLaunchMap', mapName)
		let caller = () => {
			this.MapLoader()
		}
		this.worldClient.mapLoadFinishCallBack = caller
		this.worldClient.launchMap(mapName, false, true)
	}

	private MapLoader() {
		if (false) {
			this.worldClient.paths.forEach((path) => {
				Object.keys(path.nodes).forEach((nID) => {
					path.nodes[nID].object.add(AttachModels.makePointHighlight(0.2))
				})
			})
			this.worldClient.vehicles.forEach((vehi) => {
				vehi.seats.forEach((seat) => {
					seat.entryPoints.forEach((ep) => {
						ep.add(AttachModels.makePointHighlight(0.2))
					})
				})
			})
		}

		this.worldClient.scene.traverse((obj) => {
			if (obj.hasOwnProperty('userData')) {
				if (obj.userData.hasOwnProperty('debug')) {
					if (obj.userData.debug) {
						obj.visible = true
						if (false) {
							const textureLoader = new THREE.TextureLoader()
							const texture = textureLoader.load('../client/images/uv-test-bw.jpg')
							let mat = new THREE.MeshStandardMaterial({ map: texture })
							;(obj as THREE.Mesh).material = mat
							this.worldClient.scene.add(new VertexNormalsHelper(obj, 0.1, 0x00ff00))
						}
					}
				}
			}
		})
	}

	private ForLaunchScenario(scenarioName: string) {
		if (this.worldClient.player === null) return
		if (this.worldClient.worldId === null) {
			this.OnScenario(scenarioName)
			return
		}
	}

	private OnScenario(scenarioName: string) {
		this.worldClient.launchScenario(scenarioName, false)
	}

	private ForMessage(message: string) {
		console.log('ForMessage')
	}
}

if (rootElement !== null) {
	// const root = ReactDOM.createRoot(rootElement)

	// root.render(
	// <React.StrictMode>
	// <App callBack={ReactLoaded}>
	{
		/* <h2 id="titleBar">
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
			</div> */
	}
	// </App>
	// </React.StrictMode>
	// )

	document.body.innerHTML = `
		<h2 id="titleBar">
			<a id="ton"></a>
			<a id="grab" className="on"></a>
			<a id="toff"></a>
		</h2>
		<div id="pingStats" className="noBorder">
			No Ping
		</div>
		<div id="controls">f</div>

		<div id="loading-screen">
			<div id="loading-screen-background"></div>
			<h1 id="main-title" class="sb-font">Sketchbook 0.4</h1>
			<div class="cubeWrap">
				<div class="cube">
					<div class="faces1"></div>
					<div class="faces2"></div>
				</div>
			</div>
			<div id="loading-text">Loading...<i id="loading-text-percent"></i></div>
		</div>

		<div id="work">
			<div id="controls-main"></div>
		</div>
		<!--<div id="chat">
			<center style={{ fontWeight: 'bold' }}>Chat</center>
			<div id="chat-messages-log"></div>
			<form id="chat-input">
				<input id="chat-message" type="text" name="chat-message" />
			</form>
		</div>-->
		<div id="console"></div>
		<div id="race"></div>
		<div id="all-audios"></div>
		<div id="gui-menu">
			<div id="gui-menu-container">
				<div id="gui-menu-users"></div>

				<button>s</button>
				<button>p</button>
			</div>
		</div>
	`
	ReactLoaded()
}

function ReactLoaded() {
	console.log('react loaded')

	document.title = 'Socket Control [Offline]'

	const titleBar = document.getElementById('titleBar') as HTMLDivElement
	const pingStats = document.getElementById('pingStats') as HTMLDivElement
	const controls = document.getElementById('controls') as HTMLDivElement
	const controlsMain = document.getElementById('controls-main') as HTMLDivElement
	const workBox = document.getElementById('work') as HTMLDivElement
	// const guiPlayersDom = document.getElementById('gui-players') as HTMLDivElement
	const chatInput = document.getElementById('chat-input') as HTMLFormElement
	const chatDom = document.getElementById('chat-message') as HTMLInputElement
	const chatLogDom = document.getElementById('chat-messages-log') as HTMLInputElement
	const guiMenuDom = document.getElementById('gui-menu') as HTMLInputElement
	const guiMenuUsersDom = document.getElementById('gui-menu-users') as HTMLInputElement

	const isElectronApp = Utility.isElectron()
	const isAndroid = Utility.deviceState()

	guiMenuDom.tabIndex = -1
	guiMenuDom.addEventListener('click', () => {
		if (!guiMenuDom.classList.contains('active')) {
			guiMenuDom.classList.add('active')
		}
	})

	guiMenuDom.addEventListener('keydown', (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			if (guiMenuDom.classList.contains('active')) {
				guiMenuDom.classList.remove('active')
			}
		}
	})

	fetch('../client/models/MapConfig.json')
		.then((response) => response.json())
		.then((data) => {
			// new AppClient.AppClient()
			const appOffline = new AppOffline(data.maps, controls, workBox)
		})
		.catch((error) => console.error('Error fetching JSON:', error))
}

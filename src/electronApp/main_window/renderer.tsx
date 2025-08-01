import '../../client/css/main.css'
import '../../client/css/titleBar.css'
import { FRAME_VISBLE } from '../../LoaderMode'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { SetDarkMode, SetLightMode, initPreload } from '../common/preload'
import { App } from '../common/App'

import * as THREE from 'three'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import type * as WorldBaseType from '@World'
import { Player, PlayerAttachmentType, ControlsTypes, Utility, MapConfigType } from '@World'
import type * as AppServerType from '@server/server'
import type * as WorldServerType from '@server/ts/World/WorldServer'
import { AttachModels } from '../../client/ts/Utils/AttachModels'
import { CannonDebugRenderer } from '../../client/ts/Utils/CannonDebugRenderer'
import Stats from 'three/examples/jsm/libs/stats.module.js'

declare global {
	interface Window {
		AppServerLoaded: boolean
		AppServer: typeof AppServerType
	}
}

if (FRAME_VISBLE) document.body.className = 'bodyTransparent'

const rootElement = document.getElementById('root')

if (rootElement !== null) {
	const root = ReactDOM.createRoot(rootElement)

	root.render(
		// <React.StrictMode>
		<App callBack={ReactLoaded}>
			<ul id="client-list">All Clients</ul>
			<ul id="world-list">All Worlds</ul>
		</App>
		// </React.StrictMode>
	)
}

var appServer: AppServerType.default | null = null
var renderer: THREE.WebGLRenderer
var labelRenderer: CSS2DRenderer
var camera: THREE.PerspectiveCamera
var player: Player
var cannonDebugRenderer: CannonDebugRenderer
var ambLight: THREE.AmbientLight
var stats: Stats
var isInWorld: string | null = null

function ReactLoaded() {
	console.log('react loaded')
	initPreload()
	SetLightMode()
	SetDarkMode()

	var myInterval: ReturnType<typeof setInterval> | undefined = setInterval(() => {
		if (window.AppServerLoaded === true) {
			fetch('../client/models/MapConfig.json')
				.then((response) => response.json())
				.then((data) => {
					launchServer(data.maps)
				})
				.catch((error) => console.error('Error fetching JSON:', error))
			clearInterval(myInterval)
			console.info('Server Loaded')
			myInterval = undefined
		}
	}, 1000)
	setTimeout(() => {
		if (myInterval !== undefined) {
			clearInterval(myInterval)
			console.info('Server Not Loaded')
			myInterval = undefined
		}
	}, 1000 * 10 /* seconds */)
}

function launchServer(maps: MapConfigType[]) {
	const clientListDom = document.getElementById('client-list')
	const worldListDom = document.getElementById('world-list')

	window.AppServer.initServer()
	appServer = new window.AppServer.default(maps, 3000)
	appServer.Start()

	appServer.addEventListener('connected', (event: Event) => {
		const evt = event as AppServerType.ConnectedEvent
		const arc = document.createElement('li')
		arc.innerText = evt.detail.id
		arc.id = evt.detail.id
		if (clientListDom !== null) clientListDom.appendChild(arc)
	})

	appServer.addEventListener('disconnected', (event: Event) => {
		const evt = event as AppServerType.DisconnectedEvent
		const ele = document.getElementById(evt.detail.id)
		if (clientListDom !== null && ele !== null) clientListDom.removeChild(ele)
	})

	appServer.addEventListener('worldcreated', (event: Event) => {
		const evt = event as AppServerType.WorldCreatedEvent
		const arc = document.createElement('ul')
		arc.innerText = evt.detail.id
		arc.id = evt.detail.id
		{
			const arcBtn = document.createElement('button')
			arcBtn.innerText = 'enter'
			arcBtn.onclick = () => {
				EnterWorld(evt.detail.id)
			}
			arc.appendChild(arcBtn)
		}
		console.log(arc)
		if (worldListDom !== null) worldListDom.appendChild(arc)
	})

	appServer.addEventListener('worlddestroyed', (event: Event) => {
		const evt = event as AppServerType.WorldDestroyedEvent
		const ele = document.getElementById(evt.detail.id)
		if (worldListDom !== null && ele !== null) {
			worldListDom.removeChild(ele)
			if (isInWorld !== null && isInWorld === evt.detail.id) LeaveWorld(evt.detail.id)
		}
	})

	appServer.addEventListener('worldclientadd', (event: Event) => {
		const evt = event as AppServerType.WorldClientAddEvent
		const worldDom = document.getElementById(evt.detail.wid)
		if (worldDom !== null) {
			const arc = document.createElement('li')
			arc.innerText = evt.detail.sid
			arc.id = evt.detail.wid + '_' + evt.detail.sid
			worldDom.appendChild(arc)
		}
		WorldClientAdd(evt.detail.wid, evt.detail.sid)
	})

	appServer.addEventListener('worldclientremove', (event: Event) => {
		const evt = event as AppServerType.WorldClientRemoveEvent
		const worldDom = document.getElementById(evt.detail.wid)
		const ele = document.getElementById(evt.detail.wid + '_' + evt.detail.sid)
		if (worldDom !== null && ele !== null) {
			worldDom.removeChild(ele)
		}
		WorldClientRemove(evt.detail.wid, evt.detail.sid)
	})
}

function EnterWorld(wid: string): void {
	if (appServer === null || rootElement === null) return
	const world: WorldBaseType.WorldBase /* WorldServerType.WorldServer */ | undefined = appServer.GetWorld(wid)
	if (world === undefined) return

	const worldView = document.createElement('div')
	worldView.id = 'worldView'
	// worldView.style.border = '1px solid green'
	// worldView.style.border = 'none'
	// worldView.style.backgroundColor = '#1a1a1a'
	// worldView.style.position = 'absolute'
	// worldView.style.padding = '0'
	// worldView.style.margin = '0'
	// worldView.style.boxSizing = 'border-box'
	// worldView.style.height = '100%'
	// worldView.style.width = '100%'
	// worldView.style.top = '0'
	// worldView.style.left = '0'
	rootElement.appendChild(worldView)

	// Renderer
	renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
	renderer.setPixelRatio(window.devicePixelRatio)
	renderer.setSize(worldView.offsetWidth, worldView.offsetHeight)
	renderer.autoClear = false
	renderer.toneMapping = THREE.ACESFilmicToneMapping
	renderer.toneMappingExposure = 1
	renderer.shadowMap.enabled = true
	renderer.shadowMap.type = THREE.PCFSoftShadowMap
	if (world.scene.fog !== null) renderer.setClearColor(world.scene.fog.color, 0.1)
	worldView.appendChild(renderer.domElement)
	renderer.setAnimationLoop(animate)

	cannonDebugRenderer = new CannonDebugRenderer(world.scene, world.world)

	// Label Renderer
	labelRenderer = new CSS2DRenderer()
	labelRenderer.setSize(worldView.offsetWidth, worldView.offsetHeight)
	labelRenderer.domElement.style.position = 'absolute'
	labelRenderer.domElement.style.position = 'absolute'
	labelRenderer.domElement.style.top = '0px'
	labelRenderer.domElement.style.pointerEvents = 'none'
	worldView.appendChild(labelRenderer.domElement)

	// Ambient Light
	ambLight = new THREE.AmbientLight(0xaacccc)
	world.scene.add(ambLight)
	/* const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.0)
			hemiLight.color.setHSL(0.59, 0.4, 0.6)
			hemiLight.groundColor.setHSL(0.095, 0.2, 0.75)
			hemiLight.position.set(0, 50, 0)
			this.scene.add(hemiLight) */

	// Camera
	camera = Utility.defaultCamera()
	world.scene.add(camera)

	// Stats
	stats = new Stats()
	worldView.appendChild(stats.dom)

	const sID = 'server'

	// create
	/* appServer.allUsers[sID] = new Player(sID, camera, worldView) as unknown as PlayerTypes.Player
			appServer.allUsers[sID].inputManager.controlsCallBack = OnControls

			appServer.allUsers[sID].world = appServer.allWorlds[wid]
			appServer.allUsers[sID].spawnPoint = null
			appServer.allWorlds[wid].users[sID] = appServer.allUsers[sID]
			appServer.allUsers[sID].setUID('Server Debug') */

	player = new Player(sID, camera, renderer.domElement)
	player.inputManager.controlsCallBack = OnControls
	;(player.world as unknown as WorldBaseType.WorldBase /* WorldServerType.WorldServer */) = world
	player.spawnPoint = null
	// appServer.allWorlds[wid].users[sID] = appServer.allUsers[sID]
	player.setUID('Server Debug')

	{
		/* for (let i = 0; i < appServer.allWorlds[wid].scenarios.length; i++) {
				if (appServer.allWorlds[wid].scenarios[i].name === appServer.allWorlds[wid].lastScenarioID) {
					if (appServer.allWorlds[wid].scenarios[i].playerPosition !== null) {
						const playerPosition = appServer.allWorlds[wid].scenarios[i].playerPosition
						if (playerPosition !== null) {
							const pos = Utility.GridPosition(
								(appServer.allWorlds[wid] as WorldBaseType.WorldBase).users as {},
								playerPosition
							)
							appServer.allUsers[sID].setSpawn(pos[pos.length - 1], false)
							appServer.allUsers[sID].cameraOperator.theta =
								appServer.allWorlds[wid].scenarios[i].initialCameraAngle
							appServer.allUsers[sID].cameraOperator.phi = 15
						}
					}
				}
			} */
		for (let i = 0; i < world.scenarios.length; i++) {
			if (world.scenarios[i].name === world.lastScenarioID) {
				if (world.scenarios[i].playerPosition !== null) {
					player.setSpawn(new THREE.Vector3(0, 5, 5), false)
					player.cameraOperator.theta = world.scenarios[i].initialCameraAngle
					player.cameraOperator.phi = 15
				}
			}
		}
	}
	{
		// appServer.allUsers[sID].addUser(appServer.allWorlds[wid])
		// appServer.allUsers[sID].world = world
		// appServer.allUsers[sID].world.users[appServer.allUsers[sID].sID] = appServer.allUsers[sID]
		player.inputManager.pointerLock = true
		player.cameraOperator.setSensitivity(0.2)
		world.registerUpdatable(player.inputManager)
		world.registerUpdatable(player.cameraOperator)
	}
	console.log('server add')
	appServer.Status()

	window.addEventListener('resize', onWindowResize, false)
	onWindowResize()

	// listener
	// this.listener = new THREE.AudioListener()
	// this.camera.add(this.listener)

	function onWindowResize() {
		const width = window.innerWidth
		const height = window.innerHeight

		camera.aspect = width / height
		camera.updateProjectionMatrix()

		renderer.setSize(width, height)
		labelRenderer.setSize(width, height)
		// const pixelRatio = renderer.getPixelRatio()

		// this.fxaaPass.uniforms['resolution'].value.set(1 / (width * pixelRatio), 1 / (height * pixelRatio))
		// composer.setSize(width, height)
	}

	function OnControls(controls: { sID: string; type: ControlsTypes; data: { [id: string]: any } }) {
		player.inputManager.setControls(controls)
	}

	function animate() {
		cannonDebugRenderer.update()
		stats.update()
		if (world !== undefined) {
			renderer.render(world.scene, camera)
			labelRenderer.render(world.scene, camera)
		}
	}

	{
		const clsBtn = document.createElement('div')
		clsBtn.id = 'world_close'
		clsBtn.innerText = 'X'
		clsBtn.style.color = 'red'
		clsBtn.style.fontWeight = 'bold'
		clsBtn.style.position = 'absolute'
		clsBtn.style.position = 'absolute'
		clsBtn.style.zIndex = '999999'
		clsBtn.style.right = '4px'
		clsBtn.style.bottom = '4px'
		clsBtn.onclick = () => {
			LeaveWorld(wid)
		}
		worldView.appendChild(clsBtn)
	}
	isInWorld = wid

	const clientListDom = document.getElementById('client-list')
	const worldListDom = document.getElementById('world-list')
	if (clientListDom !== null) clientListDom.style.display = 'none'
	if (worldListDom !== null) worldListDom.style.display = 'none'
}

function LeaveWorld(wid: string): void {
	if (appServer === null || rootElement === null) return
	const world: /* WorldBaseType.WorldBase */ WorldServerType.WorldServer | undefined = appServer.GetWorld(wid)
	if (world === undefined) return
	world.unregisterUpdatable(player.inputManager)
	world.unregisterUpdatable(player.cameraOperator)
	world.scene.remove(ambLight)
	world.scene.remove(camera)
	cannonDebugRenderer.clearMeshes()
	renderer.dispose()
	// labelRenderer.dispose()
	const worldView = document.getElementById('worldView')
	if (worldView !== null) rootElement.removeChild(worldView)
	isInWorld = null
	appServer.Status()

	const clientListDom = document.getElementById('client-list')
	const worldListDom = document.getElementById('world-list')
	if (clientListDom !== null) clientListDom.style.display = 'block'
	if (worldListDom !== null) worldListDom.style.display = 'block'
}

function WorldClientAdd(wid: string, sid: string) {
	if (appServer === null) return
	const world: /* WorldBaseType.WorldBase */ WorldServerType.WorldServer | undefined = appServer.GetWorld(wid)
	const player: WorldBaseType.Player | undefined = appServer.allUsers[sid]
	if (world === undefined || player === undefined) return
	if (isInWorld !== wid) return
	player.cameraOperator.camera.add(AttachModels.makeCamera())
	player.attachments.push({ obj: player.cameraOperator.camera, addTo: PlayerAttachmentType.AddToWorld })
	/* {
		const camHelper = new THREE.CameraHelper(player.cameraOperator.camera)
		camHelper.visible = false

		player.attachments.push({ obj: camHelper, addTo: PlayerAttachmentType.AddToWorld })
	} */
	{
		const labelDiv = document.createElement('div')
		labelDiv.className = 'label debug'
		labelDiv.textContent = player.uID

		const label = new CSS2DObject(labelDiv)
		label.position.set(0, 1.2, 0)

		player.attachments.push({ obj: label, addTo: PlayerAttachmentType.AddToCharacter })
	}
	{
		const labelDiv = document.createElement('div')
		labelDiv.className = 'label debug'
		labelDiv.textContent = player.uID + '( 📷 )'

		const label = new CSS2DObject(labelDiv)
		label.position.set(0, 0.6, 0)

		player.attachments.push({ obj: label, addTo: PlayerAttachmentType.AddToCamera })
	}
	player.attachments.forEach((obj) => {
		switch (obj.addTo) {
			case PlayerAttachmentType.AddToWorld: {
				world.addSceneObject(obj.obj)
				break
			}
			case PlayerAttachmentType.AddToCharacter: {
				if (player.character !== null) player.character.modelContainer.add(obj.obj)
				break
			}
			case PlayerAttachmentType.AddToCamera: {
				player.cameraOperator.camera.add(obj.obj)
				break
			}
		}
	})
}

function WorldClientRemove(wid: string, sid: string) {
	if (appServer === null) return
	const world: /* WorldBaseType.WorldBase */ WorldServerType.WorldServer | undefined = appServer.GetWorld(wid)
	const player: WorldBaseType.Player | undefined = appServer.allUsers[sid]
	if (world === undefined || player === undefined) return
	if (isInWorld !== wid) return
	player.attachments.forEach((obj) => {
		switch (obj.addTo) {
			case PlayerAttachmentType.AddToWorld: {
				world.removeSceneObject(obj.obj)
				break
			}
			case PlayerAttachmentType.AddToCharacter: {
				/* if (obj.obj instanceof THREE.LOD) {
					console.log(obj.obj.levels)
					obj.obj.levels.forEach((child) => {
						console.log((obj.obj as any).removeLevel(child.distance))
					})
				} */
				if (player.character !== null) player.character.modelContainer.remove(obj.obj)
				break
			}
			case PlayerAttachmentType.AddToCamera: {
				player.cameraOperator.camera.remove(obj.obj)
				break
			}
		}
	})
}

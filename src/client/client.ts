import './css/main.css'
import './css/titleBar.css'
import './css/animate.css'
import './css/cubeLoader.css'
import './css/loadingScreen.css'
import { FRAME_VISBLE } from '../LoaderMode'
import {
	Common,
	Utility,
	PlayerSetMesssage,
	PlayerAttachmentType,
	ControlsTypes,
	MessageTypes,
	Communication,
	DataSender,
	Packager,
	MapConfigType,
	AttachModels,
} from '@World'
import * as THREE from 'three'
import { VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper'
import { io, Socket } from 'socket.io-client'
import parser from 'socket.io-msgpack-parser'
// import { pack, unpack } from "msgpackr"
import { WorldClient, PlayerClient } from '@WorldClient'
// import { PlayerClient } from '../worldclient/ts/Core/PlayerClient'
// import { AttachModels } from '../worldclient/ts/Utils/AttachModels'

export type DivsType = {
	controls: HTMLDivElement
	workBox: HTMLDivElement
	pingStats: HTMLDivElement
	chatInput: HTMLFormElement
	chatDom: HTMLInputElement
	guiMenuUsersDom: HTMLInputElement
	chatLogDom: HTMLInputElement
}

export function initClient(): DivsType {
	THREE.Cache.enabled = true

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

	if (isAndroid) {
		controlsMain.style.display = 'block'
		console.log('isAndroid', isAndroid)
	}

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

	if (navigator.userAgent.includes('QtWebEngine') || isElectronApp) {
		document.body.classList.add('bodyTransparent')
		console.log('transparent')
	}

	if (typeof process === 'object') {
		// workBox.classList.add('Hide')
		// console.log('isElectron', isElectronApp)

		try {
			if (!FRAME_VISBLE) {
				document.body.className = 'bodyTransparent'
				workBox.classList.add('Hide')
			}
		} catch {
			//
		}
	} else titleBar.style.display = 'none'

	return {
		controls: controls,
		workBox: workBox,
		pingStats: pingStats,
		chatInput: chatInput,
		chatDom: chatDom,
		guiMenuUsersDom: guiMenuUsersDom,
		chatLogDom: chatLogDom,
	}
}

export default class AppClient {
	private io: Socket | null
	private ws: WebSocket | null
	private worldClient: WorldClient
	private sID: string
	private lastUpdate: number

	private timer: number
	private bandwithUsage: number

	private clock: THREE.Clock
	private bufferData: { delta: number; data: any }[] = []
	private isReplay: boolean = false
	private isWorld: boolean = false

	private divs: DivsType
	constructor(maps: MapConfigType[], divs: DivsType) {
		// bind functions

		this.SetupConnection = this.SetupConnection.bind(this)
		this.MapLoader = this.MapLoader.bind(this)
		this.PlayReplay = this.PlayReplay.bind(this)

		this.OnConnect = this.OnConnect.bind(this)
		this.OnDisConnect = this.OnDisConnect.bind(this)
		this.OnSetID = this.OnSetID.bind(this)
		this.OnAddClient = this.OnAddClient.bind(this)
		this.OnRemoveClient = this.OnRemoveClient.bind(this)
		this.Set = this.Set.bind(this)
		this.OnUpdate = this.OnUpdate.bind(this)
		this.OnControls = this.OnControls.bind(this)
		this.OnMap = this.OnMap.bind(this)
		this.OnScenario = this.OnScenario.bind(this)
		this.OnMessage = this.OnMessage.bind(this)
		this.OnChangeCallBack = this.OnChangeCallBack.bind(this)
		this.OnLeaveCallBack = this.OnLeaveCallBack.bind(this)

		this.ForControls = this.ForControls.bind(this)
		this.ForLaunchMap = this.ForLaunchMap.bind(this)
		this.ForLaunchScenario = this.ForLaunchScenario.bind(this)
		this.ForMessage = this.ForMessage.bind(this)
		this.ForSocketLoop = this.ForSocketLoop.bind(this)
		this.ForSocketLoopCallBack = this.ForSocketLoopCallBack.bind(this)

		// init
		this.divs = divs
		this.clock = new THREE.Clock()
		this.io = null
		this.ws = null
		this.worldClient = new WorldClient(
			maps,
			this.divs.controls,
			this.divs.workBox,
			this.ForSocketLoop,
			this.ForLaunchMap,
			this.ForLaunchScenario
		)
		this.sID = ''
		this.lastUpdate = Date.now()
		this.timer = 0
		this.bandwithUsage = 0

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

		this.SetupConnection(false)

		this.divs.chatInput.addEventListener('submit', (e) => {
			e.preventDefault()
			if (this.divs.chatDom.value !== '') {
				if (this.divs.chatDom.value === '/replay') {
					this.PlayReplay(0)
				} else this.ForMessage(this.divs.chatDom.value)
				this.divs.chatDom.value = ''
			}
		})
	}

	private SetupConnection(isReconnect: boolean) {
		// Connection
		if (Common.conn === Communication.SocketIO) {
			this.io = io({ parser: parser })
			this.ws = null
		} else if (Common.conn === Communication.WebSocket) {
			this.io = null
			const host_name = typeof process === 'object' ? 'localhost' : window.location.hostname
			const host_port = window.location.port == '' ? '' : ':' + window.location.port
			const socketURL = host_name + host_port
			if (window.location.protocol.includes('https'))
				this.ws = new WebSocket('wss://' + socketURL, 'echo-protocol')
			else this.ws = new WebSocket('ws://' + socketURL, 'echo-protocol')
		}

		// Configuration
		if (this.io !== null) {
			this.io.on('connect', this.OnConnect)
			this.io.on('disconnect', this.OnDisConnect)
			this.io.on('setID', this.OnSetID)
			this.io.on('addClient', this.OnAddClient)
			this.io.on('removeClient', this.OnRemoveClient)
			this.io.on('update', this.OnUpdate)
			this.io.on('controls', this.OnControls)
			this.io.on('map', this.OnMap)
			this.io.on('scenario', this.OnScenario)
			this.io.on('message', this.OnMessage)
		} else if (this.ws !== null) {
			const ws = this.ws
			this.ws.binaryType = 'arraybuffer'
			this.ws.onopen = (event) => {
				if (isReconnect) {
					location.reload()
				} else {
					this.OnConnect()
				}
			}
			this.ws.onmessage = (event) => {
				let data = {} as any
				if (Common.packager === Packager.JSON) data = JSON.parse(event.data)
				/* else if (Common.packager === Packager.MsgPacker)
					data = unpack(new Uint8Array(event.data)) */

				switch (data.type) {
					case 'setID': {
						this.OnSetID(data.params, (uID: string, sID: string, worldId: string) => {
							if (Common.packager === Packager.JSON)
								ws.send(JSON.stringify({ type: 'setIDCallBack', params: { uID: uID, sID: sID } }))
							/* else if (Common.packager === Packager.MsgPacker)
								ws.send(pack({ type: 'setIDCallBack', params: { uID: uID, sID: sID } })) */
						})
						break
					}
					case 'update': {
						this.OnUpdate(data.params)
						break
					}
					case 'ForSocketLoopCallBack': {
						this.ForSocketLoopCallBack()
						if (Common.sender === DataSender.PingPong) {
							this.OnUpdate(data.params)
						}
						break
					}
					case 'controls': {
						this.OnControls(data.params)
						break
					}
					case 'map': {
						this.OnMap(data.params.map)
						break
					}
					case 'scenario': {
						this.OnScenario(data.params.scenario)
						break
					}
					case 'message': {
						this.OnMessage(data.params)
						break
					}
					case 'addClient': {
						this.OnAddClient(data.params)
						break
					}
					case 'removeClient': {
						this.OnRemoveClient(data.params)
						break
					}
					case 'changeCallBack': {
						this.OnChangeCallBack(data.params)
						break
					}
					case 'leaveCallBack': {
						this.OnLeaveCallBack(data.params)
						break
					}
					default: {
						console.log(event.data)
						break
					}
				}
			}
			this.ws.onclose = (event) => {
				console.log('Close: ', JSON.stringify(event))
				this.OnDisConnect(this.sID)
				setTimeout(() => {
					this.SetupConnection(true)
				}, 1000)
				this.ws == null
			}
			this.ws.onerror = (event) => {
				console.error('Socket encountered error: ', event, 'Closing socket')
				ws.close()
			}
		}
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

	private PlayReplay(inx: number): void {
		if (!this.isReplay) {
			if (!this.divs.workBox.classList.contains('replay')) this.divs.workBox.classList.add('replay')
		}
		this.isReplay = true

		if (inx >= this.bufferData.length) {
			this.isReplay = false
			if (this.divs.workBox.classList.contains('replay')) this.divs.workBox.classList.remove('replay')
			return
		}

		let buff = this.bufferData[inx]

		this.Set(buff.data)

		setTimeout(() => {
			this.PlayReplay(inx + 1)
		}, buff.delta * 1000 - 10)
	}

	private OnConnect() {
		console.log('Connected')
		this.worldClient.stats.dom.classList.remove('noPing')
		this.worldClient.stats.dom.classList.add('ping')

		this.worldClient.launchMap(Object.keys(this.worldClient.maps)[0], false, true)
	}

	private OnDisConnect(str: string | null, desc?: Error | { description: string }) {
		if (str !== null) {
			console.log('Disconnect: ' + str + ', Reason: ' + desc)
			this.worldClient.stats.dom.classList.remove('ping')
			this.worldClient.stats.dom.classList.add('noPing')
		}

		let clearWorld = true
		if (desc !== undefined && !(desc instanceof Error) && desc.description == 'keepData') clearWorld = false

		Object.keys(this.worldClient.users).forEach((sID) => {
			if (this.worldClient.users[sID] !== undefined) {
				if (str === null) {
					this.worldClient.users[sID].removeUser(this.worldClient)
					if (this.sID !== sID) delete this.worldClient.users[sID]
				}
			}
		})

		if (clearWorld) {
			this.worldClient.clearEntities(true)
			this.worldClient.clearScene()
		}
	}

	private OnSetID(message: PlayerSetMesssage, callBack: Function) {
		let caller = () => {
			const UID: string = 'Player_' + message.count
			/* {
				this.worldClient.worldId = "unjoin"
				this.worldClient.settings.SyncInputs = false
			} */
			this.worldClient.player = new PlayerClient(
				message.sID,
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

			callBack(UID, message.sID)
			this.MapLoader()

			this.worldClient.mapLoadFinishCallBack = null
		}

		caller()
	}

	private OnAddClient(messageData: { sID: string; uID: string }) {
		if (this.worldClient.users[messageData.sID] !== undefined) return

		const player = new PlayerClient(messageData.sID, Utility.defaultCamera(), null, false)
		// Initialization
		player.setUID(messageData.uID)
		player.cameraOperator.camera.add(AttachModels.makeCamera())
		player.attachments.push({ obj: player.cameraOperator.camera, addTo: PlayerAttachmentType.AddToWorld })
		this.worldClient.addSceneObject(player.cameraOperator.camera)

		let playerPosition: THREE.Vector3 | null = null
		let isPlayerPositionNearVehicle: boolean = false
		this.worldClient.scenarios.forEach((scenario) => {
			if (scenario.name === this.worldClient.lastScenarioID) {
				playerPosition = scenario.playerPosition
				isPlayerPositionNearVehicle = scenario.isPlayerPositionNearVehicle
			}
		})
		if (playerPosition !== null) player.setSpawn(playerPosition, isPlayerPositionNearVehicle)
		player.addUser(this.worldClient)

		console.log('New User: ' + player.uID)
		this.worldClient.users[player.sID] = player
	}

	private OnRemoveClient(messageData: { sID: string }) {
		if (this.sID === messageData.sID) return
		if (this.worldClient.users[messageData.sID] !== undefined) {
			console.log(`Removed User: ${this.worldClient.users[messageData.sID].uID}`)
			this.worldClient.users[messageData.sID].removeUser(this.worldClient)
			delete this.worldClient.users[messageData.sID]
		}
	}

	private Set(messages: { [id: string]: any }) {
		this.divs.pingStats.innerHTML = 'Ping: ' + '<br>'
		this.divs.guiMenuUsersDom.innerHTML = ''
		let players = 0
		let validRooms: string[] = []

		let isActive = false
		let isChanged = false
		if (this.worldClient.player !== null)
			if (this.worldClient.player.world !== null)
				isActive = this.worldClient.player.world.worldId === null ? false : true
		if (this.isWorld !== isActive) {
			this.isWorld = isActive
			isChanged = true
		}

		Object.keys(messages).forEach((id) => {
			if (messages[id].sID !== undefined) {
				this.divs.pingStats.innerHTML += '[' + messages[id].sID + '] '
				// pingStats.innerHTML += "[" + messages[id].data.worldId + "][" + messages[id].data.isWS + "] "
				if (messages[id].sID == this.sID) {
					if (this.lastUpdate < Date.now() - 1000) {
						this.worldClient.networkStats.update(messages[id].ping, 100)
						this.lastUpdate = Date.now()
					}
					this.divs.pingStats.innerHTML += '(YOU) '
				}
				this.divs.pingStats.innerHTML += messages[id].uID + ': '
				this.divs.pingStats.innerHTML += messages[id].ping + '<br>'
			}

			switch (messages[id].msgType) {
				case MessageTypes.World: {
					validRooms.push(messages[id].uID)
					this.divs.guiMenuUsersDom.innerHTML += '<div>' + messages[id].uID
					this.divs.guiMenuUsersDom.innerHTML += '<ul>'
					if (messages[id].users !== undefined) {
						messages[id].users.forEach((usr: string) => {
							this.divs.guiMenuUsersDom.innerHTML += '<li>' + usr + '</li>'
						})
					}
					this.divs.guiMenuUsersDom.innerHTML += '</ul>'
					this.divs.guiMenuUsersDom.innerHTML += '</div>'
					break
				}
				case MessageTypes.Player: {
					if (messages[id].data.worldId !== null) {
						if (messages[id].data.worldId !== this.worldClient.worldId) break
					}
					players++

					if (messages[id].data.worldId === null) break
					if (this.worldClient.users[id] === undefined) {
						console.log('Undefined Player ' + this.worldClient.users[id])
						break
					}
					// World Time Scale
					this.worldClient.users[id].uiControls = messages[id].data.uiControls

					if (this.sID === messages[id].sID) {
						if (this.worldClient.users[id].uiControls !== this.worldClient.uiControls) {
							this.worldClient.updateControls(messages[id].data.uiControls)
						}
						this.worldClient.timeScaleTarget = messages[id].data.timeScaleTarget

						if (this.worldClient.settings.SyncSun) {
							this.worldClient.effectController.elevation = messages[id].data.sun.elevation
							this.worldClient.effectController.azimuth = messages[id].data.sun.azimuth
							this.worldClient.sunConf.elevation = this.worldClient.effectController.elevation
							this.worldClient.sunConf.azimuth = this.worldClient.effectController.azimuth
							this.worldClient.sunGuiChanged()
							// console.log(JSON.stringify(messages[id].data.sun))
						}
						if (this.worldClient.settings.SyncInputs) this.worldClient.users[id].Set(messages[id])
					} else this.worldClient.users[id].Set(messages[id])
					break
				}
				case MessageTypes.Character: {
					this.worldClient.characters.forEach((char) => {
						if (char.uID === messages[id].uID) {
							char.Set(messages[id])
						}
					})
					break
				}
				case MessageTypes.Vehicle: {
					this.worldClient.vehicles.forEach((vehi) => {
						if (vehi.uID === messages[id].uID) {
							vehi.Set(messages[id])
						}
					})
					break
				}
				case MessageTypes.Water: {
					this.worldClient.waters.forEach((water) => {
						if (water.uID === messages[id].uID) {
							water.Set(messages[id])
						}
					})
					break
				}
				case MessageTypes.Shape: {
					this.worldClient.shapes.forEach((shape) => {
						if (shape.uID === messages[id].uID) {
							shape.Set(messages[id])
						}
					})
					break
				}
				case MessageTypes.RaceResults: {
					this.worldClient.updateRaceResults(messages[id].results)
					break
				}
				default: {
					console.log('Unknown Message: ', messages[id])
					break
				}
			}
		})

		this.divs.pingStats.innerHTML += '<br><b>Players: ' + players + '</b>'
		this.divs.pingStats.innerHTML += '<br><b>Current World: ' + this.worldClient.worldId + '</b>'

		let toRemoveRooms: string[] = []
		if (validRooms.length > 0) {
			Object.keys(this.worldClient.roomCallers).forEach((wid) => {
				if (!validRooms.includes(wid)) {
					toRemoveRooms.push(wid)
				}
			})
		}

		if (isChanged) {
			Object.keys(this.worldClient.roomCallers).forEach((wid) => {
				if (!toRemoveRooms.includes(wid)) toRemoveRooms.push(wid)
			})
		}

		while (toRemoveRooms.length > 0) {
			let wid = toRemoveRooms.pop()
			if (wid !== undefined) {
				for (let i = 0; i < this.worldClient.worldsGUIFolder.children.length; i++) {
					const firstChild = this.worldClient.worldsGUIFolder.children[i].element.firstChild
					if (firstChild !== null) {
						const name = firstChild.textContent
						if (name !== null && name.includes(wid)) {
							this.worldClient.worldsGUIFolder.children[i].dispose()
							break
						}
					}
				}
				delete this.worldClient.roomCallers[wid]
			}
		}

		if (!isChanged) {
			for (let i = 0; i < this.worldClient.worldsGUIFolder.children.length; i++) {
				const firstChild = this.worldClient.worldsGUIFolder.children[i].element.firstChild
				if (firstChild !== null && firstChild.textContent !== null) {
					let inx = validRooms.indexOf(firstChild.textContent)
					if (inx != -1) {
						validRooms.splice(inx, 1)
					}
				}
			}
		}

		while (validRooms.length > 0) {
			const wid = validRooms.pop()
			if (wid !== undefined) {
				if ((isActive && wid === this.worldClient.worldId) || !isActive) {
					this.worldClient.roomCallers[wid] = {
						join: () => {
							if (this.io !== null) this.io.emit('change', wid, this.OnChangeCallBack)
							else if (this.ws !== null) {
								if (Common.packager === Packager.JSON)
									this.ws.send(
										JSON.stringify({ type: 'change', params: { sID: this.sID, worldId: wid } })
									)
								/* else if (Common.packager === Packager.MsgPacker)
								this.ws.send(pack({ type: 'change', params: { sID: this.sID, worldId: wid } })) */
							}
						},
						leave: () => {
							if (this.io !== null) this.io.emit('leave', wid, this.OnLeaveCallBack)
							else if (this.ws !== null) {
								if (Common.packager === Packager.JSON)
									this.ws.send(
										JSON.stringify({ type: 'leave', params: { sID: this.sID, worldId: wid } })
									)
								/* else if (Common.packager === Packager.MsgPacker)
								this.ws.send(pack({ type: 'leave', params: { sID: this.sID, worldId: wid } })) */
							}
						},
					}
					let worldFolder = this.worldClient.worldsGUIFolder.addFolder({ title: wid })
					if (!isActive) {
						worldFolder.addButton({ title: 'Join' }).on('click', (ev: any) => {
							this.worldClient.roomCallers[wid].join()
						})
					} else {
						worldFolder.addButton({ title: 'Leave' }).on('click', (ev: any) => {
							this.worldClient.roomCallers[wid].leave()
						})
					}
				}
			}
		}
	}

	private formatByteSize(bytes: number): string {
		if (bytes < 1024) return bytes + ' bytes'
		else if (bytes < 1048576) return (bytes / 1024).toFixed(3) + ' KiB'
		else if (bytes < 1073741824) return (bytes / 1048576).toFixed(3) + ' MiB'
		else return (bytes / 1073741824).toFixed(3) + ' GiB'
	}

	private memorySizeOf(obj: any) {
		var bytes = 0
		function sizeOf(obj: any) {
			if (obj !== null && obj !== undefined) {
				switch (typeof obj) {
					case 'number':
						bytes += 8
						break
					case 'string':
						bytes += obj.length * 2
						break
					case 'boolean':
						bytes += 4
						break
					case 'object':
						var objClass = Object.prototype.toString.call(obj).slice(8, -1)
						if (objClass === 'Object' || objClass === 'Array') {
							for (var key in obj) {
								if (!obj.hasOwnProperty(key)) continue
								sizeOf(obj[key])
							}
						} else bytes += obj.toString().length * 2
						break
				}
			}
			return bytes
		}
		return sizeOf(obj)
	}

	private OnUpdate(messages: { [id: string]: any }) {
		let delta = this.clock.getDelta()
		if (this.isReplay) return
		this.Set(messages)
		if (this.timer >= 1.0) {
			this.worldClient.bandwidthStats.update(Number(this.formatByteSize(this.bandwithUsage).replace(/[^0-9\.]/g, '')), 250)
			this.timer = 0
			this.bandwithUsage = 0
		}
		this.timer += delta
		this.bandwithUsage += this.memorySizeOf(messages)

		this.bufferData.push({ delta: delta, data: messages })
		let time = 0,
			inx = -1
		if (this.bufferData.length > 2) {
			for (let i = this.bufferData.length - 1; i > 0; --i) {
				time += this.bufferData[i].delta
				if (time > 45) {
					// seconds
					inx = i
					break
				}
			}
			if (inx > 1) {
				while (--inx) {
					this.bufferData.shift()
				}
			}
		}
	}

	private OnControls(controls: { sID: string; type: ControlsTypes; data: { [id: string]: any } }) {
		if (this.isReplay) return
		if (controls.sID === this.sID && !this.worldClient.settings.SyncInputs) return
		if (this.worldClient.users[controls.sID] !== undefined) {
			this.worldClient.users[controls.sID].inputManager.setControls(controls)
		}
	}

	private OnMap(mapName: string) {
		let caller = () => {
			this.MapLoader()
		}
		this.worldClient.mapLoadFinishCallBack = caller
		this.worldClient.launchMap(mapName, false, true)
	}

	private OnScenario(scenarioName: string) {
		this.worldClient.launchScenario(scenarioName, false)
	}

	private OnMessage(messageData: { [id: string]: string }) {
		if (messageData.sID === undefined) return
		if (this.worldClient.users[messageData.sID] === undefined) return
		if (this.worldClient.users[messageData.sID].uID === null) return

		let from: string = this.worldClient.users[messageData.sID].uID as string
		this.worldClient.chatData.push({ from: from, message: messageData.message })

		const messageDiv = document.createElement('p')
		messageDiv.innerHTML = ''
		messageDiv.innerHTML += `<strong><ins>${from}: </ins></strong>`
		messageDiv.innerHTML += `${messageData.message}`
		this.divs.chatLogDom.appendChild(messageDiv)
	}

	private OnChangeCallBack(messageData: {
		worldId: string
		lastMapID: string
		lastScenarioID: string
		players: { sID: string; uID: string }[]
	}) {
		if (this.worldClient.player === null) return
		if (this.worldClient.worldId !== null) this.OnDisConnect(null, { description: 'keepData' })
		else this.OnDisConnect(null)
		this.worldClient.worldId = messageData.worldId
		const worldClient = this.worldClient
		this.worldClient.mapLoadFinishCallBack = () => {
			worldClient.launchScenario(messageData.lastScenarioID, false)

			setTimeout(() => {
				if (this.io !== null) this.io.emit('changeFinish', this.worldClient.worldId)
				else if (this.ws !== null) {
					if (Common.packager === Packager.JSON)
						this.ws.send(
							JSON.stringify({
								type: 'changeFinish',
								params: { sID: this.sID, worldId: this.worldClient.worldId },
							})
						)
					/* else if (Common.packager === Packager.MsgPacker)
						this.ws.send(pack({ type: "changeFinish", params: { sID: this.sID, worldId: this.worldClient.worldId } })) */
				}
			}, 1000)
			worldClient.mapLoadFinishCallBack = null
		}
		this.worldClient.launchMap(messageData.lastMapID, false, false)

		messageData.players.forEach((element) => {
			this.OnAddClient({ sID: element.sID, uID: element.uID })
		})
	}

	private OnLeaveCallBack(messageData: { worldId: string | null }) {
		this.OnDisConnect(null)
		this.worldClient.worldId = messageData.worldId
		if (this.worldClient.player !== null) {
			let player = this.worldClient.users[this.sID]
			delete this.worldClient.users[this.sID]

			this.worldClient.launchMap(Object.keys(this.worldClient.maps)[0], false, true)
			this.worldClient.users[this.sID] = player
			this.worldClient.player.addUser(this.worldClient)
		}
	}

	private ForControls(controls: { sID: string; type: ControlsTypes; data: { [id: string]: any } }) {
		if (this.isReplay) return
		if (this.worldClient.player === null) return
		controls.sID = this.worldClient.player.sID

		{
			if (this.io !== null) this.io.emit('controls', controls)
			else if (this.ws !== null) {
				if (Common.packager === Packager.JSON)
					this.ws.send(JSON.stringify({ type: 'controls', params: controls }))
				/* else if (Common.packager === Packager.MsgPacker)
					this.ws.send(pack({ type: "controls", params: controls })) */
			}
		}

		if (!this.worldClient.settings.SyncInputs) this.worldClient.player.inputManager.setControls(controls)
	}

	private ForLaunchMap(mapName: string) {
		if (this.worldClient.player === null) return
		if (this.worldClient.worldId === null) {
			this.OnMap(mapName)
			return
		}
		{
			if (this.io !== null) this.io.emit('map', mapName)
			else if (this.ws !== null) {
				if (Common.packager === Packager.JSON)
					this.ws.send(
						JSON.stringify({ type: 'map', params: { sID: this.worldClient.player.sID, map: mapName } })
					)
				/* else if (Common.packager === Packager.MsgPacker)
					this.ws.send(pack({ type: "map", params: { sID: this.worldClient.player.sID, map: mapName } })) */
			}
		}
	}

	private ForLaunchScenario(scenarioName: string) {
		if (this.worldClient.player === null) return
		if (this.worldClient.worldId === null) {
			this.OnScenario(scenarioName)
			return
		}
		{
			if (this.io !== null) this.io.emit('scenario', scenarioName)
			else if (this.ws !== null)
				if (Common.packager === Packager.JSON)
					this.ws.send(
						JSON.stringify({
							type: 'scenario',
							params: { sID: this.worldClient.player.sID, scenario: scenarioName },
						})
					)
			/* else if (Common.packager === Packager.MsgPacker)
					this.ws.send(pack({ type: "scenario", params: { sID: this.worldClient.player.sID, scenario: scenarioName } })) */
		}
	}

	private ForMessage(message: string) {
		if (this.worldClient.player === null) return
		const messageData = { sID: this.worldClient.player.sID, message: message }

		{
			if (this.io !== null) this.io.emit('message', messageData)
			else if (this.ws !== null) {
				if (Common.packager === Packager.JSON)
					this.ws.send(JSON.stringify({ type: 'message', params: messageData }))
				/* else if (Common.packager === Packager.MsgPacker)
					this.ws.send(pack({ type: "message", params: messageData })) */
			}
		}
	}

	private ForSocketLoop() {
		if (this.worldClient.player === null) return
		this.worldClient.player.timeStamp = Date.now()

		{
			if (this.io !== null) this.io.emit('update', this.worldClient.player.Out(), this.ForSocketLoopCallBack)
			else if (this.ws !== null) {
				if (Common.packager === Packager.JSON)
					this.ws.send(JSON.stringify({ type: 'update', params: this.worldClient.player.Out() }))
				/* else if (Common.packager === Packager.MsgPacker)
					this.ws.send(pack({ type: "update", params: this.worldClient.player.Out() })) */
			}
		}
	}

	private ForSocketLoopCallBack() {
		if (this.worldClient.player === null) return
		this.worldClient.player.ping = Date.now() - this.worldClient.player.timeStamp
	}
}

// if (!isElectronApp) new AppClient()

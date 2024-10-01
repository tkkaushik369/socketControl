import './css/main.css'
import { Common } from '../server/Common'
import * as THREE from 'three'
import { VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper'
import { Utility } from '../server/ts/Core/Utility'
import { io, Socket } from 'socket.io-client'
import parser from 'socket.io-msgpack-parser'
import { pack, unpack } from "msgpackr"
import { WorldClient } from './ts/World/WorldClient'
import { Player, PlayerSetMesssage } from '../server/ts/Core/Player'
import { ControlsTypes } from '../server/ts/Enums/ControlsTypes'
import { AttachModels } from './ts/Utils/AttachModels'
import { MessageTypes } from '../server/ts/Enums/MessagesTypes'
import { Communication, DataSender, Packager } from '../server/ts/Enums/Communication'

THREE.Cache.enabled = true

const pingStats = document.getElementById('pingStats') as HTMLDivElement
const controls = document.getElementById('controls') as HTMLDivElement
const controlsMain = document.getElementById('controls-main') as HTMLDivElement
const workBox = document.getElementById('work') as HTMLDivElement
// const guiPlayersDom = document.getElementById('gui-players') as HTMLDivElement
const chatInput = document.getElementById('chat-input') as HTMLFormElement
const chatDom = document.getElementById('chat-message') as HTMLInputElement
const chatLogDom = document.getElementById('chat-messages-log') as HTMLInputElement

const isElectronApp = Utility.isElectron()
const isAndroid = Utility.deviceState()

if (navigator.userAgent.includes('QtWebEngine') || isElectronApp) {
	document.body.classList.add('bodyTransparent')
	console.log('transparent')
}

if (isElectronApp) {
	workBox.classList.add('Hide')
	console.log("isElectron", isElectronApp)
}

if (isAndroid) {
	controlsMain.style.display = 'block'
	console.log("isAndroid", isAndroid)
}

export default class AppClient {

	private io: Socket | null
	private ws: WebSocket | null
	private worldClient: WorldClient
	private sID: string
	private lastUpdate: number

	constructor() {
		// bind functions
		this.OnConnect = this.OnConnect.bind(this)
		this.OnDisConnect = this.OnDisConnect.bind(this)
		this.MapLoader = this.MapLoader.bind(this)
		this.OnSetID = this.OnSetID.bind(this)
		this.OnRemoveClient = this.OnRemoveClient.bind(this)
		this.OnUpdate = this.OnUpdate.bind(this)
		this.OnControls = this.OnControls.bind(this)
		this.OnMap = this.OnMap.bind(this)
		this.OnScenario = this.OnScenario.bind(this)
		this.OnMessage = this.OnMessage.bind(this)
		this.OnChange = this.OnChange.bind(this)
		this.OnLeave = this.OnLeave.bind(this)
		this.ForControls = this.ForControls.bind(this)
		this.ForLaunchMap = this.ForLaunchMap.bind(this)
		this.ForLaunchScenario = this.ForLaunchScenario.bind(this)
		this.ForMessage = this.ForMessage.bind(this)
		this.ForSocketLoop = this.ForSocketLoop.bind(this)
		this.ForSocketLoopCallBack = this.ForSocketLoopCallBack.bind(this)

		// init
		if (Common.conn === Communication.SocketIO) {
			this.io = io({ parser: parser })
			this.ws = null
		} else if (Common.conn === Communication.WebSocket) {
			this.io = null
			if (window.location.protocol.includes('https'))
				this.ws = new WebSocket("wss://" + window.location.host, 'echo-protocol')
			else
				this.ws = new WebSocket("ws://" + window.location.host, 'echo-protocol')
		} else {
			this.io = null
			this.ws = null
		}
		this.worldClient = new WorldClient(controls, workBox, this.ForSocketLoop, this.ForLaunchMap, this.ForLaunchScenario)
		this.sID = ""
		this.lastUpdate = Date.now()

		chatInput.addEventListener('submit', (e) => {
			e.preventDefault()
			this.ForMessage(chatDom.value)
			chatDom.value = ''
		})

		if (this.io !== null) {
			this.io.on("connect", this.OnConnect)
			this.io.on("disconnect", this.OnDisConnect)
			this.io.on("setID", this.OnSetID)
			this.io.on("removeClient", this.OnRemoveClient)
			this.io.on("update", this.OnUpdate)
			this.io.on("controls", this.OnControls)
			this.io.on("map", this.OnMap)
			this.io.on("scenario", this.OnScenario)
			this.io.on("message", this.OnMessage)
		} else if (this.ws !== null) {
			const ws = this.ws
			this.ws.binaryType = "arraybuffer"
			this.ws.onopen = (event) => { this.OnConnect() }
			this.ws.onmessage = (event) => {
				let data = {} as any
				if (Common.packager === Packager.JSON)
					data = JSON.parse(event.data)
				else if (Common.packager === Packager.MsgPacker)
					data = unpack(new Uint8Array(event.data))

				switch (data.type) {
					case "setID": {
						this.OnSetID(data.params, (uID: string, sID: string, worldId: string) => {
							if (Common.packager === Packager.JSON)
								ws.send(JSON.stringify({ type: 'setIDCallBack', params: { uID: uID, sID: sID } }))
							else if (Common.packager === Packager.MsgPacker)
								ws.send(pack({ type: 'setIDCallBack', params: { uID: uID, sID: sID } }))
						})
						break
					}
					case "update": {
						this.OnUpdate(data.params)
						break
					}
					case "ForSocketLoopCallBack": {
						this.ForSocketLoopCallBack()
						if (Common.sender === DataSender.PingPong) {
							this.OnUpdate(data.params)
						}
						break
					}
					case "controls": {
						this.OnControls(data.params)
						break
					}
					case "map": {
						this.OnMap(data.params.map)
						break
					}
					case "scenario": {
						this.OnScenario(data.params.scenario)
						break
					}
					case "message": {
						this.OnMessage(data.params)
						break
					}
					case "removeClient": {
						this.OnRemoveClient(data.params.sID)
						break
					}
					case "change": {
						this.OnChange(data.params)
						break
					}
					case "leave": {
						this.OnLeave(data.params)
						break
					}
					default: {
						console.log(event.data)
						break
					}
				}
			}
			this.ws.onclose = (event) => {
				console.log("Close: ", JSON.stringify(event))
				this.OnDisConnect(this.sID)
			}
		}
	}

	private OnConnect() {
		console.log("Connected")
		this.worldClient.stats.dom.classList.remove("noPing")
		this.worldClient.stats.dom.classList.add("ping")
	}

	private OnDisConnect(str: string | null, desc?: Error | { description: string }) {
		if (str !== null) {
			console.log("Disconnect: " + str + ", Reason: " + desc)
			this.worldClient.stats.dom.classList.remove("ping")
			this.worldClient.stats.dom.classList.add("noPing")
		}

		let clearWorld = true
		if ((desc !== undefined) && !(desc instanceof Error) && (desc.description == 'keepData')) clearWorld = false

		Object.keys(this.worldClient.users).forEach((sID) => {
			if (this.worldClient.users[sID] !== undefined) {
				if ((str === null) && (this.sID !== sID)) {
					this.worldClient.users[sID].attachments.forEach(obj => {
						this.worldClient.scene.remove(obj)
					})
					this.worldClient.users[sID].removeUser(this.worldClient)
					delete this.worldClient.users[sID]
				}
			}
		})

		if (clearWorld) {
			this.worldClient.clearEntities(true)
			this.worldClient.clearScene()
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
							const texture = textureLoader.load(
								'./images/uv-test-bw.jpg',
							)
							let mat = new THREE.MeshStandardMaterial({ map: texture });
							(obj as THREE.Mesh).material = mat
							this.worldClient.scene.add(new VertexNormalsHelper(obj, 0.1, 0x00ff00))
						}
					}
				}
			}
		})
	}

	private OnSetID(message: PlayerSetMesssage, callBack: Function) {
		let caller = () => {
			const UID: string = "Player_" + message.count
			/* {
				this.worldClient.worldId = "unjoin"
				this.worldClient.settings.SyncInputs = false
			} */
			this.worldClient.player = new Player(message.sID, this.worldClient.camera, this.worldClient.renderer.domElement)
			this.worldClient.player.setUID(UID)
			this.sID = this.worldClient.player.sID

			// Initialization
			this.worldClient.player.inputManager.controlsCallBack = this.ForControls
			this.worldClient.player.cameraOperator.camera.add(AttachModels.makeCamera())
			this.worldClient.player.attachments.push(this.worldClient.player.cameraOperator.camera)
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
			if (playerPosition !== null)
				this.worldClient.player.setSpawn(playerPosition, isPlayerPositionNearVehicle)
			this.worldClient.player.addUser(this.worldClient)

			console.log(`Username: ${UID}`)
			this.worldClient.users[this.worldClient.player.sID] = this.worldClient.player

			callBack(UID, message.sID)
			this.MapLoader()

			this.worldClient.mapLoadFinishCallBack = null
		}

		caller()
	}

	private OnRemoveClient(sID: string) {
		if (this.sID === sID) return
		if (this.worldClient.users[sID] !== undefined) {
			console.log(`Removed User: ${this.worldClient.users[sID].uID}`)
			this.worldClient.users[sID].attachments.forEach(obj => {
				this.worldClient.scene.remove(obj)
			})
			this.worldClient.users[sID].removeUser(this.worldClient)
			delete this.worldClient.users[sID]
		}
	}

	private OnUpdate(messages: { [id: string]: any }) {
		pingStats.innerHTML = "Ping: " + "<br>"
		let players = 0
		let validRooms: string[] = []

		Object.keys(messages).forEach((id) => {
			if (messages[id].sID !== undefined) {
				// pingStats.innerHTML += "[" + messages[id].sID + "] "
				pingStats.innerHTML += "[" + messages[id].data.worldId + "][" + messages[id].data.isWS + "] "
				if (messages[id].sID == this.sID) {
					if (this.lastUpdate < Date.now() - 1000) {
						this.worldClient.networkStats.update(messages[id].ping, 100)
						this.lastUpdate = Date.now()
					}
					pingStats.innerHTML += "(YOU) "
				}
				pingStats.innerHTML += messages[id].uID + ": "
				pingStats.innerHTML += messages[id].ping + "<br>"
			}

			switch (messages[id].msgType) {
				case MessageTypes.World: {
					validRooms.push(messages[id].uID)
					break
				}
				case MessageTypes.Player: {
					if (messages[id].data.worldId !== null) {
						if (this.worldClient.roomCallers[messages[id].data.worldId] === undefined) {
							this.worldClient.roomCallers[messages[id].data.worldId] = {
								'join': () => {
									if (this.io !== null)
										this.io.emit('change', messages[id].data.worldId, this.OnChange)
									else if (this.ws !== null) {
										if (Common.packager === Packager.JSON)
											this.ws.send(JSON.stringify({ type: 'change', params: { sID: this.sID, worldId: messages[id].data.worldId } }))
										else if (Common.packager === Packager.MsgPacker)
											this.ws.send(pack({ type: 'change', params: { sID: this.sID, worldId: messages[id].data.worldId } }))
									}
								},
								'leave': () => {
									if (this.io !== null)
										this.io.emit('leave', messages[id].data.worldId, this.OnLeave)
									else if (this.ws !== null) {
										if (Common.packager === Packager.JSON)
											this.ws.send(JSON.stringify({ type: 'leave', params: { sID: this.sID, worldId: messages[id].data.worldId } }))
										else if (Common.packager === Packager.MsgPacker)
											this.ws.send(pack({ type: 'leave', params: { sID: this.sID, worldId: messages[id].data.worldId } }))
									}
								},
							}
							let worldFolder = this.worldClient.worldsGUIFolder.addFolder({ title: messages[id].data.worldId })
							worldFolder.addButton({ title: 'Join' }).on('click', (ev: any) => { this.worldClient.roomCallers[messages[id].data.worldId].join() })
							worldFolder.addButton({ title: 'Leave' }).on('click', (ev: any) => { this.worldClient.roomCallers[messages[id].data.worldId].leave() })
						}
						if (messages[id].data.worldId !== this.worldClient.worldId) break
					}
					players++
					if ((this.worldClient.users[id] === undefined) && (messages[id].data.worldId !== null)) {
						const player = new Player(messages[id].sID, Utility.defaultCamera(), null)
						// Initialization
						player.setUID(messages[id].uID)
						player.cameraOperator.camera.add(AttachModels.makeCamera())
						player.attachments.push(player.cameraOperator.camera)
						this.worldClient.addSceneObject(player.cameraOperator.camera)

						let playerPosition: THREE.Vector3 | null = null
						let isPlayerPositionNearVehicle: boolean = false
						this.worldClient.scenarios.forEach((scenario) => {
							if (scenario.name === this.worldClient.lastScenarioID) {
								playerPosition = scenario.playerPosition
								isPlayerPositionNearVehicle = scenario.isPlayerPositionNearVehicle
							}
						})
						if (playerPosition !== null)
							player.setSpawn(playerPosition, isPlayerPositionNearVehicle)
						player.addUser(this.worldClient)

						console.log("New User: " + player.uID)
						this.worldClient.users[player.sID] = player
					}

					if (this.worldClient.users[id] === undefined) {
						console.log("Undefined Player" + this.worldClient.users[id])
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
						if (this.worldClient.settings.SyncInputs)
							this.worldClient.users[id].Set(messages[id])
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
				case MessageTypes.Decoration: {
					this.worldClient.waters.forEach((water) => {
						if (water.uID === messages[id].uID) {
							water.Set(messages[id])
						}
					})
					break
				}
				default: {
					console.log("Unknown Message: ", messages[id])
					break
				}
			}
		})

		pingStats.innerHTML += "<br><b>Players: " + players + "</b>"
		pingStats.innerHTML += "<br><b>Current World: " + this.worldClient.worldId + "</b>"

		let toRemoveRooms: string[] = []
		if (validRooms.length > 0) {
			Object.keys(this.worldClient.roomCallers).forEach((wid) => {
				if (!validRooms.includes(wid)) {
					toRemoveRooms.push(wid)
				}
			})
		}

		if (toRemoveRooms.length > 0) {
			let wid = toRemoveRooms.pop()
			if (wid !== undefined) {
				for (let i = 0; i < this.worldClient.worldsGUIFolder.children.length; i++) {
					const firstChild = this.worldClient.worldsGUIFolder.children[i].element.firstChild
					if (firstChild !== null) {
						const name = firstChild.textContent
						if ((name !== null) && name.includes(wid)) {
							this.worldClient.worldsGUIFolder.children[i].dispose()
							break
						}
					}
				}
				delete this.worldClient.roomCallers[wid]
			}
		}

		this.worldClient.worldsGUIFolder.children.forEach((gvr) => {
			const firstChild = gvr.element.firstChild
			if ((firstChild !== null) && (firstChild.textContent !== null)) {
				let inx = validRooms.indexOf(firstChild.textContent)
				if (inx != -1) {
					validRooms.splice(inx, 1);
				}
			}
		})

		while (validRooms.length > 0) {
			let wid = validRooms.pop()
			if (wid !== undefined) {
				this.worldClient.roomCallers[wid] = {
					'join': () => {
						if (this.io !== null)
							this.io.emit('change', wid, this.OnChange)
						else if (this.ws !== null) {
							if (Common.packager === Packager.JSON)
								this.ws.send(JSON.stringify({ type: 'change', params: { sID: this.sID, worldId: wid } }))
							else if (Common.packager === Packager.MsgPacker)
								this.ws.send(pack({ type: 'change', params: { sID: this.sID, worldId: wid } }))
						}
					},
					'leave': () => {
						if (this.io !== null)
							this.io.emit('leave', wid, this.OnLeave)
						else if (this.ws !== null) {
							if (Common.packager === Packager.JSON)
								this.ws.send(JSON.stringify({ type: 'leave', params: { sID: this.sID, worldId: wid } }))
							else if (Common.packager === Packager.MsgPacker)
								this.ws.send(pack({ type: 'leave', params: { sID: this.sID, worldId: wid } }))
						}
					}
				}
				let worldFolder = this.worldClient.worldsGUIFolder.addFolder({ title: wid })
				worldFolder.addButton({ title: 'Join' }).on('click', (ev: any) => { this.worldClient.roomCallers[wid].join() })
				worldFolder.addButton({ title: 'Leave' }).on('click', (ev: any) => { this.worldClient.roomCallers[wid].leave() })
			}
		}
	}

	private OnControls(controls: { sID: string, type: ControlsTypes, data: { [id: string]: any } }) {
		if ((controls.sID === this.sID) && !this.worldClient.settings.SyncInputs) return
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

		console.log(messageData.sID, messageData.message)
		const messageDiv = document.createElement('p')
		messageDiv.innerHTML = ''
		messageDiv.innerHTML += `<strong><ins>${from}: </ins></strong>`
		messageDiv.innerHTML += `${messageData.message}`
		chatLogDom.appendChild(messageDiv)
	}

	private OnChange(messageData: { worldId: string, lastMapID: string, lastScenarioID: string }) {
		if (this.worldClient.player !== null) {
			this.OnDisConnect(null, { description: 'keepData' })
			this.worldClient.worldId = messageData.worldId
			const worldClient = this.worldClient
			this.worldClient.mapLoadFinishCallBack = () => {
				worldClient.launchScenario(messageData.lastScenarioID, false)
				worldClient.mapLoadFinishCallBack = null
			}
			this.worldClient.launchMap(messageData.lastMapID, false, false)
		}
	}

	private OnLeave(messageData: { worldId: string }) {
		this.OnDisConnect(null)
		this.worldClient.worldId = messageData.worldId
	}

	private ForControls(controls: { sID: string, type: ControlsTypes, data: { [id: string]: any } }) {
		if (this.worldClient.player === null) return
		controls.sID = this.worldClient.player.sID

		{
			if (this.io !== null)
				this.io.emit("controls", controls)
			else if (this.ws !== null) {
				if (Common.packager === Packager.JSON)
					this.ws.send(JSON.stringify({ type: "controls", params: controls }))
				else if (Common.packager === Packager.MsgPacker)
					this.ws.send(pack({ type: "controls", params: controls }))
			}
		}

		if (!this.worldClient.settings.SyncInputs)
			this.worldClient.player.inputManager.setControls(controls)
	}

	private ForLaunchMap(mapName: string) {
		if (this.worldClient.player === null) return

		{
			if (this.io !== null)
				this.io.emit("map", mapName)
			else if (this.ws !== null) {
				if (Common.packager === Packager.JSON)
					this.ws.send(JSON.stringify({ type: "map", params: { sID: this.worldClient.player.sID, map: mapName } }))
				else if (Common.packager === Packager.MsgPacker)
					this.ws.send(pack({ type: "map", params: { sID: this.worldClient.player.sID, map: mapName } }))
			}
		}
	}

	private ForLaunchScenario(scenarioName: string) {
		if (this.worldClient.player === null) return

		{
			if (this.io !== null)
				this.io.emit("scenario", scenarioName)
			else if (this.ws !== null)
				if (Common.packager === Packager.JSON)
					this.ws.send(JSON.stringify({ type: "scenario", params: { sID: this.worldClient.player.sID, scenario: scenarioName } }))
				else if (Common.packager === Packager.MsgPacker)
					this.ws.send(pack({ type: "scenario", params: { sID: this.worldClient.player.sID, scenario: scenarioName } }))
		}
	}

	private ForMessage(message: string) {
		if (this.worldClient.player === null) return
		const messageData = { sID: this.worldClient.player.sID, message: message }

		{
			if (this.io !== null)
				this.io.emit("message", messageData)
			else if (this.ws !== null) {
				if (Common.packager === Packager.JSON)
					this.ws.send(JSON.stringify({ type: "message", params: messageData }))
				else if (Common.packager === Packager.MsgPacker)
					this.ws.send(pack({ type: "message", params: messageData }))
			}
		}
	}

	private ForSocketLoop() {
		if (this.worldClient.player === null) return
		this.worldClient.player.timeStamp = Date.now()

		{
			if (this.io !== null)
				this.io.emit("update", this.worldClient.player.Out(), this.ForSocketLoopCallBack)
			else if (this.ws !== null) {
				if (Common.packager === Packager.JSON)
					this.ws.send(JSON.stringify({ type: "update", params: this.worldClient.player.Out() }))
				else if (Common.packager === Packager.MsgPacker)
					this.ws.send(pack({ type: "update", params: this.worldClient.player.Out() }))
			}
		}
	}


	private ForSocketLoopCallBack() {
		if (this.worldClient.player === null) return
		this.worldClient.player.ping = Date.now() - this.worldClient.player.timeStamp
	}
}

new AppClient()
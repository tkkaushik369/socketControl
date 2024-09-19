import './css/main.css'
import * as THREE from 'three'
import { VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper'
import { Utility } from '../server/ts/Core/Utility'
import { io, Socket } from 'socket.io-client'
import parser from 'socket.io-msgpack-parser'
import { WorldClient } from './ts/World/WorldClient'
import { Player, PlayerSetMesssage } from '../server/ts/Core/Player'
import { ControlsTypes } from '../server/ts/Enums/ControlsTypes'
import { AttachModels } from './ts/Utils/AttachModels'
import _ from 'lodash'

THREE.Cache.enabled = true

const pingStats = document.getElementById('pingStats') as HTMLDivElement
const controls = document.getElementById('controls') as HTMLDivElement
const controlsMain = document.getElementById('controls-main') as HTMLDivElement
const workBox = document.getElementById('work') as HTMLDivElement

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

	private io: Socket
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
		this.OnWorlds = this.OnWorlds.bind(this)
		this.OnPlayers = this.OnPlayers.bind(this)
		this.OnCharactors = this.OnCharactors.bind(this)
		this.OnVehicles = this.OnVehicles.bind(this)
		this.OnDecorations = this.OnDecorations.bind(this)
		this.OnControls = this.OnControls.bind(this)
		this.OnMap = this.OnMap.bind(this)
		this.OnScenario = this.OnScenario.bind(this)
		this.ForControls = this.ForControls.bind(this)
		this.ForLaunchMap = this.ForLaunchMap.bind(this)
		this.ForLaunchScenario = this.ForLaunchScenario.bind(this)
		this.ForSocketLoop = this.ForSocketLoop.bind(this)

		// init
		this.io = io({ parser: parser })
		this.worldClient = new WorldClient(controls, workBox, this.ForSocketLoop, this.ForLaunchMap, this.ForLaunchScenario)
		this.sID = ""
		this.lastUpdate = Date.now()

		// socket
		this.io.on("connect", this.OnConnect);
		this.io.on("disconnect", this.OnDisConnect);
		this.io.on("setID", this.OnSetID);
		this.io.on("removeClient", this.OnRemoveClient);

		this.io.on("worlds", this.OnWorlds);
		this.io.on("players", this.OnPlayers);
		this.io.on("characters", this.OnCharactors);
		this.io.on("vehicles", this.OnVehicles);
		this.io.on("decorations", this.OnDecorations);

		this.io.on("controls", this.OnControls);
		this.io.on("map", this.OnMap);
		this.io.on("scenario", this.OnScenario);
	}

	private OnConnect() {
		console.log("Connected")
		this.worldClient.stats.dom.classList.remove("noPing")
		this.worldClient.stats.dom.classList.add("ping")
	}

	private OnDisConnect(str: string) {
		console.log("Disconnect: " + str)
		this.worldClient.stats.dom.classList.remove("ping")
		this.worldClient.stats.dom.classList.add("noPing")
		Object.keys(this.worldClient.users).forEach((sID) => {
			if (this.worldClient.users[sID] !== undefined) {
				this.worldClient.users[sID].attachments.forEach(obj => {
					this.worldClient.scene.remove(obj)
				});
				this.worldClient.users[sID].removeUser()
				delete this.worldClient.users[sID]
			}
		})
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
						obj.visible = true;
						if (false) {
							const textureLoader = new THREE.TextureLoader();
							const texture = textureLoader.load(
								'./images/uv-test-bw.jpg',
							);
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
			this.worldClient.worldId = message.worldId
			this.worldClient.launchScenario(message.lastScenarioID, false)
			this.worldClient.player = new Player(message.sID, this.worldClient, this.worldClient.camera, this.worldClient.renderer.domElement)
			this.worldClient.player.setUID(UID)
			this.sID = this.worldClient.player.sID

			// Initialization
			this.worldClient.player.inputManager.controlsCallBack = this.ForControls
			this.worldClient.player.cameraOperator.camera.add(AttachModels.makeCamera())
			this.worldClient.player.attachments.push(this.worldClient.player.cameraOperator.camera)
			this.worldClient.player.cameraOperator.camera.visible = false
			this.worldClient.addSceneObject(this.worldClient.player.cameraOperator.camera)
			this.worldClient.player.addUser()

			console.log(`Username: ${UID}`)
			this.worldClient.users[this.worldClient.player.sID] = this.worldClient.player

			callBack(UID)
			this.MapLoader()

			this.worldClient.mapLoadFinishCallBack = null
		}

		this.worldClient.mapLoadFinishCallBack = caller;
		this.worldClient.launchMap(message.lastMapID, false, false)
	}

	private OnRemoveClient(sID: string) {
		if (this.sID === sID) return
		if (this.worldClient.users[sID] !== undefined) {
			console.log(`Removed User: ${this.worldClient.users[sID].uID}`)
			this.worldClient.users[sID].attachments.forEach(obj => {
				this.worldClient.scene.remove(obj)
			});
			this.worldClient.users[sID].removeUser()
			delete this.worldClient.users[sID]
		}
	}

	private OnWorlds(messages: { [id: string]: any }) {
		let validRooms: string[] = []
		Object.keys(messages).forEach((id) => {
			validRooms.push(messages[id].uID)
		})

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
					if ((this.worldClient.worldsGUIFolder.children[i] as any).property.includes(wid)) {
						(this.worldClient.worldsGUIFolder.children[i] as any).destroy()
						break
					}
				}
				delete this.worldClient.roomCallers[wid]
			}
		}
	}

	private OnPlayers(messages: { [id: string]: any }) {
		pingStats.innerHTML = "Ping: " + "<br>"
		let players = 0

		Object.keys(messages).forEach((id) => {

			// pingStats.innerHTML += "[" + messages[id].sID + "] "
			pingStats.innerHTML += "[" + messages[id].data.worldId + "] "
			if (messages[id].sID == this.sID) {
				if (this.lastUpdate < Date.now() - 1000) {
					this.worldClient.networkStats.update(messages[id].ping, 100)
					this.lastUpdate = Date.now()
				}
				pingStats.innerHTML += "(YOU) "
			}
			pingStats.innerHTML += messages[id].uID + ": "
			pingStats.innerHTML += messages[id].ping + "<br>"

			if (messages[id].data.worldId !== null) {
				if (this.worldClient.roomCallers[messages[id].data.worldId] === undefined) {
					this.worldClient.roomCallers[messages[id].data.worldId] = () => {
						this.io.emit('change', messages[id].data.worldId, (worldId: string, lastMapID: string, lastScenarioID: string) => {
							if (this.worldClient.player !== null) {
								this.worldClient.worldId = worldId
								const worldClient = this.worldClient
								this.worldClient.mapLoadFinishCallBack = () => {
									worldClient.launchScenario(lastScenarioID, false)
									worldClient.mapLoadFinishCallBack = null
								}
								this.worldClient.launchMap(lastMapID, false, false)
							}
						})
					}
					this.worldClient.worldsGUIFolder.add(this.worldClient.roomCallers, messages[id].data.worldId)
				}
			}
			if (messages[id].data.worldId === this.worldClient.worldId) {
				players++
				if (this.worldClient.users[id] === undefined) {
					const player = new Player(messages[id].sID, this.worldClient, Utility.defaultCamera(), null)
					// Initialization
					player.setUID(messages[id].uID)
					player.cameraOperator.camera.add(AttachModels.makeCamera())
					player.attachments.push(player.cameraOperator.camera)
					this.worldClient.addSceneObject(player.cameraOperator.camera)
					player.addUser()

					console.log("New User: " + player.uID)
					this.worldClient.users[player.sID] = player
				}

				if (this.worldClient.users[id] === undefined) {
					console.log("Undefined Player" + this.worldClient.users[id])
				} else {

					if (this.sID === messages[id].sID) {
						// World Time Scale
						this.worldClient.timeScaleTarget = messages[id].data.timeScaleTarget

						if (this.worldClient.settings.SyncSun) {
							this.worldClient.effectController.elevation = messages[id].data.sun.elevation
							this.worldClient.effectController.azimuth = messages[id].data.sun.azimuth
							this.worldClient.sunConf.elevation = this.worldClient.effectController.elevation
							this.worldClient.sunConf.azimuth = this.worldClient.effectController.azimuth
							this.worldClient.sunGuiChanged()
							// console.log(JSON.stringify(messages[id].data.sun))
						}
					}

					if ((this.sID !== messages[id].sID) || this.worldClient.settings.SyncCamera)
						this.worldClient.users[id].Set(messages[id])
				}
			}
		})

		pingStats.innerHTML += "<br><b>Players: " + players + "</b>"
		pingStats.innerHTML += "<br><b>Current World: " + this.worldClient.worldId + "</b>"
	}

	private OnCharactors(messages: { [id: string]: any }) {
		Object.keys(messages).forEach((id) => {
			this.worldClient.characters.forEach((char) => { if (char.uID === messages[id].uID) char.Set(messages[id]) })
		})
	}

	private OnVehicles(messages: { [id: string]: any }) {
		Object.keys(messages).forEach((id) => {
			this.worldClient.vehicles.forEach((vehi) => { if (vehi.uID === messages[id].uID) vehi.Set(messages[id]) })
		})
	}

	private OnDecorations(messages: { [id: string]: any }) {
		Object.keys(messages).forEach((id) => {
			this.worldClient.waters.forEach((water) => {
				if (water.uID === messages[id].uID) {
					water.Set(messages[id])
				}
			})
		})
	}

	private OnControls(controls: { sID: string, type: ControlsTypes, data: { [id: string]: any } }) {
		if ((controls.sID === this.sID) && this.worldClient.settings.SyncInputs) return
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

	private ForControls(controls: { type: ControlsTypes, data: { [id: string]: any } }) {
		if (this.worldClient.player !== null) {
			this.io.emit("controls", controls)
			if (this.worldClient.settings.SyncInputs)
				this.worldClient.player.inputManager.setControls(controls)
		}
	}

	private ForLaunchMap(mapName: string) {
		if (this.worldClient.player !== null) this.io.emit("map", mapName)
	}

	private ForLaunchScenario(scenarioName: string) {
		if (this.worldClient.player !== null) this.io.emit("scenario", scenarioName)
	}

	private ForSocketLoop() {
		if (this.worldClient.player !== null) {
			this.worldClient.player.timeStamp = Date.now()

			const player = this.worldClient.player
			this.io.emit("update", this.worldClient.player.Out(), () => {
				player.ping = Date.now() - player.timeStamp
			})
		}
	}
}

new AppClient();
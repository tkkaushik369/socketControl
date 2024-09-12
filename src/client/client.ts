import './css/main.css'
import * as THREE from 'three'
import { LDrawLoader } from 'three/examples/jsm/loaders/LDrawLoader'
import { VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper'
import { Utility } from '../server/ts/Core/Utility'
import { io, Socket } from 'socket.io-client'
import parser from 'socket.io-msgpack-parser'
import { WorldClient } from './ts/World/WorldClient'
import { Player } from '../server/ts/Core/Player'
import { ControlsTypes } from '../server/ts/Enums/ControlsTypes'
import { MessageTypes } from '../server/ts/Enums/MessagesTypes'
import { AttachModels } from './ts/Utils/AttachModels'
import { EntityType } from '../server/ts/Enums/EntityType'
import { VehicleSeat } from '../server/ts/Vehicles/VehicleSeat'
import { Car } from '../server/ts/Vehicles/Car'
import { Helicopter } from '../server/ts/Vehicles/Helicopter'
import { Airplane } from '../server/ts/Vehicles/Airplane'
import * as CharState from '../server/ts/Characters/CharacterStates/_CharacterStateLibrary'
import * as VehicalState from '../server/ts/Characters/CharacterStates/Vehicles/_VehicleStateLibrary'
import _ from 'lodash'
import { PlayerCaller } from './ts/World/PlayerCaller'

if (navigator.userAgent.includes('QtWebEngine')) {
	document.body.classList.add('bodyTransparent')
	console.log('transparent')
}

const pingStats = document.getElementById('pingStats') as HTMLDivElement
const controls = document.getElementById('controls') as HTMLDivElement
const workBox = document.getElementById('work') as HTMLDivElement

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
		this.OnPlayers = this.OnPlayers.bind(this)
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
		this.io.on("players", this.OnPlayers);
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
							// this.worldClient.scene.add(new VertexNormalsHelper(obj, 0.1, 0x00ff00))
						}
					}
				}
			}
		})
	}

	private OnSetID(message: any, callBack: Function) {
		let caller = () => {
			this.worldClient.launchScenario(message.lastScenarioID, false)
			this.worldClient.player = new Player(message.sID, this.worldClient, this.worldClient.camera, this.worldClient.renderer.domElement)
			this.worldClient.player.setUID("Player_" + message.count)
			this.sID = this.worldClient.player.sID

			// Initialization
			this.worldClient.player.inputManager.controlsCallBack = this.ForControls
			this.worldClient.player.cameraOperator.camera.add(AttachModels.makeCamera())
			this.worldClient.player.attachments.push(this.worldClient.player.cameraOperator.camera)
			this.worldClient.player.cameraOperator.camera.visible = false
			this.worldClient.addSceneObject(this.worldClient.player.cameraOperator.camera)
			this.worldClient.player.addUser()

			console.log(`Username: ${this.worldClient.player.uID}`)
			this.worldClient.users[this.worldClient.player.sID] = this.worldClient.player

			callBack(this.worldClient.player.uID)
			this.MapLoader()
		}

		this.worldClient.mapLoadFinishCallBack = caller;
		this.worldClient.launchMap(message.lastMapID, false, false)
	}

	private OnRemoveClient(sID: string) {
		if (this.worldClient.users[sID] !== undefined) {
			console.log(`Removed User: ${this.worldClient.users[sID].uID}`)
			this.worldClient.users[sID].attachments.forEach(obj => {
				this.worldClient.scene.remove(obj)
			});
			this.worldClient.users[sID].removeUser()
			delete this.worldClient.users[sID]
		}
	}

	private OnPlayers(messages: { [id: string]: any }) {
		pingStats.innerHTML = "Ping: " + "<br>"
		this.worldClient.players.forEach((pc) => { pc.flag = false })
		Object.keys(messages).forEach((id) => {
			if (messages[id].sID !== undefined) {
				let i = 0
				let notFound = true
				let playerCaller: PlayerCaller | null = null
				for (i = 0; i < this.worldClient.players.length; i++) {
					if (this.worldClient.players[i].userName === messages[id].uID) {
						notFound = false
						playerCaller = this.worldClient.players[i]
						break
					}
				}
				if (notFound) {
					this.worldClient.players.push(new PlayerCaller(messages[id].uID))
					// this.worldClient.playersGUIFolder
					playerCaller = this.worldClient.players[i]
				}

				if (playerCaller !== null) {
					// playerCaller
				}

				pingStats.innerHTML += messages[id].msgType + ": "
				pingStats.innerHTML += "[" + messages[id].sID + "] "
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
				case MessageTypes.Player:
				case MessageTypes.PlayerAll:
					{
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
							break
						}

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

						if ((this.sID !== messages[id].sID) || this.worldClient.settings.SyncCamera) {
							this.worldClient.users[id].cameraOperator.camera.position.set(
								messages[id].data.cameraPosition.x,
								messages[id].data.cameraPosition.y,
								messages[id].data.cameraPosition.z,
							)
							this.worldClient.users[id].cameraOperator.camera.quaternion.set(
								messages[id].data.cameraQuaternion.x,
								messages[id].data.cameraQuaternion.y,
								messages[id].data.cameraQuaternion.z,
								messages[id].data.cameraQuaternion.w,
							)
						}
						break
					}
				case MessageTypes.Character: {
					this.worldClient.characters.forEach((char) => {
						if (char.uID === messages[id].uID) {
							this.worldClient.zeroBody(char.characterCapsule.body)
							char.characterCapsule.body.position.set(
								messages[id].data.characterPosition.x,
								messages[id].data.characterPosition.y,
								messages[id].data.characterPosition.z,
							)
							char.characterCapsule.body.interpolatedPosition.set(
								messages[id].data.characterPosition.x,
								messages[id].data.characterPosition.y,
								messages[id].data.characterPosition.z,
							)
							char.position.set(
								messages[id].data.characterPosition.x,
								messages[id].data.characterPosition.y,
								messages[id].data.characterPosition.z,
							)
							char.quaternion.set(
								messages[id].data.characterQuaternion.x,
								messages[id].data.characterQuaternion.y,
								messages[id].data.characterQuaternion.z,
								messages[id].data.characterQuaternion.w,
							)

							if ((messages[id].data.AiData.character !== null) && (char.behaviour !== null)) {
								char.triggerAction(messages[id].data.AiData.character.action, messages[id].data.AiData.character.isPressed)
								if ((messages[id].data.AiData.character !== null) && (char.controlledObject !== null))
									char.controlledObject.triggerAction(messages[id].data.AiData.controlledObject.action, messages[id].data.AiData.controlledObject.isPressed)
							}

							/* if(char.player !== null)
								console.log(char.charState.state, messages[id].data.charState) */

							if (char.charState.state !== messages[id].data.charState) {
								let isError = null
								// CharacterStates
								if (false) char
								else if ("DropIdle" === messages[id].data.charState) char.setState(new CharState.DropIdle(char), false)
								else if ("DropRolling" === messages[id].data.charState) char.setState(new CharState.DropRolling(char), false)
								else if ("DropRunning" === messages[id].data.charState) char.setState(new CharState.DropRunning(char), false)
								else if ("EndWalk" === messages[id].data.charState) char.setState(new CharState.EndWalk(char), false)
								else if ("Falling" === messages[id].data.charState) char.setState(new CharState.Falling(char), false)
								else if ("Idle" === messages[id].data.charState) char.setState(new CharState.Idle(char), false)
								else if ("IdleRotateLeft" === messages[id].data.charState) char.setState(new CharState.IdleRotateLeft(char), false)
								else if ("IdleRotateRight" === messages[id].data.charState) char.setState(new CharState.IdleRotateRight(char), false)
								else if ("JumpIdle" === messages[id].data.charState) char.setState(new CharState.JumpIdle(char), false)
								else if ("JumpRunning" === messages[id].data.charState) char.setState(new CharState.JumpRunning(char), false)
								else if ("Sprint" === messages[id].data.charState) char.setState(new CharState.Sprint(char), false)
								else if ("StartWalkBackLeft" === messages[id].data.charState) char.setState(new CharState.StartWalkBackLeft(char), false)
								else if ("StartWalkBackRight" === messages[id].data.charState) char.setState(new CharState.StartWalkBackRight(char), false)
								else if ("StartWalkForward" === messages[id].data.charState) char.setState(new CharState.StartWalkForward(char), false)
								else if ("StartWalkLeft" === messages[id].data.charState) char.setState(new CharState.StartWalkLeft(char), false)
								else if ("StartWalkRight" === messages[id].data.charState) char.setState(new CharState.StartWalkRight(char), false)
								else if ("Walk" === messages[id].data.charState) char.setState(new CharState.Walk(char), false)
								// VehicalStates
								else if ("CloseVehicleDoorInside" === messages[id].data.charState) {
									let seat: VehicleSeat | null = null
									let vehi = Utility.getVehical(this.worldClient, messages[id].data.vehicalState.vehical)
									if (vehi !== null) {
										let vehiSeat = Utility.getSeat(vehi, messages[id].data.vehicalState.seat)
										seat = vehiSeat
									}
									if (seat !== null) {
										char.setState(new VehicalState.CloseVehicleDoorInside(char, seat), false)
									} else {
										isError = "CloseVehicleDoorInside Failed"
									}
								} else if ("CloseVehicleDoorOutside" === messages[id].data.charState) {
									let seat: VehicleSeat | null = null
									let vehi = Utility.getVehical(this.worldClient, messages[id].data.vehicalState.vehical)
									if (vehi !== null) {
										let vehiSeat = Utility.getSeat(vehi, messages[id].data.vehicalState.seat)
										seat = vehiSeat
									}
									if (seat !== null) {
										char.setState(new VehicalState.CloseVehicleDoorOutside(char, seat), false)
									} else {
										isError = "CloseVehicleDoorOutside Failed"
									}
								} else if ("Driving" === messages[id].data.charState) {
									let seat: VehicleSeat | null = null
									let vehi = Utility.getVehical(this.worldClient, messages[id].data.vehicalState.vehical)
									if (vehi !== null) {
										let vehiSeat = Utility.getSeat(vehi, messages[id].data.vehicalState.seat)
										seat = vehiSeat
									}
									if (seat !== null) {
										char.setState(new VehicalState.Driving(char, seat), false)
									} else {
										isError = "Driving Failed"
									}
								} else if ("EnteringVehicle" === messages[id].data.charState) {
									let seat: VehicleSeat | null = null
									let entryPoint: THREE.Object3D | null = null
									let vehi = Utility.getVehical(this.worldClient, messages[id].data.vehicalState.vehical)
									if (vehi !== null) {
										let vehiSeat = Utility.getSeat(vehi, messages[id].data.vehicalState.seat)
										if (vehiSeat !== null) {
											let ep = Utility.getEntryPoint(vehiSeat, messages[id].data.vehicalState.entryPoint)
											seat = vehiSeat
											entryPoint = ep
										}
									}
									if ((seat !== null) && (entryPoint !== null)) {
										char.setState(new VehicalState.EnteringVehicle(char, seat, entryPoint), false)
									} else {
										isError = "EnteringVehicle Failed"
									}
								} else if ("ExitingAirplane" === messages[id].data.charState) {
									let seat: VehicleSeat | null = null
									let vehi = Utility.getVehical(this.worldClient, messages[id].data.vehicalState.vehical)
									if (vehi !== null) {
										let vehiSeat = Utility.getSeat(vehi, messages[id].data.vehicalState.seat)
										seat = vehiSeat
									}
									if (seat !== null) {
										char.setState(new VehicalState.ExitingAirplane(char, seat), false)
									} else {
										isError = "ExitingAirplane Failed"
									}
								} else if ("ExitingVehicle" === messages[id].data.charState) {
									let seat: VehicleSeat | null = null
									let vehi = Utility.getVehical(this.worldClient, messages[id].data.vehicalState.vehical)
									if (vehi !== null) {
										let vehiSeat = Utility.getSeat(vehi, messages[id].data.vehicalState.seat)
										seat = vehiSeat
									}
									if (seat !== null) {
										char.setState(new VehicalState.ExitingVehicle(char, seat), false)
									} else {
										isError = "ExitingVehicle Failed"
									}
								} else if ("OpenVehicleDoor" === messages[id].data.charState) {
									let seat: VehicleSeat | null = null
									let entryPoint: THREE.Object3D | null = null
									let vehi = Utility.getVehical(this.worldClient, messages[id].data.vehicalState.vehical)
									if (vehi !== null) {
										let vehiSeat = Utility.getSeat(vehi, messages[id].data.vehicalState.seat)
										if (vehiSeat !== null) {
											let ep = Utility.getEntryPoint(vehiSeat, messages[id].data.vehicalState.entryPoint)
											seat = vehiSeat
											entryPoint = ep
										}
									}
									if ((seat !== null) && (entryPoint !== null)) {
										char.setState(new VehicalState.OpenVehicleDoor(char, seat, entryPoint), false)
									} else {
										isError = "OpenVehicleDoor Failed"
									}
								} else if ("Sitting" === messages[id].data.charState) {
									let seat: VehicleSeat | null = null
									let vehi = Utility.getVehical(this.worldClient, messages[id].data.vehicalState.vehical)
									if (vehi !== null) {
										let vehiSeat = Utility.getSeat(vehi, messages[id].data.vehicalState.seat)
										seat = vehiSeat
									}
									if (seat !== null) {
										char.setState(new VehicalState.Sitting(char, seat), false)
									} else {
										isError = "Sitting Failed"
									}
								} else if ("SwitchingSeats" === messages[id].data.charState) {
									let fromSeat: VehicleSeat | null = null
									let toSeat: VehicleSeat | null = null
									let vehi = Utility.getVehical(this.worldClient, messages[id].data.vehicalState.vehical)
									if (vehi !== null) {
										fromSeat = Utility.getSeat(vehi, messages[id].data.vehicalState.fromSeat)
										toSeat = Utility.getSeat(vehi, messages[id].data.vehicalState.toSeat)
									}
									if ((fromSeat !== null) && (toSeat !== null)) {
										char.setState(new VehicalState.SwitchingSeats(char, fromSeat, toSeat), false)
									} else {
										isError = "SwitchingSeats Failed"
									}
								}
								else {
									isError = "Unknown State: " + messages[id].data.charState
								}
								if (isError === null)
									char.charState.onInputChange()
								else console.log(isError)
							}
						}
					})
					break
				}
				case MessageTypes.Vehical: {
					this.worldClient.vehicles.forEach((vehi) => {
						if (vehi.uID === messages[id].uID) {
							this.worldClient.zeroBody(vehi.collision)
							vehi.collision.position.set(
								messages[id].data.vehiclePosition.x,
								messages[id].data.vehiclePosition.y,
								messages[id].data.vehiclePosition.z,
							)
							vehi.collision.quaternion.set(
								messages[id].data.vehicleQuaternion.x,
								messages[id].data.vehicleQuaternion.y,
								messages[id].data.vehicleQuaternion.z,
								messages[id].data.vehicleQuaternion.w,
							)
							vehi.collision.interpolatedPosition.set(
								messages[id].data.vehiclePosition.x,
								messages[id].data.vehiclePosition.y,
								messages[id].data.vehiclePosition.z,
							)
							vehi.collision.interpolatedQuaternion.set(
								messages[id].data.vehicleQuaternion.x,
								messages[id].data.vehicleQuaternion.y,
								messages[id].data.vehicleQuaternion.z,
								messages[id].data.vehicleQuaternion.w,
							)
							vehi.position.set(
								messages[id].data.vehiclePosition.x,
								messages[id].data.vehiclePosition.y,
								messages[id].data.vehiclePosition.z,
							)
							vehi.quaternion.set(
								messages[id].data.vehicleQuaternion.x,
								messages[id].data.vehicleQuaternion.y,
								messages[id].data.vehicleQuaternion.z,
								messages[id].data.vehicleQuaternion.w,
							)

							switch (messages[id].data.entity) {
								case EntityType.Airplane: {
									for (let i = 0; i < messages[id].data.wheels.length; i++) {
										vehi.wheels[i].wheelObject.position.set(
											messages[id].data.wheels[i].position.x,
											messages[id].data.wheels[i].position.y,
											messages[id].data.wheels[i].position.z,
										)
										vehi.wheels[i].wheelObject.quaternion.set(
											messages[id].data.wheels[i].quaternion.x,
											messages[id].data.wheels[i].quaternion.y,
											messages[id].data.wheels[i].quaternion.z,
											messages[id].data.wheels[i].quaternion.w,
										)
									}
									if ((vehi as Airplane).rotor) {
										(vehi as Airplane).rotor!.quaternion.set(
											messages[id].data.rotor.quaternion.x,
											messages[id].data.rotor.quaternion.y,
											messages[id].data.rotor.quaternion.z,
											messages[id].data.rotor.quaternion.w,
										)
									}
									if ((vehi as Airplane).leftAileron) {
										(vehi as Airplane).leftAileron!.quaternion.set(
											messages[id].data.leftaileron.quaternion.x,
											messages[id].data.leftaileron.quaternion.y,
											messages[id].data.leftaileron.quaternion.z,
											messages[id].data.leftaileron.quaternion.w,
										)
									}
									if ((vehi as Airplane).rightAileron) {
										(vehi as Airplane).rightAileron!.quaternion.set(
											messages[id].data.rightaileron.quaternion.x,
											messages[id].data.rightaileron.quaternion.y,
											messages[id].data.rightaileron.quaternion.z,
											messages[id].data.rightaileron.quaternion.w,
										)
									}
									if ((vehi as Airplane).rudder) {
										(vehi as Airplane).rudder!.quaternion.set(
											messages[id].data.rudder.quaternion.x,
											messages[id].data.rudder.quaternion.y,
											messages[id].data.rudder.quaternion.z,
											messages[id].data.rudder.quaternion.w,
										)
									}
									for (let i = 0; i < messages[id].data.elevators.length; i++) {
										(vehi as Airplane).elevators[i].quaternion.set(
											messages[id].data.elevators[i].quaternion.x,
											messages[id].data.elevators[i].quaternion.y,
											messages[id].data.elevators[i].quaternion.z,
											messages[id].data.elevators[i].quaternion.w,
										)
									}
									break
								}
								case EntityType.Car: {
									for (let i = 0; i < messages[id].data.wheels.length; i++) {
										vehi.wheels[i].wheelObject.position.set(
											messages[id].data.wheels[i].position.x,
											messages[id].data.wheels[i].position.y,
											messages[id].data.wheels[i].position.z,
										)
										vehi.wheels[i].wheelObject.quaternion.set(
											messages[id].data.wheels[i].quaternion.x,
											messages[id].data.wheels[i].quaternion.y,
											messages[id].data.wheels[i].quaternion.z,
											messages[id].data.wheels[i].quaternion.w,
										)
									}
									for (let i = 0; i < messages[id].data.doors.length; i++) {
										if (vehi.seats[i].door !== null) {
											if (vehi.seats[i].door!.doorObject !== null) {
												vehi.seats[i].door!.doorObject.position.set(
													messages[id].data.doors[i].position.x,
													messages[id].data.doors[i].position.y,
													messages[id].data.doors[i].position.z,
												)
												vehi.seats[i].door!.doorObject.quaternion.set(
													messages[id].data.doors[i].quaternion.x,
													messages[id].data.doors[i].quaternion.y,
													messages[id].data.doors[i].quaternion.z,
													messages[id].data.doors[i].quaternion.w,
												)
											}
										}
									}
									if ((vehi as Car).steeringWheel !== null) {
										(vehi as Car).steeringWheel!.quaternion.set(
											messages[id].data.steeringWheel.quaternion.x,
											messages[id].data.steeringWheel.quaternion.y,
											messages[id].data.steeringWheel.quaternion.z,
											messages[id].data.steeringWheel.quaternion.w,
										)
									}
									break
								}
								case EntityType.Helicopter: {
									for (let i = 0; i < messages[id].data.doors.length; i++) {
										if (vehi.seats[i].door !== null) {
											if (vehi.seats[i].door!.doorObject !== null) {
												vehi.seats[i].door!.doorObject.position.set(
													messages[id].data.doors[i].position.x,
													messages[id].data.doors[i].position.y,
													messages[id].data.doors[i].position.z,
												)
												vehi.seats[i].door!.doorObject.quaternion.set(
													messages[id].data.doors[i].quaternion.x,
													messages[id].data.doors[i].quaternion.y,
													messages[id].data.doors[i].quaternion.z,
													messages[id].data.doors[i].quaternion.w,
												)
											}
										}
									}
									for (let i = 0; i < messages[id].data.rotors.length; i++) {
										if ((vehi as Helicopter).rotors[i]) {
											(vehi as Helicopter).rotors[i].quaternion.set(
												messages[id].data.rotors[i].quaternion.x,
												messages[id].data.rotors[i].quaternion.y,
												messages[id].data.rotors[i].quaternion.z,
												messages[id].data.rotors[i].quaternion.w,
											);
										}
									}
									break
								}
								default: {
									console.log("Unknown Entity:", messages[id].data.entity)
									break
								}
							}
						}
					})
					break
				}
				case MessageTypes.Decoration: {
					this.worldClient.waters.forEach((water) => {
						if (water.uID === messages[id].uID) {
							water.material.uniforms['time'].value = messages[id].data.time
							for (let i = 0; i < messages[id].data.floaters.length; i++) {
								water.floatingBodies[i].position.set(
									messages[id].data.floaters[i].position.x,
									messages[id].data.floaters[i].position.y,
									messages[id].data.floaters[i].position.z,
								)
								water.floatingBodies[i].quaternion.set(
									messages[id].data.floaters[i].quaternion.x,
									messages[id].data.floaters[i].quaternion.y,
									messages[id].data.floaters[i].quaternion.z,
									messages[id].data.floaters[i].quaternion.w,
								)
								water.floatingMeshes[i].position.set(
									messages[id].data.floaters[i].position.x,
									messages[id].data.floaters[i].position.y,
									messages[id].data.floaters[i].position.z,
								)
								water.floatingMeshes[i].quaternion.set(
									messages[id].data.floaters[i].quaternion.x,
									messages[id].data.floaters[i].quaternion.y,
									messages[id].data.floaters[i].quaternion.z,
									messages[id].data.floaters[i].quaternion.w,
								)
							}
						}
					})
					break
				}
				default: {
					console.log("Unknown Message: ", messages[id].msgType)
					break
				}
			}
		})
	}

	private OnControls(controls: { sID: string, type: ControlsTypes, data: { [id: string]: any } }) {
		if ((controls.sID === this.sID) && this.worldClient.settings.SyncInputs) return
		let user = this.worldClient.users[controls.sID]
		if (user !== undefined) {
			user.inputManager.setControls(controls)
		}
	}

	private OnScenario(scenarioName: string) {
		this.worldClient.launchScenario(scenarioName, false)
	}

	private OnMap(mapName: string) {
		let caller = () => {
			this.MapLoader()
		}
		this.worldClient.mapLoadFinishCallBack = caller
		this.worldClient.launchMap(mapName, false, true)
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
			this.worldClient.player.ping = Date.now() - this.worldClient.player.timeStamp
			this.worldClient.player.timeStamp = Date.now()
			this.io.emit("update", this.worldClient.player.Out())
		}
	}
}

new AppClient();
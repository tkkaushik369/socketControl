import './css/main.css'
import { io, Socket } from 'socket.io-client'
import WorldClient from './ts/WorldClient'
import { Player } from '../server/ts/Player'
import * as GameModes from './ts/GameModes'
import { Message } from '../server/ts/Messages/Message'
import { messageTypes } from '../server/ts/Enums/messageTypes'
import * as CharacterStates from '../server/ts/Characters/CharacterStates'
import Character from '../server/ts/Characters/Character'
import * as THREE from 'three'

if (navigator.userAgent.includes('QtWebEngine')) {
	document.body.classList.add('bodyTransparent')
	console.log('transparent')
}

const pingStats = document.getElementById('pingStats') as HTMLDivElement
const workBox = document.getElementById('work') as HTMLDivElement

export default class AppClient {

	private io: Socket

	private worldClient: WorldClient
	private player: Player | null
	private clients: { [id: string]: Player }

	private fixedTimeStep: number

	constructor() {
		// Bind Functions
		this.OnConnect = this.OnConnect.bind(this)
		this.OnDisConnect = this.OnDisConnect.bind(this)
		this.OnSetID = this.OnSetID.bind(this)
		this.OnRemoveClient = this.OnRemoveClient.bind(this)
		this.OnPlayers = this.OnPlayers.bind(this)
		this.OnChangeScenario = this.OnChangeScenario.bind(this)
		this.ForSocketLoop = this.ForSocketLoop.bind(this)
		this.ForChangeScenario = this.ForChangeScenario.bind(this)
		this.ForShoot = this.ForShoot.bind(this)
		this.OnChangeTimeScale = this.OnChangeTimeScale.bind(this)
		this.ForChangeTimeScale = this.ForChangeTimeScale.bind(this)
		this.ForCharacterControl = this.ForCharacterControl.bind(this)

		// Init
		this.clients = {}
		this.fixedTimeStep = 1.0 / 60.0; // fps

		this.io = io()
		this.worldClient = new WorldClient(this.clients, workBox)
		this.worldClient.changeSceneCallBack = this.ForChangeScenario
		this.worldClient.shootCallBack = this.ForShoot
		this.worldClient.changeTimeScaleCallBack = this.ForChangeTimeScale
		this.worldClient.sendCharacterControlCallBack = this.ForCharacterControl
		this.player = null


		// Socket
		this.io.on("connect", this.OnConnect);
		this.io.on("disconnect", this.OnDisConnect);
		this.io.on("setid", this.OnSetID);
		this.io.on("removeClient", this.OnRemoveClient);
		this.io.on("players", this.OnPlayers);
		this.io.on("changeScenario", this.OnChangeScenario);
		this.io.on("changeTimeScale", this.OnChangeTimeScale);
		setInterval(this.ForSocketLoop, this.fixedTimeStep * 1000)
	}

	private OnConnect() {
		console.log("Connected")
	}

	private OnDisConnect(str: string) {
		console.log("Disconnect " + str)
		if((this.player !== null) && (this.player.userName !== null)) {
			this.worldClient.allCharacters[this.player.userName].labelDiv?.remove()
			this.worldClient.removeWorldCharacter(this.player.userName)
		}
	}

	private OnChangeScenario(inx: number) {
		console.log("Scenario Change: " + inx)
		this.worldClient.changeScenario(inx, false)
	}

	private ForChangeScenario(inx: number) {
		this.io.emit("changeScenario", inx)
	}

	private ForShoot(position: THREE.Vector3, quaternion: THREE.Quaternion, isOffset: boolean) {
		this.io.emit('shoot', {
			position: {
				x: position.x,
				y: position.y,
				z: position.z,
			},
			quaternion: {
				x: quaternion.x,
				y: quaternion.y,
				z: quaternion.z,
				w: quaternion.w,
			},
			isOffset: isOffset,
		})
	}

	private OnChangeTimeScale(data: any) {
		this.worldClient.settings.TimeScale = data.TimeScale
		this.worldClient.timeScaleTarget = data.timeScaleTarget
	}

	private ForChangeTimeScale(val: number) {
		this.io.emit("changeTimeScale", val)
	}

	private ForCharacterControl(name: string, key: string, val: boolean) {
		this.io.emit("characterControl", { name: name, key: key, val: val })
	}

	private OnSetID(message: Message, callBack: Function) {
		this.player = new Player(message.id)
		this.player.userName = "Player " + message.data.count
		this.worldClient.playerConn = this.player
		console.log("Username: " + this.player.userName)
		callBack(this.player.userName)

		const player = new Character({ position: new THREE.Vector3(2, 5, 5) })
		this.worldClient.addWorldCharacter(player, this.player.userName)
		this.worldClient.LoadCharacter(player)
		player.takeControl(GameModes.CharacterControls)
		// this.worldClient.setGameMode(new GameModes.CharacterControls(player));

		// load server Scenario
		if (message.data.currentScenarioIndex)
			this.worldClient.changeScenario(message.data.currentScenarioIndex, false)

		// load server TimeScale
		if (message.data.TimeScale)
			this.worldClient.settings.TimeScale = message.data.TimeScale
		if (message.data.timeScaleTarget)
			this.worldClient.timeScaleTarget = message.data.timeScaleTarget

		// start socket loop
		setInterval(this.ForSocketLoop, this.fixedTimeStep * 1000)
	}

	private OnRemoveClient(id: string) {
		console.log("Removed: " + id)
		if(this.clients[id].userName !== null) {
			this.worldClient.allCharacters[this.clients[id].userName].labelDiv?.remove()
			this.worldClient.removeWorldCharacter(this.clients[id].userName)
		}
		if (this.clients[id]) delete this.clients[id]
	}

	private OnPlayers(messages: { [id: string]: Message }) {
		pingStats.innerHTML = "Ping: " + "<br>"
		Object.keys(messages).forEach((id) => {
			switch (messages[id].type) {
				case messageTypes.playerData: {
					if (this.clients[id] === undefined) {
						this.clients[id] = new Player(id)
						console.log(JSON.stringify(messages[id]))
						this.clients[id].userName = messages[id].userName

						if((this.clients[id].userName != null) && (this.clients[id].userName != this.player?.userName)) {
							const player = new Character({ position: new THREE.Vector3(2, 5, 5) })
							this.worldClient.addWorldCharacter(player, this.clients[id].userName)
							this.worldClient.LoadCharacter(player)
						}
					}

					this.clients[id].userName = messages[id].userName
					this.clients[id].data.count = messages[id].data.count
					this.clients[id].timeStamp = messages[id].timeStamp
					this.clients[id].ping = messages[id].ping

					if (this.clients[id].userName != null) {
						pingStats.innerHTML += this.clients[id].userName + ": "
						pingStats.innerHTML += this.clients[id].ping + "<br>"
					}
					break;
				}
				case messageTypes.worldObjectData: {
					if (messages[id].userName != null) {
						if (this.worldClient.allWorldObjects[id] != undefined) {
							if (this.worldClient.allWorldObjects[id].model != undefined) {
								this.worldClient.allWorldObjects[id].model?.position.set(
									messages[id].data.position.x,
									messages[id].data.position.y,
									messages[id].data.position.z,
								)
								this.worldClient.allWorldObjects[id].model?.quaternion.set(
									messages[id].data.quaternion.x,
									messages[id].data.quaternion.y,
									messages[id].data.quaternion.z,
									messages[id].data.quaternion.w,
								)
							}
						}
					}
					break;
				}
				case messageTypes.worldObjectBallData: {
					if (messages[id].userName != null) {
						let ball = this.worldClient.allBalls[(Number(id.split("_")[1]))]
						ball.model?.position.set(
							messages[id].data.position.x,
							messages[id].data.position.y,
							messages[id].data.position.z,
						)
						ball.model?.quaternion.set(
							messages[id].data.quaternion.x,
							messages[id].data.quaternion.y,
							messages[id].data.quaternion.z,
							messages[id].data.quaternion.w,
						)
					}
					break;
				}
				case messageTypes.worldObjectCharacter: {
					let character = this.worldClient.allCharacters[id]
					if (character === undefined) {
						// console.log(messages[id])
						break;
					}
					character.position.set(
						messages[id].data.characterModel_position.x,
						messages[id].data.characterModel_position.y,
						messages[id].data.characterModel_position.z,
					);
					character.quaternion.set(
						messages[id].data.characterModel_quaternion.x,
						messages[id].data.characterModel_quaternion.y,
						messages[id].data.characterModel_quaternion.z,
						messages[id].data.characterModel_quaternion.w,
					);
					character.characterCapsule.physics!.visual.position.copy(character.position)
					character.raycastBox.position.set(
						messages[id].data.raycastBox.x,
						messages[id].data.raycastBox.y,
						messages[id].data.raycastBox.z,
						)
					character.position.add(character.modelOffset);
					let state = messages[id].data.charStateRaw;
					if (character.lastState !== state) {
						if (state == "DefaultState") character.setState(CharacterStates.DefaultState)
						if (state == "Idle") character.setState(CharacterStates.Idle)
						if (state == "IdleRotateRight") character.setState(CharacterStates.IdleRotateRight)
						if (state == "IdleRotateLeft") character.setState(CharacterStates.IdleRotateLeft)
						if (state == "Walk") character.setState(CharacterStates.Walk)
						if (state == "Sprint") character.setState(CharacterStates.Sprint)
						if (state == "StartWalkForward") character.setState(CharacterStates.StartWalkForward)
						if (state == "StartWalkLeft") character.setState(CharacterStates.StartWalkLeft)
						if (state == "StartWalkRight") character.setState(CharacterStates.StartWalkRight)
						if (state == "StartWalkBackLeft") character.setState(CharacterStates.StartWalkBackLeft)
						if (state == "StartWalkRight") character.setState(CharacterStates.StartWalkRight)
						if (state == "EndWalk") character.setState(CharacterStates.EndWalk)
						if (state == "JumpIdle") character.setState(CharacterStates.JumpIdle)
						if (state == "JumpRunning") character.setState(CharacterStates.JumpRunning)
						if (state == "Falling") character.setState(CharacterStates.Falling)
						if (state == "DropIdle") character.setState(CharacterStates.DropIdle)
						if (state == "DropRunning") character.setState(CharacterStates.DropRunning)
						if (state == "DropRolling") character.setState(CharacterStates.DropRolling)
						character.lastState = state;
						if(character.name == 'player') {
							console.log(state)
						}
					}
					break
				}
			}
		})
	}

	private ForSocketLoop() {
		if (this.player !== null) this.io.emit("update", this.player.Out())
	}
}

new AppClient();
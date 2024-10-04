import * as THREE from 'three'
import { WorldBase } from '../World/WorldBase'
import { InputManager } from './InputManager'
import { INetwork } from '../Interfaces/INetwork'
import { MessageTypes } from '../Enums/MessagesTypes'
import { CameraOperator } from '../Core/CameraOperator'
import { CharacterSpawnPoint } from '../World/SpawnPoints/CharacterSpawnPoint'
import { Character } from '../Characters/Character'
import _ from 'lodash'
import { WebSocket } from 'ws'
import { UiControlsGroup } from '../Enums/UiControlsGroup'

export type PlayerSetMesssage = {
	sID: string,
	count: number,
}

export class Player implements INetwork {
	sID: string
	world: WorldBase | null
	ws: WebSocket | null

	uID: string | null
	msgType: MessageTypes
	timeStamp: number
	ping: number

	data: {
		isWS: boolean,
		worldId: string | null,
		sun: {
			elevation: number, // 0 to 90
			azimuth: number, // -180 to 180
		},
		timeScaleTarget: number,
		cameraPosition: { x: number, y: number, z: number }
		cameraQuaternion: { x: number, y: number, z: number, w: number }
	}

	inputManager: InputManager
	cameraOperator: CameraOperator

	uiControls: UiControlsGroup

	spawnPoint: CharacterSpawnPoint | null
	character: Character | null

	// client
	attachments: { obj: THREE.Object3D, addToWorld: boolean }[]

	constructor(sID: string, camera: THREE.PerspectiveCamera, domElement: HTMLElement | null) {
		// bind functions
		this.setUID = this.setUID.bind(this)
		this.setSpawn = this.setSpawn.bind(this)
		this.addUser = this.addUser.bind(this)
		this.removeUser = this.removeUser.bind(this)
		this.Out = this.Out.bind(this)
		this.Set = this.Set.bind(this)

		// init
		this.sID = sID
		this.world = null
		this.ws = null

		this.uID = null
		this.msgType = MessageTypes.Player
		this.timeStamp = Date.now()
		this.ping = 0
		this.inputManager = new InputManager(this, domElement)
		this.cameraOperator = new CameraOperator(this, camera, 0.2)

		this.attachments = []

		{
			const camHelper = new THREE.CameraHelper(this.cameraOperator.camera)
			camHelper.visible = false

			this.attachments.push({ obj: camHelper, addToWorld: true })
		}

		this.spawnPoint = null
		this.character = null
		this.uiControls = UiControlsGroup.CameraOperator

		this.data = {
			isWS: false,
			worldId: null,
			sun: { elevation: 0, azimuth: 0 },
			timeScaleTarget: 1,
			cameraPosition: { x: 0, y: 0, z: 0 },
			cameraQuaternion: { x: 0, y: 0, z: 0, w: 0 },
		}
	}

	public setUID(uID: string) {
		this.uID = uID
		if (this.world === null) return
		const world = this.world
		// this.setSpawn(new THREE.Vector3(0, 17, -5), false) // for testing
		this.world.scenarios.forEach((sc => {
			if (world.lastScenarioID === sc.name) {
				if (sc.playerPosition !== null) {
					this.setSpawn(sc.playerPosition, false)
				}
			}
		}))
	}

	public setSpawn(pos: THREE.Vector3, isPlayerNearVehicle: boolean, deg?: number) {
		let spawnPlayer = new THREE.Object3D()
		spawnPlayer.userData = {
			name: this.uID + "_character",
			data: "spawn",
			type: "player",
		}
		spawnPlayer.position.copy(pos)
		if (isPlayerNearVehicle && (deg !== undefined)) {
			const angle = deg * (Math.PI / 180)
			const dist = 1
			spawnPlayer.rotateY(angle)
			spawnPlayer.position.x += Math.cos(angle) * dist
			spawnPlayer.position.y -= 2
			spawnPlayer.position.z -= Math.sin(angle) * dist
		}
		this.spawnPoint = new CharacterSpawnPoint(spawnPlayer, spawnPlayer.userData)
	}

	public addUser(exworld: WorldBase | null) {
		if (exworld !== null) {
			this.world = exworld
			this.world.users[this.sID] = this
			this.inputManager.pointerLock = this.world.settings.Pointer_Lock
			this.cameraOperator.setSensitivity(this.world.settings.Mouse_Sensitivity)
			this.world.registerUpdatable(this.inputManager)
			this.world.registerUpdatable(this.cameraOperator)
		}
		if (this.world === null) return
		const world = this.world
		if (this.spawnPoint === null) return
		this.character = this.spawnPoint.spawn(this.world)
		if (this.character !== null) {
			this.character.player = this
			this.character.takeControl()
		}
		this.attachments.forEach((obj) => {
			if (obj.addToWorld)
				world.addSceneObject(obj.obj)
			else if (this.character !== null)
				this.character.modelContainer.add(obj.obj)
		})
	}
	public removeUser(exworld: WorldBase | null) {
		if (this.world === null) return
		const world = this.world
		this.attachments.forEach((obj) => {
			if (obj.addToWorld)
				world.removeSceneObject(obj.obj)
			else if (this.character !== null) {
				/* if (obj.obj instanceof THREE.LOD) {
					console.log(obj.obj.levels)
					obj.obj.levels.forEach((child) => {
						console.log((obj.obj as any).removeLevel(child.distance))
					})
				} */
				this.character.modelContainer.remove(obj.obj)
			}
		})
		if (this.character !== null) {
			this.world.removeSceneObject(this.character)
			this.character.player = null
			this.character = null
		}
		if (exworld !== null) {
			this.world.unregisterUpdatable(this.inputManager)
			this.world.unregisterUpdatable(this.cameraOperator)
		}
	}

	Out() {
		return {
			sID: this.sID,
			uID: this.uID,
			msgType: this.msgType,
			timeStamp: this.timeStamp,
			ping: this.ping,

			data: {
				uiControls: this.uiControls,
				isWS: (this.ws !== null),
				worldId: (this.world !== null) ? this.world.worldId : null,
				sun: {
					elevation: this.data.sun.elevation,
					azimuth: this.data.sun.azimuth
				},
				timeScaleTarget: this.data.timeScaleTarget,
				cameraPosition: this.data.cameraPosition,
				cameraQuaternion: this.data.cameraQuaternion,
			}
		}
	}

	Set(messages: any) {
		this.cameraOperator.camera.position.set(
			messages.data.cameraPosition.x,
			messages.data.cameraPosition.y,
			messages.data.cameraPosition.z,
		)
		this.cameraOperator.camera.quaternion.set(
			messages.data.cameraQuaternion.x,
			messages.data.cameraQuaternion.y,
			messages.data.cameraQuaternion.z,
			messages.data.cameraQuaternion.w,
		)
	}
}
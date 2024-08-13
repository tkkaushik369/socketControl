import * as THREE from 'three'
import { WorldBase } from '../World/WorldBase'
import { InputManager } from './InputManager'
import { INetwork } from '../Interfaces/INetwork'
import { MessageTypes } from '../Enums/MessagesTypes'
import { CameraOperator } from '../Core/CameraOperator'
import { CharacterSpawnPoint } from '../World/CharacterSpawnPoint'
import { Character } from '../Characters/Character'
import _ from 'lodash'

export type PlayerSetMesssage = {
	sID: string,
	count: number,
	lastScenarioID: string,
	lastMapID: string,
}

export class Player implements INetwork {
	sID: string
	world: WorldBase

	uID: string | null
	msgType: MessageTypes
	timeStamp: number
	ping: number

	data: {
		sun: {
			elevation: number, // 0 to 90
			azimuth: number, // -180 to 180
		},
		timeScaleTarget: number,
		cameraPosition: { x: number; y: number; z: number }
		cameraQuaternion: { x: number; y: number; z: number, w: number }
	}

	inputManager: InputManager
	cameraOperator: CameraOperator

	spawnPoint: CharacterSpawnPoint | null
	character: Character | null

	// client
	attachments: THREE.Object3D[]

	constructor(sID: string, world: WorldBase, camera: THREE.PerspectiveCamera, domElement: HTMLElement | null) {
		// bind functions
		this.setUID = this.setUID.bind(this)
		this.Out = this.Out.bind(this)

		// init
		this.sID = sID
		this.world = world

		this.uID = null
		this.msgType = MessageTypes.Player
		this.timeStamp = Date.now()
		this.ping = 0
		this.inputManager = new InputManager(this, this.world, domElement)
		this.cameraOperator = new CameraOperator(this, this.world, camera, domElement ? this.world.settings.Mouse_Sensitivity : 0.2)
		this.attachments = []

		this.spawnPoint = null
		this.character = null

		this.data = {
			sun: { elevation: 0, azimuth: 0 },
			timeScaleTarget: 1,
			cameraPosition: { x: 0, y: 0, z: 0 },
			cameraQuaternion: { x: 0, y: 0, z: 0, w: 0 },
		}
	}

	public setUID(uID: string) {
		this.uID = uID

		let spawnPlayer = new THREE.Object3D()
		spawnPlayer.userData = {
			name: uID + "_character",
			data: "spawn",
			type: "player",
		}
		spawnPlayer.position.set(0, 17, -5)

		this.spawnPoint = new CharacterSpawnPoint(spawnPlayer, spawnPlayer.userData)
	}

	public addUser() {
		if ((this.world === null) || (this.spawnPoint === null)) return
		this.character = this.spawnPoint.spawn(this.world)
		this.character.player = this
		this.character.takeControl()
	}
	public removeUser() {
		if (this.world === null) return
		if (this.character !== null) {
			this.world.removeSceneObject(this.character)
			this.world.remove(this.character)
			this.character.removeFromWorld(this.world)
			_.pull(this.world.characters, this.character)
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
}
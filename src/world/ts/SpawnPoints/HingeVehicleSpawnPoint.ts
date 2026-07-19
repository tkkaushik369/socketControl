import { SpawnBase } from './SpawnBase'
import * as THREE from 'three'

import { BaseScene } from '../MapConfigs/BaseScene'
import { WorldBase } from '../WorldBase'
import { Train } from '../Vehicles/Train'
import { Character } from '../Characters/Character'
import { FollowPath } from '../Characters/CharacterAI/FollowPath'
import { Player } from '../Core/Player'
import { Utility } from '../Core/Utility'

export class HingeVehicleSpawnPoint extends SpawnBase {
	public type: string | null
	public subtype: string | null
	public driver: string | null // ai | player
	public playerData: { player: Player; position: THREE.Vector3 } | null
	public firstAINode: string | null
	// public maxGears: number

	public motorSpeed: number
	public motorForce: number

	constructor(object: THREE.Object3D) {
		super(object, object.userData)

		this.type = null
		this.subtype = null
		this.driver = null
		this.playerData = null
		this.firstAINode = null

		this.motorSpeed = 0
		this.motorForce = 0

		// this.maxGears = -1

		if (this.userData.hasOwnProperty('type')) {
			this.type = this.userData.type
		}

		if (this.userData.hasOwnProperty('subtype')) {
			this.subtype = this.userData.subtype
		}

		if (this.userData.hasOwnProperty('driver')) {
			this.driver = this.userData.driver

			if (this.userData.driver === 'ai' && this.userData.hasOwnProperty('first_node')) {
				this.firstAINode = this.userData.first_node
			}
		}

		/* if (this.userData.hasOwnProperty('max_gears')) {
			this.maxGears = this.userData.max_gears
		} */

		if (this.userData.hasOwnProperty('motor_speed')) {
			this.motorSpeed = this.userData.motor_speed
		}

		if (this.userData.hasOwnProperty('motor_force')) {
			this.motorForce = this.userData.motor_force
		}
	}

	public async spawn(world: WorldBase, inRace = false): Promise<Train | null> {
		super.spawn(world)

		if (world.lastMapID === null) return null
		if (this.type === null) return null
		const type: string = this.type
		// const MapConfig = getMapConfig(world)
		const MapConfig = world.MapConfig

		let callerCharacter = (model: any, vehicle: Train, player?: Player): Character => {
			let character = new Character()
			// world.getGLTF('boxman.glb', (gltf: any) => {
			character.setModel(model, world.isClient)
			character.uID = vehicle.uID + '_driver'
			if (inRace) {
				character.nextCheckpointIndex = 0
				character.lapCount = 0
			}
			// })
			world.add(character)
			if (player !== undefined) {
				character.player = player
				player.character = character
			}

			if (this.driver === 'player') {
				// character.teleportToVehicle(vehicle, vehicle.seats[0])
				character.takeControl()
			} else if (this.driver === 'ai') {
				// character.teleportToVehicle(vehicle, vehicle.seats[0])
				if (this.firstAINode !== null) {
					let nodeFound = false
					world.paths.forEach((path) => {
						Object.keys(path.nodes).forEach((nodeName) => {
							const node = path.nodes[nodeName]
							let pathRadius = 10
							if (this.userData.hasOwnProperty('path_radius')) {
								pathRadius = this.userData.path_radius
							}
							if (node.object.name === this.firstAINode) {
								character.setBehaviour(new FollowPath(character, node, pathRadius))
								nodeFound = true
							}
						})
					})
					if (!nodeFound) {
						console.error('Path node ' + this.firstAINode + 'not found.')
					}
				}
			}
			return character
		}

		let callerVehicle = (model: any, playerData?: { player: Player; position: THREE.Vector3 }): Train => {
			let worldPos = new THREE.Vector3()
			let worldQuat = new THREE.Quaternion()

			this.object.getWorldPosition(worldPos)
			if (playerData !== undefined) worldPos = worldPos.add(playerData.position)

			this.object.getWorldQuaternion(worldQuat)

			let vehicle: Train = this.getNewVehicleByType(model)
			// if (this.maxGears > 0) vehicle.maxGears = this.maxGears
			if (this.motorSpeed !== 0) vehicle.setMotorSpeed(this.motorSpeed)
			if (this.motorForce !== 0) vehicle.setMotorForce(this.motorForce)

			vehicle.readVehicleData(model, world.isClient)

			vehicle.uID = this.userData.name
			if (this.playerData !== null) vehicle.uID += '' + this.playerData.player.uID
			vehicle.spawnPoint = this.object

			vehicle.setPosition(worldPos.x, worldPos.y + 1, worldPos.z)
			vehicle.collision.quaternion.copy(Utility.cannonQuat(worldQuat))
			world.add(vehicle)

			if (this.driver !== null) {
				if (world.lastMapID !== null && MapConfig[world.lastMapID] !== undefined) {
					for (let j = 0; j < MapConfig[world.lastMapID].characters.length; j++) {
						const char = MapConfig[world.lastMapID].characters[j]
						if ('character' == char.type /* && (this.subtype == char.subtype) */) {
							if (typeof char.objCaller === 'string') {
								world.getGLTF(char.objCaller, (gltf: any) => {
									let model = gltf
									return callerCharacter(
										model,
										vehicle,
										playerData !== undefined ? playerData.player : undefined
									)
								})
							} else
								callerCharacter(
									this.clone(char.objCaller as any),
									vehicle,
									playerData !== undefined ? playerData.player : undefined
								)
							break
						}
					}
				}
			}
			return vehicle
		}

		if (world.lastMapID !== null && MapConfig[world.lastMapID] !== undefined) {
			for (let j = 0; j < MapConfig[world.lastMapID].trains.length; j++) {
				const vehi = MapConfig[world.lastMapID].trains[j]
				if (type == vehi.type && this.subtype == vehi.subtype) {
					// console.log(type, this.subtype)
					if (vehi.objCaller instanceof BaseScene) {
						// let model = vehi.objCaller.getVehicle(type, this.subtype)
						let model = new (vehi.objCaller as any).constructor().getVehicle(type, this.subtype)
						return callerVehicle(model, this.playerData === null ? undefined : this.playerData)
					} else {
						world.getGLTF(vehi.objCaller, (gltf: any) => {
							let model = gltf
							return callerVehicle(model, this.playerData === null ? undefined : this.playerData)
						})
					}
					break
				}
			}
		}
		return null
	}

	private getNewVehicleByType(model: any): Train {
		switch (this.type) {
			case 'train': {
				switch (this.subtype) {
					case 'train_test':
						return new Train(model)
					default:
						return new Train(model)
				}
			}
			default:
				return new Train(model)
		}
	}
}

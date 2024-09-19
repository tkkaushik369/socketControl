import * as THREE from 'three'
import { ISpawnPoint } from '../../Interfaces/ISpawnPoint'
import { WorldBase } from '../WorldBase'
import { Vehicle } from '../../Vehicles/Vehicle'
import { Helicopter } from '../../Vehicles/Helicopter'
import { Airplane } from '../../Vehicles/Airplane'
import { Car } from '../../Vehicles/Car'
import { Utility } from '../../Core/Utility'
import { Character } from '../../Characters/Character'
import { FollowPath } from '../../Characters/CharacterAI/FollowPath'

import { MapConfig } from '../MapConfigs'
import { BaseScene } from '../BaseScene'
import { Player } from '../../Core/Player'

export class VehicleSpawnPoint implements ISpawnPoint {
	public type: string | null
	public subtype: string | null
	public driver: string | null // ai | player
	public playerData: { player: Player, position: THREE.Vector3 } | null
	public firstAINode: string | null

	public object: THREE.Object3D
	public userData: { [id: string]: any }

	constructor(object: THREE.Object3D) {
		this.object = object
		this.type = null
		this.subtype = null
		this.driver = null
		this.playerData = null
		this.firstAINode = null
		this.userData = this.object.userData

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
	}

	public async spawn(world: WorldBase): Promise<Vehicle | null> {
		if (world.lastMapID === null) return null
		if (this.type === null) return null
		const type: string = this.type

		let callerCharacter = (model: any, vehicle: Vehicle, player?: Player): Character => {
			let character = new Character()
			// world.getGLTF('boxman.glb', (gltf: any) => {
			character.setModel(model)
			character.uID = vehicle.uID + "_driver"
			// })
			world.add(character)
			if (player !== undefined) {
				character.player = player
				player.character = character
			}

			if (this.driver === 'player') {
				character.teleportToVehicle(vehicle, vehicle.seats[0])
				character.takeControl()
			}
			else if (this.driver === 'ai') {
				character.teleportToVehicle(vehicle, vehicle.seats[0])
				if (this.firstAINode !== null) {
					let nodeFound = false
					world.paths.forEach((path) => {
						Object.keys(path.nodes).forEach((nodeName) => {
							const node = path.nodes[nodeName]
							if (node.object.name === this.firstAINode) {
								character.setBehaviour(new FollowPath(character, node, 10))
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

		let callerVehicle = (model: any, playerData?: { player: Player, position: THREE.Vector3 }): Vehicle => {
			let worldPos = new THREE.Vector3()
			let worldQuat = new THREE.Quaternion()

			this.object.getWorldPosition(worldPos)
			if (playerData !== undefined)
				worldPos = worldPos.add(playerData.position)

			this.object.getWorldQuaternion(worldQuat)

			let vehicle: Vehicle = this.getNewVehicleByType(model)
			vehicle.uID = this.userData.name
			if (this.playerData !== null)
				vehicle.uID += "" + this.playerData.player.uID
			vehicle.spawnPoint = this.object

			vehicle.setPosition(worldPos.x, worldPos.y + 1, worldPos.z)
			vehicle.collision.quaternion.copy(Utility.cannonQuat(worldQuat))
			world.add(vehicle)

			if (this.driver !== null) {
				if ((world.lastMapID !== null) && (MapConfig[world.lastMapID] !== undefined)) {
					for (let j = 0; j < MapConfig[world.lastMapID].characters.length; j++) {
						const char = MapConfig[world.lastMapID].characters[j]
						if (('character' == char.type) /* && (this.subtype == char.subtype) */) {
							if (typeof char.objCaller === 'string') {
								world.getGLTF(char.objCaller, (gltf: any) => {
									let model = gltf
									return callerCharacter(model, vehicle, (playerData !== undefined) ? playerData.player : undefined)
								})
							}
							break
						}
					}
				}
			}
			return vehicle
		}

		if ((world.lastMapID !== null) && (MapConfig[world.lastMapID] !== undefined)) {
			for (let j = 0; j < MapConfig[world.lastMapID].vehicles.length; j++) {
				const vehi = MapConfig[world.lastMapID].vehicles[j]
				if ((type == vehi.type) && (this.subtype == vehi.subtype)) {
					// console.log(type, this.subtype)
					if (vehi.objCaller instanceof BaseScene) {
						// let model = vehi.objCaller.getVehical(type, this.subtype)
						let model = new (vehi.objCaller as any).constructor().getVehical(type, this.subtype)
						return callerVehicle(model, (this.playerData === null) ? undefined : this.playerData)
					} else {
						world.getGLTF(vehi.objCaller, (gltf: any) => {
							let model = gltf
							return callerVehicle(model, (this.playerData === null) ? undefined : this.playerData)
						})
					}
					break
				}
			}
		}
		return null
	}

	private getNewVehicleByType(model: any): Vehicle {
		switch (this.type) {
			case 'car': {
				switch (this.subtype) {
					case 'car_test': return new Car(model)
					default: return new Car(model)
				}
			}
			case 'heli': {
				switch (this.subtype) {
					case 'heli_test': return new Helicopter(model)
					default: return new Helicopter(model)
				}
			}
			case 'airplane': {
				switch (this.subtype) {
					case 'airplane_test': return new Airplane(model)
					default: return new Airplane(model)
				}
			}
			default: return new Car(model)
		}
	}
}
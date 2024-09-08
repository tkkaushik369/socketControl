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

export class VehicleSpawnPoint implements ISpawnPoint {
	public type: string | null
	public subtype: string | null
	public driver: string | null // ai | player
	public firstAINode: string | null

	private object: THREE.Object3D
	public userData: { [id: string]: any }

	constructor(object: THREE.Object3D) {
		this.object = object
		this.type = null
		this.subtype = null
		this.driver = null
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
		let caller = (model: any): Vehicle => {
			let vehicle: Vehicle = this.getNewVehicleByType(model)
			vehicle.uID = this.userData.name
			vehicle.spawnPoint = this.object

			let worldPos = new THREE.Vector3()
			let worldQuat = new THREE.Quaternion()
			this.object.getWorldPosition(worldPos)
			this.object.getWorldQuaternion(worldQuat)

			vehicle.setPosition(worldPos.x, worldPos.y + 1, worldPos.z)
			vehicle.collision.quaternion.copy(Utility.cannonQuat(worldQuat))
			world.add(vehicle)

			if (this.driver !== null) {
				let character = new Character()
				world.getGLTF('boxman.glb', (gltf: any) => {
					character.setModel(gltf)
					character.uID = vehicle.uID + "_driver"
				})
				world.add(character)

				if (this.driver === 'player') {
					vehicle.materials.forEach((mat) => {
						const material = (mat as THREE.MeshPhongMaterial)
						// console.log(vehicle.hasOwnProperty('isMesh'))
						// material.wireframe = true
						// material.color = new THREE.Color(0xe5a00d)
						// console.log(this.object)
					})
					// character.teleportToVehicle(vehicle, vehicle.seats[0])
					// character.takeControl()
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
			}
			return vehicle
		}

		if (MapConfig[world.lastMapID] !== undefined) {
			console.log(type, this.subtype)
			for (let j = 0; j < MapConfig[world.lastMapID].vehicles.length; j++) {
				const vehi = MapConfig[world.lastMapID].vehicles[j]
				if ((type == vehi.type) && (this.subtype == vehi.subtype)) {
					if (vehi.objCaller instanceof BaseScene) {
						// let model = vehi.objCaller.getVehical(type, this.subtype)
						let model = new (vehi.objCaller as any).constructor().getVehical(type, this.subtype)
						return caller(model)
					} else {
						world.getGLTF(vehi.objCaller, (gltf: any) => {
							let model = gltf
							return caller(model)
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
					case 'lego': {
						let vehicle = new Car(model, 40)
						vehicle.engineForce = 300
						vehicle.rayCastVehicle.wheelInfos.forEach((wheel) => {
							wheel.radius = 0.2
						})
						return vehicle
					}
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
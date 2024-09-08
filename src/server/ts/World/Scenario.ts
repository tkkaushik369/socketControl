import * as THREE from 'three'
import { ISpawnPoint } from '../Interfaces/ISpawnPoint'
import { VehicleSpawnPoint } from './SpawnPoints/VehicleSpawnPoint'
import { CharacterSpawnPoint } from './SpawnPoints/CharacterSpawnPoint'
import { WorldBase } from '../World/WorldBase'
import { Character } from '../Characters/Character'
import { Vehicle } from '../Vehicles/Vehicle'

export class Scenario {
	public name: string
	public spawnAlways: boolean = false // vehical spwn
	public default: boolean = false // only one default in one scene
	public world: WorldBase
	public descriptionTitle: string
	public descriptionContent: string

	private rootNode: THREE.Object3D
	public spawnPoints: ISpawnPoint[] = []
	private invisible: boolean = false // vehical spwn
	private initialCameraAngle: number

	public playerPosition: THREE.Vector3 | null
	public isPlayerPositionNearVehical: boolean

	constructor(root: THREE.Object3D, world: WorldBase) {
		this.rootNode = root
		this.world = world
		this.name = "_name_"
		this.descriptionTitle = "_descriptionTitle_"
		this.descriptionContent = "_descriptionContent_"
		this.initialCameraAngle = 0
		this.playerPosition = null
		this.isPlayerPositionNearVehical = false

		// Scenario
		if (root.userData.hasOwnProperty('name')) {
			this.name = root.userData.name
		}
		if (root.userData.hasOwnProperty('default') && root.userData.default === 'true') {
			this.default = true
		}
		if (root.userData.hasOwnProperty('spawn_always') && root.userData.spawn_always === 'true') {
			this.spawnAlways = true
		}
		if (root.userData.hasOwnProperty('invisible') && root.userData.invisible === 'true') {
			this.invisible = true
		}
		if (root.userData.hasOwnProperty('desc_title')) {
			this.descriptionTitle = root.userData.desc_title
		}
		if (root.userData.hasOwnProperty('desc_content')) {
			this.descriptionContent = root.userData.desc_content
		}
		if (root.userData.hasOwnProperty('camera_angle')) {
			this.initialCameraAngle = root.userData.camera_angle
		}

		if (!this.invisible) this.createLaunchLink()

		// Find all scenario spawns and enitites
		root.traverse((child) => {
			if (child.hasOwnProperty('userData') && child.userData.hasOwnProperty('data')) {
				if (child.userData.data === 'spawn') {
					if (child.userData.type === 'car' || child.userData.type === 'airplane' || child.userData.type === 'heli') {
						let sp = new VehicleSpawnPoint(child)
						this.spawnPoints.push(sp)

						if (child.userData.hasOwnProperty('driver')) {
							if (child.userData.driver === "player") {
								let pos = new THREE.Vector3().add(root.position).add(child.position).add(new THREE.Vector3(0, 3, 0))
								this.playerPosition = new THREE.Vector3().copy(pos)
								this.isPlayerPositionNearVehical = true

								/* if (this.name.toLowerCase().includes('race')) {
									let closest = {
										dist: Number.POSITIVE_INFINITY,
										pos: new THREE.Vector3()
									}
									let distPos: {
										[id: string]: {
											dist: number,
											pos: THREE.Vector3
										}
									} = {}
									world.paths.forEach((path) => {
										Object.keys(path.nodes).forEach((nodeName) => {
											const node = path.nodes[nodeName]
											distPos[nodeName] = {
												dist: pos.distanceTo(node.object.position),
												pos: node.object.position
											}

											if (closest.dist > distPos[nodeName].dist) {
												closest = distPos[nodeName]
											}
										})
									})
									console.log(this.name, closest)
								} */
							}
						}
					}
					else if (child.userData.type === 'player') {
						// let sp = new CharacterSpawnPoint(child, child.userData)
						// this.spawnPoints.push(sp)
						let pos = new THREE.Vector3().add(root.position).add(child.position)
						this.playerPosition = new THREE.Vector3().copy(pos)
					}
					else if (child.userData.type === 'character_ai') {
						let sp = new CharacterSpawnPoint(child, child.userData)
						this.spawnPoints.push(sp)
					}
					else if (child.userData.type === 'character_follow') {
						let sp = new CharacterSpawnPoint(child, child.userData)
						this.spawnPoints.push(sp)
					}
				}
			}
		})
	}

	public createLaunchLink(): void {
		this.world.scenariosCalls[this.name] = () => {
			this.world.launchScenario(this.name, this.world.isClient)
		}

		if (this.world.scenarioGUIFolderCallback !== null) {
			this.world.scenarioGUIFolderCallback.add(this.world.scenariosCalls, this.name)
		}
	}

	public launch(world: WorldBase): void {
		// Spawn Vehicles
		this.spawnPoints.forEach((sp) => {
			// console.log(sp.userData)
			let ent: Character | Vehicle = sp.spawn(world) // only vehicles
			if (ent=== null) {
				console.log("Unknown Spawn: ", sp.userData)
			}
		})

		// Set Spawn Players
		const playerPosition: THREE.Vector3 | null = this.playerPosition
		if (!this.spawnAlways && (playerPosition !== null)) {
			Object.keys(world.users).forEach((sID) => {
				world.users[sID].setSpawn(playerPosition, this.isPlayerPositionNearVehical ? (this.initialCameraAngle + 180) : 0)
				world.users[sID].cameraOperator.theta = this.initialCameraAngle
				world.users[sID].cameraOperator.phi = 15
			})
		}
		this.world = world
	}
}
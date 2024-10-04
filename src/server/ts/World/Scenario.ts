import * as THREE from 'three'
import { ISpawnPoint } from '../Interfaces/ISpawnPoint'
import { VehicleSpawnPoint } from './SpawnPoints/VehicleSpawnPoint'
import { CharacterSpawnPoint } from './SpawnPoints/CharacterSpawnPoint'
import { WorldBase } from '../World/WorldBase'
import { Character } from '../Characters/Character'
import { Vehicle } from '../Vehicles/Vehicle'
import { Utility } from '../Core/Utility'

export class Scenario {
	public name: string
	public spawnAlways: boolean = false // Vehicle spwn
	public default: boolean = false // only one default in one scene
	public world: WorldBase
	public descriptionTitle: string
	public descriptionContent: string

	private rootNode: THREE.Object3D
	public spawnPoints: ISpawnPoint[] = []
	private invisible: boolean = false // Vehicle spwn
	public initialCameraAngle: number

	public playerPosition: THREE.Vector3 | null
	public isPlayerPositionNearVehicle: boolean

	constructor(root: THREE.Object3D, world: WorldBase) {
		this.rootNode = root
		this.world = world
		this.name = "_name_"
		this.descriptionTitle = "_descriptionTitle_"
		this.descriptionContent = "_descriptionContent_"
		this.initialCameraAngle = 0
		this.playerPosition = null
		this.isPlayerPositionNearVehicle = false

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
					} else if (child.userData.type === 'player') {
						// let sp = new CharacterSpawnPoint(child, child.userData)
						// this.spawnPoints.push(sp)
						let pos = new THREE.Vector3().add(root.position).add(child.position)
						this.playerPosition = new THREE.Vector3().copy(pos)
					} else if (child.userData.type === 'character_ai') {
						let sp = new CharacterSpawnPoint(child, child.userData)
						this.spawnPoints.push(sp)
					} else if (child.userData.type === 'character_follow') {
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
			this.world.scenarioGUIFolderCallback.addButton({ title: this.name }).on('click', (ev: any) => { this.world.scenariosCalls[this.name]() })
		}
	}

	public launch(world: WorldBase): void {
		// Spawn Vehicles
		this.spawnPoints.forEach((sp) => {
			if (sp.userData.hasOwnProperty('driver') && (sp.userData.driver === 'player')) {
				const pos = Utility.GridPosition(world.users, new THREE.Vector3(), 3, 3, 2)
				let tot = pos.length

				Object.keys(world.users).forEach((sID) => {
					if (world.users[sID] !== undefined) {
						const vsp: VehicleSpawnPoint = new (sp as any).constructor(sp.object, world)
						// console.log(pos[tot-1])
						vsp.playerData = {
							player: world.users[sID],
							position: pos[--tot]
						}
						let ent = vsp.spawn(world) // only vehicles
						if (ent === null) {
							console.log("Unknown Spawn: ", vsp.userData)
						}
					}
				})
			} else {
				let ent: Character | Vehicle = sp.spawn(world) // only vehicles
				if (ent === null) {
					console.log("Unknown Spawn: ", sp.userData)
				}
			}
		})

		// Spawn Players
		const playerPosition: THREE.Vector3 | null = this.playerPosition
		if (!this.spawnAlways && (playerPosition !== null)) {
			const pos = Utility.GridPosition(world.users, playerPosition)
			let tot = pos.length

			Object.keys(world.users).forEach((sID) => {
				if (world.users[sID] !== undefined) {
					world.users[sID].setSpawn(pos[--tot], this.isPlayerPositionNearVehicle, this.isPlayerPositionNearVehicle ? (this.initialCameraAngle + 180) : 0)
					world.users[sID].cameraOperator.theta = this.initialCameraAngle
					world.users[sID].cameraOperator.phi = 15
					world.users[sID].addUser(null)
				}
			})
		}
		this.world = world
	}
}
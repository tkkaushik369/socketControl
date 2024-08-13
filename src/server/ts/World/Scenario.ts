import * as THREE from 'three'
import { ISpawnPoint } from '../Interfaces/ISpawnPoint'
import { VehicleSpawnPoint } from './VehicleSpawnPoint'
import { CharacterSpawnPoint } from './CharacterSpawnPoint'
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

	constructor(root: THREE.Object3D, world: WorldBase) {
		this.rootNode = root
		this.world = world
		this.name = "_name_"
		this.descriptionTitle = "_descriptionTitle_"
		this.descriptionContent = "_descriptionContent_"
		this.initialCameraAngle = 0

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
					}
					/* else if (child.userData.type === 'player') {
						let sp = new CharacterSpawnPoint(child, child.userData)
						this.spawnPoints.push(sp)
					} */
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
		this.spawnPoints.forEach((sp) => {
			let ent: Character | Vehicle = sp.spawn(world)
			if (ent !== null) {
				ent.castShadow = true
				ent.receiveShadow = true
			} else {
				console.log("Unknown Spawn: ", sp.userData)
			}
		})

		if (!this.spawnAlways) {
			Object.keys(world.users).forEach((sID) => {
				world.users[sID].cameraOperator.theta = this.initialCameraAngle
				world.users[sID].cameraOperator.phi = 15
			})
		}
		this.world = world
	}
}
import * as THREE from 'three'
import { ISpawnPoint } from '../Interfaces/ISpawnPoint'
import { WorldBase } from './WorldBase'
import { Character } from '../Characters/Character'
import { RandomBehaviour } from '../Characters/CharacterAI/RandomBehaviour'
import * as Utils from '../Core/FunctionLibrary'

export class CharacterSpawnPoint implements ISpawnPoint {
	private object: THREE.Object3D
	public userData: { [id: string]: any }

	constructor(object: THREE.Object3D, userData: { [id: string]: any }) {
		// bind functions
		this.spawn = this.spawn.bind(this)

		// init
		this.object = object
		this.userData = userData
	}

	public spawn(world: WorldBase): Character {
		let player = new Character()
		player.uID = this.userData.name
		player.spawnPoint = this.object

		let worldPos = new THREE.Vector3()
		this.object.getWorldPosition(worldPos)
		player.setPosition(worldPos.x, worldPos.y, worldPos.z)

		let forward = Utils.getForward(this.object)
		player.setOrientation(forward, true)

		world.add(player)

		/* if (this.userData.type == 'player') {
			player.takeControl()
		} else */ if (this.userData.type == 'character_ai') {
			let behaviour = new RandomBehaviour(player)
			player.setBehaviour(behaviour)
		}
		return player
	}
}
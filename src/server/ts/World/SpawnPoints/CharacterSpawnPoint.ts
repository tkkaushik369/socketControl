import * as THREE from 'three'
import { ISpawnPoint } from '../../Interfaces/ISpawnPoint'
import { WorldBase } from '../WorldBase'
import { Character } from '../../Characters/Character'
import { RandomBehaviour } from '../../Characters/CharacterAI/RandomBehaviour'
import { Utility } from '../../Core/Utility'
import { MapConfig } from '../MapConfigs'

export class CharacterSpawnPoint implements ISpawnPoint {
	public object: THREE.Object3D
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
		const callerCharacter = (gltf: any) => {
			player.setModel(gltf)
			player.uID = this.userData.name
			player.spawnPoint = this.object

			let worldPos = new THREE.Vector3()
			this.object.getWorldPosition(worldPos)
			player.setPosition(worldPos.x, worldPos.y, worldPos.z)

			let forward = Utility.getForward(this.object)
			player.setOrientation(forward, true)

			world.add(player)

		/* if (this.userData.type == 'player') {
			player.takeControl()
		} else */ if (this.userData.type == 'character_ai') {
				let behaviour = new RandomBehaviour(player)
				player.setBehaviour(behaviour)
			}
		}
		if ((world.lastMapID !== null) && (MapConfig[world.lastMapID] !== undefined)) {
			for (let j = 0; j < MapConfig[world.lastMapID].characters.length; j++) {
				const char = MapConfig[world.lastMapID].characters[j]
				if (('character' == char.type) /* && (this.subtype == char.subtype) */) {
					if (typeof char.objCaller === 'string') {
						world.getGLTF(char.objCaller, (gltf: any) => {
							let model = gltf
							callerCharacter(model)
						})
					}
					break
				}
			}
		}
		return player
	}
}
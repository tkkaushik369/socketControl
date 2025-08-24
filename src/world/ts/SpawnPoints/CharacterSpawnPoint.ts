import * as THREE from 'three'
// import { ISpawnPoint } from '../Interfaces/ISpawnPoint'
import { SpawnBase } from './SpawnBase'
import { WorldBase } from '../WorldBase'
import { Character } from '../Characters/Character'
import { FollowPath } from '../Characters/CharacterAI/FollowPath'
import { FollowTarget } from '../Characters/CharacterAI/FollowTarget'
import { RandomBehaviour } from '../Characters/CharacterAI/RandomBehaviour'
import { Utility } from '../Core/Utility'
// import { clone as SkeletonUtilsClone } from 'three/examples/jsm/utils/SkeletonUtils'
// import { getMapConfig } from '../MapConfigs'

export class CharacterSpawnPoint extends SpawnBase {
	// public object: THREE.Object3D
	// public userData: { [id: string]: any }
	public firstAINode: string | null

	constructor(object: THREE.Object3D, userData: { [id: string]: any }) {
		super(object, userData)

		// bind functions
		this.spawn = this.spawn.bind(this)

		// init
		// this.object = object
		// this.userData = userData
		this.firstAINode = null

		if (this.userData.hasOwnProperty('first_node')) {
			this.firstAINode = this.userData.first_node
		}
	}

	public spawn(world: WorldBase): Character {
		super.spawn(world)
		let player = new Character()
		// const MapConfig = getMapConfig(world)
		const MapConfig = world.MapConfig
		const callerCharacter = (gltf: any) => {
			player.setModel(gltf, world.isClient)
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
			} else */
			if (this.userData.type == 'character_ai' && this.firstAINode !== null) {
				let nodeFound = false
				world.paths.forEach((path) => {
					Object.keys(path.nodes).forEach((nodeName) => {
						const node = path.nodes[nodeName]
						if (node.object.name === this.firstAINode) {
							player.setBehaviour(new FollowPath(player, node, 10))
							nodeFound = true
						}
					})
				})
				if (!nodeFound) {
					console.error('Path node ' + this.firstAINode + 'not found.')
				}
			} else if (this.userData.type == 'character_ai') {
				let behaviour = new RandomBehaviour(player)
				player.setBehaviour(behaviour)
			} else if (this.userData.type == 'character_follow') {
				if (this.userData.target !== undefined) {
					for (let i = 0; i < world.characters.length; i++) {
						if (this.userData.target === world.characters[i].uID) {
							let behaviour = new FollowTarget(player, world.characters[i])
							player.setBehaviour(behaviour)
							break
						}
					}
				}
			}
		}
		if (world.lastMapID !== null && MapConfig[world.lastMapID] !== undefined) {
			for (let j = 0; j < MapConfig[world.lastMapID].characters.length; j++) {
				const char = MapConfig[world.lastMapID].characters[j]
				if ('character' == char.type /* && (this.subtype == char.subtype) */) {
					if (typeof char.objCaller === 'string') {
						world.getGLTF(char.objCaller, (gltf: any) => {
							let model = gltf
							callerCharacter(model)
						})
					} else callerCharacter(this.clone(char.objCaller as any))
					break
				}
			}
		}
		return player
	}
}

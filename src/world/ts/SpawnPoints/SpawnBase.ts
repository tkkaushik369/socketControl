import * as THREE from 'three'
import { WorldBase } from '@World'
import { ISpawnPoint } from '../Interfaces/ISpawnPoint'
import { clone as SkeletonUtilsClone } from 'three/examples/jsm/utils/SkeletonUtils'

export abstract class SpawnBase implements ISpawnPoint {
	object: THREE.Object3D
	userData: { [id: string]: any }

	constructor(object: THREE.Object3D, userData: { [id: string]: any }) {
		this.object = object
		this.userData = userData
	}

	spawn(world: WorldBase): any {}

	clone(source: { scene: THREE.Object3D; animations: any[] }): { scene: THREE.Object3D; animations: any[] } {
		const clone = SkeletonUtilsClone(source.scene)
		return { scene: clone, animations: clone.animations }
	}
}

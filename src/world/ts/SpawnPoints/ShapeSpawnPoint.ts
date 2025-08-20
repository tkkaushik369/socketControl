import * as THREE from 'three'
import { WorldBase } from '../WorldBase'
import { ISpawnPoint } from '../Interfaces/ISpawnPoint'
import { BoxShapeEntity } from '../Physics/ShapeEntity/BoxShapeEntity'
import { SphereShapeEntity } from '../Physics/ShapeEntity/SphereShapeEntity'

export class ShapeSpawnPoint implements ISpawnPoint {
	public object: THREE.Object3D
	public userData: { [id: string]: any }

	constructor(object: THREE.Object3D, userData: { [id: string]: any }) {
		this.object = object
		this.userData = userData
	}

	public spawn(world: WorldBase): any {
		if (this.userData.subtype === "box") {
			const boxWorldEntity = new BoxShapeEntity(this.object, true)
			boxWorldEntity.uID = this.userData.name
			world.add(boxWorldEntity)
		} else if (this.userData.subtype === "sphere") {
			const sphereWorldEntity = new SphereShapeEntity(this.object, true)
			sphereWorldEntity.uID = this.userData.name
			world.add(sphereWorldEntity)
		}
	}
}

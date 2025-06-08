import * as THREE from 'three'
import { BoxCollider } from '../Colliders/BoxCollider'
import { IWorldEntity } from '../../Interfaces/IWorldEntity'
import { EntityType } from '../../Enums/EntityType'
import { WorldBase } from '@WorldBase'
import { Utility } from '../../Core/Utility'
import { CollisionGroups } from '../../Enums/CollisionGroups'

export class BoxWorldEntity implements IWorldEntity {
	public world: WorldBase
	public entityType: EntityType = EntityType.System
	public updateOrder: number = 5

	public hasDependency: boolean
	public mass: number
	public obj: THREE.Object3D
	public phys: BoxCollider

	constructor(world: WorldBase, obj: THREE.Object3D, hasDependency: boolean = false) {
		// bind functions
		this.addToWorld = this.addToWorld.bind(this)
		this.removeFromWorld = this.removeFromWorld.bind(this)
		this.update = this.update.bind(this)

		// init
		this.world = world
		this.obj = obj
		this.mass = 0
		this.hasDependency = hasDependency

		if (this.obj.userData.hasOwnProperty('mass')) {
			this.mass = this.obj.userData.mass
		}
		this.phys = new BoxCollider({
			size: new THREE.Vector3(this.obj.scale.x / 2, this.obj.scale.y / 2, this.obj.scale.z / 2),
			mass: this.mass,
		})
		this.phys.body.position.copy(Utility.cannonVector(this.obj.position))
		this.phys.body.quaternion.copy(Utility.cannonQuat(this.obj.quaternion))
		this.phys.body.updateAABB()

		this.phys.body.shapes.forEach((shape) => {
			shape.collisionFilterMask = ~CollisionGroups.TrimeshColliders
			// shape.collisionFilterMask = CollisionGroups.Default | CollisionGroups.Characters | CollisionGroups.TrimeshColliders
			// shape.collisionFilterGroup = CollisionGroups.Default
		})
	}

	public addToWorld(world: WorldBase): void {
		if (!this.hasDependency) {
			world.addSceneObject(this.obj)
		}
		world.addWorldObject(this.phys.body)
	}

	public removeFromWorld(world: WorldBase): void {
		if (!this.hasDependency) {
			world.removeSceneObject(this.obj)
		}
		world.removeWorldObject(this.phys.body)
	}

	public update(timestep: number, unscaledTimeStep: number): void {
		// console.log('updating box')
		this.obj.position.copy(Utility.threeVector(this.phys.body.position))
		this.obj.quaternion.copy(Utility.threeQuat(this.phys.body.quaternion))
		// this.obj.updateMatrixWorld()
	}
}

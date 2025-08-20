import * as THREE from 'three'
import * as _ from 'lodash'
import { SphereCollider } from '../Colliders/SphereCollider'
import { WorldBase } from '../../WorldBase'
import { Utility } from '../../Core/Utility'
import { CollisionGroups } from '../../Enums/CollisionGroups'
import { ShapeEntityBase } from './ShapeEntityBase'

export class SphereShapeEntity extends ShapeEntityBase {
	public phys: SphereCollider

	constructor(obj: THREE.Object3D, hasDependency: boolean = false) {
		super(obj, hasDependency)
		// bind functions
		this.addToWorld = this.addToWorld.bind(this)
		this.removeFromWorld = this.removeFromWorld.bind(this)
		this.update = this.update.bind(this)
		this.Out = this.Out.bind(this)
		this.Set = this.Set.bind(this)

		// init
		this.phys = new SphereCollider({
			radius: this.obj.userData.radius,
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
		// Register shapes
		world.shapes.push(this)
		world.addWorldObject(this.phys.body)
	}

	public removeFromWorld(world: WorldBase): void {
		// Remove from shapes
		_.pull(world.shapes, this)
		world.removeWorldObject(this.phys.body)
	}

	public update(timestep: number, unscaledTimeStep: number): void {
		// console.log('updating box')
		this.obj.position.copy(Utility.threeVector(this.phys.body.interpolatedPosition))
		this.obj.quaternion.copy(Utility.threeQuat(this.phys.body.interpolatedQuaternion))
		// this.obj.updateMatrixWorld()
	}

	Out(): { [id: string]: any } {
		var msg = super.Out()
		msg.data = {
				position: {
					x: this.phys.body.interpolatedPosition.x,
					y: this.phys.body.interpolatedPosition.y,
					z: this.phys.body.interpolatedPosition.z,
				},
				quaternion: {
					x: this.phys.body.interpolatedQuaternion.x,
					y: this.phys.body.interpolatedQuaternion.y,
					z: this.phys.body.interpolatedQuaternion.z,
					w: this.phys.body.interpolatedQuaternion.w,
				},
			}
		return msg
	}
	Set(messages: any): void {
		super.Set(messages)
		// console.log(messages.data)
		if (this.world) this.world.zeroBody(this.phys.body)

		this.phys.body.position.set(
			messages.data.position.x,
			messages.data.position.y,
			messages.data.position.z
		)
		this.phys.body.quaternion.set(
			messages.data.quaternion.x,
			messages.data.quaternion.y,
			messages.data.quaternion.z,
			messages.data.quaternion.w
		)
		this.phys.body.interpolatedPosition.set(
			messages.data.position.x,
			messages.data.position.y,
			messages.data.position.z
		)
		this.phys.body.interpolatedQuaternion.set(
			messages.data.quaternion.x,
			messages.data.quaternion.y,
			messages.data.quaternion.z,
			messages.data.quaternion.w
		)
	}
}

import * as THREE from 'three'
import * as WorldObjectPhysics from './WorldObjectPhysics'
import { Message } from '../Messages/Message'
import { messageTypes } from '../Enums/messageTypes'

export default class WorldObject extends THREE.Object3D {

	public isWorldObject = true
	public model: THREE.Mesh | undefined
	public physics: WorldObjectPhysics.Physics

	public messageType: messageTypes
	public timeStamp: number
	public ping: number

	constructor(model: THREE.Mesh | undefined, physics: WorldObjectPhysics.Physics) {
		super()

		this.isWorldObject = true

		this.model = model
		this.physics = physics

		this.messageType = messageTypes.worldObjectData
		this.timeStamp = Date.now()
		this.ping = -1
	}

	public update(timeStamp: number, mesh: boolean = false, force: boolean = false) {
		if ((this.physics !== undefined) && (this.physics.physical !== undefined)) {
			if (force) {
				this.position.copy(this.physics.physical.position)
				this.quaternion.copy(this.physics.physical.quaternion)
			} else {
				this.position.copy(this.physics.physical.interpolatedPosition)
				this.quaternion.copy(this.physics.physical.interpolatedQuaternion)
			}
		}

		if ((this.model !== undefined) && mesh) {
			this.model.position.copy(this.position)
			this.model.quaternion.copy(this.quaternion)
		}
	}

	public setModel(model: THREE.Mesh | undefined = undefined) {
		this.model = model
	}

	public setModelFromPhysicsShape() {
		this.model = this.physics.getVisualModel({ visible: true, wireframe: false })
	}

	public setPhysics(physics: WorldObjectPhysics.Physics) {
		this.physics = physics
	}

	public Out(): Message {
		return {
			id: this.id.toString(),
			userName: this.name,
			type: this.messageType,
			data: {
				count: -1,
				position: {
					x: this.position.x,
					y: this.position.y,
					z: this.position.z,
				},
				quaternion: {
					x: this.quaternion.x,
					y: this.quaternion.y,
					z: this.quaternion.z,
					w: this.quaternion.w,
				},
			},
			timeStamp: this.timeStamp,
			ping: this.ping,
		}
	}
}
import * as THREE from 'three'
import * as WorldObjectPhysics from './WorldObjectPhysics'
import { Message } from '../Messages/Message'
import { messageTypes } from '../Enums/messageTypes'

export default class WorldObject extends THREE.Object3D {

	public isWorldObject = true
	public model: THREE.Mesh | undefined
	public physics: WorldObjectPhysics.Physics | undefined

	public messageType: messageTypes
	public timeStamp: number
	public ping: number

	constructor(model: THREE.Mesh | undefined, physics: any = undefined) {
		super()
		this.update = this.update.bind(this)
		this.setModel = this.setModel.bind(this)
		this.setModelFromPhysicsShape = this.setModelFromPhysicsShape.bind(this)
		this.setPhysics = this.setPhysics.bind(this)
		this.Out = this.Out.bind(this)

		this.isWorldObject = true

		this.model = model
		this.physics = physics

		this.messageType = messageTypes.worldObjectData
		this.timeStamp = Date.now()
		this.ping = -1
	}

	public update(timeStamp: number, mesh: boolean = false) {
		if ((this.physics !== undefined) && (this.physics.physical !== undefined)) {
			this.position.copy(this.physics.physical.position)
			this.quaternion.copy(this.physics.physical.quaternion)
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
		if (this.physics !== undefined) this.model = this.physics.getVisualModel({ visible: true, wireframe: false })
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
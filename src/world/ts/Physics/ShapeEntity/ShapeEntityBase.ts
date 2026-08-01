import * as THREE from 'three'
import * as _ from 'lodash'
import { IWorldEntity } from '../../Interfaces/IWorldEntity'
import { INetwork } from '../../Interfaces/INetwork'
import { MessageTypes } from '../../Enums/MessageTypes'
import { EntityType } from '../../Enums/EntityType'
import { WorldBase } from '../../WorldBase'
import { IUpdatable } from '../../Interfaces/IUpdatable'
import { ICollider } from '../../Interfaces/ICollider'
import { Portal } from '../../Worldentities/Portal'

export class ShapeEntityBase implements IWorldEntity, INetwork, IUpdatable {
	public uID: string | null
	public msgType: MessageTypes
	public timeStamp: number
	public ping: number

	public world: WorldBase | null
	public entityType: EntityType = EntityType.Shape
	public updateOrder: number = 5

	public portal_cooldown: number = 0
	public portal_previousSides: Map<Portal, number> = new Map<Portal, number>()
	public hasDependency: boolean
	public mass: number
	public obj: THREE.Object3D
	public phys: ICollider | null

	constructor(obj: THREE.Object3D, hasDependency: boolean = false) {
		// bind functions
		this.addToWorld = this.addToWorld.bind(this)
		this.removeFromWorld = this.removeFromWorld.bind(this)
		this.update = this.update.bind(this)
		this.Out = this.Out.bind(this)
		this.Set = this.Set.bind(this)

		// init
		this.uID = null
		this.msgType = MessageTypes.Shape
		this.timeStamp = Date.now()
		this.ping = 0

		this.world = null
		this.obj = obj
		this.mass = 0
		this.hasDependency = hasDependency
		this.phys = null

		if (this.obj.userData.hasOwnProperty('mass')) {
			this.mass = this.obj.userData.mass
		}
	}

	public addToWorld(world: WorldBase): void {
		if (!this.hasDependency) {
			world.addSceneObject(this.obj)
		}
		this.world = world
	}

	public removeFromWorld(world: WorldBase): void {
		if (!this.hasDependency) {
			world.removeSceneObject(this.obj)
		}
	}

	public update(timestep: number, unscaledTimeStep: number): void {}

	Out(): { [id: string]: any } {
		return {
			uID: this.uID,
			msgType: this.msgType,
			timeStamp: this.timeStamp,
			ping: this.ping,

			data: {},
		}
	}
	Set(messages: any): void {}
}

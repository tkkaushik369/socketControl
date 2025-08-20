import * as THREE from 'three'
import { InteractiveGroup } from '../Core/InteractiveGroup'
import { IWorldEntity } from '../Interfaces/IWorldEntity'
import { INetwork } from '../Interfaces/INetwork'
import { IAudible } from '../Interfaces/IAudible'
import { EntityType } from '../Enums/EntityType'
import { WorldBase } from '../WorldBase'
import { MessageTypes } from '../Enums/MessageTypes'

export class Speaker extends THREE.Object3D implements IWorldEntity, INetwork, IAudible {
	entityType: EntityType = EntityType.Speaker
	updateOrder: number = 11

	uID: string | null
	msgType: MessageTypes = MessageTypes.Speaker
	timeStamp: number
	ping: number
	interractiveGroup: InteractiveGroup | null

	audio: {
		dom: HTMLAudioElement | null
		domui: HTMLDivElement | null
		source: HTMLSourceElement | null
		posaudio: THREE.PositionalAudio | null
	}

	constructor() {
		super()

		this.uID = null
		this.timeStamp = Date.now()
		this.ping = 0
		this.interractiveGroup = null

		this.audio = {
			dom: null,
			domui: null,
			source: null,
			posaudio: null,
		}

		const mesh = new THREE.Mesh(
			new THREE.SphereGeometry(0.5, 8, 4),
			new THREE.MeshPhongMaterial({ color: 0xffff00, wireframe: true })
		)
		mesh.position.set(0, 1, 0)
		this.add(mesh)
	}

	addToWorld(world: WorldBase): void {
		world.addSceneObject(this)
	}

	removeFromWorld(world: WorldBase): void {
		world.removeSceneObject(this)
	}

	update(timestep: number, unscaledTimeStep: number): void {}

	Out(): { [id: string]: any } {
		return {}
	}
	Set(messages: any): void {}
}

import * as THREE from 'three'
import { Message } from "./Messages/Message"
import { messageTypes } from './Enums/messageTypes'

export class Player implements Message {
	public id: string
	public userName: string | null
	public type: messageTypes
	public data: {
		count: number,
		currentScenarioIndex: number
	}

	public timeStamp: number
	public ping: number
	public mesh: THREE.Object3D

	constructor(id: string) {
		this.id = id
		this.userName = null
		this.type = messageTypes.playerData
		this.data = {
			count: -1,
			currentScenarioIndex: 0,
		}

		this.timeStamp = Date.now()
		this.ping = -1
		this.mesh = new THREE.Object3D()
	}

	public Out(): Message {
		return {
			id: this.id,
			userName: this.userName,
			type: this.type,
			data: {
				count: this.data.count,
				currentScenarioIndex: this.data.currentScenarioIndex,
			},
			timeStamp: this.timeStamp,
			ping: this.ping,
		}
	}
}
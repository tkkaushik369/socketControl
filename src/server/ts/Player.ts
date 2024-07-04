import * as THREE from 'three'
import { Message } from "./Messages/Message"
import { messageTypes } from './Enums/messageTypes'

export class Player implements Message {
	public id: string
	public userName: string | null
	public type: messageTypes
	public data: {
		count: number,
		currentScenarioIndex: number,
		TimeScale: number,
		timeScaleTarget: number,
		controls: {
			isCharacter: boolean,
			name: string | null,
			viewVector: THREE.Vector3,
		}
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
			TimeScale: 1,
			timeScaleTarget: 1,
			controls: {
				isCharacter: false,
				name: null,
				viewVector: new THREE.Vector3(),
			}
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
				TimeScale: this.data.TimeScale,
				timeScaleTarget: this.data.timeScaleTarget,
				controls: {
					isCharacter: this.data.controls.isCharacter,
					name: this.data.controls.name,
					viewVector: {
						x: this.data.controls.viewVector.x,
						y: this.data.controls.viewVector.y,
						z: this.data.controls.viewVector.z,
					}
				}
			},
			timeStamp: this.timeStamp,
			ping: this.ping,
		}
	}
}
import * as THREE from 'three'
import { PlayerData, PlayerDataData } from "./Messages/Message"

export class Player implements PlayerData {
	public id: string
	public userName: string | null
	public data: { count: number }

	public timeStamp: number
	public ping: number
	public mesh: THREE.Object3D

	constructor(id: string) {
		this.id = id
		this.userName = null
		this.data = {
			count: -1
		}

		this.timeStamp = Date.now()
		this.ping = -1
		this.mesh = new THREE.Object3D()
	}

	public Out(): PlayerData {
		return {
			id: this.id,
			userName: this.userName,
			data: {
				count: this.data.count
			},
			timeStamp: this.timeStamp,
			ping: this.ping,
		}
	}
}
import * as THREE from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import { Player } from '../../../server/ts/Core/Player'

export class PlayerClient extends Player {

	isMe: boolean

	constructor(sID: string, camera: THREE.PerspectiveCamera, domElement: HTMLElement | null, isMe: boolean) {
		super(sID, camera, domElement)

		// bind functions
		this.setUID = this.setUID.bind(this)

		// init
		this.isMe = isMe
	}

	public setUID(uID: string) {
		super.setUID(uID)

		// const lod = new THREE.LOD();

		{
			const labelDiv = document.createElement('div')
			labelDiv.className = 'label' + (this.isMe ? ' me' : '')
			labelDiv.textContent = uID + (this.isMe ? ' (YOU)' : '')

			const label = new CSS2DObject(labelDiv)
			label.position.set(0, 1.2, 0)
			// lod.addLevel(label, 5)

			this.attachments.push({ obj: label, addToWorld: false })
		}

		/* {
			const labelDiv = document.createElement('div')
			labelDiv.className = 'label far' + (this.isMe ? ' me' : '')
			labelDiv.textContent = uID + (this.isMe ? ' (YOU)' : '')

			const label = new CSS2DObject(labelDiv)
			label.position.set(0, 1.2, 0)
			lod.addLevel(label, 50)
		}

		this.attachments.push({ obj: lod, addToWorld: false }) */
	}
}
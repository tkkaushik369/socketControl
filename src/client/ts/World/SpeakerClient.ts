import * as THREE from 'three'
import { InteractiveGroup } from '../../../server/ts/Core/InteractiveGroup'
import { HTMLMesh } from 'three/examples/jsm/interactive/HTMLMesh.js'
import { Speaker } from '../../../server/ts/World/Spaker'
import { WorldBase } from '../../../server/ts/World/WorldBase'

export class SpeakerClient extends Speaker {

	constructor(world: WorldBase, renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera) {
		super()

		this.interractiveGroup = new InteractiveGroup(world)
		this.interractiveGroup.listenToPointerEvents(renderer, camera);
		// this.interractiveGroup.listenToXRControllerEvents(controller1);
		// this.interractiveGroup.listenToXRControllerEvents(controller2);
		this.add(this.interractiveGroup)
	}

	addToWorld(world: WorldBase): void {
		super.addToWorld(world)
		if (this.audio.domui === null) return

		let htmlMesh = new HTMLMesh(this.audio.domui)
		htmlMesh.name = "speaker"
		htmlMesh.material.side = THREE.DoubleSide
		htmlMesh.position.set(-1, 1, 0)
		htmlMesh.scale.setScalar(1);
		htmlMesh.material.needsUpdate = true
		if (htmlMesh.material.map !== null) {
			htmlMesh.material.map.needsUpdate = true
			htmlMesh.material.map.matrixAutoUpdate = true
		}


		if (this.interractiveGroup) {
			this.interractiveGroup.add(htmlMesh)
		}
	}
}
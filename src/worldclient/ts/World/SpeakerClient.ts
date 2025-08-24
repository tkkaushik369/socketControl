import * as THREE from 'three'
import { InteractiveGroup, WorldBase, Speaker } from '@World'
import { HTMLMesh } from 'three/examples/jsm/interactive/HTMLMesh.js'

export class SpeakerClient extends Speaker {
	constructor(world: WorldBase, renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera) {
		super()

		this.interractiveGroup = new InteractiveGroup(world)
		this.interractiveGroup.listenToPointerEvents(renderer, camera)
		// this.interractiveGroup.listenToXRControllerEvents(controller1);
		// this.interractiveGroup.listenToXRControllerEvents(controller2);
		this.add(this.interractiveGroup)
	}

	addToWorld(world: WorldBase): void {
		super.addToWorld(world)

		const allAudios = document.getElementById('all-audios')
		// console.log(allAudios)
		if (allAudios === null) return

		const audioDom = document.createElement('audio')
		audioDom.preload = 'auto'
		audioDom.loop = true
		audioDom.style.display = 'none'

		const sourceDom = document.createElement('source')
		sourceDom.src = '../client/audios/358232_j_s_song.mp3'
		sourceDom.type = 'audio/wav'

		let domui = document.createElement('div')
		domui.style.backgroundColor = 'red'
		domui.style.position = 'absolute'
		domui.style.width = '400px'
		domui.style.height = '200px'
		domui.style.visibility = 'hidden'

		{
			const label = document.createElement('label')
			label.style.position = 'absolute'
			label.style.left = '50%'
			label.style.transform = 'translateX(-50%)'
			label.style.bottom = '20px'
			label.style.textAlign = 'center'
			label.innerText = 'Play Audio'
			domui.appendChild(label)

			const input = document.createElement('input')
			input.type = 'checkbox'
			input.style.position = 'absolute'
			input.style.left = '50%'
			input.style.transform = 'translateX(-50%)'
			input.style.bottom = '20px'
			input.style.width = '60px'
			input.style.height = '60px'
			input.onclick = () => {
				if (input.parentElement !== null) {
					if (input.checked) {
						audioDom.play()
						input.parentElement.style.backgroundColor = 'green'
					} else {
						audioDom.pause()
						input.parentElement.style.backgroundColor = 'red'
					}
				}
			}
			domui.appendChild(input)
		}

		audioDom.appendChild(sourceDom)
		audioDom.appendChild(domui)

		allAudios.appendChild(audioDom)

		console.log(world.listener)
		if (world.listener !== null) {
			const sound1 = new THREE.PositionalAudio(world.listener)
			sound1.setMediaElementSource(audioDom)
			sound1.setRefDistance(0.5)
			// audioDom.play()

			this.add(sound1)

			this.audio = {
				dom: audioDom,
				domui: domui,
				source: sourceDom,
				posaudio: sound1,
			}

			// console.log(this.audio)
		}

		let htmlMesh = new HTMLMesh(domui)
		htmlMesh.name = 'speaker'
		htmlMesh.material.side = THREE.DoubleSide
		htmlMesh.position.set(-1, 1, 0)
		htmlMesh.scale.setScalar(1)
		htmlMesh.material.needsUpdate = true
		if (htmlMesh.material.map !== null) {
			htmlMesh.material.map.needsUpdate = true
			htmlMesh.material.map.matrixAutoUpdate = true
		}

		if (this.interractiveGroup) {
			this.interractiveGroup.add(htmlMesh)
		}
	}

	removeFromWorld(world: WorldBase): void {
		super.removeFromWorld(world)

		const allAudios = document.getElementById('all-audios')
		console.log(this.audio,allAudios)
		if (allAudios === null) return
		if (this.audio.dom !== null) allAudios.removeChild(this.audio.dom)
	}
}

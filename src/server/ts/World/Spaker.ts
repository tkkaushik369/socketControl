import * as  THREE from 'three'
import { InteractiveGroup } from '../Core/InteractiveGroup'
import { IWorldEntity } from '../Interfaces/IWorldEntity'
import { INetwork } from '../Interfaces/INetwork'
import { IAudible } from '../Interfaces/IAudible'
import { EntityType } from '../Enums/EntityType'
import { WorldBase } from './WorldBase'
import { MessageTypes } from '../Enums/MessagesTypes'

export class Speaker extends THREE.Object3D implements IWorldEntity, INetwork, IAudible {
	entityType: EntityType = EntityType.Speaker
	updateOrder: number = 5

	uID: string | null
	msgType: MessageTypes = MessageTypes.Speaker
	timeStamp: number
	ping: number
	interractiveGroup: InteractiveGroup | null

	audio: {
		dom: HTMLAudioElement | null,
		domui: HTMLDivElement | null,
		source: HTMLSourceElement | null,
		posaudio: THREE.PositionalAudio | null,
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
			posaudio: null
		}

		const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 4), new THREE.MeshPhongMaterial({ color: 0xffff00, wireframe: true }))
		mesh.position.set(0, 1, 0)
		this.add(mesh)
	}

	addToWorld(world: WorldBase): void {
		if (!world.isClient) return
		const allAudios = document.getElementById('all-audios')
		if (allAudios === null) return

		const audioDom = document.createElement('audio')
		audioDom.preload = 'auto'
		audioDom.loop = true
		audioDom.style.display = 'none'

		const sourceDom = document.createElement('source')
		sourceDom.src = 'audios/358232_j_s_song.mp3'
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
			input.style.width = "60px"
			input.style.height = "60px"
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

		document.body.appendChild(domui)

		audioDom.appendChild(sourceDom)
		allAudios.appendChild(audioDom)

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
		}

		world.addSceneObject(this)
	}

	removeFromWorld(world: WorldBase): void {
		if (!world.isClient) return
		const allAudios = document.getElementById('all-audios')
		if (allAudios === null) return

		if (this.audio.dom !== null)
			allAudios.removeChild(this.audio.dom)

		world.removeSceneObject(this)
	}

	update(timestep: number, unscaledTimeStep: number): void { }

	Out(): { [id: string]: any } {
		return {}
	}
	Set(messages: any): void { }
}
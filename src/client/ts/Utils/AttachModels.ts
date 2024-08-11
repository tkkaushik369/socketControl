import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { Character } from '../../../server/ts/Characters/Character'
import { Idle } from '../../../server/ts/Characters/CharacterStates/_CharacterStateLibrary'

// mute color => console.log((75).toString(16), (170).toString(16))

export class AttachModels {

	public static makeCamera() {
		const group = new THREE.Group()
		{
			const camera = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1, 0.4), new THREE.MeshBasicMaterial({ color: 0x888888, wireframe: false }))
			group.add(camera)

			const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.2, 10, 1), new THREE.MeshBasicMaterial({ color: 0x2a2a2a, wireframe: false }))
			lens.rotateX(Math.PI / 2)
			lens.position.z = -0.3
			group.add(lens)

			let scale = 0.3
			group.scale.set(scale, scale, scale)
		}
		return group
	}

	public static makePointHighlight(scale: number = 1) {
		const group = new THREE.Group()
		{
			const geometry = new THREE.CircleGeometry(0.5, 24);
			const edges = new THREE.EdgesGeometry(geometry);

			const lineX = new THREE.LineSegments(edges, new THREE.LineDashedMaterial({ color: 0x00ffff, linewidth: 2, dashSize: 0.12, gapSize: 0.04 }))
			lineX.computeLineDistances()
			lineX.rotateY(Math.PI / 2)
			group.add(lineX)

			const lineY = new THREE.LineSegments(edges, new THREE.LineDashedMaterial({ color: 0xff00ff, linewidth: 2, dashSize: 0.12, gapSize: 0.04 }))
			lineY.computeLineDistances()
			lineY.rotateX(Math.PI / 2)
			group.add(lineY)

			const lineZ = new THREE.LineSegments(edges, new THREE.LineDashedMaterial({ color: 0xffff00, linewidth: 2, dashSize: 0.12, gapSize: 0.04 }))
			lineZ.computeLineDistances();
			group.add(lineZ)

			const sphereMesh = new THREE.Mesh(new THREE.SphereGeometry(0.2), new THREE.MeshBasicMaterial({ color: 0xcccccc }))
			group.add(sphereMesh)
		}
		group.scale.set(scale, scale, scale)
		group.userData = {
			name: "pointHelper"
		}
		return group
	}

	public static makePoint() {
		const geometry = new THREE.BufferGeometry()
		const vertices = [];
		vertices.push(0, 0, 0)
		geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

		const particles = new THREE.Points(geometry, new THREE.PointsMaterial({
			color: 0xcccccc,
			size: 10,
			sizeAttenuation: false,
			depthTest: false,
		}));

		return particles
	}

	public static makeCharacter(character: Character, callBack: Function | null = null) {
		const loadingManager = new GLTFLoader()
		loadingManager.load('models/boxman.glb', (gltf: any) => {
			let anim: { [id: string]: number } = {}
			character.setModel(gltf)
			character.animations.forEach((anime) => {
				anim[anime.name] = anime.duration
			})
			console.log(anim)
			if (character.world !== null) {
				character.world.characters.forEach((char) => {
					char.allAnim = anim
				})
			}
			character.charState = new Idle(character)
			character.charState.onInputChange()
			if (character.player !== null) {
				if (callBack !== null) {
					callBack(character.player.uID, anim)
				}
			}
		})
	}
}
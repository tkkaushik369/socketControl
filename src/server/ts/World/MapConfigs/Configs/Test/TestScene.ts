import * as THREE from 'three'
import { BaseScene } from '../../../BaseScene'

export class TestScene extends BaseScene {

	constructor() {
		super()

		const segmentHeight = 8
		const segmentCount = 4
		const height = segmentHeight * segmentCount
		const halfHeight = height * 0.5

		const sizing = {
			segmentHeight: segmentHeight,
			segmentCount: segmentCount,
			height: height,
			halfHeight: halfHeight
		}

		const geometry = this.createGeometry(sizing)
		const bones = this.createBones(sizing)
		const mesh = this.createMesh(geometry, bones)

		mesh.scale.multiplyScalar(1)
		this.scene.add(mesh)

		this.sceneAnimations.push(this.CreateRotationAnimation('rotate', 1000))
		this.sceneAnimations.push(this.CreateShakeAnimation('shake', 10000, new THREE.Vector3(0, 1, 0)))
	}

	private createGeometry(sizing: { [id: string]: any }) {
		const geometry = new THREE.CylinderGeometry(
			5, // radiusTop
			5, // radiusBottom
			sizing.height, // height
			8, // radiusSegments
			sizing.segmentCount * 3, // heightSegments
			true // openEnded
		)

		const position = geometry.attributes.position
		const vertex = new THREE.Vector3()
		const skinIndices = []
		const skinWeights = []

		for (let i = 0; i < position.count; i++) {
			vertex.fromBufferAttribute(position, i)
			const y = (vertex.y + sizing.halfHeight)
			const skinIndex = Math.floor(y / sizing.segmentHeight)
			const skinWeight = (y % sizing.segmentHeight) / sizing.segmentHeight
			skinIndices.push(skinIndex, skinIndex + 1, 0, 0)
			skinWeights.push(1 - skinWeight, skinWeight, 0, 0)

		}

		geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4))
		geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4))

		return geometry
	}

	private createBones(sizing: { [id: string]: any }) {
		const bones = []
		let prevBone = new THREE.Bone()
		bones.push(prevBone)
		prevBone.position.y = - sizing.halfHeight
		for (let i = 0; i < sizing.segmentCount; i++) {
			const bone = new THREE.Bone()
			bone.position.y = sizing.segmentHeight
			bones.push(bone)
			prevBone.add(bone)
			prevBone = bone
		}
		return bones
	}

	private createMesh(geometry: THREE.BufferGeometry, bones: THREE.Bone[]) {
		const material = new THREE.MeshPhongMaterial({
			color: 0x156289,
			emissive: 0x072534,
			side: THREE.DoubleSide,
			flatShading: true
		})

		const mesh = new THREE.SkinnedMesh(geometry, material)
		const skeleton = new THREE.Skeleton(bones)
		mesh.add(bones[0])
		mesh.bind(skeleton)
		const skeletonHelper = new THREE.SkeletonHelper(mesh)
		// skeletonHelper.material.linewidth = 2
		this.scene.add(skeletonHelper)
		return mesh
	}

	private CreateRotationAnimation(name: string, period: number, axis = 'x') {
		const times = [0, period], values = [0, 360]
		const trackName = '.rotation[' + axis + ']'
		const track = new THREE.NumberKeyframeTrack(trackName, times, values)
		return new THREE.AnimationClip(name, period, [track])
	}

	private CreateShakeAnimation(name: string, duration: number, shakeScale: THREE.Vector3) {

		const times = [], values: number[] = [], tmp = new THREE.Vector3()
		for (let i = 0; i < duration * 10; i++) {
			times.push(i / 10)
			tmp.set(Math.random() * 2.0 - 1.0, Math.random() * 2.0 - 1.0, Math.random() * 2.0 - 1.0).
				multiply(shakeScale).
				toArray(values, values.length)
		}

		const trackName = '.position'
		const track = new THREE.VectorKeyframeTrack(trackName, times, values)
		return new THREE.AnimationClip(name, duration, [track])
	}
}
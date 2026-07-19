import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { Utility } from '../../Core/Utility'
import { ICollider } from '../../Interfaces/ICollider'

export class HeightMapCollider implements ICollider {
	public mesh: any
	public options: any
	public body: CANNON.Body
	public debugModel: any

	constructor(mesh: THREE.Object3D, options: any) {
		this.mesh = mesh.clone()

		let defaults = {
			mass: 0,
			position: mesh.position,
			// rotation: mesh.quaternion,
			friction: 0.3,
			scale: 1,
		}
		options = Utility.setDefaults(options, defaults)
		this.options = options

		let bufferGeometry = (this.mesh as THREE.Mesh).geometry as THREE.PlaneGeometry

		// Add phys sphere
		let physBox = new CANNON.Body({
			mass: this.options.mass,
			// position: options.position,
			// quaternion: options.rotation,
		})

		let mat = new CANNON.Material('triMat')
		mat.friction = this.options.friction
		physBox.material = mat

		var sizeX = bufferGeometry.parameters.width + 1
		var sizeZ = bufferGeometry.parameters.height + 1

		var matrix: number[][] = []
		let inx = 2
		for (let i = sizeX - 1; i >= 0; i--) {
			// for (let i = 0; i < sizeX; i++) {
			matrix.push([])
			for (let j = sizeZ - 1; j >= 0; j--) {
				// for (let j = 0; j < sizeZ; j++) {
				const height = bufferGeometry.attributes.position.array[inx] * this.options.scale
				inx += 3
				matrix[sizeX - 1 - i].push(height)
			}
		}

		// Create the heightfield
		const heightfieldShape = new CANNON.Heightfield(matrix, {
			elementSize: this.options.scale,
		})
		const pos = new THREE.Vector3()
		mesh.getWorldPosition(pos)
		const quat = new THREE.Quaternion()
		mesh.getWorldQuaternion(quat)

		physBox.addShape(
			heightfieldShape,
			new CANNON.Vec3(-((sizeX - 1) * this.options.scale) / 2, -((sizeZ - 1) * this.options.scale) / 2, 0)
		)

		// physBox.position.set(pos.x - (sizeX * this.options.scale) / 2, pos.y, pos.z - (sizeZ * this.options.scale) / 2)
		physBox.position.set(pos.x, pos.y, pos.z)
		const rot = new CANNON.Vec3(0, 0, 0)
		physBox.quaternion.set(quat.x, quat.y, quat.z, quat.w)
		physBox.quaternion.toEuler(rot)
		// console.log(mesh.rotation)
		// const rot = new CANNON.Vec3(0, 0, 0)
		// physBox.quaternion.set(quat.x, quat.y, quat.z, quat.w)
		// physBox.quaternion.toEuler(rot)
		// console.log(rot)
		// rot.z += Math.PI / 2
		physBox.quaternion.setFromEuler(rot.x, rot.z, rot.y - Math.PI / 2)
		// physBox.quaternion.setFromEuler(mesh.rotation.x, mesh.rotation.y, mesh.rotation.z - Math.PI / 2)

		// console.log(pos)

		if (
			this.mesh.userData.hasOwnProperty('force_scale') &&
			this.mesh.userData.force_scale.hasOwnProperty('times')
		) {
			this.mesh.scale.set(
				this.mesh.userData.force_scale.times,
				this.mesh.userData.force_scale.times,
				this.mesh.userData.force_scale.times
			)
			// pos.multiplyScalar(1 / this.mesh.userData.force_scale.times)
		}

		// console.log(physBox.position)

		this.body = physBox
	}
}

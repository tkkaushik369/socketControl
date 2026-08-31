import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { Utility } from '../../Core/Utility'
import { ICollider } from '../../Interfaces/ICollider'
import { threeToCannon, ShapeType } from 'three-to-cannon'

export class TrimeshCollider implements ICollider {
	public mesh: any
	public options: any
	public body: CANNON.Body
	public debugModel: any

	constructor(mesh: THREE.Object3D, options: any) {
		this.mesh = mesh.clone()

		let defaults = {
			mass: 0,
			position: new CANNON.Vec3(),
			rotation: new CANNON.Quaternion(),
			friction: 0.3,
		}
		options = Utility.setDefaults(options, defaults)
		this.options = options

		// Add phys sphere
		let physBox = new CANNON.Body({
			mass: options.mass,
			position: options.position,
			quaternion: options.rotation,
		})

		let mat = new CANNON.Material('triMat')
		mat.friction = options.friction
		physBox.material = mat

		let bufferGeometry = (this.mesh as THREE.Mesh).geometry
		let indices = []
		let vertices = []

		const pos = new THREE.Vector3()
		mesh.getWorldPosition(pos)
		const quat = new THREE.Quaternion()
		mesh.getWorldQuaternion(quat)
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
		// console.log(pos)

		let indicesBuffer = bufferGeometry.getIndex()
		if (indicesBuffer !== null) {
			let inxBuff = indicesBuffer.array
			let vertBuff = bufferGeometry.attributes.position.array
			inxBuff.forEach((i) => {
				indices.push(i)
			})
			for (let i = 0; i < inxBuff.length; i++) {
				indices.push(inxBuff[i])
			}
			for (let i = 0; i < vertBuff.length; i++) {
				vertices.push(vertBuff[i])
			}

			bufferGeometry.setAttribute('position', new THREE.BufferAttribute(Utility.vertInx(indices, vertices), 3))
			bufferGeometry.computeVertexNormals()
		}

		let shape = threeToCannon(this.mesh, { type: ShapeType.MESH })
		if (shape != null) {
			physBox.addShape(shape.shape)
		}
		if (
			this.mesh.userData.hasOwnProperty('force_scale') &&
			this.mesh.userData.force_scale.hasOwnProperty('times')
		) {
			physBox.position.set(pos.x, pos.y, pos.z)
			physBox.quaternion.set(quat.x, quat.y, quat.z, quat.w)
		}
		this.body = physBox
	}
}

import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import * as _ from 'lodash'
import { Space } from '../Enums/Space'
import { Side } from '../Enums/Side'
import { SimulationFrame } from '../Physics/SpringSimulation/SimulationFrame'
import { WorldBase } from '../World/WorldBase'
import { Vehicle } from '../Vehicles/Vehicle'
import { VehicleSeat } from '../Vehicles/VehicleSeat'

export class Utility {
	static getRight(obj: THREE.Object3D, space: Space = Space.Global): THREE.Vector3 {
		const matrix = Utility.getMatrix(obj, space)
		return new THREE.Vector3(
			matrix.elements[0],
			matrix.elements[1],
			matrix.elements[2]
		)
	}

	static getUp(obj: THREE.Object3D, space: Space = Space.Global): THREE.Vector3 {
		const matrix = Utility.getMatrix(obj, space)
		return new THREE.Vector3(
			matrix.elements[4],
			matrix.elements[5],
			matrix.elements[6]
		)
	}

	static getForward(obj: THREE.Object3D, space: Space = Space.Global): THREE.Vector3 {
		const matrix = Utility.getMatrix(obj, space)
		return new THREE.Vector3(
			matrix.elements[8],
			matrix.elements[9],
			matrix.elements[10]
		)
	}

	static getBack(obj: THREE.Object3D, space: Space = Space.Global): THREE.Vector3 {
		const matrix = Utility.getMatrix(obj, space)
		return new THREE.Vector3(
			-matrix.elements[8],
			-matrix.elements[9],
			-matrix.elements[10]
		)
	}

	static getMatrix(obj: THREE.Object3D, space: Space): THREE.Matrix4 {
		switch (space) {
			case Space.Local: return obj.matrix
			case Space.Global: return obj.matrixWorld
		}
	}

	static setupMeshProperties(child: any): void {
		child.castShadow = true
		child.receiveShadow = true

		if (child.material.map !== null) {
			let mat = new THREE.MeshPhongMaterial()
			mat.shininess = 0
			mat.name = child.material.name
			mat.map = child.material.map
			if (mat.map !== null) mat.map.anisotropy = 4
			mat.aoMap = child.material.aoMap
			mat.transparent = child.material.transparent
			// mat.skinning = child.material.skinning
			// mat.shadowSide = THREE.FrontSide
			child.material = mat
		}
	}

	static setDefaults(options: {}, defaults: {}): {} {
		return _.defaults({}, _.clone(options), defaults)
	}

	static threeVector(vec: CANNON.Vec3): THREE.Vector3 {
		return new THREE.Vector3(vec.x, vec.y, vec.z)
	}

	static cannonVector(vec: THREE.Vector3): CANNON.Vec3 {
		return new CANNON.Vec3(vec.x, vec.y, vec.z)
	}

	static threeQuat(quat: CANNON.Quaternion): THREE.Quaternion {
		return new THREE.Quaternion(quat.x, quat.y, quat.z, quat.w)
	}

	static cannonQuat(quat: THREE.Quaternion): CANNON.Quaternion {
		return new CANNON.Quaternion(quat.x, quat.y, quat.z, quat.w)
	}

	static spring(source: number, dest: number, velocity: number, mass: number, damping: number): SimulationFrame {
		let acceleration = dest - source
		acceleration /= mass
		velocity += acceleration
		velocity *= damping

		let position = source + velocity

		return new SimulationFrame(position, velocity)
	}

	static springV(source: THREE.Vector3, dest: THREE.Vector3, velocity: THREE.Vector3, mass: number, damping: number): void {
		let acceleration = new THREE.Vector3().subVectors(dest, source)
		acceleration.divideScalar(mass)
		velocity.add(acceleration)
		velocity.multiplyScalar(damping)
		source.add(velocity)
	}

	static appplyVectorMatrixXZ(a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3 {
		return new THREE.Vector3(
			(a.x * b.z + a.z * b.x),
			b.y,
			(a.z * b.z + -a.x * b.x)
		)
	}

	static haveDifferentSigns(n1: number, n2: number): boolean {
		return (n1 < 0) !== (n2 < 0)
	}

	static getAngleBetweenVectors(v1: THREE.Vector3, v2: THREE.Vector3, dotTreshold: number = 0.0005): number {
		let angle: number
		let dot = v1.dot(v2)

		// If dot is close to 1, we'll round angle to zero
		if (dot > 1 - dotTreshold) {
			angle = 0
		}
		else {
			// Dot too close to -1
			if (dot < -1 + dotTreshold) {
				angle = Math.PI
			}
			else {
				// Get angle difference in radians
				angle = Math.acos(dot)
			}
		}

		return angle
	}

	static getSignedAngleBetweenVectors(v1: THREE.Vector3, v2: THREE.Vector3, normal: THREE.Vector3 = new THREE.Vector3(0, 1, 0), dotTreshold: number = 0.0005): number {
		let angle = Utility.getAngleBetweenVectors(v1, v2, dotTreshold)

		// Get vector pointing up or down
		let cross = new THREE.Vector3().crossVectors(v1, v2)
		// Compare cross with normal to find out direction
		if (normal.dot(cross) < 0) {
			angle = -angle
		}

		return angle
	}

	static detectRelativeSide(from: THREE.Object3D, to: THREE.Object3D): Side {
		const right = Utility.getRight(from, Space.Local)
		const viewVector = to.position.clone().sub(from.position).normalize()

		return right.dot(viewVector) > 0 ? Side.Left : Side.Right
	}

	static easeInOutSine(x: number): number {
		return -(Math.cos(Math.PI * x) - 1) / 2
	}

	static easeOutQuad(x: number): number {
		return 1 - (1 - x) * (1 - x)
	}

	static vertInx(indices: number[], vertices: number[]) {
		const iv: number[] = []
		indices.forEach((index) => {
			iv.push(vertices[index * 3])
			iv.push(vertices[index * 3 + 1])
			iv.push(vertices[index * 3 + 2])
		})
		const indexedVertices = new Float32Array(iv)
		return indexedVertices
	}

	static getVehical(world: WorldBase, name: string): Vehicle | null {
		let vehical: Vehicle | null = null
		world.vehicles.forEach((vehi) => {
			if (vehi.uID == name) {
				vehical = vehi
			}
		})
		return vehical
	}

	static getSeat(vehical: Vehicle, userData: { [id: string]: any }): VehicleSeat | null {
		let seat: VehicleSeat | null = null
		vehical.seats.forEach((st) => {
			if (st.seatPointObject.userData.name === userData.name) {
				seat = st
			}
		})
		return seat
	}

	static getEntryPoint(vehicalSeat: VehicleSeat, userData: { [id: string]: any }): THREE.Object3D | null {
		let entryPoint: THREE.Object3D | null = null
		vehicalSeat.entryPoints.forEach((ep) => {
			if (ep.userData.name === userData.name) {
				entryPoint = ep
			}
		})
		return entryPoint
	}

	static defaultCamera() {
		let camera = new THREE.PerspectiveCamera(75, 1080 / 1920, 0.01, 1000)
		camera.position.set(0, 10, 15)
		return camera
	}
}
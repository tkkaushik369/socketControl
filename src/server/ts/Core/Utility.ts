import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import * as _ from 'lodash'
import { Space } from '../Enums/Space'
import { Side } from '../Enums/Side'
import { SimulationFrame } from '../Physics/SpringSimulation/SimulationFrame'
import { WorldBase } from '../World/WorldBase'
import { Vehicle } from '../Vehicles/Vehicle'
import { VehicleSeat } from '../Vehicles/VehicleSeat'
import { Player } from './Player'

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

	static isElectron() {
		// Renderer process
		if (typeof window !== 'undefined' && typeof window.process === 'object'/*  && window.process.type === 'renderer' */) {
			return true;
		}
	
		// Main process
		if (typeof process !== 'undefined' && typeof process.versions === 'object' && !!process.versions.electron) {
			return true;
		}
	
		// Detect the user agent when the `nodeIntegration` option is set to true
		if (typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.indexOf('Electron') >= 0) {
			return true;
		}
	
		return false;
	}

	static deviceState() {
		//let check = false;
		//(function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
		return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
	}

	/**
	 * mode == -1 Y max
	 * 
	 * mode == 0 square
	 * 
	 * mode == 1 X Max
	 */
	static GridPosition(users: { [id: string]: Player }, position: THREE.Vector3, scaleX: number = 1, scaleY: number = 1, mode: number = 0) {
		let tot = 0
		let sq = 1
		Object.keys(users).forEach((sID) => {
			if (users[sID] !== undefined) { tot += 1 }
		})

		if (mode === 0) {
			sq = Math.ceil(Math.sqrt(tot))
			let pos: THREE.Vector3[] = []

			for (let i = 0; i < sq && tot > 0; i++) {
				for (let j = 0; j < sq && tot > 0; j++) {
					pos.push(new THREE.Vector3().copy(position).add(new THREE.Vector3(i * scaleX, 0, j * scaleY)))
					tot -= 1
				}
			}

			return pos
		} else {
			const sqX = Math.abs((mode > 0) ? mode : Math.ceil(tot / mode))
			const sqY = Math.abs((mode < 0) ? mode : Math.ceil(tot / mode))
			let pos: THREE.Vector3[] = []

			for (let i = 0; i < sqX && tot > 0; i++) {
				for (let j = 0; j < sqY && tot > 0; j++) {
					pos.push(new THREE.Vector3().copy(position).add(new THREE.Vector3(i * scaleX, 0, j * scaleY)))
					tot -= 1
				}
			}

			return pos
		}
	}
}
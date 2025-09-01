import * as THREE from 'three'
import { RaceContent } from './RaceContent'

export class RaceCheckpoint {
	private point: THREE.Vector3
	public index: number
	private raceContent: RaceContent

	private t: number
	public mesh: THREE.Mesh
	public passed: boolean

	private normal: THREE.Vector3
	private localX: THREE.Vector3
	private localY: THREE.Vector3
	private halfW: number
	private halfH: number

	constructor(point: THREE.Vector3, index: number, raceContent: RaceContent, curve: THREE.CatmullRomCurve3) {
		// bind functions
		this.checkCross = this.checkCross.bind(this)

		// init
		this.point = point.clone()
		this.index = index
		this.raceContent = raceContent
		const PLANE_W = 40
		const PLANE_H = 14

		// find nearest t on curve for this point
		this.t = this.raceContent.findClosestTOnCurve(point)

		// tangent -> plane normal (plane default normal is +Z)
		const tangent = curve.getTangent(this.t).normalize()

		// plane geometry centered at origin so centroid is at mesh.position
		const geom = new THREE.PlaneGeometry(PLANE_W, PLANE_H)
		const mat = new THREE.MeshStandardMaterial({
			color: 0x00ff88,
			side: THREE.DoubleSide,
			transparent: true,
			opacity: 0.35,
		})
		this.mesh = new THREE.Mesh(geom, mat)
		this.mesh.position.copy(this.point)

		// rotate plane so its +Z axis points along tangent
		const zAxis = new THREE.Vector3(0, 0, 1)
		const quat = new THREE.Quaternion().setFromUnitVectors(zAxis, tangent)
		this.mesh.quaternion.copy(quat)

		// a thin bar to make it more visible
		const bar = new THREE.Mesh(
			new THREE.BoxGeometry(PLANE_W, 0.1, 0.1),
			new THREE.MeshStandardMaterial({ color: 0x00ff88 })
		)
		bar.position.set(0, 0, 0.01) // slightly offset so visible
		this.mesh.add(bar)

		this.passed = false // last-frame flag hint
		this.raceContent.checkpointGroup.add(this.mesh)

		// Precompute plane normal and local axes for bounds checking:
		this.normal = tangent.clone() // world normal (unit)
		// local X axis on the plane: plane's local +X transformed to world
		const localX = new THREE.Vector3(1, 0, 0).applyQuaternion(this.mesh.quaternion).normalize()
		const localY = new THREE.Vector3(0, 1, 0).applyQuaternion(this.mesh.quaternion).normalize()

		// bounding half extents
		this.localX = localX
		this.localY = localY

		this.halfW = PLANE_W / 2
		this.halfH = PLANE_H / 2

		// add a visible normal arrow for debugging
		const arrow = new THREE.ArrowHelper(this.normal, this.point, 4, 0xffff00)
		this.raceContent.checkpointGroup.add(arrow)
	}

	// test whether a segment (prev->curr) crosses plane front->back and within bounds
	checkCross(prevPos: THREE.Vector3, currPos: THREE.Vector3) {
		// signed distances to plane (positive side is where dot > 0)
		const vPrev = prevPos.clone().sub(this.point)
		const vCurr = currPos.clone().sub(this.point)
		const dPrev = vPrev.dot(this.normal)
		const dCurr = vCurr.dot(this.normal)

		// crossing from positive to non-positive (front -> back)
		if ((dPrev >= 0 && dCurr < 0) || (dPrev <= 0 && dCurr > 0)) {
			// compute approximate intersection point along segment
			const t = dPrev / (dPrev - dCurr) // param along segment from prev->curr
			const intersect = prevPos.clone().lerp(currPos, t)

			// project onto plane local axes to check if inside plane rectangle
			const localXCoord = intersect.clone().sub(this.point).dot(this.localX)
			const localYCoord = intersect.clone().sub(this.point).dot(this.localY)

			if (Math.abs(localXCoord) <= this.halfW + 0.001 && Math.abs(localYCoord) <= this.halfH + 0.001) {
				return true
			}
		}
		return false
	}
}

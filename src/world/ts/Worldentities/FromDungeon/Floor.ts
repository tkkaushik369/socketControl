import * as THREE from 'three'
import { Grid } from './Grid'

export class Floor {
	pos: { x: number; z: number }[]
	cube: { w: number; h: number; d: number; y: number; pos: number }
	up: Floor | null
	down: Floor | null
	y: number
	grid: Grid[]

	constructor(
		scene: THREE.Object3D,
		pos: { x: number; z: number }[],
		cube: { w: number; h: number; d: number; y: number; pos: number },
		y: number,
		scale: number = 1
	) {
		this.pos = pos
		this.cube = cube
		this.y = y
		this.up = null
		this.down = null
		this.grid = []

		const geometry = new THREE.BoxGeometry((cube.w - 0.1) * scale, (1 - 0.1) * scale, (cube.d - 0.1) * scale)
		const edges = new THREE.EdgesGeometry(geometry)
		const boxEdges = new THREE.LineSegments(
			edges,
			new THREE.LineDashedMaterial({ color: 0x00ffff, dashSize: 0.1, gapSize: 0.1 })
		)
		boxEdges.position.set(pos[cube.pos].x * scale, (y + 0.5) * scale, pos[cube.pos].z * scale)
		boxEdges.computeLineDistances()
		scene.add(boxEdges)

		for (let i = 0; i < cube.w; i++) {
			for (let j = 0; j < cube.d; j++) {
				this.grid.push(new Grid(scene, pos, cube, i, y, j, scale))
			}
		}
	}
}

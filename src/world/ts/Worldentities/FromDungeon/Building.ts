import * as THREE from 'three'
import { Floor } from './Floor'

export class Building {
	pos: { x: number; z: number }[]
	cube: { w: number; h: number; d: number; y: number; pos: number }
	visual: THREE.Group
	floors: Floor[]

	constructor(
		scene: THREE.Object3D,
		pos: { x: number; z: number }[],
		cube: { w: number; h: number; d: number; y: number; pos: number },
		scale: number = 1
	) {
		this.pos = pos
		this.cube = cube
		this.floors = []
		this.visual = new THREE.Group()

		const geometry = new THREE.BoxGeometry(cube.w * scale, cube.h * scale, cube.d * scale)
		const edges = new THREE.EdgesGeometry(geometry)

		const boxEdges = new THREE.LineSegments(edges)

		const mesh = new THREE.Mesh(
			geometry,
			new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
		)

		boxEdges.position.set(pos[cube.pos].x * scale, cube.y * scale, pos[cube.pos].z * scale)
		mesh.position.set(pos[cube.pos].x * scale, cube.y * scale, pos[cube.pos].z * scale)

		// scene.add(boxEdges)
		scene.add(mesh)

		for (let i = 0; i < cube.h; i++) {
			this.floors.push(new Floor(scene, pos, cube, i, scale))
		}
	}
}

import * as THREE from 'three'

export class Grid {
	top: Grid | null
	bottom: Grid | null
	left: Grid | null
	right: Grid | null
	front: Grid | null
	back: Grid | null

	constructor(
		scene: THREE.Object3D,
		pos: { x: number; z: number }[],
		cube: { w: number; h: number; d: number; y: number; pos: number },
		x: number,
		y: number,
		z: number,
		scale: number = 1
	) {
		this.top = null
		this.bottom = null
		this.left = null
		this.right = null
		this.front = null
		this.back = null

		const geometry = new THREE.BoxGeometry((1 - 0.4) * scale, (1 - 0.4) * scale, (1 - 0.4) * scale)
		const edges = new THREE.EdgesGeometry(geometry)
		const boxEdges = new THREE.LineSegments(
			edges,
			new THREE.LineDashedMaterial({ color: 0xaa0000, dashSize: 0.06, gapSize: 0.06 })
		)
		boxEdges.position.set(
			(pos[cube.pos].x - Math.floor(cube.w / 2) + x + 0.5) * scale,
			(y + 0.5) * scale,
			(pos[cube.pos].z - Math.floor(cube.d / 2) + z + 0.5) * scale
		)
		boxEdges.computeLineDistances()
		scene.add(boxEdges)
	}
}

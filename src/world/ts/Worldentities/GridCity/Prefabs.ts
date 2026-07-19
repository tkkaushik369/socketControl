import * as THREE from 'three'
import { SUBTRACTION, ADDITION, Brush, Evaluator } from 'three-bvh-csg'

export const MAX_INSTANCE = 1024
const ENABLE_PHYSICS = true

function cornerSize(size1: number, size2?: number) {
	if (size2 === undefined) return Math.sqrt(2 * Math.pow(size1, 2))
	return Math.sqrt(Math.pow(size1, 2) + Math.pow(size2, 2))
}

export var cache: {
	[is_corner: number]: {
		[size: number]: {
			[floorsize: number]: {
				[roof: number]: {
					[windows: number]: {
						[type: number]: {
							geo: THREE.BufferGeometry
						}
					}
				}
			}
		}
	}
} = {}

export function clear_cache() {
	const corner = Object.keys(cache)
	for (let i = 0; i < corner.length; i++) {
		const size = Object.keys(cache[Number(corner[i])])
		for (let j = 0; j < size.length; j++) {
			const floorsize = Object.keys(cache[Number(corner[i])][Number(size[j])])
			for (let k = 0; k < floorsize.length; k++) {
				const roofs = Object.keys(cache[Number(corner[i])][Number(size[j])][Number(floorsize[k])])
				for (let l = 0; l < roofs.length; l++) {
					const windows = Object.keys(
						cache[Number(corner[i])][Number(size[j])][Number(floorsize[k])][Number(roofs[l])]
					)
					for (let m = 0; m < windows.length; m++) {
						const type = Object.keys(
							cache[Number(corner[i])][Number(size[j])][Number(floorsize[k])][Number(roofs[l])][
								Number(windows[m])
							]
						)
						for (let n = 0; n < type.length; n++) {
							cache[Number(corner[i])][Number(size[j])][Number(floorsize[k])][Number(roofs[l])][
								Number(windows[m])
							][Number(type[n])].geo.dispose()
						}
					}
				}
			}
		}
	}
	cache = {}
}

export function check_cache(
	size: number,
	floorsize: number,
	type: number,
	corner: boolean,
	addRoofs: boolean,
	addWindows: boolean
) {
	const corner_inx = corner ? 1 : 0
	const addRoofs_inx = addRoofs ? 1 : 0
	const addWindows_inx = addWindows ? 1 : 0
	return (
		cache[corner_inx] !== undefined &&
		cache[corner_inx][size] !== undefined &&
		cache[corner_inx][size][floorsize] !== undefined &&
		cache[corner_inx][size][floorsize][addRoofs_inx] !== undefined &&
		cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx] !== undefined &&
		cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][type] !== undefined
	)
}

const dummy_box = new THREE.BoxGeometry(0.2, 0.2, 0.2)
const phyGeo = new THREE.BoxGeometry(2, 2, 2)
const phyMat = new THREE.MeshBasicMaterial({
	color: 0xaa00aa,
	wireframe: false,
	// opacity: 0.2,
})
phyMat.polygonOffset = true
phyMat.polygonOffsetFactor = 1
phyMat.polygonOffsetUnits = 1

export class Prefabs {
	static Prefab_Front(
		addRoofs: boolean,
		addWindows: boolean,
		size: number,
		floorsize: number,
		type: number,
		geo: THREE.BufferGeometry
	) {
		switch (size) {
			case 1: {
				return Prefabs.Prefab_Front_1(geo, addRoofs, addWindows, floorsize, type)
				break
			}
			case 2: {
				return Prefabs.Prefab_Front_2(geo, addRoofs, addWindows, floorsize)
				break
			}
			case 3: {
				return Prefabs.Prefab_Front_3(geo, addRoofs, addWindows, floorsize)
				break
			}
			default: {
				return new THREE.Group()
				break
			}
		}
	}

	static Prefab_Corner(
		addRoofs: boolean,
		addWindows: boolean,
		size: number,
		corner_size: number,
		floorsize: number,
		geo: THREE.BufferGeometry
	) {
		switch (size) {
			case 1: {
				return Prefabs.Prefab_Corner_1(geo, addRoofs, addWindows, floorsize, corner_size)
				break
			}
			case 2: {
				return Prefabs.Prefab_Corner_2(geo, addRoofs, addWindows, floorsize, corner_size)
				break
			}
			case 3: {
				return Prefabs.Prefab_Corner_3(geo, addRoofs, addWindows, floorsize, corner_size)
				break
			}
			default: {
				return new THREE.Group()
				break
			}
		}
	}

	static Prefab_Front_Geo(
		simple_geometry: boolean,
		addRoofs: boolean,
		addWindows: boolean,
		size: number,
		floorsize: number,
		type: number
	) {
		switch (size) {
			case 1: {
				return Prefabs.Prefab_Front_1_Geo(simple_geometry, addRoofs, addWindows, floorsize, type)
				break
			}
			case 2: {
				return Prefabs.Prefab_Front_2_Geo(simple_geometry, addRoofs, addWindows, floorsize)
				break
			}
			case 3: {
				return Prefabs.Prefab_Front_3_Geo(simple_geometry, addRoofs, addWindows, floorsize)
				break
			}
			default: {
				const geometry = dummy_box
				return { geo: geometry, mesh_type: geometry.type }
				break
			}
		}
	}

	static Prefab_Corner_Geo(
		simple_geometry: boolean,
		addRoofs: boolean,
		addWindows: boolean,
		size: number,
		corner_size: number,
		floorsize: number
	) {
		switch (size) {
			case 1: {
				return Prefabs.Prefab_Corner_1_Geo(simple_geometry, addRoofs, addWindows, floorsize, corner_size)
				break
			}
			case 2: {
				return Prefabs.Prefab_Corner_2_Geo(simple_geometry, addRoofs, addWindows, floorsize, corner_size)
				break
			}
			case 3: {
				return Prefabs.Prefab_Corner_3_Geo(simple_geometry, addRoofs, addWindows, floorsize, corner_size)
				break
			}
			default: {
				const geometry = dummy_box
				return { geo: geometry, mesh_type: geometry.type }
				break
			}
		}
	}

	static Prefab_Front_1_Geo(
		simple_geometry: boolean,
		addRoofs: boolean,
		addWindows: boolean,
		floorsize: number,
		type: number
	) {
		const size = 1
		const corner_inx = 0
		const addRoofs_inx = addRoofs ? 1 : 0
		const addWindows_inx = addWindows ? 1 : 0

		const evaluator = new Evaluator()
		const height = 0.5
		const thick = 0.02
		const do_floors = true
		const do_floors_max = 1
		let geometry = new THREE.BufferGeometry()
		geometry = new THREE.BoxGeometry(size, height * (floorsize + 1), size)

		if (
			!(
				cache[corner_inx] !== undefined &&
				cache[corner_inx][size] !== undefined &&
				cache[corner_inx][size][floorsize] !== undefined &&
				cache[corner_inx][size][floorsize][addRoofs_inx] !== undefined &&
				cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx] !== undefined &&
				cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][type] !== undefined
			)
		) {
			if (!simple_geometry) {
				let result = new Brush(geometry)

				function flooring(altitude: number, floor_steps: boolean) {
					const roof = new Brush(new THREE.BoxGeometry(size, thick, size))
					roof.position.set(0, altitude, 0)
					roof.updateMatrixWorld()

					result = evaluator.evaluate(result, roof, ADDITION)

					if (floor_steps) {
						const stairs_width = 0.2
						const stairs_length = cornerSize(height / 2, height)
						const stairs1 = new Brush(new THREE.BoxGeometry(stairs_length, thick, stairs_width))
						stairs1.position.set(
							size / 2 - height / 2 - stairs_width - 2 * thick,
							altitude - (3 * height) / 4 + thick / 2,
							-(size - stairs_width - 4 * thick) / 2
						)
						stairs1.rotateZ(Math.PI / 2 - Math.atan(stairs_length / (height / 2)))
						stairs1.updateMatrixWorld()

						const stairs2 = new Brush(new THREE.BoxGeometry(stairs_length, thick, stairs_width))
						stairs2.position.set(
							size / 2 - height / 2 - stairs_width - 2 * thick,
							altitude - height / 4 + thick / 2,
							-(size - 3 * stairs_width - 6 * thick) / 2
						)
						stairs2.rotateZ(Math.PI / 2 + Math.atan(stairs_length / (height / 2)))
						stairs2.updateMatrixWorld()

						const step1 = new Brush(
							new THREE.BoxGeometry(height + stairs_width, thick + 0.01, 2 * stairs_width + thick)
						)
						step1.position.set(
							size / 2 - (height + stairs_width) / 2 - 2 * thick,
							altitude,
							-size / 2 + (2 * stairs_width + thick) / 2 + 2 * thick
						)
						step1.updateMatrixWorld()

						const step2 = new Brush(new THREE.BoxGeometry(stairs_width, thick, 2 * stairs_width + thick))
						step2.position.set(
							size / 2 - stairs_width / 2 - 2 * thick,
							altitude - height / 2 + thick / 2,
							-size / 2 + (2 * stairs_width + thick) / 2 + 2 * thick
						)
						step2.updateMatrixWorld()

						result = evaluator.evaluate(result, step1, SUBTRACTION)
						result = evaluator.evaluate(result, stairs1, ADDITION)
						result = evaluator.evaluate(result, stairs2, ADDITION)
						result = evaluator.evaluate(result, step2, ADDITION)
					}
				}

				function floor_windows(altitude: number, vm: number = 1, hm: number = 3) {
					for (let i = 0; i < hm; i++) {
						for (let j = 0; j < vm; j++) {
							const wins_1 = new Brush(new THREE.BoxGeometry(0.25, 0.25, thick + 0.01))
							wins_1.position.set(i * 0.3 - 0.3, altitude - 0.25 + j * 0.22, (size - thick) / 2)
							wins_1.updateMatrixWorld()

							result = evaluator.evaluate(result, wins_1, SUBTRACTION)
						}
					}
				}

				for (let i = 0; i <= (do_floors ? floorsize : do_floors_max); i++) {
					const wall1 = new Brush(new THREE.BoxGeometry(size, height, thick))
					wall1.position.set(0, -((size - height) / 2) + i * height, (size - thick) / 2)
					wall1.updateMatrixWorld()

					const wall2 = new Brush(new THREE.BoxGeometry(size, height, thick))
					wall2.position.set(0, -((size - height) / 2) + i * height, -(size - thick) / 2)
					wall2.updateMatrixWorld()

					const wall3 = new Brush(new THREE.BoxGeometry(thick, height, size))
					wall3.position.set((size - thick) / 2, -((size - height) / 2) + i * height, 0)
					wall3.updateMatrixWorld()

					const wall4 = new Brush(new THREE.BoxGeometry(thick, height, size))
					wall4.position.set(-(size - thick) / 2, -((size - height) / 2) + i * height, 0)
					wall4.updateMatrixWorld()

					if (i == 0) {
						result = evaluator.evaluate(wall1, wall2, ADDITION)
					} else {
						result = evaluator.evaluate(result, wall1, ADDITION)
						result = evaluator.evaluate(result, wall2, ADDITION)
					}
					result = evaluator.evaluate(result, wall3, ADDITION)
					result = evaluator.evaluate(result, wall4, ADDITION)

					if (i == 0) {
						switch (type) {
							case 1: {
								const door = new Brush(new THREE.BoxGeometry(0.2, 0.3, thick + 0.01))
								door.position.set(-0.35, -0.3, (size - thick) / 2)
								door.updateMatrixWorld()

								const window1 = new Brush(new THREE.BoxGeometry(0.6, 0.2, thick + 0.01))
								window1.position.set(0.1, -0.3, (size - thick) / 2)
								window1.updateMatrixWorld()

								if (addWindows) {
									result = evaluator.evaluate(result, door, SUBTRACTION)
									result = evaluator.evaluate(result, window1, SUBTRACTION)
								}
								break
							}
							case 2: {
								const door = new Brush(new THREE.BoxGeometry(0.2, 0.3, thick + 0.01))
								door.position.set(0.35, -0.3, (size - thick) / 2)
								door.updateMatrixWorld()

								const window1 = new Brush(new THREE.BoxGeometry(0.6, 0.2, thick + 0.01))
								window1.position.set(-0.1, -0.3, (size - thick) / 2)
								window1.updateMatrixWorld()

								if (addWindows) {
									result = evaluator.evaluate(result, door, SUBTRACTION)
									result = evaluator.evaluate(result, window1, SUBTRACTION)
								}
								break
							}
							case 0:
							default: {
								const door = new Brush(new THREE.BoxGeometry(0.2, 0.3, thick + 0.01))
								door.position.set(0, -0.3, (size - thick) / 2)
								door.updateMatrixWorld()

								const window1 = new Brush(new THREE.BoxGeometry(0.3, 0.2, thick + 0.01))
								window1.position.set(-0.3, -0.3, (size - thick) / 2)
								window1.updateMatrixWorld()

								const window2 = new Brush(new THREE.BoxGeometry(0.3, 0.2, thick + 0.01))
								window2.position.set(0.3, -0.3, (size - thick) / 2)
								window2.updateMatrixWorld()

								if (addWindows) {
									result = evaluator.evaluate(result, door, SUBTRACTION)
									result = evaluator.evaluate(result, window1, SUBTRACTION)
									result = evaluator.evaluate(result, window2, SUBTRACTION)
								}
								break
							}
						}

						if (addRoofs) flooring(thick / 2 - height, false)
					}

					if (addRoofs) flooring(-(thick / 2) + height * i, true)

					if (i > 0 && addWindows) floor_windows(-(thick / 2) + (size / 2) * i)
				}

				geometry = result.geometry
			}

			if (cache[corner_inx] == undefined) cache[corner_inx] = {}
			if (cache[corner_inx][size] == undefined) cache[corner_inx][size] = {}
			if (cache[corner_inx][size][floorsize] == undefined) cache[corner_inx][size][floorsize] = {}
			if (cache[corner_inx][size][floorsize][addRoofs_inx] == undefined)
				cache[corner_inx][size][floorsize][addRoofs_inx] = {}
			if (cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx] == undefined)
				cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx] = {}
			cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][type] = {
				geo: geometry,
			}
			return { geo: geometry, mesh_type: geometry.type }
		}
		return {
			geo: cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][type].geo,
			mesh_type: cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][type].geo.type,
		}
	}

	static Prefab_Front_1(
		geo: THREE.BufferGeometry,
		_addRoofs: boolean,
		_addWindows: boolean,
		floorsize: number,
		type: number
	) {
		const group = new THREE.Group()
		group.userData = {
			data: 'building',
		}
		const size = 1
		// const corner_inx = 0
		// const addRoofs_inx = addRoofs ? 1 : 0
		// const addWindows_inx = addWindows ? 1 : 0

		if (true) {
			const height = 0.5
			const thick = 0.02
			const phyMesh = new THREE.Group()

			if (true) {
				function makePhysics(data: { pos: THREE.Vector3; scale: THREE.Vector3 }) {
					const wall_phy = new THREE.Mesh(phyGeo, phyMat)
					wall_phy.scale.set(data.scale.x, data.scale.y, data.scale.z)
					wall_phy.position.set(data.pos.x, data.pos.y, data.pos.z)
					if (ENABLE_PHYSICS) {
						wall_phy.userData = {
							data: 'physics',
							type: 'box',
							optimize: 'chunk',
						}
					}

					phyMesh.add(wall_phy)
				}

				function addPhysics(i: number) {
					if (i > -1) {
						makePhysics({
							pos: new THREE.Vector3(0, (height / 2) * i, (size - thick) / 2),
							scale: new THREE.Vector3(size / 2, (height / 2) * i, thick / 2),
						})
					} else {
						switch (type) {
							case 1: {
								makePhysics({
									pos: new THREE.Vector3(-0.475, -((size - height) / 2), (size - thick) / 2),
									scale: new THREE.Vector3(0.025, height / 2, thick / 2),
								})
								break
							}
						}
					}
				}

				addPhysics(floorsize)
				addPhysics(-1)
			}

			if (true) {
				const mesh = new THREE.InstancedMesh(
					geo,
					new THREE.MeshPhongMaterial({
						// transparent: true,
						// opacity: 0.8,
						depthTest: true,
						wireframe: false,
					}),
					MAX_INSTANCE
				)
				mesh.count = 1
				mesh.frustumCulled = false
				mesh.geometry.computeBoundingBox()
				mesh.geometry.computeBoundingSphere()
				if (ENABLE_PHYSICS) {
					mesh.userData = {
						data: 'physics_instance',
						type: 'trimesh',
						optimize: 'chunk',
						debug: true,
						force_scale: {
							times: 6,
						},
					}
				}
				group.add(mesh)
				// group.add(phyMesh)
			} else {
				const edges = new THREE.EdgesGeometry(geo, 2)
				const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xff00ff }))
				group.add(line)
			}
		}

		return group
	}

	static Prefab_Corner_1_Geo(
		simple_geometry: boolean,
		addRoofs: boolean,
		addWindows: boolean,
		floorsize: number,
		corner_size: number
	) {
		const size = 1
		const corner_inx = 1
		const addRoofs_inx = addRoofs ? 1 : 0
		const addWindows_inx = addWindows ? 1 : 0

		const evaluator = new Evaluator()
		const length = size - corner_size
		const height = 0.5
		const thick = 0.02
		const do_floors = true
		const do_floors_max = 1
		let geometry = new THREE.BufferGeometry()
		geometry = new THREE.BoxGeometry(size, height * (floorsize + 1), size)

		if (
			!(
				cache[corner_inx] !== undefined &&
				cache[corner_inx][size] !== undefined &&
				cache[corner_inx][size][floorsize] !== undefined &&
				cache[corner_inx][size][floorsize][addRoofs_inx] !== undefined &&
				cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx] !== undefined &&
				cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][0] !== undefined
			)
		) {
			if (!simple_geometry) {
				let result = new Brush(geometry)

				function flooring(altitude: number, floor_steps: boolean) {
					const roof = new Brush(new THREE.BoxGeometry(size, thick, size))
					roof.position.set(0, altitude, 0)
					roof.updateMatrixWorld()

					const roof_cur = new Brush(
						new THREE.BoxGeometry(cornerSize(corner_size), thick + 0.01, cornerSize(corner_size))
					)
					roof_cur.position.set(-size / 2, altitude, size / 2)
					roof_cur.rotateY(Math.PI / 4)
					roof_cur.updateMatrixWorld()

					result = evaluator.evaluate(result, roof, ADDITION)
					result = evaluator.evaluate(result, roof_cur, SUBTRACTION)

					if (floor_steps) {
						const stairs_width = 0.2
						const stairs_length = cornerSize(height / 2, height)
						const stairs1 = new Brush(new THREE.BoxGeometry(stairs_length, thick, stairs_width))
						stairs1.position.set(
							size / 2 - height / 2 - stairs_width - 2 * thick,
							altitude - (3 * height) / 4 + thick / 2,
							-(size - stairs_width - 4 * thick) / 2
						)
						stairs1.rotateZ(Math.PI / 2 - Math.atan(stairs_length / (height / 2)))
						stairs1.updateMatrixWorld()

						const stairs2 = new Brush(new THREE.BoxGeometry(stairs_length, thick, stairs_width))
						stairs2.position.set(
							size / 2 - height / 2 - stairs_width - 2 * thick,
							altitude - height / 4 + thick / 2,
							-(size - 3 * stairs_width - 6 * thick) / 2
						)
						stairs2.rotateZ(Math.PI / 2 + Math.atan(stairs_length / (height / 2)))
						stairs2.updateMatrixWorld()

						const step1 = new Brush(
							new THREE.BoxGeometry(height + stairs_width, thick + 0.01, 2 * stairs_width + thick)
						)
						step1.position.set(
							size / 2 - (height + stairs_width) / 2 - 2 * thick,
							altitude,
							-size / 2 + (2 * stairs_width + thick) / 2 + 2 * thick
						)
						step1.updateMatrixWorld()

						const step2 = new Brush(new THREE.BoxGeometry(stairs_width, thick, 2 * stairs_width + thick))
						step2.position.set(
							size / 2 - stairs_width / 2 - 2 * thick,
							altitude - height / 2 + thick / 2,
							-size / 2 + (2 * stairs_width + thick) / 2 + 2 * thick
						)
						step2.updateMatrixWorld()

						result = evaluator.evaluate(result, step1, SUBTRACTION)
						result = evaluator.evaluate(result, stairs1, ADDITION)
						result = evaluator.evaluate(result, stairs2, ADDITION)
						result = evaluator.evaluate(result, step2, ADDITION)
					}
				}

				function floor_windows(altitude: number, vm: number = 1, hm: number = 2) {
					for (let i = 0; i < hm; i++) {
						for (let j = 0; j < vm; j++) {
							const wins_1 = new Brush(new THREE.BoxGeometry(0.25, 0.25, thick + 0.01))
							wins_1.position.set(i * 0.3, altitude - 0.25 + j * 0.22, (size - thick) / 2)
							wins_1.updateMatrixWorld()

							const wins_2 = new Brush(new THREE.BoxGeometry(thick + 0.01, 0.25, 0.25))
							wins_2.position.set(-(size - thick) / 2, altitude - 0.25 + j * 0.22, i * 0.3 - 0.3)
							wins_2.updateMatrixWorld()

							result = evaluator.evaluate(result, wins_1, SUBTRACTION)
							result = evaluator.evaluate(result, wins_2, SUBTRACTION)
						}
					}
					const wins = new Brush(new THREE.BoxGeometry(0.2, 0.2, thick + 0.01))
					wins.position.set(
						-cornerSize(corner_size + thick / 2),
						altitude - 0.25,
						cornerSize(corner_size + thick / 2)
					)
					wins.rotateY(-Math.PI / 4)
					wins.updateMatrixWorld()
					result = evaluator.evaluate(result, wins, SUBTRACTION)
				}

				for (let i = 0; i <= (do_floors ? floorsize : do_floors_max); i++) {
					const wall_1 = new Brush(new THREE.BoxGeometry(length, height, thick))
					wall_1.position.set(corner_size / 2, -(size - height) / 2 + height * i, (size - thick) / 2)
					wall_1.updateMatrixWorld()

					const wall_2 = new Brush(new THREE.BoxGeometry(thick, height, length))
					wall_2.position.set(-(size - thick) / 2, -(size - height) / 2 + height * i, -corner_size / 2)
					wall_2.updateMatrixWorld()

					const wall3 = new Brush(new THREE.BoxGeometry(size, height, thick))
					wall3.position.set(0, -(size - height) / 2 + height * i, -(size - thick) / 2)
					wall3.updateMatrixWorld()

					const wall4 = new Brush(new THREE.BoxGeometry(thick, height, size))
					wall4.position.set((size - thick) / 2, -(size - height) / 2 + height * i, 0)
					wall4.updateMatrixWorld()

					const window_1 = new Brush(new THREE.BoxGeometry(thick + 0.01, 0.2, length - 0.2))
					window_1.position.set(-((size - thick) / 2), -0.3 + height * i, -0.15)
					window_1.updateMatrixWorld()

					const window_2 = new Brush(new THREE.BoxGeometry(length - 0.2, 0.2, thick + 0.01))
					window_2.position.set(0.15, -0.3 + height * i, (size - thick) / 2)
					window_2.updateMatrixWorld()

					const corner = new Brush(new THREE.BoxGeometry(cornerSize(corner_size), height, thick))
					corner.rotateY(-Math.PI / 4)
					corner.position.set(
						-(length - cornerSize(thick) / 2) / 2,
						-height / 2 + height * i,
						(length - cornerSize(thick) / 2) / 2
					)
					corner.updateMatrixWorld()

					const door = new Brush(new THREE.BoxGeometry(0.2, 0.3, thick + 0.01))
					door.rotateY(-Math.PI / 4)
					door.position.set(
						-(length - cornerSize(thick) / 2) / 2,
						-0.32 + height * i,
						(length - cornerSize(thick) / 2) / 2
					)
					door.updateMatrixWorld()

					if (i == 0) {
						result = evaluator.evaluate(wall_1, wall_2, ADDITION)
						if (addRoofs) flooring(thick / 2 - size / 2, false)
					} else {
						result = evaluator.evaluate(result, wall_1, ADDITION)
						result = evaluator.evaluate(result, wall_2, ADDITION)
					}
					if (addRoofs) flooring(-(thick / 2) + (size / 2) * i, true)

					result = evaluator.evaluate(result, wall3, ADDITION)
					result = evaluator.evaluate(result, wall4, ADDITION)
					result = evaluator.evaluate(result, corner, ADDITION)
					if (i == 0) {
						if (addWindows) {
							result = evaluator.evaluate(result, door, SUBTRACTION)
							result = evaluator.evaluate(result, window_1, SUBTRACTION)
							result = evaluator.evaluate(result, window_2, SUBTRACTION)
						}
					} else {
						if (addWindows) floor_windows(-(thick / 2) + (size / 2) * i)
					}
				}

				geometry = result.geometry
			}

			if (cache[corner_inx] == undefined) cache[corner_inx] = {}
			if (cache[corner_inx][size] == undefined) cache[corner_inx][size] = {}
			if (cache[corner_inx][size][floorsize] == undefined) cache[corner_inx][size][floorsize] = {}
			if (cache[corner_inx][size][floorsize][addRoofs_inx] == undefined)
				cache[corner_inx][size][floorsize][addRoofs_inx] = {}
			if (cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx] == undefined)
				cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx] = {}
			cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][0] = {
				geo: geometry,
			}
			return { geo: geometry, mesh_type: geometry.type }
		}
		return {
			geo: cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][0].geo,
			mesh_type: cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][0].geo.type,
		}
	}

	static Prefab_Corner_1(
		geo: THREE.BufferGeometry,
		_addRoofs: boolean,
		_addWindows: boolean,
		_floorsize: number,
		_corner_size: number
	) {
		const group = new THREE.Group()
		group.userData = {
			data: 'building',
		}
		// const size = 1
		// const corner_inx = 1
		// const addRoofs_inx = addRoofs ? 1 : 0
		// const addWindows_inx = addWindows ? 1 : 0

		if (true) {
			if (true) {
				const mesh = new THREE.InstancedMesh(
					geo,
					new THREE.MeshPhongMaterial({
						// transparent: true,
						// opacity: 0.8,
						depthTest: true,
						wireframe: false,
					}),
					MAX_INSTANCE
				)
				mesh.count = 1
				mesh.frustumCulled = false
				mesh.geometry.computeBoundingBox()
				mesh.geometry.computeBoundingSphere()
				if (ENABLE_PHYSICS) {
					mesh.userData = {
						data: 'physics_instance',
						type: 'trimesh',
						optimize: 'chunk',
						debug: true,
						force_scale: {
							times: 6,
						},
					}
				}
				group.add(mesh)
			} else {
				const edges = new THREE.EdgesGeometry(geo, 2)
				const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xff00ff }))
				group.add(line)
			}
		}

		return group
	}

	static Prefab_Front_2_Geo(simple_geometry: boolean, addRoofs: boolean, addWindows: boolean, floorsize: number) {
		const size = 2
		const corner_inx = 0
		const addRoofs_inx = addRoofs ? 1 : 0
		const addWindows_inx = addWindows ? 1 : 0

		const evaluator = new Evaluator()
		const height = 0.5
		const thick = 0.02
		const do_floors = true
		const do_floors_max = 1
		let geometry = new THREE.BufferGeometry()
		geometry = new THREE.BoxGeometry(size, height * (floorsize + 1), size)

		if (
			!(
				cache[corner_inx] !== undefined &&
				cache[corner_inx][size] !== undefined &&
				cache[corner_inx][size][floorsize] !== undefined &&
				cache[corner_inx][size][floorsize][addRoofs_inx] !== undefined &&
				cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx] !== undefined &&
				cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][0] !== undefined
			)
		) {
			if (!simple_geometry) {
				let result = new Brush(geometry)

				function flooring(altitude: number, floor_steps: boolean) {
					const roof = new Brush(new THREE.BoxGeometry(size, thick, size))
					roof.position.set(0, altitude, 0)
					roof.updateMatrixWorld()

					result = evaluator.evaluate(result, roof, ADDITION)

					if (floor_steps) {
						const stairs_width = 0.2
						const stairs_length = cornerSize(height / 2, height)
						const stairs1 = new Brush(new THREE.BoxGeometry(stairs_length, thick, stairs_width))
						stairs1.position.set(
							size / 2 - height / 2 - stairs_width - 2 * thick,
							altitude - (3 * height) / 4 + thick / 2,
							-(size - stairs_width - 4 * thick) / 2
						)
						stairs1.rotateZ(Math.PI / 2 - Math.atan(stairs_length / (height / 2)))
						stairs1.updateMatrixWorld()

						const stairs2 = new Brush(new THREE.BoxGeometry(stairs_length, thick, stairs_width))
						stairs2.position.set(
							size / 2 - height / 2 - stairs_width - 2 * thick,
							altitude - height / 4 + thick / 2,
							-(size - 3 * stairs_width - 6 * thick) / 2
						)
						stairs2.rotateZ(Math.PI / 2 + Math.atan(stairs_length / (height / 2)))
						stairs2.updateMatrixWorld()

						const step1 = new Brush(
							new THREE.BoxGeometry(height + stairs_width, thick + 0.01, 2 * stairs_width + thick)
						)
						step1.position.set(
							size / 2 - (height + stairs_width) / 2 - 2 * thick,
							altitude,
							-size / 2 + (2 * stairs_width + thick) / 2 + 2 * thick
						)
						step1.updateMatrixWorld()

						const step2 = new Brush(new THREE.BoxGeometry(stairs_width, thick, 2 * stairs_width + thick))
						step2.position.set(
							size / 2 - stairs_width / 2 - 2 * thick,
							altitude - height / 2 + thick / 2,
							-size / 2 + (2 * stairs_width + thick) / 2 + 2 * thick
						)
						step2.updateMatrixWorld()

						result = evaluator.evaluate(result, step1, SUBTRACTION)
						result = evaluator.evaluate(result, stairs1, ADDITION)
						result = evaluator.evaluate(result, stairs2, ADDITION)
						result = evaluator.evaluate(result, step2, ADDITION)
					}
				}

				function floor_windows(altitude: number, vm: number = 1, hm: number = 6) {
					for (let i = 0; i < hm; i++) {
						for (let j = 0; j < vm; j++) {
							const wins_1 = new Brush(new THREE.BoxGeometry(0.25, 0.25, thick + 0.01))
							wins_1.position.set(i * 0.3 - 0.75, altitude - 0.25 + j * 0.22, (size - thick) / 2)
							wins_1.updateMatrixWorld()

							result = evaluator.evaluate(result, wins_1, SUBTRACTION)
						}
					}
				}

				for (let i = 0; i <= (do_floors ? floorsize : do_floors_max); i++) {
					const wall1 = new Brush(new THREE.BoxGeometry(size, height, thick))
					wall1.position.set(0, -((size - height) / 2) + i * height, (size - thick) / 2)
					wall1.updateMatrixWorld()

					const wall2 = new Brush(new THREE.BoxGeometry(size, height, thick))
					wall2.position.set(0, -((size - height) / 2) + i * height, -(size - thick) / 2)
					wall2.updateMatrixWorld()

					const wall3 = new Brush(new THREE.BoxGeometry(thick, height, size))
					wall3.position.set((size - thick) / 2, -((size - height) / 2) + i * height, 0)
					wall3.updateMatrixWorld()

					const wall4 = new Brush(new THREE.BoxGeometry(thick, height, size))
					wall4.position.set(-(size - thick) / 2, -((size - height) / 2) + i * height, 0)
					wall4.updateMatrixWorld()

					if (i == 0) {
						result = evaluator.evaluate(wall1, wall2, ADDITION)
					} else {
						result = evaluator.evaluate(result, wall1, ADDITION)
						result = evaluator.evaluate(result, wall2, ADDITION)
					}
					result = evaluator.evaluate(result, wall3, ADDITION)
					result = evaluator.evaluate(result, wall4, ADDITION)

					if (i == 0) {
						const door = new Brush(new THREE.BoxGeometry(0.2, 0.3, thick + 0.01))
						door.position.set(0, -0.3 - height, (size - thick) / 2)
						door.updateMatrixWorld()

						const window1 = new Brush(new THREE.BoxGeometry(0.72, 0.2, thick + 0.01))
						window1.position.set(-0.55, -0.3 - height, (size - thick) / 2)
						window1.updateMatrixWorld()

						const window2 = new Brush(new THREE.BoxGeometry(0.72, 0.2, thick + 0.01))
						window2.position.set(0.55, -0.3 - height, (size - thick) / 2)
						window2.updateMatrixWorld()

						if (addWindows) {
							result = evaluator.evaluate(result, door, SUBTRACTION)
							result = evaluator.evaluate(result, window1, SUBTRACTION)
							result = evaluator.evaluate(result, window2, SUBTRACTION)
						}

						if (addRoofs) flooring(thick / 2 - size / 2, false)
					}

					if (addRoofs) flooring(-(thick / 2) + height * i - height, true)

					if (i > 0 && addWindows) floor_windows(-(thick / 2) + height * i - height)
				}

				geometry = result.geometry
			}

			if (cache[corner_inx] == undefined) cache[corner_inx] = {}
			if (cache[corner_inx][size] == undefined) cache[corner_inx][size] = {}
			if (cache[corner_inx][size][floorsize] == undefined) cache[corner_inx][size][floorsize] = {}
			if (cache[corner_inx][size][floorsize][addRoofs_inx] == undefined)
				cache[corner_inx][size][floorsize][addRoofs_inx] = {}
			if (cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx] == undefined)
				cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx] = {}
			cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][0] = {
				geo: geometry,
			}
			return { geo: geometry, mesh_type: geometry.type }
		}
		return {
			geo: cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][0].geo,
			mesh_type: cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][0].geo.type,
		}
	}

	static Prefab_Front_2(geo: THREE.BufferGeometry, _addRoofs: boolean, _addWindows: boolean, _floorsize: number) {
		const group = new THREE.Group()
		group.userData = {
			data: 'building',
		}
		// const size = 2
		// const corner_inx = 0
		// const addRoofs_inx = addRoofs ? 1 : 0
		// const addWindows_inx = addWindows ? 1 : 0

		if (true) {
			if (true) {
				const mesh = new THREE.InstancedMesh(
					geo,
					new THREE.MeshPhongMaterial({
						// transparent: true,
						// opacity: 0.8,
						depthTest: true,
						wireframe: false,
					}),
					MAX_INSTANCE
				)
				mesh.count = 1
				mesh.frustumCulled = false
				mesh.geometry.computeBoundingBox()
				mesh.geometry.computeBoundingSphere()
				if (ENABLE_PHYSICS) {
					mesh.userData = {
						data: 'physics_instance',
						type: 'trimesh',
						optimize: 'chunk',
						debug: true,
						force_scale: {
							times: 6,
						},
					}
				}
				group.add(mesh)
			} else {
				const edges = new THREE.EdgesGeometry(geo, 2)
				const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xff00ff }))
				group.add(line)
			}
		}

		return group
	}

	static Prefab_Corner_2_Geo(
		simple_geometry: boolean,
		addRoofs: boolean,
		addWindows: boolean,
		floorsize: number,
		corner_size: number
	) {
		const size = 2
		const corner_inx = 1
		const addRoofs_inx = addRoofs ? 1 : 0
		const addWindows_inx = addWindows ? 1 : 0

		const evaluator = new Evaluator()
		const length = size - corner_size
		const height = 0.5
		const thick = 0.02
		const do_floors = true
		const do_floors_max = 1
		let geometry = new THREE.BufferGeometry()
		geometry = new THREE.BoxGeometry(size, height * (floorsize + 1), size)

		if (
			!(
				cache[corner_inx] !== undefined &&
				cache[corner_inx][size] !== undefined &&
				cache[corner_inx][size][floorsize] !== undefined &&
				cache[corner_inx][size][floorsize][addRoofs_inx] !== undefined &&
				cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx] !== undefined &&
				cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][0] !== undefined
			)
		) {
			if (!simple_geometry) {
				let result = new Brush(geometry)

				function flooring(altitude: number, floor_steps: boolean) {
					const roof = new Brush(new THREE.BoxGeometry(size, thick, size))
					roof.position.set(0, altitude, 0)
					roof.updateMatrixWorld()

					const roof_cur = new Brush(
						new THREE.BoxGeometry(cornerSize(corner_size), thick + 0.01, cornerSize(corner_size))
					)
					roof_cur.position.set(-size / 2, altitude, size / 2)
					roof_cur.rotateY(Math.PI / 4)
					roof_cur.updateMatrixWorld()

					result = evaluator.evaluate(result, roof, ADDITION)
					result = evaluator.evaluate(result, roof_cur, SUBTRACTION)

					if (floor_steps) {
						const stairs_width = 0.2
						const stairs_length = cornerSize(height / 2, height)
						const stairs1 = new Brush(new THREE.BoxGeometry(stairs_length, thick, stairs_width))
						stairs1.position.set(
							size / 2 - height / 2 - stairs_width - 2 * thick,
							altitude - (3 * height) / 4 + thick / 2,
							-(size - stairs_width - 4 * thick) / 2
						)
						stairs1.rotateZ(Math.PI / 2 - Math.atan(stairs_length / (height / 2)))
						stairs1.updateMatrixWorld()

						const stairs2 = new Brush(new THREE.BoxGeometry(stairs_length, thick, stairs_width))
						stairs2.position.set(
							size / 2 - height / 2 - stairs_width - 2 * thick,
							altitude - height / 4 + thick / 2,
							-(size - 3 * stairs_width - 6 * thick) / 2
						)
						stairs2.rotateZ(Math.PI / 2 + Math.atan(stairs_length / (height / 2)))
						stairs2.updateMatrixWorld()

						const step1 = new Brush(
							new THREE.BoxGeometry(height + stairs_width, thick + 0.01, 2 * stairs_width + thick)
						)
						step1.position.set(
							size / 2 - (height + stairs_width) / 2 - 2 * thick,
							altitude,
							-size / 2 + (2 * stairs_width + thick) / 2 + 2 * thick
						)
						step1.updateMatrixWorld()

						const step2 = new Brush(new THREE.BoxGeometry(stairs_width, thick, 2 * stairs_width + thick))
						step2.position.set(
							size / 2 - stairs_width / 2 - 2 * thick,
							altitude - height / 2 + thick / 2,
							-size / 2 + (2 * stairs_width + thick) / 2 + 2 * thick
						)
						step2.updateMatrixWorld()

						result = evaluator.evaluate(result, step1, SUBTRACTION)
						result = evaluator.evaluate(result, stairs1, ADDITION)
						result = evaluator.evaluate(result, stairs2, ADDITION)
						result = evaluator.evaluate(result, step2, ADDITION)
					}
				}

				function floor_windows(altitude: number, vm: number = 1, hm: number = 5) {
					for (let i = 0; i < hm; i++) {
						for (let j = 0; j < vm; j++) {
							const wins_1 = new Brush(new THREE.BoxGeometry(0.25, 0.25, thick + 0.01))
							wins_1.position.set(i * 0.3 - 0.5, altitude - 0.25 + j * 0.22, (size - thick) / 2)
							wins_1.updateMatrixWorld()

							const wins_2 = new Brush(new THREE.BoxGeometry(thick + 0.01, 0.25, 0.25))
							wins_2.position.set(-(size - thick) / 2, altitude - 0.25 + j * 0.22, i * 0.3 - 0.3 - 0.4)
							wins_2.updateMatrixWorld()

							result = evaluator.evaluate(result, wins_1, SUBTRACTION)
							result = evaluator.evaluate(result, wins_2, SUBTRACTION)
						}
					}
					const wins = new Brush(new THREE.BoxGeometry(0.2, 0.2, thick + 0.01))
					wins.position.set(
						-(length - cornerSize(thick) / 2) / 2,
						altitude - 0.25,
						(length - cornerSize(thick) / 2) / 2
					)
					wins.rotateY(-Math.PI / 4)
					wins.updateMatrixWorld()
					result = evaluator.evaluate(result, wins, SUBTRACTION)
				}

				for (let i = 0; i <= (do_floors ? floorsize : do_floors_max); i++) {
					const wall_1 = new Brush(new THREE.BoxGeometry(length, height, thick))
					wall_1.position.set(corner_size / 2, -((size - height) / 2) + height * i, (size - thick) / 2)
					wall_1.updateMatrixWorld()

					const wall_2 = new Brush(new THREE.BoxGeometry(thick, height, length))
					wall_2.position.set(-(size - thick) / 2, -((size - height) / 2) + height * i, -corner_size / 2)
					wall_2.updateMatrixWorld()

					const wall3 = new Brush(new THREE.BoxGeometry(size, height, thick))
					wall3.position.set(0, -((size - height) / 2) + height * i, -(size - thick) / 2)
					wall3.updateMatrixWorld()

					const wall4 = new Brush(new THREE.BoxGeometry(thick, height, size))
					wall4.position.set((size - thick) / 2, -((size - height) / 2) + height * i, 0)
					wall4.updateMatrixWorld()

					const window_1 = new Brush(new THREE.BoxGeometry(thick + 0.01, 0.2, length - 0.2))
					window_1.position.set(-((size - thick) / 2), -0.3 - height + height * i, -0.15)
					window_1.updateMatrixWorld()

					const window_2 = new Brush(new THREE.BoxGeometry(length - 0.2, 0.2, thick + 0.01))
					window_2.position.set(0.15, -0.3 - height + height * i, (size - thick) / 2)
					window_2.updateMatrixWorld()

					const corner = new Brush(new THREE.BoxGeometry(cornerSize(corner_size), height, thick))
					corner.rotateY(-Math.PI / 4)
					corner.position.set(
						-(length - cornerSize(thick) / 2) / 2,
						-(size - height) / 2 + height * i,
						(length - cornerSize(thick) / 2) / 2
					)
					corner.updateMatrixWorld()

					const door = new Brush(new THREE.BoxGeometry(0.2, 0.3, thick + 0.01))
					door.rotateY(-Math.PI / 4)
					door.position.set(
						-(length - cornerSize(thick) / 2) / 2,
						-0.32 - height + height * i,
						(length - cornerSize(thick) / 2) / 2
					)
					door.updateMatrixWorld()

					if (i == 0) {
						result = evaluator.evaluate(wall_1, wall_2, ADDITION)
						if (addRoofs) flooring(thick / 2 - size / 2, false)
					} else {
						result = evaluator.evaluate(result, wall_1, ADDITION)
						result = evaluator.evaluate(result, wall_2, ADDITION)
					}
					if (addRoofs) flooring(-(thick / 2) + height * i - height, true)

					result = evaluator.evaluate(result, wall3, ADDITION)
					result = evaluator.evaluate(result, wall4, ADDITION)
					result = evaluator.evaluate(result, corner, ADDITION)
					if (i == 0) {
						if (addWindows) {
							result = evaluator.evaluate(result, door, SUBTRACTION)
							result = evaluator.evaluate(result, window_1, SUBTRACTION)
							result = evaluator.evaluate(result, window_2, SUBTRACTION)
						}
					} else {
						if (addWindows) floor_windows(-(thick / 2) - height + height * i)
					}
				}

				geometry = result.geometry
			}

			if (cache[corner_inx] == undefined) cache[corner_inx] = {}
			if (cache[corner_inx][size] == undefined) cache[corner_inx][size] = {}
			if (cache[corner_inx][size][floorsize] == undefined) cache[corner_inx][size][floorsize] = {}
			if (cache[corner_inx][size][floorsize][addRoofs_inx] == undefined)
				cache[corner_inx][size][floorsize][addRoofs_inx] = {}
			if (cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx] == undefined)
				cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx] = {}
			cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][0] = {
				geo: geometry,
			}
			return { geo: geometry, mesh_type: geometry.type }
		}
		return {
			geo: cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][0].geo,
			mesh_type: cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][0].geo.type,
		}
	}

	static Prefab_Corner_2(
		geo: THREE.BufferGeometry,
		_addRoofs: boolean,
		_addWindows: boolean,
		_floorsize: number,
		_corner_size: number
	) {
		const group = new THREE.Group()
		group.userData = {
			data: 'building',
		}
		// const size = 2
		// const corner_inx = 1
		// const addRoofs_inx = addRoofs ? 1 : 0
		// const addWindows_inx = addWindows ? 1 : 0

		if (true) {
			if (true) {
				const mesh = new THREE.InstancedMesh(
					geo,
					new THREE.MeshPhongMaterial({
						// transparent: true,
						// opacity: 0.8,
						depthTest: true,
						wireframe: false,
					}),
					MAX_INSTANCE
				)
				mesh.count = 1
				mesh.frustumCulled = false
				mesh.geometry.computeBoundingBox()
				mesh.geometry.computeBoundingSphere()
				if (ENABLE_PHYSICS) {
					mesh.userData = {
						data: 'physics_instance',
						type: 'trimesh',
						optimize: 'chunk',
						debug: true,
						force_scale: {
							times: 6,
						},
					}
				}
				group.add(mesh)
			} else {
				const edges = new THREE.EdgesGeometry(geo, 2)
				const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xff00ff }))
				group.add(line)
			}
		}

		return group
	}

	static Prefab_Front_3_Geo(simple_geometry: boolean, addRoofs: boolean, addWindows: boolean, floorsize: number) {
		const size = 3
		const corner_inx = 0
		const addRoofs_inx = addRoofs ? 1 : 0
		const addWindows_inx = addWindows ? 1 : 0

		const evaluator = new Evaluator()
		const height = 0.5
		const thick = 0.02
		const do_floors = true
		const do_floors_max = 1
		let geometry = new THREE.BufferGeometry()
		geometry = new THREE.BoxGeometry(size, height * (floorsize + 1), size)

		if (
			!(
				cache[corner_inx] !== undefined &&
				cache[corner_inx][size] !== undefined &&
				cache[corner_inx][size][floorsize] !== undefined &&
				cache[corner_inx][size][floorsize][addRoofs_inx] !== undefined &&
				cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx] !== undefined &&
				cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][0] !== undefined
			)
		) {
			if (!simple_geometry) {
				let result = new Brush(geometry)

				function flooring(altitude: number, floor_steps: boolean) {
					const roof = new Brush(new THREE.BoxGeometry(size, thick, size))
					roof.position.set(0, altitude, 0)
					roof.updateMatrixWorld()

					result = evaluator.evaluate(result, roof, ADDITION)

					if (floor_steps) {
						const stairs_width = 0.2
						const stairs_length = cornerSize(height / 2, height)
						const stairs1 = new Brush(new THREE.BoxGeometry(stairs_length, thick, stairs_width))
						stairs1.position.set(
							size / 2 - height / 2 - stairs_width - 2 * thick,
							altitude - (3 * height) / 4 + thick / 2,
							-(size - stairs_width - 4 * thick) / 2
						)
						stairs1.rotateZ(Math.PI / 2 - Math.atan(stairs_length / (height / 2)))
						stairs1.updateMatrixWorld()

						const stairs2 = new Brush(new THREE.BoxGeometry(stairs_length, thick, stairs_width))
						stairs2.position.set(
							size / 2 - height / 2 - stairs_width - 2 * thick,
							altitude - height / 4 + thick / 2,
							-(size - 3 * stairs_width - 6 * thick) / 2
						)
						stairs2.rotateZ(Math.PI / 2 + Math.atan(stairs_length / (height / 2)))
						stairs2.updateMatrixWorld()

						const step1 = new Brush(
							new THREE.BoxGeometry(height + stairs_width, thick + 0.01, 2 * stairs_width + thick)
						)
						step1.position.set(
							size / 2 - (height + stairs_width) / 2 - 2 * thick,
							altitude,
							-size / 2 + (2 * stairs_width + thick) / 2 + 2 * thick
						)
						step1.updateMatrixWorld()

						const step2 = new Brush(new THREE.BoxGeometry(stairs_width, thick, 2 * stairs_width + thick))
						step2.position.set(
							size / 2 - stairs_width / 2 - 2 * thick,
							altitude - height / 2 + thick / 2,
							-size / 2 + (2 * stairs_width + thick) / 2 + 2 * thick
						)
						step2.updateMatrixWorld()

						result = evaluator.evaluate(result, step1, SUBTRACTION)
						result = evaluator.evaluate(result, stairs1, ADDITION)
						result = evaluator.evaluate(result, stairs2, ADDITION)
						result = evaluator.evaluate(result, step2, ADDITION)
					}
				}

				function floor_windows(altitude: number, vm: number = 1, hm: number = 9) {
					for (let i = 0; i < hm; i++) {
						for (let j = 0; j < vm; j++) {
							const wins_1 = new Brush(new THREE.BoxGeometry(0.25, 0.25, thick + 0.01))
							wins_1.position.set(i * 0.3 - 1.2, altitude - 0.25 + j * 0.22, (size - thick) / 2)
							wins_1.updateMatrixWorld()

							result = evaluator.evaluate(result, wins_1, SUBTRACTION)
						}
					}
				}

				for (let i = 0; i <= (do_floors ? floorsize : do_floors_max); i++) {
					const wall1 = new Brush(new THREE.BoxGeometry(size, height, thick))
					wall1.position.set(0, -((size - height) / 2) + i * height, (size - thick) / 2)
					wall1.updateMatrixWorld()

					const wall2 = new Brush(new THREE.BoxGeometry(size, height, thick))
					wall2.position.set(0, -((size - height) / 2) + i * height, -(size - thick) / 2)
					wall2.updateMatrixWorld()

					const wall3 = new Brush(new THREE.BoxGeometry(thick, height, size))
					wall3.position.set(-(size - thick) / 2, -((size - height) / 2) + i * height, 0)
					wall3.updateMatrixWorld()

					const wall4 = new Brush(new THREE.BoxGeometry(thick, height, size))
					wall4.position.set((size - thick) / 2, -((size - height) / 2) + i * height, 0)
					wall4.updateMatrixWorld()

					const door1 = new Brush(new THREE.BoxGeometry(0.2, 0.3, thick + 0.01))
					door1.position.set(-0.12, -1.3, (size - thick) / 2)
					door1.updateMatrixWorld()

					const door2 = new Brush(new THREE.BoxGeometry(0.2, 0.3, thick + 0.01))
					door2.position.set(0.12, -1.3, (size - thick) / 2)
					door2.updateMatrixWorld()

					const door3 = new Brush(new THREE.BoxGeometry(0.2, 0.3, thick + 0.01))
					door3.position.set(-1.25, -1.3, (size - thick) / 2)
					door3.updateMatrixWorld()

					const door4 = new Brush(new THREE.BoxGeometry(0.2, 0.3, thick + 0.01))
					door4.position.set(1.25, -1.3, (size - thick) / 2)
					door4.updateMatrixWorld()

					const window1 = new Brush(new THREE.BoxGeometry(0.8, 0.2, thick + 0.01))
					window1.position.set(-0.7, -1.3, (size - thick) / 2)
					window1.updateMatrixWorld()

					const window2 = new Brush(new THREE.BoxGeometry(0.8, 0.2, thick + 0.01))
					window2.position.set(0.7, -1.3, (size - thick) / 2)
					window2.updateMatrixWorld()

					if (i == 0) {
						result = evaluator.evaluate(wall1, wall2, ADDITION)
						if (addRoofs) flooring(thick / 2 - size / 2, false)
					} else {
						result = evaluator.evaluate(result, wall1, ADDITION)
						result = evaluator.evaluate(result, wall2, ADDITION)
					}
					if (addRoofs) flooring(-(thick / 2) + height * i - 2 * height, true)

					result = evaluator.evaluate(result, wall3, ADDITION)
					result = evaluator.evaluate(result, wall4, ADDITION)

					if (i == 0) {
						if (addWindows) {
							result = evaluator.evaluate(result, door1, SUBTRACTION)
							result = evaluator.evaluate(result, door2, SUBTRACTION)
							result = evaluator.evaluate(result, door3, SUBTRACTION)
							result = evaluator.evaluate(result, door4, SUBTRACTION)
							result = evaluator.evaluate(result, window1, SUBTRACTION)
							result = evaluator.evaluate(result, window2, SUBTRACTION)
						}
					} else {
						if (addWindows) floor_windows(-(thick / 2) - 2 * height + height * i)
					}
				}

				geometry = result.geometry
			}

			if (cache[corner_inx] == undefined) cache[corner_inx] = {}
			if (cache[corner_inx][size] == undefined) cache[corner_inx][size] = {}
			if (cache[corner_inx][size][floorsize] == undefined) cache[corner_inx][size][floorsize] = {}
			if (cache[corner_inx][size][floorsize][addRoofs_inx] == undefined)
				cache[corner_inx][size][floorsize][addRoofs_inx] = {}
			if (cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx] == undefined)
				cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx] = {}
			cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][0] = {
				geo: geometry,
			}
			return { geo: geometry, mesh_type: geometry.type }
		}
		return {
			geo: cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][0].geo,
			mesh_type: cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][0].geo.type,
		}
	}

	static Prefab_Front_3(geo: THREE.BufferGeometry, _addRoofs: boolean, _addWindows: boolean, _floorsize: number) {
		const group = new THREE.Group()
		group.userData = {
			data: 'building',
		}
		// const size = 3
		// const corner_inx = 0
		// const addRoofs_inx = addRoofs ? 1 : 0
		// const addWindows_inx = addWindows ? 1 : 0

		if (true) {
			if (true) {
				const mesh = new THREE.InstancedMesh(
					geo,
					new THREE.MeshPhongMaterial({
						// transparent: true,
						// opacity: 0.8,
						depthTest: true,
						wireframe: false,
					}),
					MAX_INSTANCE
				)
				mesh.count = 1
				mesh.frustumCulled = false
				mesh.geometry.computeBoundingBox()
				mesh.geometry.computeBoundingSphere()
				if (ENABLE_PHYSICS) {
					mesh.userData = {
						data: 'physics_instance',
						type: 'trimesh',
						optimize: 'chunk',
						debug: true,
						force_scale: {
							times: 6,
						},
					}
				}
				group.add(mesh)
			} else {
				const edges = new THREE.EdgesGeometry(geo, 2)
				const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xff00ff }))
				group.add(line)
			}
		}

		return group
	}

	static Prefab_Corner_3_Geo(
		simple_geometry: boolean,
		addRoofs: boolean,
		addWindows: boolean,
		floorsize: number,
		corner_size: number
	) {
		const size = 3
		const corner_inx = 1
		const addRoofs_inx = addRoofs ? 1 : 0
		const addWindows_inx = addWindows ? 1 : 0

		const evaluator = new Evaluator()
		const length = size - corner_size
		const height = 0.5
		const thick = 0.02
		const do_floors = true
		const do_floors_max = 1
		let geometry = new THREE.BufferGeometry()
		geometry = new THREE.BoxGeometry(size, height * (floorsize + 1), size)

		if (
			!(
				cache[corner_inx] !== undefined &&
				cache[corner_inx][size] !== undefined &&
				cache[corner_inx][size][floorsize] !== undefined &&
				cache[corner_inx][size][floorsize][addRoofs_inx] !== undefined &&
				cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx] !== undefined &&
				cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][0] !== undefined
			)
		) {
			if (!simple_geometry) {
				let result = new Brush(geometry)

				function flooring(altitude: number, floor_steps: boolean) {
					const roof = new Brush(new THREE.BoxGeometry(size, thick, size))
					roof.position.set(0, altitude, 0)
					roof.updateMatrixWorld()

					const roof_cur = new Brush(
						new THREE.BoxGeometry(cornerSize(corner_size), thick + 0.01, cornerSize(corner_size))
					)
					roof_cur.position.set(-size / 2, altitude, size / 2)
					roof_cur.rotateY(Math.PI / 4)
					roof_cur.updateMatrixWorld()

					result = evaluator.evaluate(result, roof, ADDITION)
					result = evaluator.evaluate(result, roof_cur, SUBTRACTION)

					if (floor_steps) {
						const stairs_width = 0.2
						const stairs_length = cornerSize(height / 2, height)
						const stairs1 = new Brush(new THREE.BoxGeometry(stairs_length, thick, stairs_width))
						stairs1.position.set(
							size / 2 - height / 2 - stairs_width - 2 * thick,
							altitude - (3 * height) / 4 + thick / 2,
							-(size - stairs_width - 4 * thick) / 2
						)
						stairs1.rotateZ(Math.PI / 2 - Math.atan(stairs_length / (height / 2)))
						stairs1.updateMatrixWorld()

						const stairs2 = new Brush(new THREE.BoxGeometry(stairs_length, thick, stairs_width))
						stairs2.position.set(
							size / 2 - height / 2 - stairs_width - 2 * thick,
							altitude - height / 4 + thick / 2,
							-(size - 3 * stairs_width - 6 * thick) / 2
						)
						stairs2.rotateZ(Math.PI / 2 + Math.atan(stairs_length / (height / 2)))
						stairs2.updateMatrixWorld()

						const step1 = new Brush(
							new THREE.BoxGeometry(height + stairs_width, thick + 0.01, 2 * stairs_width + thick)
						)
						step1.position.set(
							size / 2 - (height + stairs_width) / 2 - 2 * thick,
							altitude,
							-size / 2 + (2 * stairs_width + thick) / 2 + 2 * thick
						)
						step1.updateMatrixWorld()

						const step2 = new Brush(new THREE.BoxGeometry(stairs_width, thick, 2 * stairs_width + thick))
						step2.position.set(
							size / 2 - stairs_width / 2 - 2 * thick,
							altitude - height / 2 + thick / 2,
							-size / 2 + (2 * stairs_width + thick) / 2 + 2 * thick
						)
						step2.updateMatrixWorld()

						result = evaluator.evaluate(result, step1, SUBTRACTION)
						result = evaluator.evaluate(result, stairs1, ADDITION)
						result = evaluator.evaluate(result, stairs2, ADDITION)
						result = evaluator.evaluate(result, step2, ADDITION)
					}
				}

				function floor_windows(altitude: number, vm: number = 1, hm: number = 8) {
					for (let i = 0; i < hm; i++) {
						for (let j = 0; j < vm; j++) {
							const wins_1 = new Brush(new THREE.BoxGeometry(0.25, 0.25, thick + 0.01))
							wins_1.position.set(i * 0.3 - 0.9, altitude - 0.25 + j * 0.22, (size - thick) / 2)
							wins_1.updateMatrixWorld()

							const wins_2 = new Brush(new THREE.BoxGeometry(thick + 0.01, 0.25, 0.25))
							wins_2.position.set(-(size - thick) / 2, altitude - 0.25 + j * 0.22, i * 0.3 - 0.3 - 0.9)
							wins_2.updateMatrixWorld()

							result = evaluator.evaluate(result, wins_1, SUBTRACTION)
							result = evaluator.evaluate(result, wins_2, SUBTRACTION)
						}
					}
					const wins = new Brush(new THREE.BoxGeometry(0.2, 0.2, thick + 0.01))
					wins.position.set(
						-(length - cornerSize(thick) / 2) / 2,
						altitude - 0.25,
						(length - cornerSize(thick) / 2) / 2
					)
					wins.rotateY(-Math.PI / 4)
					wins.updateMatrixWorld()
					result = evaluator.evaluate(result, wins, SUBTRACTION)
				}

				for (let i = 0; i <= (do_floors ? floorsize : do_floors_max); i++) {
					const wall1 = new Brush(new THREE.BoxGeometry(length, height, thick))
					wall1.position.set(corner_size / 2, -((size - height) / 2) + height * i, (size - thick) / 2)
					wall1.updateMatrixWorld()

					const wall2 = new Brush(new THREE.BoxGeometry(thick, height, length))
					wall2.position.set(-(size - thick) / 2, -((size - height) / 2) + height * i, -corner_size / 2)
					wall2.updateMatrixWorld()

					const wall3 = new Brush(new THREE.BoxGeometry(thick, height, size))
					wall3.position.set((size - thick) / 2, -((size - height) / 2) + height * i, 0)
					wall3.updateMatrixWorld()

					const wall4 = new Brush(new THREE.BoxGeometry(size, height, thick))
					wall4.position.set(0, -((size - height) / 2) + height * i, -(size - thick) / 2)
					wall4.updateMatrixWorld()

					const corner = new Brush(new THREE.BoxGeometry(cornerSize(corner_size), height, thick))
					corner.position.set(
						-(length - cornerSize(thick) / 2) / 2,
						-((size - height) / 2) + height * i,
						(length - cornerSize(thick) / 2) / 2
					)
					corner.rotateY(-Math.PI / 4)
					corner.updateMatrixWorld()

					const door1 = new Brush(new THREE.BoxGeometry(0.2, 0.3, thick + 0.01))
					door1.position.set(-0.12, -((size - height) / 2) + height * i, (size - thick) / 2)
					door1.updateMatrixWorld()

					const door2 = new Brush(new THREE.BoxGeometry(0.2, 0.3, thick + 0.01))
					door2.position.set(0.12, -((size - height) / 2) + height * i, (size - thick) / 2)
					door2.updateMatrixWorld()

					const door3 = new Brush(new THREE.BoxGeometry(0.2, 0.3, thick + 0.01))
					door3.position.set(1.28, -((size - height) / 2) + height * i, (size - thick) / 2)
					door3.updateMatrixWorld()

					const door4 = new Brush(new THREE.BoxGeometry(thick + 0.01, 0.3, 0.2))
					door4.position.set(-(size - thick) / 2, -((size - height) / 2) + height * i, 0.12)
					door4.updateMatrixWorld()

					const door5 = new Brush(new THREE.BoxGeometry(thick + 0.01, 0.3, 0.2))
					door5.position.set(-(size - thick) / 2, -((size - height) / 2) + height * i, -0.12)
					door5.updateMatrixWorld()

					const door6 = new Brush(new THREE.BoxGeometry(thick + 0.01, 0.3, 0.2))
					door6.position.set(-(size - thick) / 2, -((size - height) / 2) + height * i, -1.28)
					door6.updateMatrixWorld()

					const door7 = new Brush(new THREE.BoxGeometry(0.2, 0.3, thick + 0.01))
					door7.position.set(
						-(length - cornerSize(thick) / 2) / 2,
						-((size - height) / 2) + height * i,
						(length - cornerSize(thick) / 2) / 2
					)
					door7.rotateY(-Math.PI / 4)
					door7.updateMatrixWorld()

					const window1 = new Brush(new THREE.BoxGeometry(thick + 0.01, 0.2, 0.8))
					window1.position.set(-(size - thick) / 2, -((size - height) / 2) + height * i, -0.7)
					window1.updateMatrixWorld()

					const window2 = new Brush(new THREE.BoxGeometry(thick + 0.01, 0.2, 0.8))
					window2.position.set(-(size - thick) / 2, -((size - height) / 2) + height * i, 0.75)
					window2.updateMatrixWorld()

					const window3 = new Brush(new THREE.BoxGeometry(0.8, 0.2, thick + 0.01))
					window3.position.set(0.7, -((size - height) / 2) + height * i, (size - thick) / 2)
					window3.updateMatrixWorld()

					const window4 = new Brush(new THREE.BoxGeometry(0.8, 0.2, thick + 0.01))
					window4.position.set(-0.75, -((size - height) / 2) + height * i, (size - thick) / 2)
					window4.updateMatrixWorld()

					if (i == 0) {
						result = evaluator.evaluate(wall1, wall2, ADDITION)
						if (addRoofs) flooring(thick / 2 - size / 2, false)
					} else {
						result = evaluator.evaluate(result, wall1, ADDITION)
						result = evaluator.evaluate(result, wall2, ADDITION)
					}
					if (addRoofs) flooring(-(thick / 2) + height * i - 2 * height, true)

					result = evaluator.evaluate(result, wall3, ADDITION)
					result = evaluator.evaluate(result, wall4, ADDITION)
					result = evaluator.evaluate(result, corner, ADDITION)

					if (i == 0) {
						if (addWindows) {
							result = evaluator.evaluate(result, door1, SUBTRACTION)
							result = evaluator.evaluate(result, door2, SUBTRACTION)
							result = evaluator.evaluate(result, door3, SUBTRACTION)
							result = evaluator.evaluate(result, door4, SUBTRACTION)
							result = evaluator.evaluate(result, door5, SUBTRACTION)
							result = evaluator.evaluate(result, door6, SUBTRACTION)
							result = evaluator.evaluate(result, door7, SUBTRACTION)
							result = evaluator.evaluate(result, window1, SUBTRACTION)
							result = evaluator.evaluate(result, window2, SUBTRACTION)
							result = evaluator.evaluate(result, window3, SUBTRACTION)
							result = evaluator.evaluate(result, window4, SUBTRACTION)
						}
					} else {
						if (addWindows) floor_windows(-(thick / 2) - 2 * height + height * i)
					}
				}

				geometry = result.geometry
			}

			if (cache[corner_inx] == undefined) cache[corner_inx] = {}
			if (cache[corner_inx][size] == undefined) cache[corner_inx][size] = {}
			if (cache[corner_inx][size][floorsize] == undefined) cache[corner_inx][size][floorsize] = {}
			if (cache[corner_inx][size][floorsize][addRoofs_inx] == undefined)
				cache[corner_inx][size][floorsize][addRoofs_inx] = {}
			if (cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx] == undefined)
				cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx] = {}
			cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][0] = {
				geo: geometry,
			}
			return { geo: geometry, mesh_type: geometry.type }
		}
		return {
			geo: cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][0].geo,
			mesh_type: cache[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][0].geo.type,
		}
	}

	static Prefab_Corner_3(
		geo: THREE.BufferGeometry,
		_addRoofs: boolean,
		_addWindows: boolean,
		_floorsize: number,
		_corner_size: number
	) {
		const group = new THREE.Group()
		group.userData = {
			data: 'building',
		}
		// const size = 3
		// const corner_inx = 1
		// const addRoofs_inx = addRoofs ? 1 : 0
		// const addWindows_inx = addWindows ? 1 : 0

		if (true) {
			if (true) {
				const mesh = new THREE.InstancedMesh(
					geo,
					new THREE.MeshPhongMaterial({
						// transparent: true,
						// opacity: 0.8,
						depthTest: true,
						wireframe: false,
					}),
					MAX_INSTANCE
				)
				mesh.count = 1
				mesh.frustumCulled = false
				mesh.geometry.computeBoundingBox()
				mesh.geometry.computeBoundingSphere()
				if (ENABLE_PHYSICS) {
					mesh.userData = {
						data: 'physics_instance',
						type: 'trimesh',
						optimize: 'chunk',
						debug: true,
						force_scale: {
							times: 6,
						},
					}
				}
				group.add(mesh)
			} else {
				const edges = new THREE.EdgesGeometry(geo, 2)
				const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xff00ff }))
				group.add(line)
			}
		}

		return group
	}

	static Prefab_Lights() {
		const group = new THREE.Object3D()
		if (true) {
			const lod = new THREE.LOD();
			const light_pole = new THREE.Mesh(
				new THREE.CylinderGeometry(0.01, 0.01, 0.5, 32),
				new THREE.MeshNormalMaterial()
			)
			const light_hadle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.01, 0.2), new THREE.MeshNormalMaterial())
			light_hadle.position.set(0, 0.25, 0.1)
			light_pole.add(light_hadle)

			lod.addLevel(light_pole, 0);
			lod.addLevel(new THREE.Object3D(), 50);
			group.add(lod)
		}
		return group
	}

	static Prefab_PathNode(isc: boolean) {
		const group = new THREE.Object3D()
		if (true) {
			const lod = new THREE.LOD();
			const path_node = new THREE.Mesh(
				new THREE.SphereGeometry(0.06, 4, 4),
				new THREE.MeshPhongMaterial({
					color: isc ? 0x0000aa : 0xaa0000,
				})
			)
			lod.addLevel(path_node, 0);
			lod.addLevel(new THREE.Object3D(), 50);
			group.add(lod)
		}
		return group
	}
}

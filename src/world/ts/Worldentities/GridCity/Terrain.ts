// import * as THREE from 'three'
import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js'
import { WorldBuilder } from './WorldBuilder'
import type { Junction, Road } from './WorldBuilder'

export type Chunk = {
	mesh: THREE.LineSegments | THREE.Mesh
	cx: number
	cz: number
}
export class Terrain extends THREE.Object3D {
	// scene: THREE.Scene
	public perlin: ImprovedNoise
	public CHUNK_SIZE_ORG: number
	public CHUNK_SIZE: number
	private GRID_RADIUS: number
	//private GRID_SIZE: number
	private NOISE_MULTIPLYER = 1

	public chunks: Chunk[]

	public followObject: (THREE.Object3D | CANNON.Body)[]
	public worldBuilder: WorldBuilder | null

	constructor(/* scene: THREE.Scene */) {
		super()
		// bind functions
		this.set_radius = this.set_radius.bind(this)
		this.generate = this.generate.bind(this)
		this.ToQuads = this.ToQuads.bind(this)
		this.createPlane = this.createPlane.bind(this)
		this.attachPlaneMesh = this.attachPlaneMesh.bind(this)
		this.morphRoads = this.morphRoads.bind(this)
		this.getFollowChunk = this.getFollowChunk.bind(this)
		this.getFollowChunkRad = this.getFollowChunkRad.bind(this)
		this.updateColors = this.updateColors.bind(this)
		this.updateChunk = this.updateChunk.bind(this)
		this.updateRoads = this.updateRoads.bind(this)
		this.updateInfiniteTerrain = this.updateInfiniteTerrain.bind(this)
		this.update = this.update.bind(this)

		// this.scene = scene

		// init
		this.perlin = new ImprovedNoise()
		this.CHUNK_SIZE = 20 // 20
		this.CHUNK_SIZE_ORG = 20 // 20
		this.GRID_RADIUS = 1
		//this.GRID_SIZE = this.GRID_RADIUS * 2 + 1
		this.set_radius(1)

		this.chunks = []
		this.followObject = []
		this.worldBuilder = null
	}

	public set_radius(r: number) {
		this.GRID_RADIUS = r
		//this.GRID_SIZE = this.GRID_RADIUS * 2 + 1
	}

	public generate(scale: number) {
		const all_pos: THREE.Vector2[] = this.getFollowChunkRad(this.getFollowChunk(this.followObject, scale))

		if (all_pos.length > this.chunks.length) {
			all_pos.forEach((pos) => {
				const mesh = this.createPlane(
					this.CHUNK_SIZE,
					this.perlin.noise(pos.x * 0.1, 0, pos.y * 0.1) * 0x7f7f7f + 0x7f7f7f
				)

				this.updateChunk(mesh.geometry, pos.x, pos.y)
				this.updateColors(mesh.geometry, 2)

				mesh.rotation.x = -Math.PI / 2
				mesh.position.set(pos.x * this.CHUNK_SIZE, 0, pos.y * this.CHUNK_SIZE)
				this.add(mesh)
				this.chunks.push({ mesh, cx: pos.x, cz: pos.y })
			})
		}
		if (all_pos.length < this.chunks.length) {
			const to_remove = this.chunks.length - all_pos.length
			for (let i = 0; i < to_remove; i++) {
				const chunk = this.chunks.pop()
				if (chunk !== undefined) this.remove(chunk.mesh)
			}
		}

		//console.log(all_pos)

		//this.updateRoads()
	}

	private ToQuads(g: any) {
		let p = g.parameters
		let segmentsX = p.widthSegments || 1
		let segmentsY = p.heightSegments || 1
		let indices = []
		for (let i = 0; i < segmentsY + 1; i++) {
			let index11 = 0
			let index12 = 0
			for (let j = 0; j < segmentsX; j++) {
				index11 = (segmentsX + 1) * i + j
				index12 = index11 + 1
				let index21 = index11
				let index22 = index11 + (segmentsX + 1)
				indices.push(index11, index12)
				if (index22 < (segmentsX + 1) * (segmentsY + 1) - 1) {
					indices.push(index21, index22)
				}
			}
			if (index12 + segmentsX + 1 <= (segmentsX + 1) * (segmentsY + 1) - 1) {
				indices.push(index12, index12 + segmentsX + 1)
			}
		}
		g.setIndex(indices)
		return g
	}

	public createPlane(size: number, _color: number, wireframe: boolean = true) {
		let geo = new THREE.PlaneGeometry(size, size, this.CHUNK_SIZE, this.CHUNK_SIZE)
		const colors = new Float32Array(geo.attributes.position.count * 3)
		geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

		if (wireframe) {
			let geo_line = this.ToQuads(geo)
			let mat_line = new THREE.LineBasicMaterial({
				// color: color,
				vertexColors: true,
				side: THREE.DoubleSide,
				// transparent: true,
				// opacity: 0.4,
			})
			let line_seg = new THREE.LineSegments(geo_line, mat_line)
			return line_seg
		} else {
			let mat_plane = new THREE.MeshBasicMaterial({
				// color: color,
				vertexColors: true,
				// wireframe: true,
				side: THREE.DoubleSide,
				// transparent: true,
				// opacity: 0.4,
			})
			let mesh_plane = new THREE.Mesh(geo, mat_plane)
			return mesh_plane
		}
	}

	public attachPlaneMesh(mesh1: THREE.Mesh | THREE.LineSegments, mesh2: THREE.Mesh) {
		const position1 = new THREE.Vector3()
		const position2 = new THREE.Vector3()

		const tmp_1 = new THREE.Vector3()
		const tmp_2 = new THREE.Vector3()
		mesh1.getWorldPosition(position1)
		mesh2.getWorldPosition(position2)

		const g1 = mesh1.geometry as THREE.BufferGeometry
		const pos1 = g1.attributes.position as THREE.BufferAttribute
		const g2 = mesh2.geometry as THREE.BufferGeometry
		const pos2 = g2.attributes.position as THREE.BufferAttribute

		for (let i = 0; i < pos1.count; i++) {
			position1.fromBufferAttribute(pos1, i)
			const alt = position1.z
			position1.applyMatrix4(mesh1.matrixWorld.clone())
			for (let j = 0; j < pos2.count; j++) {
				position2.fromBufferAttribute(pos2, j)
				position2.applyMatrix4(mesh2.matrixWorld.clone())

				tmp_1.copy(position1)
				tmp_2.copy(position2)
				tmp_1.y = 0
				tmp_2.y = 0

				if (tmp_1.distanceTo(tmp_2) < 0.01) pos2.setZ(j, alt)
			}
		}
		pos2.needsUpdate = true
	}

	public morphRoads(_scene: THREE.Scene) {
		if (this.worldBuilder === null) return
		// const worldBox = this.worldBuilder.getBoundingBox(this.worldBuilder.cities)
		const self = this
		const is_debug = false

		const city_ranges: {
			xMin: number
			zMin: number
			xMax: number
			zMax: number
		}[] = []
		const extra_gap = 1 / this.worldBuilder.settings.allysize
		for (let i = 0; i < this.worldBuilder.cities.length; i++) {
			city_ranges.push({
				xMin:
					(this.worldBuilder.cities[i].cityBuilder.offset_position.x -
						(this.worldBuilder.cities[i].size * this.worldBuilder.settings.allysize) / 2) /
						this.CHUNK_SIZE -
					extra_gap,
				zMin:
					(this.worldBuilder.cities[i].cityBuilder.offset_position.z -
						(this.worldBuilder.cities[i].size * this.worldBuilder.settings.allysize) / 2) /
						this.CHUNK_SIZE -
					extra_gap,
				xMax:
					(this.worldBuilder.cities[i].cityBuilder.offset_position.x +
						(this.worldBuilder.cities[i].size * this.worldBuilder.settings.allysize) / 2) /
						this.CHUNK_SIZE +
					extra_gap,
				zMax:
					(this.worldBuilder.cities[i].cityBuilder.offset_position.z +
						(this.worldBuilder.cities[i].size * this.worldBuilder.settings.allysize) / 2) /
						this.CHUNK_SIZE +
					extra_gap,
			})
		}

		function preSetupConnect(mesh: THREE.Mesh) {
			const pos = new THREE.Vector3()
			const quat = new THREE.Quaternion()
			pos.copy(mesh.position)
			mesh.getWorldQuaternion(quat)
			const obj = new THREE.Object3D()
			obj.quaternion.copy(quat)

			if (is_debug) {
				if (pos.x > 0) return
				if (pos.x < -30) return
				if (pos.z < 75) return
				if (pos.z > 85) return
			}

			let cx = pos.x //- worldBox.centX;
			let cz = pos.z //- worldBox.centZ;
			cx -= pos.x % 2
			cz -= pos.z % 2
			cx /= self.CHUNK_SIZE_ORG
			cz /= self.CHUNK_SIZE_ORG
			if (is_debug) console.log(cx, cz)

			// self.updateChunk(mesh.geometry, cx, cz)
			// return

			const chunk_meshs: (THREE.Mesh | THREE.LineSegments)[] = []
			const params = (mesh.geometry as THREE.BoxGeometry).parameters

			function createPlanerConfig(c_x: number, c_z: number) {
				const chunk_mesh = self.createPlane(
					self.CHUNK_SIZE,
					self.perlin.noise(c_x, 0, c_z) * 0x7f7f7f + 0x7f7f7f
				)
				self.updateChunk(chunk_mesh.geometry, c_x, c_z, city_ranges)
				self.updateColors(chunk_mesh.geometry, 2)
				chunk_mesh.rotation.x = -Math.PI / 2
				chunk_mesh.position.set(c_x * self.CHUNK_SIZE, /* 0.1 */ 0, c_z * self.CHUNK_SIZE)
				return chunk_mesh
			}
			if (is_debug) {
				console.log(self.CHUNK_SIZE)
				console.log(Math.max(params.width, params.height))
				console.log(Math.round(obj.rotation.z / (Math.PI / 2)) % 2)
			}
			if (
				Math.max(params.width, params.height) > self.CHUNK_SIZE &&
				Math.round(obj.rotation.z / (Math.PI / 2)) % 2 != 0
			) {
				const steps = Math.ceil(Math.max(params.width, params.height) / self.CHUNK_SIZE)
				for (let i = -steps; i < steps + 1; i++) {
					const cm = createPlanerConfig(cx + i, cz)
					chunk_meshs.push(cm)
					if (is_debug) {
						const helper = new THREE.AxesHelper(10)
						helper.position.set(cm.position.x, 0, cm.position.z)
						_scene.add(helper)
						console.log(obj.rotation.z / (Math.PI / 2))
						_scene.add(cm)
					}
				}
			} else if (Math.max(params.width, params.height) > self.CHUNK_SIZE) {
				const steps = Math.ceil(Math.max(params.width, params.height) / self.CHUNK_SIZE)
				for (let i = -steps; i < steps + 1; i++) {
					const cm = createPlanerConfig(cx, cz + i)
					chunk_meshs.push(cm)
					if (is_debug) {
						const helper = new THREE.AxesHelper(10)
						helper.position.set(cm.position.x, 0, cm.position.z)
						_scene.add(helper)
						_scene.add(cm)
					}
				}
			} else {
				const cm = createPlanerConfig(cx, cz)
				chunk_meshs.push(cm)
				if (is_debug) {
					const helper = new THREE.AxesHelper(10)
					helper.position.set(cm.position.x, 0, cm.position.z)
					_scene.add(helper)
					_scene.add(cm)
				}
			}

			chunk_meshs.forEach((cmesh: THREE.Mesh | THREE.LineSegments) => {
				self.attachPlaneMesh(cmesh, mesh)
				;(cmesh.material as THREE.Material).dispose()
				cmesh.geometry.dispose()
			})
		}

		this.worldBuilder.getAllRoads().forEach((road: Road) => road.mesh.forEach(preSetupConnect))
		this.worldBuilder.getAllJunctions().forEach((junction: Junction) => junction.mesh.forEach(preSetupConnect))
	}

	public getFollowChunk(followObject: (THREE.Object3D | CANNON.Body)[], scale: number = 1) {
		const cords: { x: number; z: number }[] = []
		for (let i = 0; i < followObject.length; i++) {
			/* let globalPos = new THREE.Vector3()
			this.getWorldPosition(globalPos)
			console.log(globalPos) */
			cords.push({
				x: Math.round(followObject[i].position.x * scale),
				z: Math.round(followObject[i].position.z * scale),
			})
		}
		return cords
	}

	public getFollowChunkRad(followObject: { x: number; z: number }[]) {
		const all_pos: THREE.Vector2[] = []
		if (this.GRID_RADIUS < 0) return all_pos
		for (let i = 0; i < followObject.length; i++) {
			const GRID_RADIUS_X = Math.round(followObject[i].x / this.CHUNK_SIZE)
			const GRID_RADIUS_Z = Math.round(followObject[i].z / this.CHUNK_SIZE)
			for (let cx = GRID_RADIUS_X - this.GRID_RADIUS; cx <= GRID_RADIUS_X + this.GRID_RADIUS; cx++) {
				for (let cz = GRID_RADIUS_Z - this.GRID_RADIUS; cz <= GRID_RADIUS_Z + this.GRID_RADIUS; cz++) {
					let to_inside = true
					for (let j = 0; j < all_pos.length; j++) {
						if (cx == all_pos[j].x && cz == all_pos[j].y) {
							to_inside = false
							break
						}
					}
					if (to_inside) all_pos.push(new THREE.Vector2(cx, cz))
				}
			}
		}

		return all_pos
	}

	public updateColors(geometry: THREE.BufferGeometry, col_type: number = 1) {
		const positions = geometry.attributes.position
		const colors = geometry.attributes.color

		for (let i = 0; i < positions.count; i++) {
			// const x = positions.getX(i)
			// const y = positions.getY(i)
			const z = (positions.getZ(i) * 2) / this.NOISE_MULTIPLYER

			// Normalize height to 0..1
			const t = THREE.MathUtils.clamp((z + 2) / 4, 0, 1)

			if (col_type == 1) {
				if (t < 0.3)
					colors.setXYZ(i, 0, 0, 0.8) // water
				else if (t < 0.6)
					colors.setXYZ(i, 0, 0.8, 0) // grass
				else colors.setXYZ(i, 0.8, 0.8, 0.8) // mountain
			} else if (col_type == 2) {
				// Blue -> Red gradient
				colors.setXYZ(
					i,
					t, // red
					0,
					1 - t // blue
				)
			}
		}

		colors.needsUpdate = true
	}

	public updateChunk(
		g: THREE.BufferGeometry,
		cx: number = 0,
		cz: number = 0,
		regions?: {
			xMin: number
			zMin: number
			xMax: number
			zMax: number
		}[]
	) {
		const pos = g.attributes.position as THREE.BufferAttribute
		const uv = g.attributes.uv as THREE.BufferAttribute
		// const params = g.parameters

		const vec2 = new THREE.Vector2()
		const vec3 = new THREE.Vector3()

		/* if (regions !== undefined && regions.length > 0) {
			console.log(regions)
		} */

		for (let i = 0; i < pos.count; i++) {
			vec3.fromBufferAttribute(pos, i)
			vec2.fromBufferAttribute(uv, i)
			//			if (i == 0) console.log(vec3, vec2);

			let wx = 0
			let wz = 0
			if (true) {
				// wx = (cx * this.CHUNK_SIZE_ORG + vec3.x + params.width / 2) / this.CHUNK_SIZE_ORG;
				// wz = (cz * this.CHUNK_SIZE_ORG + vec3.y - params.height / 2) / this.CHUNK_SIZE_ORG;
				wx = (cx * this.CHUNK_SIZE + vec3.x) / this.CHUNK_SIZE_ORG
				wz = (cz * this.CHUNK_SIZE - vec3.y) / this.CHUNK_SIZE_ORG
			} else {
				wx = cx + vec2.x
				wz = cz + vec2.y
			}

			// Skip vertices outside all dirty regions
			let inside = false
			if (regions !== undefined && regions.length > 0) {
				for (let i = 0; i < regions.length; i++) {
					if (
						wx >= regions[i].xMin &&
						wx <= regions[i].xMax &&
						wz >= regions[i].zMin &&
						wz <= regions[i].zMax
					) {
						inside = true
						break
					}
				}
			}
			if (inside) pos.setZ(i, 0.3)
			else pos.setZ(i, this.perlin.noise(wx, wz, 0) * this.NOISE_MULTIPLYER)
		}

		pos.needsUpdate = true
	}

	private updateRoads(update: boolean = false) {
		if (!update) return
		const xs = []
		const zs = []

		for (let i = 0; i < this.chunks.length; i++) {
			xs.push(this.chunks[i].cx * this.CHUNK_SIZE)
			zs.push(this.chunks[i].cz * this.CHUNK_SIZE)
		}

		const minX = Math.min(...xs) - this.CHUNK_SIZE / 2
		const maxX = Math.max(...xs) + this.CHUNK_SIZE / 2
		const minZ = Math.min(...zs) - this.CHUNK_SIZE / 2
		const maxZ = Math.max(...zs) + this.CHUNK_SIZE / 2

		if (this.worldBuilder !== null) {
			const roads = this.worldBuilder.getAllRoads()
			const worldBox = this.worldBuilder.getBoundingBox(this.worldBuilder.cities)
			roads.forEach((road) => {
				let isIn = false
				let rminX = Math.min(road.from[0], road.to[0])
				let rmaxX = Math.max(road.from[0], road.to[0])
				let rminZ = Math.min(road.from[1], road.to[1])
				let rmaxZ = Math.max(road.from[1], road.to[1])

				const isH = rminX == rmaxX
				const isV = rminZ == rmaxZ

				rminX -= worldBox.centX
				rmaxX -= worldBox.centX
				rminZ -= worldBox.centZ
				rmaxZ -= worldBox.centZ
				rminX += 10 - (rminX % 10)
				rmaxX += 10 - (rmaxX % 10)
				rminZ += 10 - (rminZ % 10)
				rmaxZ += 10 - (rmaxZ % 10)

				if (isV) {
					rminZ -= 1.5
					rmaxZ += 1.5
				} else if (isH) {
					rminX -= 1.5
					rmaxX += 1.5
				}

				if (rminX >= minX && rminX <= maxX && rminZ >= minZ && rminZ <= maxZ) {
					isIn = true
				} else if (rmaxX >= minX && rmaxX <= maxX && rmaxZ >= minZ && rmaxZ <= maxZ) {
					isIn = true
				} else if (rminX >= minX && rminX <= maxX && rmaxZ >= minZ && rmaxZ <= maxZ) {
					isIn = true
				} else if (rmaxX >= minX && rmaxX <= maxX && rminZ >= minZ && rminZ <= maxZ) {
					isIn = true
				}
				road.mesh.forEach((mesh) => {
					;(mesh.material as THREE.Material).visible = isIn
				})
			})
		}
	}

	private updateInfiniteTerrain(scale: number) {
		if (this.followObject === null) return
		const camChunks = this.getFollowChunkRad(this.getFollowChunk(this.followObject, scale))
		for (let i = 0; i < this.chunks.length; i++) {
			if (camChunks[i] != undefined) {
				this.chunks[i]

				//const dx = this.chunks[i].cx - camChunks[i].x
				//const dz = this.chunks[i].cz - camChunks[i].z

				//if (dx < -this.GRID_RADIUS) this.chunks[i].cx += this.GRID_SIZE
				//if (dx > this.GRID_RADIUS) this.chunks[i].cx -= this.GRID_SIZE
				//if (dz < -this.GRID_RADIUS) this.chunks[i].cz += this.GRID_SIZE
				//if (dz > this.GRID_RADIUS) this.chunks[i].cz -= this.GRID_SIZE

				//const newX = this.chunks[i].cx * this.CHUNK_SIZE
				//const newZ = this.chunks[i].cz * this.CHUNK_SIZE
				const newX = camChunks[i].x * this.CHUNK_SIZE
				const newZ = camChunks[i].y * this.CHUNK_SIZE

				//if (this.chunks[i].mesh.position.x !== newX || this.chunks[i].mesh.position.z !== newZ) {
				// chunk.clearAll()
				this.chunks[i].mesh.position.set(newX, /* 0.01 */ 0, newZ)
				/* ;(this.chunks[i].mesh.material as THREE.LineBasicMaterial | THREE.MeshBasicMaterial).color =
					new THREE.Color(
						this.perlin.noise(camChunks[i].x * 0.1, 0, camChunks[i].y * 0.1) * 0x7f7f7f + 0x7f7f7f
					) */
				this.updateChunk(this.chunks[i].mesh.geometry, camChunks[i].x, camChunks[i].y)
				this.updateColors(this.chunks[i].mesh.geometry, 2)
				// chunk.addGrid()
				//}
			}
		}
		/* for (const camChunk of camChunks) {
		for (const chunk of this.chunks) {
			const dx = chunk.cx - camChunk.x
			const dz = chunk.cz - camChunk.z

			if (dx < -this.GRID_RADIUS) chunk.cx += this.GRID_SIZE
			if (dx > this.GRID_RADIUS) chunk.cx -= this.GRID_SIZE
			if (dz < -this.GRID_RADIUS) chunk.cz += this.GRID_SIZE
			if (dz > this.GRID_RADIUS) chunk.cz -= this.GRID_SIZE

			const newX = chunk.cx * this.CHUNK_SIZE
			const newZ = chunk.cz * this.CHUNK_SIZE

			if (chunk.mesh.position.x !== newX || chunk.mesh.position.z !== newZ) {
				// chunk.clearAll()
				chunk.mesh.position.set(newX, 0, newZ)
				this.updateChunk(chunk.mesh.geometry, chunk.cx, chunk.cz)
				// chunk.addGrid()
					is_updated = true
			}
		}
		} */
		this.updateRoads()
	}

	public update(scale: number = 1) {
		this.generate(scale)
		this.updateInfiniteTerrain(scale)
		// console.log("followObject: ", this.followObject.length)
	}
}

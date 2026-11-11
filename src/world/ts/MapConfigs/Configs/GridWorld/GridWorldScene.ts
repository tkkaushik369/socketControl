import * as THREE from 'three'
import { WorldBase } from '@World'
import { BaseScene } from '../../BaseScene'
import { WorldBuilder, Road, Junction } from '../../../Worldentities/GridCity/WorldBuilder'
import { Terrain } from '../../../Worldentities/GridCity/Terrain'

export class GridWorldScene extends BaseScene {
	constructor(world: WorldBase | null = null) {
		super()

		/* {
			const ground = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ color: 0xcccccc }))
			ground.scale.set(500, 0.2, 500)
			const groundPhy = new THREE.Mesh(new THREE.BoxGeometry())
			groundPhy.scale.copy(ground.scale).divideScalar(2)
			groundPhy.userData = {
				data: 'physics',
				type: 'box',
			}
			groundPhy.position.copy(ground.position)
			groundPhy.quaternion.copy(ground.quaternion)
			this.scene.add(groundPhy)
			this.scene.add(ground)
		} */
		{
			{
				const scenario1 = new THREE.Object3D()
				scenario1.userData = {
					name: 'Free roam (default)',
					data: 'scenario',
					default: 'true',
					desc_title: 'Default spawn',
					camera_angle: 0,
					desc_content: 'Explore the world!',
				}

				{
					{
						let spawnPlayer = new THREE.Object3D()
						spawnPlayer.userData = {
							name: 'user',
							data: 'spawn',
							type: 'player',
						}
						spawnPlayer.position.set(0.5, 4, 0)

						scenario1.add(spawnPlayer)
					}
				}

				this.scene.add(scenario1)
			}
			{
				const scenario2 = new THREE.Object3D()
				scenario2.userData = {
					name: 'default vehicles',
					data: 'scenario',
					spawn_always: 'true',
					invisible: 'true',
				}

				{
					{
						let spawnVehicle = new THREE.Object3D()
						spawnVehicle.position.set(4, 2, 0)
						spawnVehicle.userData = {
							data: 'spawn',
							type: 'car',
							subtype: 'car_test',
							name: 'car_test',
						}
						scenario2.add(spawnVehicle)
					}
					{
						let spawnVehicle = new THREE.Object3D()
						spawnVehicle.position.set(2, 2, 0)
						spawnVehicle.userData = {
							data: 'spawn',
							type: 'car',
							subtype: null,
							name: 'car',
						}
						scenario2.add(spawnVehicle)
					}
				}
				this.scene.add(scenario2)
			}
		}

		const scaling = 6
		const settings = {
			preload_buildins: 0,
			renderCity: true,
			seed: 0,
			// 10
			corner: 3,
			footpath: 2,
			allysize: 10,
			// 20
			floorsize: 5,
			block_types_1: 3,
			block_types_2: 1,
			block_types_3: 1,
			size: 1,
			corner_size: 0.25,
			renderBuildings: true,
			renderBuildingsRoofs: true,
			renderBuildingsWindows: true,
			simple_geometry: true,
			renderHelper: false,
			renderDebug: -1,
			renderDebugsWireframe: false,
			renderDebugsBuildings: false,
			renderDebugsBuildingsWireframe: true,
			renderLights: false,
			renderNodePaths: false,
			terrainFov: 1,
			camera: 'Orthographic',
		}
		const is_debug = false
		const worldBuilder = new WorldBuilder(world, settings)
		this.scene.add(worldBuilder)

		const terrain = new Terrain()
		// terrain.CHUNK_SIZE = 20
		terrain.worldBuilder = worldBuilder
		terrain.set_radius(settings.terrainFov)
		this.scene.add(terrain)

		const self = this
		function Post_Generate() {
			// terrain.followObject = currentCamera
			terrain.morphRoads(self.scene)

			// cityBuilder.generate(true)
			// cityBuilder.render()
			{
				const worldBox = worldBuilder.getBoundingBox(worldBuilder.cities)
				const size = Math.max(worldBox.maxX, worldBox.maxZ)
				const extra = 150
				var length_max = 200
				length_max += Math.max(
					worldBuilder.getBoundingBox(worldBuilder.cities).maxX,
					worldBuilder.getBoundingBox(worldBuilder.cities).maxZ
				)
				let pts = Math.floor(20 / 6) * 2
				let length = length_max / pts / 2

				// terrain.CHUNK_SIZE_ORG = 20
				// terrain.CHUNK_SIZE = 10

				const mat = new THREE.MeshPhongMaterial({
					vertexColors: true,
					// side: THREE.DoubleSide,aa
					// wireframe: true,
					// color: 0x926829,
					// wireframe: true,
					// transparent: true,
					// opacity: 0.2,
				})

				// pts = size + extra
				const geo = new THREE.PlaneGeometry(length_max, length_max, length_max, length_max)
				// const geo = new THREE.PlaneGeometry(terrain.CHUNK_SIZE, terrain.CHUNK_SIZE, terrain.CHUNK_SIZE, terrain.CHUNK_SIZE)
				const colors = new Float32Array(geo.attributes.position.count * 3)
				geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
				const cmesh2 = new THREE.Mesh(geo, mat)
				cmesh2.rotation.x = -Math.PI / 2
				// cmesh2.position.x = 20 * scaling
				if (!is_debug)
					cmesh2.userData = {
						data: 'physics',
						type: 'heightfield',
						scale: scaling,
						visible: true,
						width: length_max,
						height: length_max,
					}
				const city_ranges: {
					xMin: number
					zMin: number
					xMax: number
					zMax: number
				}[] = []
				const extra_gap = 1 / settings.allysize
				for (let i = 0; i < worldBuilder.cities.length; i++) {
					city_ranges.push({
						xMin:
							(worldBuilder.cities[i].cityBuilder.offset_position.x -
								(worldBuilder.cities[i].size * settings.allysize) / 2) /
								terrain.CHUNK_SIZE -
							extra_gap,
						zMin:
							(worldBuilder.cities[i].cityBuilder.offset_position.z -
								(worldBuilder.cities[i].size * settings.allysize) / 2) /
								terrain.CHUNK_SIZE -
							extra_gap,
						xMax:
							(worldBuilder.cities[i].cityBuilder.offset_position.x +
								(worldBuilder.cities[i].size * settings.allysize) / 2) /
								terrain.CHUNK_SIZE +
							extra_gap,
						zMax:
							(worldBuilder.cities[i].cityBuilder.offset_position.z +
								(worldBuilder.cities[i].size * settings.allysize) / 2) /
								terrain.CHUNK_SIZE +
							extra_gap,
					})
				}
				terrain.updateChunk(
					geo,
					cmesh2.position.x / scaling / terrain.CHUNK_SIZE,
					cmesh2.position.z / scaling / terrain.CHUNK_SIZE,
					city_ranges
				)
				cmesh2.scale.set(scaling, scaling, scaling)
				terrain.updateColors(geo)
				self.scene.add(cmesh2)

				// Ensure vertex color attributes are preserved in the JSON export
				function ensureVertexColorsPreserved(obj: THREE.Mesh, color_update: boolean = false): void {
					if (obj.isMesh && obj.geometry instanceof THREE.PlaneGeometry) {
						// Original morphed mesh
						const sourceGeometry = obj.geometry

						// Create new BufferGeometry
						const clonedGeometry = new THREE.BufferGeometry()

						// Get current morphed positions
						const positions = new Float32Array(sourceGeometry.attributes.position.count * 3)

						// Apply morph transformations to cloned vertices
						const vertex = new THREE.Vector3()

						for (let i = 0; i < sourceGeometry.attributes.position.count; i++) {
							obj.getVertexPosition(i, vertex)

							positions[i * 3] = vertex.x
							positions[i * 3 + 1] = vertex.y
							positions[i * 3 + 2] = vertex.z
						}

						// Set position attribute
						clonedGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

						// Copy index and UV
						if (sourceGeometry.index) {
							clonedGeometry.setIndex(sourceGeometry.index.clone())
						}

						if (sourceGeometry.attributes.uv) {
							clonedGeometry.setAttribute('uv', sourceGeometry.attributes.uv.clone())
						}

						// Recalculate normals
						clonedGeometry.computeVertexNormals()

						// Create color attribute

						// if (sourceGeometry.attributes.color !== undefined) {
						if (color_update) {
							;(sourceGeometry.attributes.color as THREE.BufferAttribute).needsUpdate = true
							const colors = new Float32Array(positions.length)

							for (let i = 0; i < positions.length / 3; i++) {
								colors[i * 3] = sourceGeometry.attributes.color.getX(i)
								colors[i * 3 + 1] = sourceGeometry.attributes.color.getY(i)
								colors[i * 3 + 2] = sourceGeometry.attributes.color.getZ(i)
							}

							clonedGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
						}

						geo.dispose()
						;(obj.geometry as THREE.BufferGeometry) = clonedGeometry as THREE.BufferGeometry
					}
				}

				const roads: Road[] = worldBuilder.getAllRoads()
				for (const roadMeshs of roads) {
					for (const road of roadMeshs.mesh) {
						ensureVertexColorsPreserved(road)
					}
				}
				const junctions: Junction[] = worldBuilder.getAllJunctions()
				for (const junctionMeshs of junctions) {
					for (const junction of junctionMeshs.mesh) {
						ensureVertexColorsPreserved(junction)
					}
				}

				ensureVertexColorsPreserved(cmesh2, true)

				// chunked ground
				if (is_debug) {
					for (let i = -length; i <= length; i++) {
						for (let j = -length; j <= length; j++) {
							// pts = size + extra
							const geo = new THREE.PlaneGeometry(pts, pts, pts, pts)
							// const geo = new THREE.PlaneGeometry(terrain.CHUNK_SIZE, terrain.CHUNK_SIZE, terrain.CHUNK_SIZE, terrain.CHUNK_SIZE)
							// const colors = new Float32Array(geo.attributes.position.count * 3)
							// geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
							const cmesh2 = new THREE.Mesh(geo, mat)
							cmesh2.rotation.x = -Math.PI / 2
							cmesh2.position.x = pts * scaling * i
							// cmesh2.position.y = 10
							cmesh2.position.z = pts * scaling * j
							// cmesh2.position.x += 1.5
							// cmesh2.position.z += 1.5
							cmesh2.userData = {
								data: 'physics',
								type: 'heightfield',
								scale: scaling,
								optimize: 'chunk',
								visible: false,
							}
							terrain.updateChunk(
								geo,
								cmesh2.position.x / scaling / terrain.CHUNK_SIZE,
								cmesh2.position.z / scaling / terrain.CHUNK_SIZE
							)
							// geo.scale(scaling, scaling, scaling)
							// cmesh2.scale.set(scaling, scaling, scaling)
							// terrain.updateColors(geo)
							self.scene.add(cmesh2)
						}
					}
				}
			}
		}

		// terrain.generate()
		// worldBuilder.generate()
		if (settings.preload_buildins) {
			worldBuilder.generate(1, Post_Generate, false)
		} else {
			worldBuilder.generate(1)
			Post_Generate()
		}

		terrain.scale.set(scaling, scaling, scaling)
		worldBuilder.scale.set(scaling, scaling, scaling)
	}
}

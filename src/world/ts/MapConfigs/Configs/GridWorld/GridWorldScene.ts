import * as THREE from 'three'
import { BaseScene } from '../../BaseScene'
import { WorldBuilder } from '../../../Worldentities/GridCity/WorldBuilder'
import { Terrain } from '../../../Worldentities/GridCity/Terrain'

export class GridWorldScene extends BaseScene {
	constructor() {
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
		const worldBuilder = new WorldBuilder(settings)
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
				var pts = 200
				pts += Math.max(
					worldBuilder.getBoundingBox(worldBuilder.cities).maxX,
					worldBuilder.getBoundingBox(worldBuilder.cities).maxZ
				)
				// pts = 30

				// terrain.CHUNK_SIZE_ORG = 20
				// terrain.CHUNK_SIZE = 10

				const mat = new THREE.MeshPhongMaterial({
					// vertexColors: true,
					// side: THREE.DoubleSide,aa
					// wireframe: true,
					color: 0x926829,
					// wireframe: true,
					// transparent: true,
					// opacity: 0.2,
				})

				// pts = size + extra
				const geo = new THREE.PlaneGeometry(pts, pts, pts, pts)
				// const geo = new THREE.PlaneGeometry(terrain.CHUNK_SIZE, terrain.CHUNK_SIZE, terrain.CHUNK_SIZE, terrain.CHUNK_SIZE)
				const colors = new Float32Array(geo.attributes.position.count * 3)
				geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
				const cmesh2 = new THREE.Mesh(geo, mat)
				cmesh2.rotation.x = -Math.PI / 2
				// cmesh2.position.x = 20 * scaling
				cmesh2.userData = { data: 'physics', type: 'heightfield', scale: scaling }
				terrain.updateChunk(geo, (cmesh2.position.x / scaling) / terrain.CHUNK_SIZE, (cmesh2.position.z / scaling) / terrain.CHUNK_SIZE)
				cmesh2.scale.set(scaling, scaling, scaling)
				// terrain.updateColors(geo)
				self.scene.add(cmesh2)
			}
		}

		// terrain.generate()
		// worldBuilder.generate()
		if (settings.preload_buildins) {
			worldBuilder.generate(1, Post_Generate, true)
		} else {
			worldBuilder.generate(1)
			Post_Generate()
		}

		terrain.scale.set(scaling, scaling, scaling)
		worldBuilder.scale.set(scaling, scaling, scaling)
	}
}

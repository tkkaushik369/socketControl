import * as THREE from 'three'
import { WorldBase } from '@World'
import { BaseScene } from '../../BaseScene'
import { CityBuilder } from '../../../Worldentities/GridCity/GridCityBuilder'

export class GridCityScene extends BaseScene {
	constructor(world: WorldBase | null = null) {
		super()

		{
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
		}
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
						spawnPlayer.position.set(0, 2, 0)

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

		const settings = {
			preload_buildins: 1,
			renderCity: true,
			seed: 0,
			// 10
			corner: 3,
			footpath: 1,
			allysize: 10,
			// 20
			floorsize: 5,
			block_types_1: 3,
			block_types_2: 1,
			block_types_3: 1,
			size: 3,
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
		}

		const logs = false
		const cityId = 'Grid_City_1'
		function cityDone() {
			if (logs) console.log(`City Done: ${cityId}`)
			// if (callback !== null) callback(cityId)
		}
		function cityProgress(prog: number) {
			if (logs) console.log(`City Prpg: ${cityId}|${Number(prog).toFixed(2) + '%'}`)
		}
		const cityBuilder = new CityBuilder(world, cityId, settings, cityDone, cityProgress)
		this.scene.add(cityBuilder)

		/* const scene_data = {
			ally_data: [
				{
					grid: [
						[
							[3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
							[3, 102, 102, 101, 103, 103, 103, 101, 101, 3],
							[3, 102, 102, 0, 103, 103, 103, 0, 101, 3],
							[3, 101, 0, 0, 103, 103, 103, 0, 101, 3],
							[3, 102, 102, 0, 0, 0, 0, 102, 102, 3],
							[3, 102, 102, 0, 0, 0, 0, 102, 102, 3],
							[3, 102, 102, 0, 0, 0, 1, 1, 1, 3],
							[3, 102, 102, 102, 102, 0, 1, 0, 101, 3],
							[3, 101, 101, 102, 102, 101, 1, 101, 101, 3],
							[3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
						],
						[
							[2, 2, 2, 3, 3, 3, 3, 2, 2, 2],
							[2, 2, 2, 0, 0, 0, 0, 2, 2, 2],
							[2, 2, 2, 0, 0, 0, 0, 2, 2, 2],
							[3, 0, 0, 0, 0, 0, 0, 0, 0, 3],
							[3, 0, 0, 0, 0, 0, 0, 0, 0, 3],
							[3, 0, 0, 0, 0, 0, 0, 0, 0, 3],
							[3, 0, 0, 0, 0, 0, 1, 1, 1, 3],
							[2, 2, 2, 0, 0, 0, 1, 2, 2, 2],
							[2, 2, 2, 0, 0, 0, 1, 2, 2, 2],
							[2, 2, 2, 3, 3, 3, 3, 2, 2, 2],
						],
					],
					buildings: [
						{ x: -3, z: -3, size: 2, o: 6, floors: 4, type: 0 },
						{ x: -1.5, z: -3.5, size: 1, o: 1, floors: 1, type: 0 },
						{ x: 0, z: -3, size: 2, o: 1, floors: 2, type: 0 },
						{ x: 2, z: -3, size: 2, o: 1, floors: 1, type: 0 },
						{ x: 3.5, z: -3.5, size: 1, o: 5, floors: 2, type: 0 },
						{ x: 3.5, z: -2.5, size: 1, o: 2, floors: 2, type: 2 },
						{ x: 3, z: -1, size: 2, o: 2, floors: 3, type: 0 },
						{ x: 3.5, z: 0.5, size: 1, o: 2, floors: 1, type: 2 },
						{ x: 3.5, z: 2.5, size: 1, o: 2, floors: 4, type: 1 },
						{ x: 3.5, z: 3.5, size: 1, o: 7, floors: 0, type: 1 },
						{ x: 2.5, z: 3.5, size: 1, o: 3, floors: 1, type: 0 },
						{ x: 0, z: 3, size: 2, o: 3, floors: 5, type: 0 },
						{ x: -1.5, z: 3.5, size: 1, o: 3, floors: 4, type: 1 },
						{ x: -2.5, z: 3.5, size: 1, o: 3, floors: 3, type: 2 },
						{ x: -3.5, z: 3.5, size: 1, o: 8, floors: 0, type: 2 },
						{ x: -3.5, z: 2.5, size: 1, o: 4, floors: 2, type: 1 },
						{ x: -2.5, z: 0.5, size: 3, o: 4, floors: 0, type: 0 },
						{ x: -3.5, z: -1.5, size: 1, o: 4, floors: 5, type: 1 },
					],
					lights: [
						{ x: -3, z: -4.375, o: 1 },
						{ x: -3, z: 4.375, o: 3 },
						{ x: 4.375, z: -3, o: 2 },
						{ x: -4.375, z: -3, o: 4 },
						{ x: -1, z: -4.375, o: 1 },
						{ x: -1, z: 4.375, o: 3 },
						{ x: 4.375, z: -1, o: 2 },
						{ x: -4.375, z: -1, o: 4 },
						{ x: 1, z: -4.375, o: 1 },
						{ x: 1, z: 4.375, o: 3 },
						{ x: 4.375, z: 1, o: 2 },
						{ x: -4.375, z: 1, o: 4 },
						{ x: 3, z: -4.375, o: 1 },
						{ x: 3, z: 4.375, o: 3 },
						{ x: 4.375, z: 3, o: 2 },
						{ x: -4.375, z: 3, o: 4 },
						{ x: -4.375, z: -4.375, o: 6 },
						{ x: 4.375, z: -4.375, o: 5 },
						{ x: 4.375, z: 4.375, o: 7 },
						{ x: -4.375, z: 4.375, o: 8 },
					],
					path_nodes: [
						{ x: -3.5, z: -4.25, ns: [], isc: false },
						{ x: -4.25, z: -4.25, ns: [], isc: false },
						{ x: -3.5, z: -4.375, ns: [], isc: true },
						{ x: -4.375, z: -3.5, ns: [], isc: true },
						{ x: -2.5, z: -4.25, ns: [], isc: false },
						{ x: -1.5, z: -4.25, ns: [], isc: false },
						{ x: -0.5, z: -4.25, ns: [], isc: false },
						{ x: 0.5, z: -4.25, ns: [], isc: false },
						{ x: 1.5, z: -4.25, ns: [], isc: false },
						{ x: 2.5, z: -4.25, ns: [], isc: false },
						{ x: 3.5, z: -4.25, ns: [], isc: false },
						{ x: 4.25, z: -3.5, ns: [], isc: false },
						{ x: 4.25, z: -4.25, ns: [], isc: false },
						{ x: 4.375, z: -3.5, ns: [], isc: true },
						{ x: 3.5, z: -4.375, ns: [], isc: true },
						{ x: 4.25, z: -2.5, ns: [], isc: false },
						{ x: 4.25, z: -1.5, ns: [], isc: false },
						{ x: 4.25, z: -0.5, ns: [], isc: false },
						{ x: 4.25, z: 0.5, ns: [], isc: false },
						{ x: 4.25, z: 1.5, ns: [], isc: false },
						{ x: 4.25, z: 2.5, ns: [], isc: false },
						{ x: 4.25, z: 3.5, ns: [], isc: false },
						{ x: -3.5, z: 4.25, ns: [], isc: false },
						{ x: -2.5, z: 4.25, ns: [], isc: false },
						{ x: -1.5, z: 4.25, ns: [], isc: false },
						{ x: -0.5, z: 4.25, ns: [], isc: false },
						{ x: 0.5, z: 4.25, ns: [], isc: false },
						{ x: 1.5, z: 4.25, ns: [], isc: false },
						{ x: 2.5, z: 4.25, ns: [], isc: false },
						{ x: 3.5, z: 4.25, ns: [], isc: false },
						{ x: 4.25, z: 4.25, ns: [], isc: false },
						{ x: 3.5, z: 4.375, ns: [], isc: true },
						{ x: 4.375, z: 3.5, ns: [], isc: true },
						{ x: -4.25, z: -3.5, ns: [], isc: false },
						{ x: -4.25, z: -2.5, ns: [], isc: false },
						{ x: -4.25, z: -1.5, ns: [], isc: false },
						{ x: -4.25, z: -0.5, ns: [], isc: false },
						{ x: -4.25, z: 0.5, ns: [], isc: false },
						{ x: -4.25, z: 1.5, ns: [], isc: false },
						{ x: -4.25, z: 2.5, ns: [], isc: false },
						{ x: -4.25, z: 3.5, ns: [], isc: false },
						{ x: -4.25, z: 4.25, ns: [], isc: false },
						{ x: -3.5, z: 4.375, ns: [], isc: true },
						{ x: -4.375, z: 3.5, ns: [], isc: true },
					],
					depth: 2,
					offset_position: { x: 0, y: 0, z: 0 },
				},
			],
			settings: {
				preload_buildins: 0,
				seed: 0,
				corner: 3,
				footpath: 1,
				allysize: 10,
				floorsize: 5,
				block_types_1: 3,
				block_types_2: 1,
				block_types_3: 1,
				size: 1,
				corner_size: 0.25,
				renderHelper: false,
				renderDebugsWireframe: false,
				renderDebug: -1,
				renderBuildings: true,
				renderBuildingsRoofs: true,
				renderBuildingsWindows: true,
				renderDebugsBuildings: false,
				renderDebugsBuildingsWireframe: true,
				renderLights: false,
				renderNodePaths: false,
				camera: 'Orthographic',
			},
		} */

		// cityBuilder.setData(scene_data.ally_data, scene_data.settings)
		cityBuilder.generate(true)
		cityBuilder.render()
		cityBuilder.scale.set(6, 6, 6)
	}
}

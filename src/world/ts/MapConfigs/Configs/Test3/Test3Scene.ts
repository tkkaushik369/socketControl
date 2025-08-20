import * as THREE from 'three'
import { BaseScene } from '../../BaseScene'
import { Utility } from '../../../Core/Utility'

export class Test3Scene extends BaseScene {
	constructor() {
		super()
		// bind functions
		this.MakeInfrastructure = this.MakeInfrastructure.bind(this)
		this.MakeScenario = this.MakeScenario.bind(this)
		this.MakeScenarioVehicle = this.MakeScenarioVehicle.bind(this)
		this.MakeScenarioVehiclePath = this.MakeScenarioVehiclePath.bind(this)

		this.MakeInfrastructure()
		this.MakeScenario()
		this.MakeScenarioVehicle()
		this.MakeScenarioVehiclePath()
	}

	private MakeInfrastructure() {
		// ground
		{
			const ground = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ color: 0xcccccc }))
			ground.scale.set(124, 0.2, 124)
			{
				const groundPhy = new THREE.Mesh(new THREE.BoxGeometry())
				groundPhy.scale.copy(ground.scale).divideScalar(2)
				groundPhy.userData = {
					data: 'physics',
					type: 'box',
				}
				groundPhy.position.copy(ground.position)
				groundPhy.quaternion.copy(ground.quaternion)
				this.scene.add(groundPhy)
			}
			this.scene.add(ground)
		}
		// road
		{
			{
				const ramp = new THREE.Mesh(
					new THREE.BoxGeometry(),
					new THREE.MeshStandardMaterial({ color: 0x444444 })
				)
				ramp.position.set(5, 4, 30)
				ramp.scale.set(15, 0.2, 40)
				ramp.rotation.x = -Math.PI / 15
				{
					const rampPhy = new THREE.Mesh(new THREE.BoxGeometry())
					rampPhy.scale.copy(ramp.scale).divideScalar(2)
					rampPhy.userData = {
						data: 'physics',
						type: 'box',
					}
					rampPhy.position.copy(ramp.position)
					rampPhy.quaternion.copy(ramp.quaternion)
					this.scene.add(rampPhy)
				}
				this.scene.add(ramp)
			}
			{
				const ground = new THREE.Mesh(
					new THREE.BoxGeometry(),
					new THREE.MeshStandardMaterial({ color: 0x444444 })
				)
				ground.scale.set(60, 0.2, 15)
				ground.position.set(-17.5, 8.15, 57)
				{
					const groundPhy = new THREE.Mesh(new THREE.BoxGeometry())
					groundPhy.scale.copy(ground.scale).divideScalar(2)
					groundPhy.userData = {
						data: 'physics',
						type: 'box',
					}
					groundPhy.position.copy(ground.position)
					groundPhy.quaternion.copy(ground.quaternion)
					this.scene.add(groundPhy)
				}
				this.scene.add(ground)
			}
			{
				const ramp = new THREE.Mesh(
					new THREE.BoxGeometry(),
					new THREE.MeshStandardMaterial({ color: 0x444444 })
				)
				ramp.position.set(-40, 10.2, 40)
				ramp.scale.set(15, 0.2, 20)
				ramp.rotation.x = Math.PI / 15
				{
					const rampPhy = new THREE.Mesh(new THREE.BoxGeometry())
					rampPhy.scale.copy(ramp.scale).divideScalar(2)
					rampPhy.userData = {
						data: 'physics',
						type: 'box',
					}
					rampPhy.position.copy(ramp.position)
					rampPhy.quaternion.copy(ramp.quaternion)
					this.scene.add(rampPhy)
				}
				this.scene.add(ramp)
			}
			{
				const ground = new THREE.Mesh(
					new THREE.BoxGeometry(),
					new THREE.MeshStandardMaterial({ color: 0x444444 })
				)
				ground.scale.set(15, 0.2, 60)
				ground.position.set(-40, 12.25, 0.4)
				{
					const groundPhy = new THREE.Mesh(new THREE.BoxGeometry())
					groundPhy.scale.copy(ground.scale).divideScalar(2)
					groundPhy.userData = {
						data: 'physics',
						type: 'box',
					}
					groundPhy.position.copy(ground.position)
					groundPhy.quaternion.copy(ground.quaternion)
					this.scene.add(groundPhy)
				}
				this.scene.add(ground)
			}
			/* {
				const radius = 7.5
				const height = 0.2
				const segment = 24
				const ramp = new THREE.Mesh(
					new THREE.CylinderGeometry(radius, radius, height, segment),
					new THREE.MeshStandardMaterial({ color: 0x444444 })
				)
				ramp.position.set(12.5, 8.15, 64.5)
				{
					const rampPhy = new THREE.Mesh(new THREE.CylinderGeometry())
					rampPhy.scale.copy(ramp.scale).divideScalar(2)
					rampPhy.userData = {
						data: 'physics',
						type: 'cylinder',
						radius: radius,
						height: height,
						segment: segment,
					}
					rampPhy.position.copy(ramp.position)
					rampPhy.quaternion.copy(ramp.quaternion)
					this.scene.add(rampPhy)
				}
				this.scene.add(ramp)
			} */
		}
		// grass
		{
			{
				const grassObj = new THREE.Mesh(
					new THREE.PlaneGeometry(2, 2),
					new THREE.MeshStandardMaterial({ color: 0x000000 })
				)
				grassObj.scale.set(5, 5, 5)
				grassObj.position.set(57, 0.11, 57)
				grassObj.rotation.x = -Math.PI / 2
				grassObj.material.name = 'grass'
				grassObj.material.userData = {
					data: 'material',
					type: 'grass',
					instances: 50000,
				}
				this.scene.add(grassObj)
			}
			{
				const grassObj = new THREE.Mesh(
					new THREE.PlaneGeometry(2, 2),
					new THREE.MeshStandardMaterial({ color: 0x000000 })
				)
				grassObj.scale.set(5, 5, 5)
				grassObj.position.set(47, 0.11, 47)
				grassObj.rotation.x = -Math.PI / 2
				grassObj.material.name = 'grass'
				grassObj.material.userData = {
					data: 'material',
					type: 'grass',
					instances: 50000,
				}
				this.scene.add(grassObj)
			}
			{
				const grassObj = new THREE.Mesh(
					new THREE.PlaneGeometry(2, 2),
					new THREE.MeshStandardMaterial({ color: 0x000000 })
				)
				grassObj.scale.set(5, 5, 5)
				grassObj.position.set(57, 0.11, 47)
				grassObj.rotation.x = -Math.PI / 2
				grassObj.material.name = 'grass'
				grassObj.material.userData = {
					data: 'material',
					type: 'grass',
					instances: 50000,
				}
				this.scene.add(grassObj)
			}
			{
				const grassObj = new THREE.Mesh(
					new THREE.PlaneGeometry(2, 2),
					new THREE.MeshStandardMaterial({ color: 0x000000 })
				)
				grassObj.scale.set(5, 5, 5)
				grassObj.position.set(47, 0.11, 57)
				grassObj.rotation.x = -Math.PI / 2
				grassObj.material.name = 'grass'
				grassObj.material.userData = {
					data: 'material',
					type: 'grass',
					instances: 50000,
				}
				this.scene.add(grassObj)
			}
		}
	}

	private MakeScenario() {
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

			/* {
				let spawnCharAI = new THREE.Object3D()
				spawnCharAI.userData = {
					name: 'john',
					data: 'spawn',
					type: 'character_ai',
					first_node: 'node1',
				}
				spawnCharAI.position.set(3, 15, 5)

				scenario1.add(spawnCharAI)
			} */

			this.scene.add(scenario1)
		}
	}

	private MakeScenarioVehicle() {
		{
			const scenario2 = new THREE.Object3D()
			scenario2.userData = {
				name: 'default vehicles',
				data: 'scenario',
				spawn_always: 'true',
				invisible: 'true',
			}

			// vehicles
			{
				{
					let spawnVehicle = new THREE.Object3D()
					spawnVehicle.position.set(4, 2, 0)
					spawnVehicle.userData = {
						data: 'spawn',
						type: 'car',
						name: 'car_glb',
					}
					scenario2.add(spawnVehicle)
				}

				{
					let spawnVehicle = new THREE.Object3D()
					spawnVehicle.position.set(6, 2, 0)
					spawnVehicle.userData = {
						data: 'spawn',
						type: 'heli',
						name: 'heliglb',
					}
					scenario2.add(spawnVehicle)
				}
			}

			{
				let spawnVehicle = new THREE.Object3D()
				spawnVehicle.position.set(-10, 1, -10)
				spawnVehicle.userData = {
					data: 'spawn',
					type: 'car',
					name: 'car_ai',
					driver: 'ai',
					first_node: 'node1',
				}
				scenario2.add(spawnVehicle)
			}

			// box
			{
				const boxPhy = new THREE.Mesh(
					new THREE.BoxGeometry(),
					new THREE.MeshStandardMaterial({ color: 0xccffff })
				)
				boxPhy.scale.set(1, 0.4, 1)
				boxPhy.position.set(15, 2, -15)
				boxPhy.userData = {
					data: 'spawn',
					type: 'shape',
					subtype: 'box',
					name: 'shape_box_1',
					mass: 1,
				}
				scenario2.add(boxPhy)
			}

			// sphere
			{
				const radius = 0.3
				const boxPhy = new THREE.Mesh(
					new THREE.SphereGeometry(radius),
					new THREE.MeshStandardMaterial({ color: 0xccffff })
				)
				boxPhy.position.set(16, 2, -15)
				boxPhy.userData = {
					data: 'spawn',
					type: 'shape',
					subtype: 'sphere',
					name: 'shape_sphere_1',
					mass: 1,
					radius: radius,
				}
				scenario2.add(boxPhy)
			}

			this.scene.add(scenario2)
		}
	}

	private MakeScenarioVehiclePath() {
		{
			// path
			let axissize = 0.5
			const path = new THREE.Object3D()
			path.name = 'path1'
			path.userData = {
				data: 'path',
				name: 'path1',
			}

			{
				let node1 = new THREE.Object3D()
				node1.add(new THREE.AxesHelper(axissize))
				node1.add(new THREE.PolarGridHelper(10, 16, 8, 64))
				node1.position.x = -15
				node1.position.z = -10
				node1.name = 'node1'
				node1.userData = {
					name: 'node1',
					data: 'pathNode',
					previousNode: 'node4',
					nextNode: 'node2',
				}
				path.add(node1)

				let node2 = new THREE.Object3D()
				node2.add(new THREE.AxesHelper(axissize))
				node2.add(new THREE.PolarGridHelper(10, 16, 8, 64))
				node2.position.x = 5
				node2.position.z = -10
				node2.name = 'node2'
				node2.userData = {
					name: 'node2',
					data: 'pathNode',
					previousNode: 'node1',
					nextNode: 'node3',
				}
				path.add(node2)

				let node3 = new THREE.Object3D()
				node3.add(new THREE.AxesHelper(axissize))
				node3.add(new THREE.PolarGridHelper(10, 16, 8, 64))
				node3.position.x = 5
				node3.position.z = 10
				node3.name = 'node3'
				node3.userData = {
					name: 'node3',
					data: 'pathNode',
					previousNode: 'node2',
					nextNode: 'node4',
				}
				path.add(node3)

				let node4 = new THREE.Object3D()
				node4.add(new THREE.AxesHelper(axissize))
				node4.add(new THREE.PolarGridHelper(10, 16, 8, 64))
				node4.position.x = -15
				node4.position.z = 10
				node4.name = 'node4'
				node4.userData = {
					name: 'node4',
					data: 'pathNode',
					previousNode: 'node3',
					nextNode: 'node1',
				}
				path.add(node4)
			}
			path.position.set(-8, 0.1, 3)
			this.scene.add(path)
		}
	}
}

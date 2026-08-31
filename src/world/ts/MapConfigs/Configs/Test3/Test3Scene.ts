import * as THREE from 'three'
import { BaseScene } from '../../BaseScene'
import { Rails } from '../../../Worldentities/FromDungeon/Rails'
import { City } from '../../../Worldentities/FromDungeon/City'
// import { Utility } from '../../../Core/Utility'

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
			ground.scale.set(350, 0.2, 350)
			{
				const groundPhy = new THREE.Mesh(new THREE.BoxGeometry())
				groundPhy.scale.copy(ground.scale).divideScalar(2)
				groundPhy.userData = {
					data: 'physics',
					type: 'box',
				}
				groundPhy.position.copy(ground.position)
				groundPhy.quaternion.copy(ground.quaternion)
				groundPhy.position.set(0, 5, 0)
				this.scene.add(groundPhy)
			}
			ground.position.set(0, 5, 0)
			this.scene.add(ground)
		}
		// road
		if (true) {
			{
				const ramp = new THREE.Mesh(
					new THREE.BoxGeometry(),
					new THREE.MeshStandardMaterial({ color: 0x444444 })
				)
				ramp.position.set(5, 9, 30)
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
				ground.position.set(-17.5, 13.15, 57)
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
				ramp.position.set(-40, 15.2, 40)
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
				ground.position.set(-40, 17.25, 0.4)
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
				ramp.position.set(12.5, 13.15, 64.5)
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
		} else {
			const scale = 6.0
			const scene_data = {
				pos: [
					{ x: 4, z: 17 },
					{ x: -8, z: 1 },
					{ x: 11, z: 5 },
					{ x: -7, z: 6 },
					{ x: -7, z: -6 },
					{ x: 7, z: 11 },
					{ x: 10, z: -2 },
					{ x: -1, z: 0 },
					{ x: -3, z: 15 },
					{ x: 9, z: -9 },
					{ x: -1, z: -11 },
					{ x: 17, z: -1 },
					{ x: -3, z: 8 },
					{ x: 11, z: 13 },
					{ x: -2, z: 11 },
					{ x: -8, z: 9 },
					{ x: -11, z: -6 },
					{ x: 3, z: 0 },
					{ x: 2, z: -9 },
					{ x: -11, z: 6 },
					{ x: 2, z: 4 },
					{ x: -1, z: -4 },
					{ x: 16, z: 2 },
					{ x: 15, z: -5 },
					{ x: 19, z: 6 },
					{ x: 15, z: 14 },
					{ x: -8, z: 13 },
					{ x: -5, z: -11 },
					{ x: 8, z: 18 },
				],
				cubes: [
					{ w: 2, h: 2, d: 8, y: 1, pos: 0 },
					{ w: 8, h: 2, d: 6, y: 1, pos: 1 },
					{ w: 6, h: 1, d: 6, y: 0.5, pos: 2 },
					{ w: 2, h: 3, d: 2, y: 1.5, pos: 3 },
					{ w: 4, h: 2, d: 6, y: 1, pos: 4 },
					{ w: 4, h: 3, d: 2, y: 1.5, pos: 5 },
					{ w: 6, h: 2, d: 4, y: 1, pos: 6 },
					{ w: 2, h: 1, d: 2, y: 0.5, pos: 7 },
					{ w: 6, h: 2, d: 4, y: 1, pos: 8 },
					{ w: 8, h: 1, d: 6, y: 0.5, pos: 9 },
					{ w: 2, h: 2, d: 4, y: 1, pos: 10 },
					{ w: 4, h: 2, d: 2, y: 1, pos: 11 },
					{ w: 4, h: 1, d: 2, y: 0.5, pos: 12 },
					{ w: 2, h: 1, d: 6, y: 0.5, pos: 13 },
					{ w: 6, h: 3, d: 2, y: 1.5, pos: 14 },
					{ w: 4, h: 1, d: 2, y: 0.5, pos: 15 },
					{ w: 2, h: 3, d: 2, y: 1.5, pos: 16 },
					{ w: 2, h: 2, d: 4, y: 1, pos: 17 },
					{ w: 2, h: 2, d: 8, y: 1, pos: 18 },
					{ w: 4, h: 1, d: 2, y: 0.5, pos: 19 },
					{ w: 4, h: 2, d: 2, y: 1, pos: 20 },
					{ w: 2, h: 3, d: 4, y: 1.5, pos: 21 },
					{ w: 2, h: 3, d: 2, y: 1.5, pos: 22 },
					{ w: 2, h: 1, d: 2, y: 0.5, pos: 23 },
					{ w: 8, h: 3, d: 4, y: 1.5, pos: 24 },
					{ w: 4, h: 3, d: 8, y: 1.5, pos: 25 },
					{ w: 2, h: 1, d: 4, y: 0.5, pos: 26 },
					{ w: 2, h: 1, d: 2, y: 0.5, pos: 27 },
					{ w: 2, h: 2, d: 2, y: 1, pos: 28 },
				],
				lines: [
					{ pos1: 16, pos2: 27, color: 16776960 },
					{ pos1: 27, pos2: 4, color: 16776960 },
					{ pos1: 4, pos2: 16, color: 16776960 },
					{ pos1: 19, pos2: 16, color: 16776960 },
					{ pos1: 16, pos2: 1, color: 16776960 },
					{ pos1: 1, pos2: 19, color: 16776960 },
					{ pos1: 26, pos2: 19, color: 16776960 },
					{ pos1: 19, pos2: 15, color: 16776960 },
					{ pos1: 15, pos2: 26, color: 16776960 },
					{ pos1: 8, pos2: 26, color: 16776960 },
					{ pos1: 26, pos2: 14, color: 16776960 },
					{ pos1: 14, pos2: 8, color: 16776960 },
					{ pos1: 0, pos2: 8, color: 16776960 },
					{ pos1: 14, pos2: 0, color: 16776960 },
					{ pos1: 25, pos2: 0, color: 16776960 },
					{ pos1: 0, pos2: 28, color: 16776960 },
					{ pos1: 28, pos2: 25, color: 16776960 },
					{ pos1: 24, pos2: 25, color: 16776960 },
					{ pos1: 25, pos2: 2, color: 16776960 },
					{ pos1: 2, pos2: 24, color: 16776960 },
					{ pos1: 11, pos2: 24, color: 16776960 },
					{ pos1: 24, pos2: 22, color: 16776960 },
					{ pos1: 22, pos2: 11, color: 16776960 },
					{ pos1: 23, pos2: 11, color: 16776960 },
					{ pos1: 11, pos2: 6, color: 16776960 },
					{ pos1: 6, pos2: 23, color: 16776960 },
					{ pos1: 9, pos2: 23, color: 16776960 },
					{ pos1: 6, pos2: 9, color: 16776960 },
					{ pos1: 10, pos2: 9, color: 16776960 },
					{ pos1: 9, pos2: 18, color: 16776960 },
					{ pos1: 18, pos2: 10, color: 16776960 },
					{ pos1: 27, pos2: 10, color: 16776960 },
					{ pos1: 10, pos2: 21, color: 16776960 },
					{ pos1: 21, pos2: 27, color: 16776960 },
					{ pos1: 21, pos2: 4, color: 16776960 },
					{ pos1: 4, pos2: 1, color: 16776960 },
					{ pos1: 1, pos2: 3, color: 16776960 },
					{ pos1: 3, pos2: 19, color: 16776960 },
					{ pos1: 3, pos2: 15, color: 16776960 },
					{ pos1: 15, pos2: 14, color: 16776960 },
					{ pos1: 14, pos2: 5, color: 16776960 },
					{ pos1: 5, pos2: 0, color: 16776960 },
					{ pos1: 5, pos2: 28, color: 16776960 },
					{ pos1: 28, pos2: 13, color: 16776960 },
					{ pos1: 13, pos2: 25, color: 16776960 },
					{ pos1: 13, pos2: 2, color: 16776960 },
					{ pos1: 2, pos2: 22, color: 16776960 },
					{ pos1: 22, pos2: 6, color: 16776960 },
					{ pos1: 18, pos2: 21, color: 16776960 },
					{ pos1: 21, pos2: 1, color: 16776960 },
					{ pos1: 1, pos2: 7, color: 16776960 },
					{ pos1: 7, pos2: 3, color: 16776960 },
					{ pos1: 3, pos2: 14, color: 16776960 },
					{ pos1: 14, pos2: 12, color: 16776960 },
					{ pos1: 12, pos2: 5, color: 16776960 },
					{ pos1: 5, pos2: 13, color: 16776960 },
					{ pos1: 5, pos2: 2, color: 16776960 },
					{ pos1: 2, pos2: 6, color: 16776960 },
					{ pos1: 18, pos2: 6, color: 16776960 },
					{ pos1: 6, pos2: 17, color: 16776960 },
					{ pos1: 17, pos2: 18, color: 16776960 },
					{ pos1: 17, pos2: 21, color: 16776960 },
					{ pos1: 21, pos2: 7, color: 16776960 },
					{ pos1: 7, pos2: 12, color: 16776960 },
					{ pos1: 12, pos2: 3, color: 16776960 },
					{ pos1: 12, pos2: 20, color: 16776960 },
					{ pos1: 20, pos2: 5, color: 16776960 },
					{ pos1: 20, pos2: 2, color: 16776960 },
					{ pos1: 2, pos2: 17, color: 16776960 },
					{ pos1: 7, pos2: 20, color: 16776960 },
					{ pos1: 20, pos2: 17, color: 16776960 },
					{ pos1: 7, pos2: 17, color: 16776960 },
					{ pos1: 16, pos2: 27, color: 16711935 },
					{ pos1: 16, pos2: 4, color: 16711935 },
					{ pos1: 16, pos2: 19, color: 16711935 },
					{ pos1: 19, pos2: 1, color: 16711935 },
					{ pos1: 19, pos2: 26, color: 16711935 },
					{ pos1: 26, pos2: 15, color: 16711935 },
					{ pos1: 26, pos2: 8, color: 16711935 },
					{ pos1: 8, pos2: 14, color: 16711935 },
					{ pos1: 8, pos2: 0, color: 16711935 },
					{ pos1: 0, pos2: 25, color: 16711935 },
					{ pos1: 0, pos2: 28, color: 16711935 },
					{ pos1: 25, pos2: 24, color: 16711935 },
					{ pos1: 24, pos2: 2, color: 16711935 },
					{ pos1: 24, pos2: 11, color: 16711935 },
					{ pos1: 11, pos2: 22, color: 16711935 },
					{ pos1: 11, pos2: 23, color: 16711935 },
					{ pos1: 23, pos2: 6, color: 16711935 },
					{ pos1: 6, pos2: 9, color: 16711935 },
					{ pos1: 27, pos2: 10, color: 16711935 },
					{ pos1: 10, pos2: 18, color: 16711935 },
					{ pos1: 18, pos2: 21, color: 16711935 },
					{ pos1: 15, pos2: 3, color: 16711935 },
					{ pos1: 28, pos2: 5, color: 16711935 },
					{ pos1: 25, pos2: 13, color: 16711935 },
					{ pos1: 21, pos2: 7, color: 16711935 },
					{ pos1: 14, pos2: 12, color: 16711935 },
					{ pos1: 7, pos2: 17, color: 16711935 },
					{ pos1: 12, pos2: 20, color: 16711935 },
				],
			}

			const cityObject = new THREE.Object3D()
			const city = new City(cityObject, scene_data, scale)
			cityObject.position.set(0, 5, 0)
			this.scene.add(cityObject)

			scene_data.lines.forEach((line) => {
				const geometry = new THREE.BufferGeometry()
				geometry.setAttribute(
					'position',
					new THREE.BufferAttribute(
						new Float32Array([
							scene_data.pos[line.pos1].x * scale,
							0,
							scene_data.pos[line.pos1].z * scale,
							scene_data.pos[line.pos2].x * scale,
							0,
							scene_data.pos[line.pos2].z * scale,
						]),
						3
					)
				)
				// console.log(line.color);
				const material =
					line.color === 16776960
						? new THREE.LineDashedMaterial({ color: line.color, dashSize: 0.2, gapSize: 0.1 })
						: new THREE.LineBasicMaterial({ color: line.color })
				const mesh = new THREE.Line(geometry, material)
				mesh.computeLineDistances()
				mesh.position.set(0, 6, 0)
				this.scene.add(mesh)
			})
		}
		// rail track
		if (false) {
			const points1 = [
				new THREE.Vector3(-14, 0, -56),
				new THREE.Vector3(-12, 0, 5),
				new THREE.Vector3(3, 0, 28),
				new THREE.Vector3(36, 0, 36),
				/*  new THREE.Vector3(58, 0, 36), */ new THREE.Vector3(98, 0, 36),
			]
			const points2 = [
				new THREE.Vector3(4, 0, 92),
				new THREE.Vector3(4, 0, 72),
				new THREE.Vector3(10, 3, 48),
				new THREE.Vector3(22, 4, 24),
				new THREE.Vector3(22, 2, -4),
				new THREE.Vector3(16, 0, -24),
				new THREE.Vector3(16, 0, -56),
			]

			// const points3 = [new THREE.Vector3(-14, 0, -36), new THREE.Vector3(-10, 0, -60), new THREE.Vector3(14, 4, -60), new THREE.Vector3(44, 0, -60), new THREE.Vector3(78, 0, -40), new THREE.Vector3(98, 0, 0)];

			points1.forEach((p) => p.multiplyScalar(6 / 4))
			points2.forEach((p) => p.multiplyScalar(6 / 4))

			// initial build
			const railWidth: number = 0.16,
				railHeight: number = 0.32,
				baseSpacing: number = 1.9,
				segmentLength: number = 1.2
			const offsetPos = new THREE.Vector3(0, 5.5, 0)

			const rail1 = new Rails(points1, railWidth, railHeight, baseSpacing, segmentLength)
			// rail1.line.position.add(offsetPos)
			rail1.railsInstanced.position.add(offsetPos)
			rail1.sleepersInstanced.position.add(offsetPos)
			// rail1.leftLine.position.add(offsetPos)
			// rail1.rightLine.position.add(offsetPos)
			// this.scene.add(rail1.line)
			this.scene.add(rail1.railsInstanced)
			this.scene.add(rail1.sleepersInstanced)
			// this.scene.add(rail1.leftLine)
			// this.scene.add(rail1.rightLine)

			const rail2 = new Rails(points2, railWidth, railHeight, baseSpacing, segmentLength)
			// rail2.line.position.add(offsetPos)
			rail2.railsInstanced.position.add(offsetPos)
			rail2.sleepersInstanced.position.add(offsetPos)
			// rail2.leftLine.position.add(offsetPos)
			// rail2.rightLine.position.add(offsetPos)
			// this.scene.add(rail2.line)
			this.scene.add(rail2.railsInstanced)
			this.scene.add(rail2.sleepersInstanced)
			// this.scene.add(rail2.leftLine)
			// this.scene.add(rail2.rightLine)

			{
				rail1.physicsConfigs(this.scene, true, false)
				rail2.physicsConfigs(this.scene, true, false)
			}
			// buildTrack(points3);
		}
		// grass
		if (false) {
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
		// Portal
		{
			const geo = new THREE.PlaneGeometry(2, 2)

			// const portalA = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x00ffff }))
			// portalA.name = "portalA"
			// portalA.userData = {
			// 	"name": "portalA",
			// 	"data": "portal",
			// 	"linked_portal": "portalD"
			// }
			// portalA.position.set(46, 6, -4)
			// this.scene.add(portalA)

			// const portalB = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffff00 }))
			// portalB.name = "portalB"
			// portalB.userData = {
			// 	"name": "portalB",
			// 	"data": "portal",
			// 	"linked_portal": "portalC"
			// }
			// portalB.position.set(54, 6, -4)
			// this.scene.add(portalB)

			// const portalC = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xff00ff }))
			// portalC.name = "portalA"
			// portalC.userData = {
			// 	"name": "portalC",
			// 	"data": "portal",
			// 	"linked_portal": "portalB"
			// }
			// portalC.position.set(54, 6, 4)
			// portalC.rotateY((-3 * Math.PI) / 4)
			// this.scene.add(portalC)

			// const portalD = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xccccff }))
			// portalD.name = "portalD"
			// portalD.userData = {
			// 	"name": "portalD",
			// 	"data": "portal",
			// 	"linked_portal": "portalA"
			// }
			// portalD.position.set(46, 6, 4)
			// portalD.rotateY((3 * Math.PI) / 4)
			// this.scene.add(portalD)

			const portal_1 = new THREE.Mesh(
				new THREE.PlaneGeometry(2, 2),
				new THREE.MeshBasicMaterial({ color: 0x0000ff })
			)
			portal_1.name = 'portal_1'
			portal_1.userData = {
				name: 'portal_1',
				data: 'portal',
				linked_portal: 'portal_2',
			}
			portal_1.position.set(14, 6.1, 10)
			portal_1.rotateY(Math.PI)
			this.scene.add(portal_1)

			const portal_2 = new THREE.Mesh(
				new THREE.PlaneGeometry(2, 2),
				new THREE.MeshBasicMaterial({ color: 0xff0000 })
			)
			portal_2.name = 'portal_2'
			portal_2.userData = {
				name: 'portal_2',
				data: 'portal',
				linked_portal: 'portal_1',
			}
			portal_2.position.set(-38.5, 18.3, -28)
			// portal_2.rotateY((-3 * Math.PI) / 4)
			this.scene.add(portal_2)
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
					spawnPlayer.position.set(13, 7, -4)

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
					path_radius: '4',
				}
				spawnCharAI.position.set(0, 10, 0)

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
					spawnVehicle.position.set(6, 7, 0)
					spawnVehicle.userData = {
						data: 'spawn',
						type: 'car',
						name: 'car_glb',
					}
					scenario2.add(spawnVehicle)
				}

				{
					let spawnVehicle = new THREE.Object3D()
					spawnVehicle.position.set(6, 7, -4)
					spawnVehicle.userData = {
						data: 'spawn',
						type: 'car',
						subtype: 'car_test',
						name: 'car_example',
					}
					scenario2.add(spawnVehicle)
				}

				{
					let spawnVehicle = new THREE.Object3D()
					spawnVehicle.position.set(8, 7, 0)
					spawnVehicle.userData = {
						data: 'spawn',
						type: 'heli',
						name: 'heliglb',
					}
					scenario2.add(spawnVehicle)
				}

				{
					let spawnVehicle = new THREE.Object3D()
					spawnVehicle.position.set(2, 6, -6)
					spawnVehicle.userData = {
						data: 'spawn',
						type: 'car',
						name: 'car_ai',
						driver: 'ai',
						max_gears: 1,
						first_node: 'node1',
						path_radius: '3',
					}
					scenario2.add(spawnVehicle)
				}

				if (false) {
					const force = 1
					const speed = 20
					{
						let spawnVehicle = new THREE.Object3D()
						spawnVehicle.position.set(5.6, 5.8, 128)
						spawnVehicle.userData = {
							data: 'spawn',
							type: 'train',
							subtype: 'train_test',
							motor_force: force,
							motor_speed: speed,
							name: 'train_example_1',
						}
						scenario2.add(spawnVehicle)
					}
					{
						let spawnVehicle = new THREE.Object3D()
						spawnVehicle.position.set(-20.9, 7.8, -78)
						spawnVehicle.userData = {
							data: 'spawn',
							type: 'train',
							subtype: 'train_test',
							motor_force: force,
							motor_speed: -speed,
							name: 'train_example_2',
						}
						scenario2.add(spawnVehicle)
					}
				}
			}

			// box
			{
				const boxPhy = new THREE.Mesh(
					new THREE.BoxGeometry(),
					new THREE.MeshStandardMaterial({ color: 0xccffff })
				)
				boxPhy.scale.set(1, 0.4, 1)
				boxPhy.position.set(10, 6, -15)
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
				boxPhy.position.set(11, 6, -15)
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
				// node1.add(new THREE.AxesHelper(axissize))
				// node1.add(new THREE.PolarGridHelper(10, 16, 10, 64))
				node1.position.x = 4
				node1.position.z = -16
				node1.name = 'node1'
				node1.userData = {
					name: 'node1',
					data: 'pathNode',
					previousNode: 'node9',
					nextNode: 'node2',
				}
				path.add(node1)

				let node2 = new THREE.Object3D()
				// node2.add(new THREE.AxesHelper(axissize))
				// node2.add(new THREE.PolarGridHelper(10, 16, 10, 64))
				node2.position.x = 4
				node2.position.z = 10
				node2.name = 'node2'
				node2.userData = {
					name: 'node2',
					data: 'pathNode',
					previousNode: 'node1',
					nextNode: 'node3',
				}
				path.add(node2)

				let node3 = new THREE.Object3D()
				// node3.add(new THREE.AxesHelper(axissize))
				// node3.add(new THREE.PolarGridHelper(10, 16, 10, 64))
				node3.position.x = -10
				node3.position.z = 14
				node3.name = 'node3'
				node3.userData = {
					name: 'node3',
					data: 'pathNode',
					previousNode: 'node2',
					nextNode: 'node4',
				}
				path.add(node3)

				let node4 = new THREE.Object3D()
				// node4.add(new THREE.AxesHelper(axissize))
				// node4.add(new THREE.PolarGridHelper(10, 16, 10, 64))
				node4.position.x = -4
				node4.position.z = 32
				node4.name = 'node3'
				node4.userData = {
					name: 'node4',
					data: 'pathNode',
					previousNode: 'node3',
					nextNode: 'node5',
				}
				path.add(node4)

				let node5 = new THREE.Object3D()
				// node5.add(new THREE.AxesHelper(axissize))
				// node5.add(new THREE.PolarGridHelper(10, 16, 10, 64))
				node5.position.x = 40
				node5.position.z = 50
				node5.name = 'node5'
				node5.userData = {
					name: 'node5',
					data: 'pathNode',
					previousNode: 'node4',
					nextNode: 'node6',
				}
				path.add(node5)

				let node6 = new THREE.Object3D()
				// node6.add(new THREE.AxesHelper(axissize))
				// node6.add(new THREE.PolarGridHelper(10, 16, 10, 64))
				node6.position.x = 86
				node6.position.z = 52
				node6.name = 'node6'
				node6.userData = {
					name: 'node6',
					data: 'pathNode',
					previousNode: 'node5',
					nextNode: 'node7',
				}
				path.add(node6)

				let node7 = new THREE.Object3D()
				// node7.add(new THREE.AxesHelper(axissize))
				// node7.add(new THREE.PolarGridHelper(10, 16, 10, 64))
				node7.position.x = 87
				node7.position.z = 4
				node7.name = 'node7'
				node7.userData = {
					name: 'node7',
					data: 'pathNode',
					previousNode: 'node6',
					nextNode: 'node8',
				}
				path.add(node7)

				let node8 = new THREE.Object3D()
				// node8.add(new THREE.AxesHelper(axissize))
				// node8.add(new THREE.PolarGridHelper(10, 16, 10, 64))
				node8.position.x = 32
				node8.position.z = 4
				node8.name = 'node8'
				node8.userData = {
					name: 'node8',
					data: 'pathNode',
					previousNode: 'node7',
					nextNode: 'node9',
				}
				path.add(node8)

				let node9 = new THREE.Object3D()
				// node9.add(new THREE.AxesHelper(axissize))
				// node9.add(new THREE.PolarGridHelper(10, 16, 10, 64))
				node9.position.x = 27
				node9.position.z = -17
				node9.name = 'node9'
				node9.userData = {
					name: 'node9',
					data: 'pathNode',
					previousNode: 'node8',
					nextNode: 'node1',
				}
				path.add(node9)
			}
			path.position.set(0, 5.1, 0)
			this.scene.add(path)
		}
	}
}

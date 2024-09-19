import * as THREE from 'three'
import { VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper'
import { BaseScene } from '../../../BaseScene'
import { Utility } from '../../../../Core/Utility'

export class Example extends BaseScene {
	constructor() {
		super()
		// function bind
		this.makeWheel = this.makeWheel.bind(this)
		this.makeSeat = this.makeSeat.bind(this)
		this.makeCar = this.makeCar.bind(this)
		this.makeHeli = this.makeHeli.bind(this)
		this.makeAirPlane = this.makeAirPlane.bind(this)

		{ // world
			{ // physics
				{ // box
					const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xaa00aa }))
					const cubePhy = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xaa00aa }))
					cube.scale.set(60, 0.2, 60)
					cubePhy.scale.copy(cube.scale).divideScalar(2)
					cubePhy.position.copy(cube.position)
					cubePhy.quaternion.copy(cube.quaternion)
					cubePhy.userData = {
						data: "physics",
						type: "box",
					}
					this.scene.add(cubePhy)
					this.scene.add(cube)
				}
				{ // trimesh 
					const material = new THREE.MeshStandardMaterial({ color: 0x00aaaa })
					let geometry = new THREE.BufferGeometry()
					/* 
					6  7  8  9  16
					5  0  1  10 17
					4  3  2  11 18
					15 14 13 12 19
					24 23 22 21 20
					 */
					const vertices = [
						0, 0, 0, // 0
						8, 0, 0, // 1
						8, 0, 8, // 2
						0, 0, 8, // 3
						-8, 2, 8, // 4
						-8, 2, 0, // 5
						-8, 2, -8, // 6
						0, 2, -8, // 7
						8, 2, -8, // 8
						16, 2, -8, // 9
						16, 2, 0, // 10
						16, 2, 8, // 11
						16, 2, 16, // 12
						8, 2, 16, // 13
						0, 2, 16, // 14
						-8, 2, 16, // 15
						// 24, 1, -8, // 16
						// 24, 1, 0, // 17
					]

					const indices = [
						1, 0, 2,
						0, 3, 2,
						0, 5, 3,
						5, 4, 3,
						7, 6, 0,
						6, 5, 0,
						8, 7, 1,
						7, 0, 1,
						9, 8, 10,
						8, 1, 10,
						10, 1, 11,
						1, 2, 11,
						11, 2, 12,
						2, 13, 12,
						2, 3, 13,
						3, 14, 13,
						3, 4, 14,
						4, 15, 14,
						// 16, 9, 17,
						// 9, 10, 17,
					];

					const uvs = [];
					let t = true
					for (let i = 0; i < indices.length; i += 3) {
						if (t)
							uvs.push(
								1, 1,
								0, 1,
								1, 0,
							)
						else
							uvs.push(
								0, 1,
								0, 0,
								1, 0,
							)
						t = !t
					}

					geometry.setAttribute('position', new THREE.BufferAttribute(Utility.vertInx(indices, vertices), 3))
					geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
					geometry.computeVertexNormals()

					const mesh = new THREE.Mesh(geometry, material)
					mesh.userData = {
						debug: true,
						data: "physics",
						type: "trimesh",
					}
					mesh.position.set(30 + 8, -2, 5)
					this.scene.add(mesh)
				}
				{ // spline extrude

					const length = 0.4, width = 0.05;
					const spline = new THREE.CatmullRomCurve3([
						new THREE.Vector3(-2.5, 1.5, 0.0),
						new THREE.Vector3(-2, 1.5, 0.0),
						new THREE.Vector3(-1.8, 1.5, 0.05),
						new THREE.Vector3(-0.2, 0, 0.1),
						new THREE.Vector3(0.2, 0.0, 0.15),
						new THREE.Vector3(0.5, 0.4, 0.2),
						new THREE.Vector3(0.48, 0.7, 0.25),
						new THREE.Vector3(0.2, 1, 0.3),
						new THREE.Vector3(-0.2, 1, 0.35),
						new THREE.Vector3(-0.48, 0.7, 0.4),
						new THREE.Vector3(-0.5, 0.4, 0.45),
						new THREE.Vector3(-0.2, 0.0, 0.5),
						new THREE.Vector3(0.2, 0, 0.55),
						new THREE.Vector3(1.8, 1.5, 0.6),
						new THREE.Vector3(2, 1.5, 0.65),
						new THREE.Vector3(2.5, 1.5, 0.65),
					]);

					spline.closed = false;
					spline.tension = 0

					const geometry = new THREE.BufferGeometry()
					const vertices = []
					const indices = []
					const steps = 100
					let i

					for (i = 0; i <= steps; i++) {
						let p = spline.getPointAt(i / steps)
						let t = spline.getTangentAt(i / steps)

						let p0 = new THREE.Vector3().copy(p)
						let p1 = new THREE.Vector3().copy(p)
						let p2 = new THREE.Vector3().copy(p)
						let p3 = new THREE.Vector3().copy(p)
						p0.y -= width / 2
						p0.z -= length / 2
						p1.y -= width / 2
						p1.z += length / 2
						p2.y += width / 2
						p2.z += length / 2
						p3.y += width / 2
						p3.z -= length / 2

						vertices.push(
							p0.x, p0.y, p0.z,
							p1.x, p1.y, p1.z,
							p2.x, p2.y, p2.z,
							p3.x, p3.y, p3.z,
						)
						if (i != 0) {
							indices.push(
								(i * 4) + (/* p */2), (i * 4) + (/* p */3), (i * 4) + (/* l */2 - 4),
								(i * 4) + (/* p */3), (i * 4) + (/* l */3 - 4), (i * 4) + (/* l */2 - 4),

								(i * 4) + (/* p */1), (i * 4) + (/* p */2), (i * 4) + (/* l */1 - 4),
								(i * 4) + (/* p */2), (i * 4) + (/* l */2 - 4), (i * 4) + (/* l */1 - 4),

								(i * 4) + (/* p */0), (i * 4) + (/* p */1), (i * 4) + (/* l */0 - 4),
								(i * 4) + (/* p */1), (i * 4) + (/* l */1 - 4), (i * 4) + (/* l */0 - 4),

								(i * 4) + (/* p */3), (i * 4) + (/* p */0), (i * 4) + (/* l */3 - 4),
								(i * 4) + (/* p */0), (i * 4) + (/* l */0 - 4), (i * 4) + (/* l */3 - 4),
							)
						}
					}

					geometry.setAttribute('position', new THREE.BufferAttribute(Utility.vertInx(indices, vertices), 3))
					geometry.computeVertexNormals()

					const material1 = new THREE.MeshStandardMaterial({ color: 0xb0b000 });
					const mesh1 = new THREE.Mesh(geometry, material1);
					mesh1.userData = {
						debug: true,
						data: "physics",
						type: "trimesh",
					}
					mesh1.position.set(78, -30.5, -8)
					mesh1.scale.multiplyScalar(20)
					this.scene.add(mesh1);
				}
			}

			{ // path
				let axissize = 0.5
				const path = new THREE.Object3D()
				path.name = 'path1'
				path.userData = {
					data: "path",
					name: "path1"
				}

				{
					let node1 = new THREE.Object3D()
					node1.add(new THREE.AxesHelper(axissize))
					node1.add(new THREE.PolarGridHelper(10, 16, 8, 64))
					node1.position.x = -15
					node1.position.z = -10
					node1.name = 'node1'
					node1.userData = {
						name: "node1",
						data: "pathNode",
						previousNode: "node4",
						nextNode: "node2",
					}
					path.add(node1)

					let node2 = new THREE.Object3D()
					node2.add(new THREE.AxesHelper(axissize))
					node2.add(new THREE.PolarGridHelper(10, 16, 8, 64))
					node2.position.x = 5
					node2.position.z = -10
					node2.name = 'node2'
					node2.userData = {
						name: "node2",
						data: "pathNode",
						previousNode: "node1",
						nextNode: "node3",
					}
					path.add(node2)

					let node3 = new THREE.Object3D()
					node3.add(new THREE.AxesHelper(axissize))
					node3.add(new THREE.PolarGridHelper(10, 16, 8, 64))
					node3.position.x = 5
					node3.position.z = 10
					node3.name = 'node3'
					node3.userData = {
						name: "node3",
						data: "pathNode",
						previousNode: "node2",
						nextNode: "node4",
					}
					path.add(node3)

					let node4 = new THREE.Object3D()
					node4.add(new THREE.AxesHelper(axissize))
					node4.add(new THREE.PolarGridHelper(10, 16, 8, 64))
					node4.position.x = -15
					node4.position.z = 10
					node4.name = 'node4'
					node4.userData = {
						name: "node4",
						data: "pathNode",
						previousNode: "node3",
						nextNode: "node1",
					}
					path.add(node4)

				}
				path.position.set(-8, 0, 3)
				this.scene.add(path)
			}

			{ // scenarios

				{
					const scenario1 = new THREE.Object3D()
					scenario1.userData = {
						name: "Free roam (default)",
						data: "scenario",
						default: "true",
						desc_title: "Default spawn",
						camera_angle: 0,
						desc_content: "Explore the world!"
					}

					{
						{
							let spawnPlayer = new THREE.Object3D()
							spawnPlayer.userData = {
								name: "user",
								data: "spawn",
								type: "player",
							}
							spawnPlayer.position.set(5, 15, 5)

							scenario1.add(spawnPlayer)
						}
						{
							let spawnCharAI = new THREE.Object3D()
							spawnCharAI.userData = {
								name: "john",
								data: "spawn",
								type: "character_ai",
							}
							spawnCharAI.position.set(3, 15, 5)

							scenario1.add(spawnCharAI)
						}
						{
							let spawnCharFollow = new THREE.Object3D()
							spawnCharFollow.userData = {
								name: "bob",
								data: "spawn",
								type: "character_follow",
								target: "john",
							}
							spawnCharFollow.position.set(1, 15, 5)

							scenario1.add(spawnCharFollow)
						}
					}
					this.scene.add(scenario1)
				}

				{
					const scenario2 = new THREE.Object3D()
					scenario2.userData = {
						name: "default vehicles",
						data: "scenario",
						spawn_always: "true",
						invisible: "true"
					}

					{
						let spawnVehical = new THREE.Object3D()
						spawnVehical.position.set(6, 0, 0)
						spawnVehical.userData = {
							data: "spawn",
							type: "car",
							subtype: "car_test",
							name: "car",
						}
						scenario2.add(spawnVehical)
					}

					{
						let spawnVehical = new THREE.Object3D()
						spawnVehical.position.set(-10, 1, -10)
						spawnVehical.userData = {
							data: "spawn",
							type: "car",
							subtype: "car_test",
							name: "car_ai",
							driver: "ai",
							first_node: "node1"
						}
						scenario2.add(spawnVehical)
					}

					{
						let spawnVehical = new THREE.Object3D()
						spawnVehical.position.set(9, 0, 0)
						spawnVehical.userData = {
							data: "spawn",
							type: "heli",
							subtype: "heli_test",
							name: "heli",
						}
						scenario2.add(spawnVehical)
					}

					{
						let spawnVehical = new THREE.Object3D()
						spawnVehical.position.set(125, 1, 5)
						spawnVehical.rotateY(-Math.PI / 2)
						spawnVehical.userData = {
							data: "spawn",
							type: "heli",
							subtype: "heli_test",
							name: "heli_ramp",
						}
						scenario2.add(spawnVehical)
					}

					{
						let spawnVehical = new THREE.Object3D()
						spawnVehical.position.set(12, 0, 0)
						spawnVehical.userData = {
							data: "spawn",
							type: "airplane",
							subtype: "airplane_test",
							name: "airplane",
						}
						scenario2.add(spawnVehical)
					}

					{
						let spawnVehical = new THREE.Object3D()
						spawnVehical.position.set(6, 0, -5)
						spawnVehical.userData = {
							data: "spawn",
							type: "car",
							name: "car_glb",
						}
						scenario2.add(spawnVehical)
					}

					{
						let spawnVehical = new THREE.Object3D()
						spawnVehical.position.set(9, 0, -5)
						spawnVehical.userData = {
							data: "spawn",
							type: "heli",
							name: "heliglb",
						}
						scenario2.add(spawnVehical)
					}

					{
						let spawnVehical = new THREE.Object3D()
						spawnVehical.position.set(12, 0, -5)
						spawnVehical.userData = {
							data: "spawn",
							type: "airplane",
							name: "airplaneglb",
						}
						scenario2.add(spawnVehical)
					}
					this.scene.add(scenario2)
				}
			}
		}

		{ // car
			const body = this.makeCar()
			this.car.add(body)
		}

		{ // heli
			const body = this.makeHeli()
			this.heli.add(body)
		}

		{ // airplane
			const body = this.makeAirPlane()
			this.airplane.add(body)
		}
	}

	makeWheel(radius: number = 0.3, thickness: number = 0.1) {
		const wheelGrp = new THREE.Group()
		const wheel = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, thickness), new THREE.MeshLambertMaterial({ color: 0x333333 }))
		wheel.rotation.z = Math.PI / 2
		wheelGrp.add(wheel)
		return wheelGrp
	}

	makeSeat(isDriver: boolean = false) {
		const seatGrp = new THREE.Group()
		const seat = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.3), new THREE.MeshLambertMaterial({ color: (isDriver ? 0xe5a00d : 0x00ffff) }))
		seatGrp.add(seat)
		return seatGrp
	}

	makeCar() {
		const body = new THREE.Mesh()
		{ // stearing
			const steering = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.05), new THREE.MeshLambertMaterial({ color: 0x333333 }))
			steering.position.set(-0.3, 0.3, 0.5)
			steering.rotation.x = Math.PI / 8
			steering.userData = {
				data: 'steering_wheel'
			}
			body.add(steering)
		}
		{ // camera
			const camera = new THREE.Object3D()
			camera.position.set(-0.3, 0.6, 0.2)
			camera.userData = {
				data: 'camera'
			}
			body.add(camera)
		}
		{
			// chassy
			{
				const upper = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 1.4), new THREE.MeshLambertMaterial({ color: 0x666666, transparent: true, opacity: 0.4 }))
				upper.position.set(0, 0.5, -0.2)
				body.add(upper)
			}
			{
				const lower = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 2.4), new THREE.MeshLambertMaterial({ color: 0x666666, transparent: true, opacity: 0.8 }))
				body.add(lower)
			}
		}
		{
			// head lights
			{
				const left = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.1), new THREE.MeshLambertMaterial({ color: 0xffffff }))
				left.position.set(-0.4, 0.08, 1.2)
				left.rotateX(-Math.PI / 2)
				const light = new THREE.SpotLight(0xffffff, 2, 15)
				light.name = 'leftlight'
				light.userData = {
					data: 'light'
				}
				light.position.copy(left.position)
				light.power = 100
				light.angle = 30 * (Math.PI / 180)
				light.castShadow = true
				light.target.position.copy(light.position).add(new THREE.Vector3(0, 0, 1))
				body.add(light);
				body.add(light.target);
				body.add(left)
			}
			{
				const right = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.1), new THREE.MeshLambertMaterial({ color: 0xffffff }))
				right.position.set(0.4, 0.08, 1.2)
				right.rotateX(-Math.PI / 2)
				const light = new THREE.SpotLight(0xffffff, 2, 15)
				light.name = 'rightlight'
				light.userData = {
					data: 'light'
				}
				light.position.copy(right.position)
				light.power = 100
				light.angle = 30 * (Math.PI / 180)
				light.castShadow = true
				light.target.position.copy(light.position).add(new THREE.Vector3(0, 0, 1))
				body.add(light)
				body.add(light.target)
				body.add(right)
			}
		}
		{ // sceats
			{
				const seat = this.makeSeat(true)
				seat.position.set(-0.3, 0, 0.2)
				seat.name = 'seat_1'
				body.add(seat)
				seat.userData = {
					name: 'seat_1',
					data: 'seat',
					door_object: "door_1",
					seat_type: "driver",
					entry_points: "entrance_1",
					connected_seats: "seat_2"
				}

				const doorObj = new THREE.Object3D()
				doorObj.position.copy(seat.position)
				doorObj.position.x -= 0.3
				doorObj.position.y += 0.1
				doorObj.position.z += 0.4
				const door = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.5), new THREE.MeshLambertMaterial({ color: 0xffff00 }))
				door.position.z = -0.25
				doorObj.name = "door_1"
				doorObj.userData = {
					name: "door_1"
				}
				doorObj.add(door)
				body.add(doorObj)

				const entryPoint = new THREE.AxesHelper()
				entryPoint.position.copy(doorObj.position)
				entryPoint.position.x -= 0.3
				entryPoint.position.y -= 0.5
				entryPoint.position.z -= 0.4
				entryPoint.name = 'entrance_1'
				entryPoint.userData = {
					name: "entrance_1"
				}
				body.add(entryPoint)
			}
			{
				const seat = this.makeSeat()
				seat.position.set(0.3, 0, 0.2)
				seat.name = 'seat_2'
				body.add(seat)
				seat.userData = {
					name: 'seat_2',
					data: 'seat',
					door_object: "door_2",
					seat_type: "passenger",
					entry_points: "entrance_2",
					connected_seats: "seat_1"
				}

				const doorObj = new THREE.Object3D()
				doorObj.position.copy(seat.position)
				doorObj.position.x += 0.3
				doorObj.position.y += 0.1
				doorObj.position.z += 0.4
				const door = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.5), new THREE.MeshLambertMaterial({ color: 0xffff00 }))
				door.position.z = -0.25
				doorObj.name = "door_2"
				doorObj.userData = {
					name: "door_2"
				}
				doorObj.add(door)
				body.add(doorObj)

				const entryPoint = new THREE.AxesHelper()
				entryPoint.position.copy(doorObj.position)
				entryPoint.position.x += 0.3
				entryPoint.position.y -= 0.5
				entryPoint.position.z -= 0.4
				entryPoint.name = 'entrance_2'
				entryPoint.userData = {
					name: "entrance_2"
				}
				body.add(entryPoint)
			}
			{
				const seat = this.makeSeat()
				seat.position.set(-0.3, 0, -0.6)
				seat.name = 'seat_3'
				body.add(seat)
				seat.userData = {
					name: 'seat_3',
					data: 'seat',
					door_object: "door_3",
					seat_type: "passenger",
					entry_points: "entrance_3",
					connected_seats: "seat_4"
				}

				const doorObj = new THREE.Object3D()
				doorObj.position.copy(seat.position)
				doorObj.position.x -= 0.3
				doorObj.position.y += 0.1
				doorObj.position.z += 0.4
				const door = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.5), new THREE.MeshLambertMaterial({ color: 0xffff00 }))
				door.position.z -= 0.25
				doorObj.name = "door_3"
				doorObj.userData = {
					name: "door_3"
				}
				doorObj.add(door)
				body.add(doorObj)

				const entryPoint = new THREE.AxesHelper()
				entryPoint.position.copy(doorObj.position)
				entryPoint.position.x -= 0.3
				entryPoint.position.y -= 0.5
				entryPoint.position.z -= 0.4
				entryPoint.name = 'entrance_3'
				entryPoint.userData = {
					name: "entrance_3"
				}
				body.add(entryPoint)
			}
			{
				const seat = this.makeSeat()
				seat.position.set(0.3, 0, -0.6)
				seat.name = 'seat_4'
				body.add(seat)
				seat.userData = {
					name: 'seat_4',
					data: 'seat',
					door_object: "door_4",
					seat_type: "passenger",
					entry_points: "entrance_4",
					connected_seats: "seat_3"
				}

				const doorObj = new THREE.Object3D()
				doorObj.position.copy(seat.position)
				doorObj.position.x += 0.3
				doorObj.position.y += 0.1
				doorObj.position.z += 0.4
				const door = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.5), new THREE.MeshLambertMaterial({ color: 0xffff00 }))
				door.position.z -= 0.25
				doorObj.name = "door_4"
				doorObj.userData = {
					name: "door_4"
				}
				doorObj.add(door)
				body.add(doorObj)

				const entryPoint = new THREE.AxesHelper()
				entryPoint.position.copy(doorObj.position)
				entryPoint.position.x += 0.3
				entryPoint.position.y -= 0.5
				entryPoint.position.z -= 0.4
				entryPoint.name = 'entrance_4'
				entryPoint.userData = {
					name: "entrance_4"
				}
				body.add(entryPoint)
			}
		}
		{ // wheels
			{
				const wheelObj = this.makeWheel(0.26, 0.2)
				wheelObj.position.set(-0.5, -0.2, 0.8)
				wheelObj.name = "wheel_fl"
				wheelObj.userData = {
					name: "wheel_fl",
					steering: "true",
					data: "wheel",
					drive: "fwd"
				}
				body.add(wheelObj)
			}
			{
				const wheelObj = this.makeWheel(0.26, 0.2)
				wheelObj.position.set(0.5, -0.2, 0.8)
				wheelObj.name = "wheel_fr"
				wheelObj.userData = {
					name: "wheel_fr",
					steering: "true",
					data: "wheel",
					drive: "fwd"
				}
				body.add(wheelObj)
			}
			{
				const wheelObj = this.makeWheel(0.26, 0.2)
				wheelObj.position.set(0.5, -0.2, -0.8)
				wheelObj.name = "wheel_bl"
				wheelObj.userData = {
					name: "wheel_bl",
					steering: "false",
					data: "wheel",
					drive: "rwd"
				}
				body.add(wheelObj)
			}
			{
				const wheelObj = this.makeWheel(0.26, 0.2)
				wheelObj.position.set(-0.5, -0.2, -0.8)
				wheelObj.name = "wheel_br"
				wheelObj.userData = {
					name: "wheel_br",
					steering: "false",
					data: "wheel",
					drive: "rwd"
				}
				body.add(wheelObj)
			}

		}
		{ // collisions
			{
				const bodyColl = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x666666, wireframe: true }))
				bodyColl.scale.set(1.2, 0.5, 2.4)
				bodyColl.scale.multiplyScalar(0.5)
				bodyColl.userData = {
					data: "collision",
					shape: "box"
				}
				body.add(bodyColl)
			}
			{
				const bodyColl = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x666666, wireframe: true }))
				bodyColl.position.set(0, 0.5, -0.2)
				bodyColl.scale.set(1.2, 0.5, 1.4)
				bodyColl.scale.multiplyScalar(0.5)
				bodyColl.userData = {
					data: "collision",
					shape: "box"
				}
				body.add(bodyColl)
			}
			{
				{
					const bodyColl = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshLambertMaterial({ color: 0x666666, wireframe: true }))
					bodyColl.position.set(-0.3, 0, 0.8)
					bodyColl.scale.multiplyScalar(0.3)
					bodyColl.userData = {
						shape: "sphere",
						data: "collision"
					}
					body.add(bodyColl)
				}
				{
					const bodyColl = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshLambertMaterial({ color: 0x666666, wireframe: true }))
					bodyColl.position.set(0.3, 0, 0.8)
					bodyColl.scale.multiplyScalar(0.3)
					bodyColl.userData = {
						shape: "sphere",
						data: "collision"
					}
					body.add(bodyColl)
				}
			}
			{
				{
					const bodyColl = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshLambertMaterial({ color: 0x666666, wireframe: true }))
					bodyColl.position.set(-0.3, 0, -0.9)
					bodyColl.scale.multiplyScalar(0.3)
					bodyColl.userData = {
						shape: "sphere",
						data: "collision"
					}
					body.add(bodyColl)
				}
				{
					const bodyColl = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshLambertMaterial({ color: 0x666666, wireframe: true }))
					bodyColl.position.set(0.3, 0, -0.9)
					bodyColl.scale.multiplyScalar(0.3)
					bodyColl.userData = {
						shape: "sphere",
						data: "collision"
					}
					body.add(bodyColl)
				}
			}
			{
				{
					const bodyColl = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshLambertMaterial({ color: 0x666666, wireframe: true }))
					bodyColl.position.set(-0.3, 0, 0.2)
					bodyColl.scale.multiplyScalar(0.3)
					bodyColl.userData = {
						shape: "sphere",
						data: "collision"
					}
					body.add(bodyColl)
				}
				{
					const bodyColl = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshLambertMaterial({ color: 0x666666, wireframe: true }))
					bodyColl.position.set(0.3, 0, 0.2)
					bodyColl.scale.multiplyScalar(0.3)
					bodyColl.userData = {
						shape: "sphere",
						data: "collision"
					}
					body.add(bodyColl)
				}
			}
			{
				{
					const bodyColl = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshLambertMaterial({ color: 0x666666, wireframe: true }))
					bodyColl.position.set(-0.3, 0, -0.4)
					bodyColl.scale.multiplyScalar(0.3)
					bodyColl.userData = {
						shape: "sphere",
						data: "collision"
					}
					body.add(bodyColl)
				}
				{
					const bodyColl = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshLambertMaterial({ color: 0x666666, wireframe: true }))
					bodyColl.position.set(0.3, 0, -0.4)
					bodyColl.scale.multiplyScalar(0.3)
					bodyColl.userData = {
						shape: "sphere",
						data: "collision"
					}
					body.add(bodyColl)
				}
			}
			{
				{
					const bodyColl = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshLambertMaterial({ color: 0x666666, wireframe: true }))
					bodyColl.position.set(-0.3, 0.4, 0.1)
					bodyColl.scale.multiplyScalar(0.3)
					bodyColl.userData = {
						shape: "sphere",
						data: "collision"
					}
					body.add(bodyColl)
				}
				{
					const bodyColl = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshLambertMaterial({ color: 0x666666, wireframe: true }))
					bodyColl.position.set(0.3, 0.4, 0.1)
					bodyColl.scale.multiplyScalar(0.3)
					bodyColl.userData = {
						shape: "sphere",
						data: "collision"
					}
					body.add(bodyColl)
				}
			}
			{
				{
					const bodyColl = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshLambertMaterial({ color: 0x666666, wireframe: true }))
					bodyColl.position.set(-0.3, 0.4, -0.7)
					bodyColl.scale.multiplyScalar(0.3)
					bodyColl.userData = {
						shape: "sphere",
						data: "collision"
					}
					body.add(bodyColl)
				}
				{
					const bodyColl = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshLambertMaterial({ color: 0x666666, wireframe: true }))
					bodyColl.position.set(0.3, 0.4, -0.7)
					bodyColl.scale.multiplyScalar(0.3)
					bodyColl.userData = {
						shape: "sphere",
						data: "collision"
					}
					body.add(bodyColl)
				}
			}
		}
		return body
	}

	makeHeli() {
		const body = new THREE.Mesh()
		{ // chassy
			const lower = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 1.4), new THREE.MeshLambertMaterial({ color: 0x666666, transparent: true, opacity: 0.8 }))
			body.add(lower)

			const upper = new THREE.Mesh(new THREE.SphereGeometry(0.7), new THREE.MeshLambertMaterial({ color: 0x666666, transparent: true, opacity: 0.8 }))
			upper.position.set(0, 0.4, 0)
			body.add(upper)

			const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 2), new THREE.MeshLambertMaterial({ color: 0x666666, transparent: true, opacity: 0.8 }))
			back.position.set(0, 0.8, -1.2)
			body.add(back)

		}
		{ // rotor
			const rotor = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.4, 0.1), new THREE.MeshLambertMaterial({ color: 0xe5a00d }))
			rotor.position.set(0, 1.3, 0)
			rotor.rotation.z = Math.PI / 2
			rotor.userData = {
				data: 'rotor'
			}
			body.add(rotor)

			const rotorBack = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.1), new THREE.MeshLambertMaterial({ color: 0xe5a00d }))
			rotorBack.position.set(0.4, 0.8, -2)
			rotorBack.rotation.x = Math.PI / 2
			rotorBack.userData = {
				data: 'rotor'
			}
			body.add(rotorBack)
		}
		{ // camera
			const camera = new THREE.Object3D()
			camera.position.set(-0.35, 0.5, 0.20)
			camera.userData = {
				data: 'camera'
			}
			body.add(camera)
		}
		{ // sceats
			{
				const seat = this.makeSeat()
				seat.position.set(-0.3, 0, 0)
				seat.name = 'seat_1'
				body.add(seat)
				seat.userData = {
					name: 'seat_1',
					data: 'seat',
					door_object: "door_1",
					seat_type: "driver",
					entry_points: "entrance_1",
					connected_seats: "seat_2"
				}

				const doorObj = new THREE.Object3D()
				doorObj.position.copy(seat.position)
				doorObj.position.x -= 0.4
				doorObj.position.y += 0.1
				doorObj.position.z += 0.4
				const door = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.5), new THREE.MeshLambertMaterial({ color: 0xffff00 }))
				door.position.z -= 0.2
				doorObj.name = "door_1"
				doorObj.userData = {
					name: "door_1"
				}
				doorObj.add(door)
				body.add(doorObj)

				const entryPoint = new THREE.AxesHelper()
				entryPoint.position.copy(doorObj.position)
				entryPoint.position.x -= 0.4
				entryPoint.position.y -= 0.5
				entryPoint.position.z -= 0.4
				entryPoint.name = 'entrance_1'
				entryPoint.userData = {
					name: "entrance_1"
				}
				body.add(entryPoint)
			}
			{
				const seat = this.makeSeat()
				seat.position.set(0.3, 0, 0)
				seat.name = 'seat_2'
				body.add(seat)
				seat.userData = {
					name: 'seat_2',
					data: 'seat',
					door_object: "door_2",
					seat_type: "passenger",
					entry_points: "entrance_2",
					connected_seats: "seat_1"
				}

				const doorObj = new THREE.Object3D()
				doorObj.position.copy(seat.position)
				doorObj.position.x += 0.4
				doorObj.position.y += 0.1
				doorObj.position.z += 0.4
				const door = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.5), new THREE.MeshLambertMaterial({ color: 0xffff00 }))
				door.position.z -= 0.2
				doorObj.name = "door_2"
				doorObj.userData = {
					name: "door_2"
				}
				doorObj.add(door)
				body.add(doorObj)

				const entryPoint = new THREE.AxesHelper()
				entryPoint.position.copy(doorObj.position)
				entryPoint.position.x += 0.4
				entryPoint.position.y -= 0.5
				entryPoint.position.z -= 0.4
				entryPoint.name = 'entrance_2'
				entryPoint.userData = {
					name: "entrance_2"
				}
				body.add(entryPoint)
			}
		}
		{ // landings
			{
				const bodyLanders = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x666666, transparent: true, opacity: 0.8 }))
				bodyLanders.position.set(0.8, -0.4, 0)
				bodyLanders.scale.set(0.1, 0.1, 1.4)
				body.add(bodyLanders)
			}
			{
				const bodyLanders = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x666666, transparent: true, opacity: 0.8 }))
				bodyLanders.position.set(-0.8, -0.4, 0)
				bodyLanders.scale.set(0.1, 0.1, 1.4)
				body.add(bodyLanders)
			}
		}
		{ // collisions
			{
				const bodyColl = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x666666, wireframe: true }))
				bodyColl.scale.set(1.4, 0.5, 1.4)
				bodyColl.scale.multiplyScalar(0.5)
				bodyColl.userData = {
					data: "collision",
					shape: "box"
				}
				body.add(bodyColl)
			}
			{
				const bodyColl = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x666666, wireframe: true }))
				bodyColl.scale.set(0.5, 0.6, 2)
				bodyColl.scale.multiplyScalar(0.5)
				bodyColl.position.set(0, 0.8, -1.2)
				bodyColl.userData = {
					data: "collision",
					shape: "box"
				}
				body.add(bodyColl)
			}
			{
				{ // landers
					{
						const bodyColl = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x666666, wireframe: true }))
						bodyColl.position.set(-0.8, -0.4, 0)
						bodyColl.scale.set(0.1, 0.1, 1.4)
						bodyColl.scale.multiplyScalar(0.5)
						bodyColl.userData = {
							data: "collision",
							shape: "box"
						}
						body.add(bodyColl)
					}
					{
						const bodyColl = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x666666, wireframe: true }))
						bodyColl.position.set(0.8, -0.4, 0)
						bodyColl.scale.set(0.1, 0.1, 1.4)
						bodyColl.scale.multiplyScalar(0.5)
						bodyColl.userData = {
							data: "collision",
							shape: "box"
						}
						body.add(bodyColl)
					}
				}
				{ // upper
					const bodyLanders = new THREE.Mesh(new THREE.SphereGeometry(), new THREE.MeshLambertMaterial({ color: 0x666666, wireframe: true }))
					bodyLanders.position.set(0, 0.4, 0)
					bodyLanders.scale.multiplyScalar(0.7)
					bodyLanders.userData = {
						data: "collision",
						shape: "sphere"
					}
					body.add(bodyLanders)
				}
				{ // lower
					{
						const bodyLanders = new THREE.Mesh(new THREE.SphereGeometry(), new THREE.MeshLambertMaterial({ color: 0x666666, wireframe: true }))
						bodyLanders.position.set(-0.4, 0, 0.4)
						bodyLanders.scale.multiplyScalar(0.25)
						bodyLanders.userData = {
							data: "collision",
							shape: "sphere"
						}
						body.add(bodyLanders)
					}
					{
						const bodyLanders = new THREE.Mesh(new THREE.SphereGeometry(), new THREE.MeshLambertMaterial({ color: 0x666666, wireframe: true }))
						bodyLanders.position.set(0.4, 0, 0.4)
						bodyLanders.scale.multiplyScalar(0.25)
						bodyLanders.userData = {
							data: "collision",
							shape: "sphere"
						}
						body.add(bodyLanders)
					}

					{
						const bodyLanders = new THREE.Mesh(new THREE.SphereGeometry(), new THREE.MeshLambertMaterial({ color: 0x666666, wireframe: true }))
						bodyLanders.position.set(-0.4, 0, -0.4)
						bodyLanders.scale.multiplyScalar(0.25)
						bodyLanders.userData = {
							data: "collision",
							shape: "sphere"
						}
						body.add(bodyLanders)
					}
					{
						const bodyLanders = new THREE.Mesh(new THREE.SphereGeometry(), new THREE.MeshLambertMaterial({ color: 0x666666, wireframe: true }))
						bodyLanders.position.set(0.4, 0, -0.4)
						bodyLanders.scale.multiplyScalar(0.25)
						bodyLanders.userData = {
							data: "collision",
							shape: "sphere"
						}
						body.add(bodyLanders)
					}
				}
				{ // propeller
					const bodyLanders = new THREE.Mesh(new THREE.SphereGeometry(), new THREE.MeshLambertMaterial({ color: 0x666666, wireframe: true }))
					bodyLanders.position.set(0, 1.2, 0)
					bodyLanders.scale.multiplyScalar(0.25)
					bodyLanders.userData = {
						data: "collision",
						shape: "sphere"
					}
					body.add(bodyLanders)
				}
				// back
				{
					{
						const bodyLanders = new THREE.Mesh(new THREE.SphereGeometry(), new THREE.MeshLambertMaterial({ color: 0x666666, wireframe: true }))
						bodyLanders.position.set(0, 0.8, -2)
						bodyLanders.scale.multiplyScalar(0.25)
						bodyLanders.userData = {
							data: "collision",
							shape: "sphere"
						}
						body.add(bodyLanders)
					}
					{
						const bodyLanders = new THREE.Mesh(new THREE.SphereGeometry(), new THREE.MeshLambertMaterial({ color: 0x666666, wireframe: true }))
						bodyLanders.position.set(0, 0.8, -1)
						bodyLanders.scale.multiplyScalar(0.25)
						bodyLanders.userData = {
							data: "collision",
							shape: "sphere"
						}
						body.add(bodyLanders)
					}
					{
						const bodyLanders = new THREE.Mesh(new THREE.SphereGeometry(), new THREE.MeshLambertMaterial({ color: 0x666666, wireframe: true }))
						bodyLanders.position.set(0, 0.8, -1.5)
						bodyLanders.scale.multiplyScalar(0.25)
						bodyLanders.userData = {
							data: "collision",
							shape: "sphere"
						}
						body.add(bodyLanders)
					}
				}
				{ // landers
					for (let i = 0; i < 5; i++) {
						const bodyLanders = new THREE.Mesh(new THREE.SphereGeometry(), new THREE.MeshLambertMaterial({ color: 0x666666, wireframe: true }))
						bodyLanders.position.set(-0.8, -0.4, 0.61 - (i * 0.3))
						bodyLanders.scale.multiplyScalar(0.08)
						bodyLanders.userData = {
							data: "collision",
							shape: "sphere"
						}
						body.add(bodyLanders)
					}
					for (let i = 0; i < 5; i++) {
						const bodyLanders = new THREE.Mesh(new THREE.SphereGeometry(), new THREE.MeshLambertMaterial({ color: 0x666666, wireframe: true }))
						bodyLanders.position.set(0.8, -0.4, 0.61 - (i * 0.3))
						bodyLanders.scale.multiplyScalar(0.08)
						bodyLanders.userData = {
							data: "collision",
							shape: "sphere"
						}
						body.add(bodyLanders)
					}
				}
			}
		}
		return body
	}

	makeAirPlane() {
		const body = new THREE.Mesh()
		{ // chassy
			const lower = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 2.6), new THREE.MeshLambertMaterial({ color: 0x666666, transparent: true, opacity: 0.8 }))
			body.add(lower)

			const upper = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.8), new THREE.MeshLambertMaterial({ color: 0x666666, transparent: true, opacity: 0.8 }))
			upper.position.set(0, 0.4, -0.9)
			body.add(upper)
		}
		{ // rotor
			const rotor = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.8), new THREE.MeshLambertMaterial({ color: 0x33aaff }))
			rotor.position.set(0, 0, 1.5)
			rotor.rotation.y = Math.PI / 2
			rotor.userData = {
				data: 'rotor'
			}
			body.add(rotor)
		}
		{ // camera
			const camera = new THREE.Object3D()
			camera.position.set(0, 1, 0.3)
			camera.userData = {
				data: 'camera'
			}
			body.add(camera)
		}
		{ // rudder
			const rudderObj = new THREE.Object3D()
			rudderObj.position.set(0, 0.8, -0.9)
			rudderObj.rotation.x = Math.PI
			const rudder = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.3), new THREE.MeshLambertMaterial({ color: 0x00ffff }))
			rudder.position.z = +0.2
			rudderObj.add(rudder)
			rudderObj.name = 'rudder'
			rudderObj.userData = {
				data: 'rudder'
			}
			body.add(rudderObj)
		}
		{ // elevator
			{
				const eleObj = new THREE.Object3D()
				eleObj.position.set(0.7, 0.2, -0.9)
				eleObj.rotation.y = Math.PI / 2
				const eleObj1 = new THREE.Object3D()
				eleObj1.rotation.set(Math.PI / 2, 0, Math.PI / 2)
				const elevator = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.1), new THREE.MeshLambertMaterial({ color: 0xffff00 }))
				eleObj1.userData = {
					data: 'elevator'
				}
				elevator.position.y = -0.2
				eleObj1.add(elevator)
				eleObj.add(eleObj1)
				body.add(eleObj)
			}
			{
				const eleObj = new THREE.Object3D()
				eleObj.position.set(-0.7, 0.2, -0.9)
				eleObj.rotation.y = Math.PI / 2
				const eleObj1 = new THREE.Object3D()
				eleObj1.rotation.set(Math.PI / 2, 0, Math.PI / 2)
				const elevator = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.1), new THREE.MeshLambertMaterial({ color: 0xffff00 }))
				eleObj1.userData = {
					data: 'elevator'
				}
				elevator.position.y = -0.2
				eleObj1.add(elevator)
				eleObj.add(eleObj1)
				body.add(eleObj)
			}
		}
		{ // "aileron",
			{
				const aileronObj = new THREE.Object3D()
				const aileronObj1 = new THREE.Object3D()
				aileronObj.position.set(0.9, -0.2, 1.2)
				aileronObj.rotation.z = Math.PI / 2
				const aileron = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 0.5), new THREE.MeshLambertMaterial({ color: 0xffaa77 }))
				aileron.position.z = -0.3
				aileronObj1.userData = {
					data: "aileron",
					side: "right"
				}
				aileronObj1.add(aileron)
				aileronObj.add(aileronObj1)
				body.add(aileronObj)
			}
			{
				const aileronObj = new THREE.Object3D()
				const aileronObj1 = new THREE.Object3D()
				aileronObj.position.set(-0.9, -0.2, 1.2)
				aileronObj.rotation.z = Math.PI / 2
				const aileron = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 0.5), new THREE.MeshLambertMaterial({ color: 0xffaa77 }))
				aileron.position.z = -0.3
				aileronObj1.userData = {
					data: "aileron",
					side: "left"
				}
				aileronObj1.add(aileron)
				aileronObj.add(aileronObj1)
				body.add(aileronObj)
			}
		}
		{ // seat
			const seat = this.makeSeat(true)
			seat.position.set(0, 0, 0.3)
			seat.name = 'seat_1'
			seat.userData = {
				name: 'seat_1',
				data: 'seat',
				seat_type: "driver",
				entry_points: "entrance_1;entrance_2",
			}
			body.add(seat)

			{
				const entryPoint = new THREE.AxesHelper()
				entryPoint.position.copy(seat.position)
				entryPoint.position.x -= 0.7
				entryPoint.position.y -= 0.4
				entryPoint.name = 'entrance_1'
				entryPoint.userData = {
					name: "entrance_1"
				}
				body.add(entryPoint)
			}

			{
				const entryPoint = new THREE.AxesHelper()
				entryPoint.position.copy(seat.position)
				entryPoint.position.x += 0.7
				entryPoint.position.y -= 0.4
				entryPoint.name = 'entrance_2'
				entryPoint.userData = {
					name: "entrance_2"
				}
				body.add(entryPoint)
			}
		}
		{ // wheels
			{
				const wheelObj = this.makeWheel(0.14, 0.1)
				wheelObj.position.set(0, -0.3, 1)
				wheelObj.name = "wheel_fl"
				wheelObj.userData = {
					name: "wheel_fl",
					steering: "true",
					data: "wheel",
					drive: "fwd"
				}
				body.add(wheelObj)
			}

			{
				const wheelObj = this.makeWheel(0.14, 0.1)
				wheelObj.position.set(-0.5, -0.3, -1)
				wheelObj.name = "wheel_bl"
				wheelObj.userData = {
					name: "wheel_bl",
					data: "wheel",
				}
				body.add(wheelObj)
			}

			{
				const wheelObj = this.makeWheel(0.14, 0.1)
				wheelObj.position.set(0.5, -0.3, -1)
				wheelObj.name = "wheel_br"
				wheelObj.userData = {
					name: "wheel_br",
					data: "wheel",
				}
				body.add(wheelObj)
			}
		}
		{ // collisions
			{
				const bodyColl = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x666666, transparent: true, opacity: 0.8, wireframe: true }))
				bodyColl.scale.set(0.8, 0.5, 2.6)
				bodyColl.scale.multiplyScalar(0.5)
				bodyColl.userData = {
					data: "collision",
					shape: "box"
				}
				body.add(bodyColl)
			}
			{ // aileron
				{
					const bodyColl = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x666666, transparent: true, opacity: 0.8, wireframe: true }))
					bodyColl.scale.set(1.2, 0.15, 0.5)
					bodyColl.scale.multiplyScalar(0.5)
					bodyColl.position.set(-0.9, -0.2, 0.9)
					bodyColl.userData = {
						data: "collision",
						shape: "box"
					}
					body.add(bodyColl)
				}
				{
					const bodyColl = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x666666, transparent: true, opacity: 0.8, wireframe: true }))
					bodyColl.scale.set(1.2, 0.15, 0.5)
					bodyColl.scale.multiplyScalar(0.5)
					bodyColl.position.set(0.9, -0.2, 0.9)
					bodyColl.userData = {
						data: "collision",
						shape: "box"
					}
					body.add(bodyColl)
				}
			}
			{ // elevator
				{
					const bodyColl = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x666666, transparent: true, opacity: 0.8, wireframe: true }))
					bodyColl.scale.set(0.6, 0.15, 0.3)
					bodyColl.scale.multiplyScalar(0.5)
					bodyColl.position.set(-0.7, 0.2, -1.1)
					bodyColl.userData = {
						data: "collision",
						shape: "box"
					}
					body.add(bodyColl)
				}
				{
					const bodyColl = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x666666, transparent: true, opacity: 0.8, wireframe: true }))
					bodyColl.scale.set(0.6, 0.15, 0.3)
					bodyColl.scale.multiplyScalar(0.5)
					bodyColl.position.set(0.7, 0.2, -1.1)
					bodyColl.userData = {
						data: "collision",
						shape: "box"
					}
					body.add(bodyColl)
				}
			}
			{
				const bodyColl = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x666666, transparent: true, opacity: 0.8, wireframe: true }))
				bodyColl.scale.set(0.6, 0.3, 0.8)
				bodyColl.scale.multiplyScalar(0.5)
				bodyColl.position.set(0, 0.4, -0.9)
				bodyColl.userData = {
					data: "collision",
					shape: "box"
				}
				body.add(bodyColl)
			}
			{ // rudder
				const bodyColl = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0x666666, transparent: true, opacity: 0.8, wireframe: true }))
				bodyColl.scale.set(0.1, 0.5, 0.5)
				bodyColl.scale.multiplyScalar(0.5)
				bodyColl.position.set(0, 0.8, -1)
				bodyColl.userData = {
					data: "collision",
					shape: "box"
				}
				body.add(bodyColl)
			}
		}
		return body
	}
}
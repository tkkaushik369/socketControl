import * as THREE from 'three'
import { BaseScene } from '../../../BaseScene'

export class Test2Scene extends BaseScene {
	constructor() {
		super()

		{
			const ground = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ color: 0xcccccc }))
			ground.scale.set(16, 0.2, 16)
			const groundPhy = new THREE.Mesh(new THREE.BoxGeometry())
			groundPhy.scale.copy(ground.scale).divideScalar(2)
			groundPhy.userData = {
				data: "physics",
				type: "box",
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
						spawnPlayer.position.set(0, 2, 0)

						scenario1.add(spawnPlayer)
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
					{
						let spawnVehical = new THREE.Object3D()
						spawnVehical.position.set(4, 2, 0)
						spawnVehical.userData = {
							data: "spawn",
							type: "car",
							subtype: "car_test",
							name: "car",
						}
						scenario2.add(spawnVehical)
					}
				}
				this.scene.add(scenario2)
			}
		}
	}
}
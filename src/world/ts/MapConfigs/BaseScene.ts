import * as THREE from 'three'

export type SceneType = {
	scene: THREE.Scene
	animations: any[]
}
export type MeshType = {
	scene: THREE.Mesh
	animations: any[]
}

export abstract class BaseScene {
	scene: THREE.Scene
	sceneAnimations: any[]

	car: THREE.Mesh
	carAnimations: any[]

	heli: THREE.Mesh
	heliAnimations: any[]

	airplane: THREE.Mesh
	airplaneAnimations: any[]

	constructor() {
		this.scene = new THREE.Scene()
		this.sceneAnimations = []

		this.car = new THREE.Mesh()
		this.carAnimations = []

		this.heli = new THREE.Mesh()
		this.heliAnimations = []

		this.airplane = new THREE.Mesh()
		this.airplaneAnimations = []
	}

	getScene(): SceneType {
		const data = {
			scene: this.scene,
			animations: this.sceneAnimations,
		}
		return data
	}

	getVehicle(type: string, subtype: string | null = null): MeshType {
		switch (type) {
			case 'car': {
				switch (subtype) {
					case 'car_test':
						return { scene: this.car, animations: this.carAnimations }
					default:
						return { scene: this.car, animations: this.carAnimations }
				}
			}
			case 'heli': {
				switch (subtype) {
					case 'heli_test':
						return { scene: this.heli, animations: this.heliAnimations }
					default:
						return { scene: this.heli, animations: this.heliAnimations }
				}
			}
			case 'airplane': {
				switch (subtype) {
					case 'airplane_test':
						return { scene: this.airplane, animations: this.airplaneAnimations }
					default:
						return { scene: this.airplane, animations: this.airplaneAnimations }
				}
			}
			default:
				return { scene: this.car, animations: this.carAnimations }
		}
	}
}

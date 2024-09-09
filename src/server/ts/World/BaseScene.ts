import * as THREE from 'three'

export type SceneType = {
	scene: THREE.Scene,
	animations: any[]
}
export type MeshType = {
	scene: THREE.Mesh,
	animations: any[]
}

export abstract class BaseScene {
	scene: THREE.Scene
	sceneAnimations: any[]

	car: THREE.Mesh
	carAnimations: any[]
	
	legocar: THREE.Mesh
	legocarAnimations: any[]
	
	heli: THREE.Mesh
	heliAnimations: any[]

	legoheli: THREE.Mesh
	legoheliAnimations: any[]
	
	airplane: THREE.Mesh
	airplaneAnimations: any[]

	legoairplane: THREE.Mesh
	legoairplaneAnimations: any[]

	constructor() {
		this.scene = new THREE.Scene()
		this.sceneAnimations = []

		this.car = new THREE.Mesh()
		this.carAnimations = []
		
		this.legocar = new THREE.Mesh()
		this.legocarAnimations = []
		
		this.heli = new THREE.Mesh()
		this.heliAnimations = []

		this.legoheli = new THREE.Mesh()
		this.legoheliAnimations = []
		
		this.airplane = new THREE.Mesh()
		this.airplaneAnimations = []

		this.legoairplane = new THREE.Mesh()
		this.legoairplaneAnimations = []
	}

	getScene(): SceneType {
		const data = {
			scene: this.scene,
			animations: this.sceneAnimations,
		}
		return data
	}

	getVehical(type: string, subtype: string | null = null): MeshType {
		switch (type) {
			case 'car': {
				switch (subtype) {
					case 'car_test': return { scene: this.car, animations: this.carAnimations }
					case 'lego': return { scene: this.legocar, animations: this.legocarAnimations }
					default: return { scene: this.car, animations: this.carAnimations }
				}
			}
			case 'heli': {
				switch (subtype) {
					case 'heli_test': return { scene: this.heli, animations: this.heliAnimations }
					case 'lego': return { scene: this.legoheli, animations: this.legoheliAnimations }
					default: return { scene: this.heli, animations: this.heliAnimations }
				}
			}
			case 'airplane': {
				switch (subtype) {
					case 'airplane_test': return{ scene: this.airplane, animations: this.airplaneAnimations }
					case 'lego': return{ scene: this.legoairplane, animations: this.legoairplaneAnimations }
					default: return { scene: this.airplane, animations: this.airplaneAnimations }
				}
			}
			default: return { scene: this.car, animations: this.carAnimations }
		}
	}
}
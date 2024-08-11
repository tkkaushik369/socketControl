import * as THREE from 'three'

export abstract class BaseScene {
	scene: THREE.Scene
	car: THREE.Mesh
	legocar: THREE.Mesh
	heli: THREE.Mesh
	airplane: THREE.Mesh

	constructor() {
		this.scene = new THREE.Scene()
		this.car = new THREE.Mesh()
		this.legocar = new THREE.Mesh()
		this.heli = new THREE.Mesh()
		this.airplane = new THREE.Mesh()
	}

	getScene() {
		const data = {
			scene: this.scene
		}
		return data
	}

	getVehical(type: string, subtype: string | null = null): { scene: THREE.Mesh } {
		switch (type) {
			case 'car': {
				switch (subtype) {
					case 'car_test': return { scene: this.car }
					case 'lego': return { scene: this.legocar }
					default: return { scene: this.car }
				}
			}
			case 'heli': {
				switch (subtype) {
					case 'heli_test': { scene: this.heli }
					default: return { scene: this.heli }
				}
			}
			case 'airplane': {
				switch (subtype) {
					case 'airplane_test': { scene: this.airplane }
					default: return { scene: this.airplane }
				}
			}
			default: return { scene: this.car }
		}
	}
}
import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import * as _ from 'lodash'

export default class Utility {
	public static getBodyFromMesh(mesh: THREE.Mesh): CANNON.Body | undefined {
		switch (mesh.userData.physics) {
			case 'box': {
				let mass = mesh.userData.mass
				if (mass === undefined) mass = 0;
				else mass = Number(mass)

				const parameter = (mesh.geometry as THREE.BoxGeometry).parameters
				const shape = new CANNON.Box(new CANNON.Vec3(parameter.width / 2, parameter.height / 2, parameter.depth / 2))
				const body = new CANNON.Body({ mass: mass, shape: shape })
				return body;
			}
			case 'sphere': {
				let mass = mesh.userData.mass
				if (mass === undefined) mass = 0;
				else mass = Number(mass)

				const parameter = (mesh.geometry as THREE.SphereGeometry).parameters
				const shape = new CANNON.Sphere(parameter.radius)
				const body = new CANNON.Body({ mass: mass, shape: shape })
				return body;
			}
		}
		return undefined
	}

	public static randNumb(min: number, max: number) {
		return Math.floor(Math.random() * (max - min + 1) + min);
	}

	public static getRandomMutedColor(pre = "") {
		var mutedColor = pre
		mutedColor += this.randNumb(75, 170).toString(16)
		mutedColor += this.randNumb(75, 170).toString(16)
		mutedColor += this.randNumb(75, 170).toString(16)
		return mutedColor
	}

	public static setDefaults(options: { [id: string]: any }, defaults: { [id: string]: any }) {
		return _.defaults({}, _.clone(options), defaults)
	}

	public static createCapsuleGeometry(radius: number = 1, height: number = 2, N: number = 32) {
		return new THREE.CapsuleGeometry(radius, height, N / 2, N)
	}
}
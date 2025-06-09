import * as CANNON from 'cannon-es'
import { Utility } from '../../Core/Utility'
import { ICollider } from '../../Interfaces/ICollider'

export class SphereCollider implements ICollider {
	public options: any
	public body: CANNON.Body

	constructor(options: any) {
		let defaults = {
			mass: 0,
			position: new CANNON.Vec3(),
			radius: 0.3,
			friction: 0.3,
		}
		options = Utility.setDefaults(options, defaults)
		this.options = options

		let mat = new CANNON.Material('sphereMat')
		mat.friction = options.friction

		let shape = new CANNON.Sphere(options.radius)

		// Add phys sphere
		let physSphere = new CANNON.Body({
			mass: options.mass,
			position: options.position,
			shape,
		})
		physSphere.material = mat

		this.body = physSphere
	}
}

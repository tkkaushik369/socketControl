import * as CANNON from 'cannon-es'
import { Utility } from '../../Core/Utility'
import { ICollider } from '../../Interfaces/ICollider'

export class CylinderCollider implements ICollider {
	public options: any
	public body: CANNON.Body

	constructor(options: any) {
		let defaults = {
			mass: 0,
			position: new CANNON.Vec3(),
			radius1: 0.3,
			radius2: 0.3,
			height: 0.1,
			segment: 6,
			friction: 0.3,
		}
		options = Utility.setDefaults(options, defaults)
		this.options = options

		let mat = new CANNON.Material('cylinderMat')
		mat.friction = options.friction

		let shape = new CANNON.Cylinder(options.radius1, options.radius2, options.height, options.segment)

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

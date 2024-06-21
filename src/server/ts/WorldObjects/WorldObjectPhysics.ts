import * as CANNON from 'cannon-es'
import * as THREE from 'three'
import Utility from '../Utils/Utility'
import CannonUtils from '../Utils/cannonUtils'

export class Physics {

	public options: { [id: string]: any }
	public physical: CANNON.Body
	public visual: THREE.Mesh

	constructor() {
		this.getVisualModel = this.getVisualModel.bind(this)

		this.options = {}
		this.physical = new CANNON.Body()
		this.visual = this.getVisualModel({ visible: false, wireframe: true });
	}

	public getVisualModel(options: { [id: string]: any }): THREE.Mesh {
		return new THREE.Mesh()
	}
}

export class Sphere extends Physics {
	constructor(options: { [id: string]: any }) {
		super()
		this.getVisualModel = this.getVisualModel.bind(this)	

		let defaults = {
			mass: 0,
			position: new CANNON.Vec3(0, 0, 0),
			radius: 1,
			friction: 0.3,
		}
		options = Utility.setDefaults(options, defaults)
		this.options = options

		let mat = new CANNON.Material()
		mat.friction = options.friction

		let shape = new CANNON.Sphere(options.radius)
		shape.material = mat

		let body = new CANNON.Body({
			mass: options.mass,
			position: options.position,
			shape: shape,
			material: mat,
		})

		this.physical = body
		this.visual = this.getVisualModel({ visible: false, wireframe: true });
	}

	public getVisualModel(options: { [id: string]: any }): THREE.Mesh {
		let defaults = {
			visible: true,
			wireframe: true,
		}
		options = Utility.setDefaults(options, defaults)

		let geometry = new THREE.SphereGeometry(this.options.radius, 32, 32)
		let material = new THREE.MeshLambertMaterial({ color: 0x0000cc, wireframe: options.wireframe })
		let mesh = new THREE.Mesh(geometry, material)
		mesh.visible = options.visible

		if (!options.wireframe) {
			mesh.castShadow = true
			mesh.receiveShadow = true
		}

		return mesh
	}
}

export class Box extends Physics {
	constructor(options: { [id: string]: any }) {
		super()
		this.getVisualModel = this.getVisualModel.bind(this)

		let defaults = {
			mass: 0,
			position: new CANNON.Vec3(0, 0, 0),
			size: new CANNON.Vec3(0.5, 0.5, 0.5),
			quaternion: new CANNON.Quaternion(),
			friction: 0.3,
		}
		options = Utility.setDefaults(options, defaults)
		this.options = options

		let mat = new CANNON.Material()
		mat.friction = options.friction

		let shape = new CANNON.Box(options.size)
		shape.material = mat

		let body = new CANNON.Body({
			mass: options.mass,
			position: options.position,
			quaternion: options.quaternion,
			shape: shape,
			material: mat,
		})

		this.physical = body
		this.visual = this.getVisualModel({ visible: false, wireframe: true });
	}

	public getVisualModel(options: { [id: string]: any }): THREE.Mesh {
		let defaults = {
			visble: true,
			wireframe: true,
		}
		options = Utility.setDefaults(options, defaults)

		let geometry = new THREE.BoxGeometry(this.options.size.x * 2, this.options.size.y * 2, this.options.size.z * 2)
		let material = new THREE.MeshLambertMaterial({ color: 0x0000cc, wireframe: options.wireframe })
		let mesh = new THREE.Mesh(geometry, material)
		mesh.visible = options.visible

		if (!options.wireframe) {
			mesh.castShadow = true
			mesh.receiveShadow = true
		}
		return mesh
	}
}

export class Capsule extends Physics {
	constructor(options: { [id: string]: any }) {
		super()
		this.getVisualModel = this.getVisualModel.bind(this)

		let defaults = {
			mass: 0,
			position: new CANNON.Vec3(0, 0, 0),
			height: 0.5,
			radius: 0.3,
			swgments: 8,
			friction: 0.3,
		}
		options = Utility.setDefaults(options, defaults)
		this.options = options

		let mat = new CANNON.Material()
		mat.friction = options.friction

		let body = new CANNON.Body({
			mass: options.mass,
			position: options.position,
		})

		let shape = new CANNON.Sphere(options.radius)
		body.material = mat
		shape.material = mat

		body.addShape(shape, new CANNON.Vec3(0, 0, 0))
		body.addShape(shape, new CANNON.Vec3(0, options.height / 2, 0))
		body.addShape(shape, new CANNON.Vec3(0, - options.height / 2, 0))

		this.physical = body
		this.visual = this.getVisualModel({ visible: false, wireframe: true });
	}

	public getVisualModel(options: { [id: string]: any }): THREE.Mesh {
		let defaults = {
			visible: true,
			wireframe: true,
		}
		options = Utility.setDefaults(options, defaults)

		let material = new THREE.MeshLambertMaterial({ color: 0x0000cc, wireframe: options.wireframe })
		let geometry = Utility.createCapsuleGeometry(this.options.radius, this.options.height, this.options.swgments)
		let mesh = new THREE.Mesh(geometry, material)

		if (!options.wireframe) {
			mesh.castShadow = true
			mesh.receiveShadow = true
		}

		return mesh
	}
}

export class Convex extends Physics {
	public mesh: THREE.Mesh

	constructor(mesh: THREE.Mesh, options: { [id: string]: any }) {
		super()
		this.getVisualModel = this.getVisualModel.bind(this)

		this.mesh = mesh

		let defaults = {
			mass: 0,
			position: mesh.position,
			friction: 0.3,
		}
		options = Utility.setDefaults(options, defaults)
		this.options = options

		let mat = new CANNON.Material()
		mat.friction = options.friction

		let shape = CannonUtils.CreateConvexPolyhedron(this.mesh.geometry)
		shape.material = mat

		let body = new CANNON.Body({
			mass: options.mass,
			position: options.position,
			shape: shape,
			material: mat,
		})

		this.physical = body
		this.visual = this.getVisualModel({ visible: false, wireframe: true });
	}

	public getVisualModel(options: { [id: string]: any }): THREE.Mesh {
		let defaults = {
			visible: true,
			wireframe: true,
		}
		options = Utility.setDefaults(options, defaults)

		let material = new THREE.MeshLambertMaterial({ color: 0x0000cc, wireframe: options.wireframe })
		let mesh = this.mesh.clone()
		mesh.material = material
		mesh.visible = options.visible

		if (!options.wireframe) {
			mesh.castShadow = true
			mesh.receiveShadow = true
		}

		return mesh
	}
}

export class Trimesh extends Physics {

	public mesh: THREE.Mesh

	constructor(mesh: THREE.Mesh, options: { [id: string]: any }) {
		super()
		this.getVisualModel	= this.getVisualModel.bind(this)

		this.mesh = mesh

		let defaults = {
			mass: 0,
			position: mesh.position,
			friction: 0.3,
		}
		options = Utility.setDefaults(options, defaults)
		this.options = options

		let mat = new CANNON.Material()
		mat.friction = options.friction

		let shape = CannonUtils.CreateTrimesh(this.mesh.geometry)
		shape.material = mat

		let body = new CANNON.Body({
			mass: options.mass,
			position: options.position,
			shape: shape,
			material: mat,
		})

		this.physical = body
		this.visual = this.getVisualModel({ visible: false, wireframe: true });
	}

	public getVisualModel(options: { [id: string]: any }): THREE.Mesh {
		let defaults = {
			visible: true,
			wireframe: true,
		}
		options = Utility.setDefaults(options, defaults)

		let material = new THREE.MeshLambertMaterial({ color: 0x0000cc, wireframe: options.wireframe })
		let mesh = this.mesh.clone()
		mesh.material = material
		mesh.visible = options.visible
		if (!options.wireframe) {
			mesh.castShadow = true
			mesh.receiveShadow = true
		}

		return mesh
	}
}
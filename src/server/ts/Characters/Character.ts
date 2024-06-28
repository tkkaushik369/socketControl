import * as THREE from 'three'
import Utility from '../Utils/Utility';


export class Character extends THREE.Object3D {

	private height: number
	private modelOffset: THREE.Vector3
	private visuals: THREE.Group
	private modelContainer: THREE.Group

	private worldClient: any

	constructor(options: { [id: string]: any } = {}) {
		let defaults = {
			position: new THREE.Vector3(),
			height: 1
		};

		options = Utility.setDefaults(options, defaults);
		super()

		// Geometry
		this.height = options.height
		this.modelOffset = new THREE.Vector3()

		// The Visuals group is centered for easy character tilting
		this.visuals = new THREE.Group()
		this.add(this.visuals)

		// Model container is used to realiable ground the character, as animation can alter position of model itself
		this.modelContainer = new THREE.Group()
		this.modelContainer.position.y = - this.height / 2
		this.visuals.add(this.modelContainer)

		// Default Model
		let capsuleGeometry = Utility.createCapsuleGeometry(0.5, this.height)
		let capsule = new THREE.Mesh(capsuleGeometry, new THREE.MeshLambertMaterial({ color: 0x0000ff }))
		capsule.position.set(0, this.height / 2, 0)
		capsule.castShadow = true
	}
}
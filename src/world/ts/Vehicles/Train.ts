import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import * as _ from 'lodash'
import { IWorldEntity } from '../Interfaces/IWorldEntity'
import { INetwork } from '../Interfaces/INetwork'
import { MessageTypes } from '../Enums/MessageTypes'
import { EntityType } from '../Enums/EntityType'
import { WorldBase } from '@World'
import { Utility } from '../Core/Utility'
import { CollisionGroups } from '../Enums/CollisionGroups'
import { CylinderCollider } from '../Physics/Colliders/CylinderCollider'

export class Train extends THREE.Object3D implements IWorldEntity, INetwork {
	public uID: string | null
	public msgType: MessageTypes = MessageTypes.Train
	public timeStamp: number
	public ping: number

	public updateOrder: number = 2
	public entityType: EntityType = EntityType.Train

	public world: WorldBase | null
	// public maxGears: number
	public maxMotorForce: number
	public maxMotorSpeed: number
	public spawnPoint: THREE.Object3D | null
	public camera: THREE.Object3D | null
	public collision: CANNON.Body

	public wheelFL: CANNON.Body
	public constraintFL: CANNON.HingeConstraint
	public wheelFLObj: THREE.Object3D | null

	public wheelFR: CANNON.Body
	public constraintFR: CANNON.HingeConstraint
	public wheelFRObj: THREE.Object3D | null

	public wheelBL: CANNON.Body
	public constraintBL: CANNON.HingeConstraint
	public wheelBLObj: THREE.Object3D | null

	public wheelBR: CANNON.Body
	public constraintBR: CANNON.HingeConstraint
	public wheelBRObj: THREE.Object3D | null

	public materials: THREE.Material[] = []

	public modelContainer: THREE.Group
	public lights: THREE.SpotLight[]

	private widthOff: number
	private heightOff: number
	private lengthOff: number

	constructor(
		gltf: any,
		mass: number = 10,
		wheelMass = 2,
		widthOff: number = 0.8,
		heightOff: number = 0.2,
		lengthOff: number = 1.8
	) {
		super()

		// bind functions
		this.readVehicleData = this.readVehicleData.bind(this)
		this.setPosition = this.setPosition.bind(this)
		this.resetRotation = this.resetRotation.bind(this)
		this.setMotorSpeed = this.setMotorSpeed.bind(this)
		this.setMotorForce = this.setMotorForce.bind(this)
		this.addToWorld = this.addToWorld.bind(this)
		this.removeFromWorld = this.removeFromWorld.bind(this)
		this.update = this.update.bind(this)
		this.Out = this.Out.bind(this)
		this.Set = this.Set.bind(this)

		this.uID = null
		this.timeStamp = Date.now()
		this.ping = 0

		this.world = null
		// this.maxGears = 5
		this.spawnPoint = null
		this.camera = null
		this.lights = []
		this.wheelBLObj = null
		this.wheelFLObj = null
		this.wheelBRObj = null
		this.wheelFRObj = null

		this.widthOff = widthOff
		this.heightOff = heightOff
		this.lengthOff = lengthOff

		this.maxMotorForce = 1.5
		this.maxMotorSpeed = 1.5

		// Model
		this.modelContainer = new THREE.Group()
		this.add(this.modelContainer)

		// Physics mat
		let mat = new CANNON.Material('Mat')
		mat.friction = 0.01

		// Collision body
		this.collision = new CANNON.Body({ mass: mass })
		this.collision.material = mat

		{
			const rot = new CANNON.Vec3(0, 0, Math.PI / 2)
			let wheelMaterial = new CANNON.Material('cylinderMat')
			mat.friction = 0.3
			const radius1 = 0.3,
				radius2 = 0.5,
				radius3 = 0.29,
				radius4 = 0.3,
				height1 = 0.1,
				height2 = 0.2,
				segments = 32

			{
				// FL
				const wheelFLShape = new CANNON.Cylinder(radius1, radius2, height1, segments)
				const wheelFLShape1 = new CANNON.Cylinder(radius3, radius4, height2, segments)
				// const wheelFLShape2 = new CANNON.Cylinder(radius2, radius1, height1, segments)
				this.wheelFL = new CANNON.Body({ mass: wheelMass, material: wheelMaterial })
				this.wheelFL.addShape(
					wheelFLShape,
					new CANNON.Vec3(0, 0, 0),
					new CANNON.Quaternion(0, 0, 0, 0).setFromEuler(rot.x, rot.y, rot.z)
				)
				this.wheelFL.addShape(
					wheelFLShape1,
					new CANNON.Vec3(-0.2, 0, 0),
					new CANNON.Quaternion(0, 0, 0, 0).setFromEuler(rot.x, rot.y, rot.z)
				)
				// this.wheelFL.addShape(
				// 	wheelFLShape2,
				// 	new CANNON.Vec3(-0.4, 0, 0),
				// 	new CANNON.Quaternion(0, 0, 0, 0).setFromEuler(rot.x, rot.y, rot.z)
				// )

				this.constraintFL = new CANNON.HingeConstraint(this.collision, this.wheelFL, {
					pivotA: new CANNON.Vec3(-this.widthOff, -this.heightOff, this.lengthOff),
					axisA: new CANNON.Vec3(1, 0, 0),
					maxForce: 25,
				})
			}

			{
				// FR
				const wheelFRShape = new CANNON.Cylinder(radius1, radius2, height1, segments)
				const wheelFRShape1 = new CANNON.Cylinder(radius3, radius4, height2, segments)
				// const wheelFRShape2 = new CANNON.Cylinder(radius2, radius1, height1, segments)
				this.wheelFR = new CANNON.Body({ mass: wheelMass, material: wheelMaterial })
				this.wheelFR.addShape(
					wheelFRShape,
					new CANNON.Vec3(0, 0, 0),
					new CANNON.Quaternion(0, 0, 0, 0).setFromEuler(rot.x, rot.y, rot.z)
				)
				this.wheelFR.addShape(
					wheelFRShape1,
					new CANNON.Vec3(-0.2, 0, 0),
					new CANNON.Quaternion(0, 0, 0, 0).setFromEuler(rot.x, rot.y, rot.z)
				)
				// this.wheelFR.addShape(
				// 	wheelFRShape2,
				// 	new CANNON.Vec3(-0.4, 0, 0),
				// 	new CANNON.Quaternion(0, 0, 0, 0).setFromEuler(rot.x, rot.y, rot.z)
				// )

				this.constraintFR = new CANNON.HingeConstraint(this.collision, this.wheelFR, {
					pivotA: new CANNON.Vec3(-this.widthOff, -this.heightOff, -this.lengthOff),
					axisA: new CANNON.Vec3(1, 0, 0),
					maxForce: 25,
				})
			}

			{
				// BL
				const wheelBLShape = new CANNON.Cylinder(radius2, radius1, height1, segments)
				const wheelBLShape1 = new CANNON.Cylinder(radius4, radius3, height2, segments)
				// const wheelBLShape2 = new CANNON.Cylinder(radius1, radius2, height1, segments)
				this.wheelBL = new CANNON.Body({ mass: wheelMass, material: wheelMaterial })
				this.wheelBL.addShape(
					wheelBLShape,
					new CANNON.Vec3(0, 0, 0),
					new CANNON.Quaternion(0, 0, 0, 0).setFromEuler(rot.x, rot.y, rot.z)
				)
				this.wheelBL.addShape(
					wheelBLShape1,
					new CANNON.Vec3(0.2, 0, 0),
					new CANNON.Quaternion(0, 0, 0, 0).setFromEuler(rot.x, rot.y, rot.z)
				)
				// this.wheelBL.addShape(
				// 	wheelBLShape2,
				// 	new CANNON.Vec3(0.4, 0, 0),
				// 	new CANNON.Quaternion(0, 0, 0, 0).setFromEuler(rot.x, rot.y, rot.z)
				// )

				this.constraintBL = new CANNON.HingeConstraint(this.collision, this.wheelBL, {
					pivotA: new CANNON.Vec3(this.widthOff, -this.heightOff, this.lengthOff),
					axisA: new CANNON.Vec3(1, 0, 0),
					maxForce: 25,
				})
			}

			{
				// BR
				const wheelBRShape = new CANNON.Cylinder(radius2, radius1, height1, segments)
				const wheelBRShape1 = new CANNON.Cylinder(radius4, radius3, height2, segments)
				// const wheelBRShape2 = new CANNON.Cylinder(radius1, radius2, height1, segments)
				this.wheelBR = new CANNON.Body({ mass: wheelMass, material: wheelMaterial })
				this.wheelBR.addShape(
					wheelBRShape,
					new CANNON.Vec3(0, 0, 0),
					new CANNON.Quaternion(0, 0, 0, 0).setFromEuler(rot.x, rot.y, rot.z)
				)
				this.wheelBR.addShape(
					wheelBRShape1,
					new CANNON.Vec3(0.2, 0, 0),
					new CANNON.Quaternion(0, 0, 0, 0).setFromEuler(rot.x, rot.y, rot.z)
				)
				// this.wheelBR.addShape(
				// 	wheelBRShape2,
				// 	new CANNON.Vec3(0.4, 0, 0),
				// 	new CANNON.Quaternion(0, 0, 0, 0).setFromEuler(rot.x, rot.y, rot.z)
				// )

				this.constraintBR = new CANNON.HingeConstraint(this.collision, this.wheelBR, {
					pivotA: new CANNON.Vec3(this.widthOff, -this.heightOff, -this.lengthOff),
					axisA: new CANNON.Vec3(1, 0, 0),
					maxForce: 25,
				})
			}

			// this.wheelRL
			// this.wheelRR
			this.collision.allowSleep = false

			this.wheelFL.allowSleep = false
			this.constraintFL.enableMotor()
			this.constraintFL.setMotorMaxForce(this.maxMotorForce)
			this.constraintFL.setMotorSpeed(this.maxMotorSpeed)

			this.wheelFR.allowSleep = false
			this.constraintFR.enableMotor()
			this.constraintFR.setMotorMaxForce(this.maxMotorForce)
			this.constraintFR.setMotorSpeed(this.maxMotorSpeed)

			this.wheelBL.allowSleep = false
			this.constraintBL.enableMotor()
			this.constraintBL.setMotorMaxForce(this.maxMotorForce)
			this.constraintBL.setMotorSpeed(this.maxMotorSpeed)

			this.wheelBL.allowSleep = false
			this.constraintBR.enableMotor()
			this.constraintBR.setMotorMaxForce(this.maxMotorForce)
			this.constraintBR.setMotorSpeed(this.maxMotorSpeed)
		}
	}

	public readVehicleData(gltf: any, isClient: boolean) {
		gltf.scene.traverse((child: any) => {
			if (child.isMesh) {
				Utility.setupMeshProperties(child, isClient)

				if (child.material !== undefined) {
					this.materials.push(child.material)
				}
			}

			if (child.hasOwnProperty('userData')) {
				if (child.userData.hasOwnProperty('data')) {
					if (child.userData.data === 'seat') {
						// this.seats.push(new VehicleSeat(this, child, gltf))
					}
					if (child.userData.data === 'camera') {
						this.camera = child
					}
					if (child.userData.data === 'wheel') {
						if (child.userData.loc === 'fl') {
							this.wheelBLObj = child
						}
						if (child.userData.loc === 'fr') {
							this.wheelFLObj = child
						}
						if (child.userData.loc === 'bl') {
							this.wheelBRObj = child
						}
						if (child.userData.loc === 'br') {
							this.wheelFRObj = child
						}
					}
					if (child.userData.data === 'collision') {
						if (child.userData.shape === 'box') {
							child.visible = false

							let phys = new CANNON.Box(new CANNON.Vec3(child.scale.x, child.scale.y, child.scale.z))
							phys.collisionFilterMask = ~CollisionGroups.TrimeshColliders
							this.collision.addShape(
								phys,
								new CANNON.Vec3(child.position.x, child.position.y, child.position.z)
							)
						} else if (child.userData.shape === 'sphere') {
							child.visible = false

							let phys = new CANNON.Sphere(child.scale.x)
							phys.collisionFilterGroup = CollisionGroups.TrimeshColliders
							this.collision.addShape(
								phys,
								new CANNON.Vec3(child.position.x, child.position.y, child.position.z)
							)
						}
					}
					if (child.userData.data === 'navmesh') {
						child.visible = false
					}
					if (child.userData.data === 'light') {
						this.lights.push(child)
					}
				}
			}
		})

		this.modelContainer.add(gltf.scene)

		if (this.collision.shapes.length === 0) {
			console.warn('Vehicle ' + typeof this + ' has no collision data.')
		}
		/* if (this.seats.length === 0) {
			console.warn('Vehicle ' + typeof this + ' has no seats.')
		} else {
			this.connectSeats()
		} */

		// this.wheels.forEach((wheel) => {
		// 	this.handlingSetup.chassisConnectionPointLocal.set(
		// 		wheel.position.x,
		// 		wheel.position.y + 0.2,
		// 		wheel.position.z
		// 	)
		// 	const index = this.rayCastVehicle.addWheel(this.handlingSetup)
		// 	wheel.rayCastWheelInfoIndex = index
		// })
	}
	public setPosition(x: number, y: number, z: number) {
		this.collision.position.set(x, y, z)
		this.collision.interpolatedPosition.set(x, y, z)

		this.wheelFL.position.set(x - this.widthOff, y - this.heightOff, z + this.lengthOff)
		this.wheelFL.interpolatedPosition.set(x - this.widthOff, y - this.heightOff, z + this.lengthOff)

		this.wheelFR.position.set(x - this.widthOff, y - this.heightOff, z - this.lengthOff)
		this.wheelFR.interpolatedPosition.set(x - this.widthOff, y - this.heightOff, z - this.lengthOff)

		this.wheelBL.position.set(x + this.widthOff, y - this.heightOff, z + this.lengthOff)
		this.wheelBL.interpolatedPosition.set(x + this.widthOff, y - this.heightOff, z + this.lengthOff)

		this.wheelBR.position.set(x + this.widthOff, y - this.heightOff, z - this.lengthOff)
		this.wheelBR.interpolatedPosition.set(x + this.widthOff, y - this.heightOff, z - this.lengthOff)
	}

	public resetRotation(newQuat: CANNON.Quaternion = new CANNON.Quaternion(0, 0, 0, 1)) {
		this.collision.quaternion.copy(newQuat)
		this.collision.interpolatedQuaternion.copy(newQuat)
		this.wheelFL.quaternion.copy(newQuat)
		this.wheelFL.interpolatedQuaternion.copy(newQuat)
		this.wheelFR.quaternion.copy(newQuat)
		this.wheelFR.interpolatedQuaternion.copy(newQuat)
		this.wheelBL.quaternion.copy(newQuat)
		this.wheelBL.interpolatedQuaternion.copy(newQuat)
		this.wheelBR.quaternion.copy(newQuat)
		this.wheelBR.interpolatedQuaternion.copy(newQuat)

		this.collision.velocity.setZero()
		this.collision.angularVelocity.setZero()
		this.wheelFL.velocity.setZero()
		this.wheelFL.angularVelocity.setZero()
		this.wheelFR.velocity.setZero()
		this.wheelFR.angularVelocity.setZero()
		this.wheelBL.velocity.setZero()
		this.wheelBL.angularVelocity.setZero()
		this.wheelBR.velocity.setZero()
		this.wheelBR.angularVelocity.setZero()
	}

	public setMotorSpeed(speed: number, update: boolean = true) {
		if (update) this.maxMotorSpeed = speed
		this.constraintFL.setMotorSpeed(speed)
		this.constraintFR.setMotorSpeed(speed)
		this.constraintBL.setMotorSpeed(speed)
		this.constraintBR.setMotorSpeed(speed)
	}
	public setMotorForce(force: number, update: boolean = true) {
		if (update) this.maxMotorForce = force
		this.constraintFL.setMotorMaxForce(force)
		this.constraintFR.setMotorMaxForce(force)
		this.constraintBL.setMotorMaxForce(force)
		this.constraintBR.setMotorMaxForce(force)
	}

	public addToWorld(world: WorldBase): void {
		if (_.includes(world.trains, this)) {
			console.warn('Adding vehicle to a world in which it already exists.')
		} else {
			this.world = world
			world.trains.push(this)
			world.addSceneObject(this)

			world.addWorldObject(this.collision)

			world.addWorldObject(this.wheelFL)
			world.addWorldObject(this.wheelFR)
			world.addWorldObject(this.wheelBL)
			world.addWorldObject(this.wheelBR)

			world.world.addConstraint(this.constraintFL)
			world.world.addConstraint(this.constraintFR)
			world.world.addConstraint(this.constraintBL)
			world.world.addConstraint(this.constraintBR)

			if (this.wheelFLObj !== null) {
				world.scene.attach(this.wheelFLObj)
			}
			if (this.wheelFRObj !== null) {
				world.scene.attach(this.wheelFRObj)
			}
			if (this.wheelBLObj !== null) {
				world.scene.attach(this.wheelBLObj)
			}
			if (this.wheelBRObj !== null) {
				world.scene.attach(this.wheelBRObj)
			}
		}
	}
	public removeFromWorld(world: WorldBase): void {
		if (!_.includes(world.trains, this)) {
			console.warn("Removing vehicle from a world in which it isn't present.")
		} else {
			world.world.removeConstraint(this.constraintFL)
			world.world.removeConstraint(this.constraintFR)
			world.world.removeConstraint(this.constraintBL)
			world.world.removeConstraint(this.constraintBR)

			world.removeWorldObject(this.wheelFL)
			world.removeWorldObject(this.wheelFR)
			world.removeWorldObject(this.wheelBL)
			world.removeWorldObject(this.wheelBL)

			world.removeWorldObject(this.collision)

			if (this.wheelFLObj !== null) {
				world.scene.remove(this.wheelFLObj)
			}
			if (this.wheelFRObj !== null) {
				world.scene.remove(this.wheelFRObj)
			}
			if (this.wheelBLObj !== null) {
				world.scene.remove(this.wheelBLObj)
			}
			if (this.wheelBRObj !== null) {
				world.scene.remove(this.wheelBRObj)
			}

			_.pull(world.trains, this)
			world.removeSceneObject(this)

			this.world = null
		}
	}

	public update(timestep: number, unscaledTimeStep: number = 0): void {
		this.position.copy(this.collision.interpolatedPosition)
		this.quaternion.copy(this.collision.interpolatedQuaternion)

		if (this.wheelFLObj !== null) {
			this.wheelFLObj.position.copy(this.wheelFL.interpolatedPosition)
			this.wheelFLObj.quaternion.copy(this.wheelFL.interpolatedQuaternion)
		}
		if (this.wheelFRObj !== null) {
			this.wheelFRObj.position.copy(this.wheelFR.interpolatedPosition)
			this.wheelFRObj.quaternion.copy(this.wheelFR.interpolatedQuaternion)
		}
		if (this.wheelBLObj !== null) {
			this.wheelBLObj.position.copy(this.wheelBL.interpolatedPosition)
			this.wheelBLObj.quaternion.copy(this.wheelBL.interpolatedQuaternion)
		}
		if (this.wheelBRObj !== null) {
			this.wheelBRObj.position.copy(this.wheelBR.interpolatedPosition)
			this.wheelBRObj.quaternion.copy(this.wheelBR.interpolatedQuaternion)
		}
	}

	public Out(): { [id: string]: any } {
		return {
			uID: this.uID,
			msgType: this.msgType,
			timeStamp: this.timeStamp,
			ping: this.ping,

			data: {
				vehicle: {
					position: {
						x: this.collision.interpolatedPosition.x,
						y: this.collision.interpolatedPosition.y,
						z: this.collision.interpolatedPosition.z,
					},
					quaternion: {
						x: this.collision.interpolatedQuaternion.x,
						y: this.collision.interpolatedQuaternion.y,
						z: this.collision.interpolatedQuaternion.z,
						w: this.collision.interpolatedQuaternion.w,
					},
				},
				wheel: {
					fl: {
						position: {
							x: this.wheelFL.interpolatedPosition.x,
							y: this.wheelFL.interpolatedPosition.y,
							z: this.wheelFL.interpolatedPosition.z,
						},
						quaternion: {
							x: this.wheelFL.interpolatedQuaternion.x,
							y: this.wheelFL.interpolatedQuaternion.y,
							z: this.wheelFL.interpolatedQuaternion.z,
							w: this.wheelFL.interpolatedQuaternion.w,
						},
					},
					fr: {
						position: {
							x: this.wheelFR.interpolatedPosition.x,
							y: this.wheelFR.interpolatedPosition.y,
							z: this.wheelFR.interpolatedPosition.z,
						},
						quaternion: {
							x: this.wheelFR.interpolatedQuaternion.x,
							y: this.wheelFR.interpolatedQuaternion.y,
							z: this.wheelFR.interpolatedQuaternion.z,
							w: this.wheelFR.interpolatedQuaternion.w,
						},
					},
					bl: {
						position: {
							x: this.wheelBL.interpolatedPosition.x,
							y: this.wheelBL.interpolatedPosition.y,
							z: this.wheelBL.interpolatedPosition.z,
						},
						quaternion: {
							x: this.wheelBL.interpolatedQuaternion.x,
							y: this.wheelBL.interpolatedQuaternion.y,
							z: this.wheelBL.interpolatedQuaternion.z,
							w: this.wheelBL.interpolatedQuaternion.w,
						},
					},
					br: {
						position: {
							x: this.wheelBR.interpolatedPosition.x,
							y: this.wheelBR.interpolatedPosition.y,
							z: this.wheelBR.interpolatedPosition.z,
						},
						quaternion: {
							x: this.wheelBR.interpolatedQuaternion.x,
							y: this.wheelBR.interpolatedQuaternion.y,
							z: this.wheelBR.interpolatedQuaternion.z,
							w: this.wheelBR.interpolatedQuaternion.w,
						},
					},
				},
			},
		}
	}
	public Set(messages: any): void {
		if (this.world) this.world.zeroBody(this.collision)

		this.collision.position.set(
			messages.data.vehicle.position.x,
			messages.data.vehicle.position.y,
			messages.data.vehicle.position.z
		)
		this.collision.quaternion.set(
			messages.data.vehicle.quaternion.x,
			messages.data.vehicle.quaternion.y,
			messages.data.vehicle.quaternion.z,
			messages.data.vehicle.quaternion.w
		)
		this.collision.interpolatedPosition.set(
			messages.data.vehicle.position.x,
			messages.data.vehicle.position.y,
			messages.data.vehicle.position.z
		)
		this.collision.interpolatedQuaternion.set(
			messages.data.vehicle.quaternion.x,
			messages.data.vehicle.quaternion.y,
			messages.data.vehicle.quaternion.z,
			messages.data.vehicle.quaternion.w
		)
		this.position.set(
			messages.data.vehicle.position.x,
			messages.data.vehicle.position.y,
			messages.data.vehicle.position.z
		)
		this.quaternion.set(
			messages.data.vehicle.quaternion.x,
			messages.data.vehicle.quaternion.y,
			messages.data.vehicle.quaternion.z,
			messages.data.vehicle.quaternion.w
		)

		this.wheelFL.position.set(
			messages.data.wheel.fl.position.x,
			messages.data.wheel.fl.position.y,
			messages.data.wheel.fl.position.z
		)
		this.wheelFL.quaternion.set(
			messages.data.wheel.fl.quaternion.x,
			messages.data.wheel.fl.quaternion.y,
			messages.data.wheel.fl.quaternion.z,
			messages.data.wheel.fl.quaternion.w
		)
		this.wheelFL.interpolatedPosition.set(
			messages.data.wheel.fl.position.x,
			messages.data.wheel.fl.position.y,
			messages.data.wheel.fl.position.z
		)
		this.wheelFL.interpolatedQuaternion.set(
			messages.data.wheel.fl.quaternion.x,
			messages.data.wheel.fl.quaternion.y,
			messages.data.wheel.fl.quaternion.z,
			messages.data.wheel.fl.quaternion.w
		)
		if (this.wheelFLObj !== null) {
			this.wheelFLObj.position.set(
				messages.data.wheel.fl.position.x,
				messages.data.wheel.fl.position.y,
				messages.data.wheel.fl.position.z
			)
			this.wheelFLObj.quaternion.set(
				messages.data.wheel.fl.quaternion.x,
				messages.data.wheel.fl.quaternion.y,
				messages.data.wheel.fl.quaternion.z,
				messages.data.wheel.fl.quaternion.w
			)
		}

		this.wheelFR.position.set(
			messages.data.wheel.fr.position.x,
			messages.data.wheel.fr.position.y,
			messages.data.wheel.fr.position.z
		)
		this.wheelFR.quaternion.set(
			messages.data.wheel.fr.quaternion.x,
			messages.data.wheel.fr.quaternion.y,
			messages.data.wheel.fr.quaternion.z,
			messages.data.wheel.fr.quaternion.w
		)
		this.wheelFR.interpolatedPosition.set(
			messages.data.wheel.br.position.x,
			messages.data.wheel.br.position.y,
			messages.data.wheel.br.position.z
		)
		this.wheelFR.interpolatedQuaternion.set(
			messages.data.wheel.fr.quaternion.x,
			messages.data.wheel.fr.quaternion.y,
			messages.data.wheel.fr.quaternion.z,
			messages.data.wheel.fr.quaternion.w
		)
		if (this.wheelFRObj !== null) {
			this.wheelFRObj.position.set(
				messages.data.wheel.fr.position.x,
				messages.data.wheel.fr.position.y,
				messages.data.wheel.fr.position.z
			)
			this.wheelFRObj.quaternion.set(
				messages.data.wheel.fr.quaternion.x,
				messages.data.wheel.fr.quaternion.y,
				messages.data.wheel.fr.quaternion.z,
				messages.data.wheel.fr.quaternion.w
			)
		}

		this.wheelBL.position.set(
			messages.data.wheel.bl.position.x,
			messages.data.wheel.bl.position.y,
			messages.data.wheel.bl.position.z
		)
		this.wheelBL.quaternion.set(
			messages.data.wheel.bl.quaternion.x,
			messages.data.wheel.bl.quaternion.y,
			messages.data.wheel.bl.quaternion.z,
			messages.data.wheel.bl.quaternion.w
		)
		this.wheelBL.interpolatedPosition.set(
			messages.data.wheel.bl.position.x,
			messages.data.wheel.bl.position.y,
			messages.data.wheel.bl.position.z
		)
		this.wheelBL.interpolatedQuaternion.set(
			messages.data.wheel.bl.quaternion.x,
			messages.data.wheel.bl.quaternion.y,
			messages.data.wheel.bl.quaternion.z,
			messages.data.wheel.bl.quaternion.w
		)
		if (this.wheelBLObj !== null) {
			this.wheelBLObj.position.set(
				messages.data.wheel.bl.position.x,
				messages.data.wheel.bl.position.y,
				messages.data.wheel.bl.position.z
			)
			this.wheelBLObj.quaternion.set(
				messages.data.wheel.bl.quaternion.x,
				messages.data.wheel.bl.quaternion.y,
				messages.data.wheel.bl.quaternion.z,
				messages.data.wheel.bl.quaternion.w
			)
		}

		this.wheelBR.position.set(
			messages.data.wheel.br.position.x,
			messages.data.wheel.br.position.y,
			messages.data.wheel.br.position.z
		)
		this.wheelBR.quaternion.set(
			messages.data.wheel.br.quaternion.x,
			messages.data.wheel.br.quaternion.y,
			messages.data.wheel.br.quaternion.z,
			messages.data.wheel.br.quaternion.w
		)
		this.wheelBR.interpolatedPosition.set(
			messages.data.wheel.br.position.x,
			messages.data.wheel.br.position.y,
			messages.data.wheel.br.position.z
		)
		this.wheelBR.interpolatedQuaternion.set(
			messages.data.wheel.br.quaternion.x,
			messages.data.wheel.br.quaternion.y,
			messages.data.wheel.br.quaternion.z,
			messages.data.wheel.br.quaternion.w
		)
		if (this.wheelBRObj !== null) {
			this.wheelBRObj.position.set(
				messages.data.wheel.br.position.x,
				messages.data.wheel.br.position.y,
				messages.data.wheel.br.position.z
			)
			this.wheelBRObj.quaternion.set(
				messages.data.wheel.br.quaternion.x,
				messages.data.wheel.br.quaternion.y,
				messages.data.wheel.br.quaternion.z,
				messages.data.wheel.br.quaternion.w
			)
		}
	}
}

import { Character } from '../Characters/Character'
import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { WorldBase } from '../World/WorldBase'
import * as _ from 'lodash'
import { KeyBinding } from '../Core/KeyBinding'
import { VehicleSeat } from './VehicleSeat'
import { Wheel } from './Wheel'
import { Utility } from '../Core/Utility'
import { CollisionGroups } from '../Enums/CollisionGroups'
import { SwitchingSeats } from '../Characters/CharacterStates/Vehicles/_VehicleStateLibrary'
import { EntityType } from '../Enums/EntityType'
import { IWorldEntity } from '../Interfaces/IWorldEntity'
import { IControllable } from '../Interfaces/IControllable'
import { INetwork } from '../Interfaces/INetwork'
import { MessageTypes } from '../Enums/MessagesTypes'
import { IInputReceiver } from '../Interfaces/IInputReceiver'

export abstract class Vehicle extends THREE.Object3D implements IWorldEntity, IInputReceiver, IControllable, INetwork {
	public uID: string | null
	public msgType: MessageTypes = MessageTypes.Vehical
	public timeStamp: number
	public ping: number

	public updateOrder: number = 2
	public abstract entityType: EntityType

	public controllingCharacter: Character | null
	public actions: { [action: string]: KeyBinding } = {}
	public rayCastVehicle: CANNON.RaycastVehicle
	public seats: VehicleSeat[] = []
	public wheels: Wheel[] = []
	public drive: string
	public camera: THREE.Object3D | null
	public world: WorldBase | null
	public help: THREE.AxesHelper
	public collision: CANNON.Body
	public materials: THREE.Material[] = []
	public spawnPoint: THREE.Object3D | null
	public modelContainer: THREE.Group
	public lights: THREE.SpotLight[]

	private firstPerson: boolean = false

	constructor(gltf: any, mass: number, handlingSetup?: any) {
		super()

		// inint
		this.uID = null
		this.timeStamp = Date.now()
		this.ping = 0

		this.world = null
		this.spawnPoint = null
		this.drive = "awd"
		this.camera = null
		this.controllingCharacter = null

		this.lights = []

		if (handlingSetup === undefined) handlingSetup = {}
		handlingSetup.chassisConnectionPointLocal = new CANNON.Vec3()
		handlingSetup.axleLocal = new CANNON.Vec3(-1, 0, 0)
		handlingSetup.directionLocal = new CANNON.Vec3(0, -1, 0)

		// Physics mat
		let mat = new CANNON.Material('Mat')
		mat.friction = 0.01

		// Collision body
		this.collision = new CANNON.Body({ mass: mass })
		this.collision.material = mat

		// Read GLTF
		this.readVehicleData(gltf)

		this.modelContainer = new THREE.Group()
		this.add(this.modelContainer)
		this.modelContainer.add(gltf.scene)

		// Raycast vehicle component
		this.rayCastVehicle = new CANNON.RaycastVehicle({
			chassisBody: this.collision,
			indexUpAxis: 1,
			indexRightAxis: 0,
			indexForwardAxis: 2,
		})

		this.wheels.forEach((wheel) => {
			handlingSetup.chassisConnectionPointLocal.set(wheel.position.x, wheel.position.y + 0.2, wheel.position.z)
			const index = this.rayCastVehicle.addWheel(handlingSetup)
			wheel.rayCastWheelInfoIndex = index
		})

		// this.collision.collisionFilterGroup = CollisionGroups.Default
		// this.collision.collisionFilterMask = CollisionGroups.Default | CollisionGroups.Characters | CollisionGroups.TrimeshColliders
		this.help = new THREE.AxesHelper(2)
	}

	public noDirectionPressed(): boolean {
		return true
	}

	public update(timeStep: number): void {
		if (this.world === null) return
		if (this.world.isClient) {
			const world = this.world as WorldBase
			this.lights.forEach((li) => { li.power = (world.sunConf.elevation > 3) ? 1 : 200 })
			return
		}

		this.position.set(
			this.collision.interpolatedPosition.x,
			this.collision.interpolatedPosition.y,
			this.collision.interpolatedPosition.z
		)

		this.quaternion.set(
			this.collision.interpolatedQuaternion.x,
			this.collision.interpolatedQuaternion.y,
			this.collision.interpolatedQuaternion.z,
			this.collision.interpolatedQuaternion.w
		)

		this.seats.forEach((seat: VehicleSeat) => {
			seat.update(timeStep)
		})

		for (let i = 0; i < this.rayCastVehicle.wheelInfos.length; i++) {
			this.rayCastVehicle.updateWheelTransform(i)
			let transform = (this.rayCastVehicle.wheelInfos[i] as CANNON.WheelInfo).worldTransform

			let wheelObject = this.wheels[i].wheelObject
			wheelObject.position.copy(Utility.threeVector(transform.position))
			wheelObject.quaternion.copy(Utility.threeQuat(transform.quaternion))

			// let upAxisWorld = new CANNON.Vec3()
			// this.rayCastVehicle.getVehicleAxisWorld(this.rayCastVehicle.indexUpAxis, upAxisWorld) // getVehicleAxisWorld(axisIndex: number, result: Vec3): void;
		}

		this.updateMatrixWorld()
	}

	public forceCharacterOut(): void {
		if (this.controllingCharacter) {
			this.controllingCharacter.modelContainer.visible = true
			this.controllingCharacter.exitVehicle()
		}
	}

	public onInputChange(): void {
		if ((this.controllingCharacter === null) || (this.controllingCharacter.occupyingSeat === null)) return
		let len = this.controllingCharacter.occupyingSeat.connectedSeats.length
		if (this.actions.seat_switch.justPressed && len > 0) {
			this.controllingCharacter.modelContainer.visible = true
			if (this.controllingCharacter.occupyingSeat !== null) {
				this.controllingCharacter.setState(
					new SwitchingSeats(
						this.controllingCharacter,
						this.controllingCharacter.occupyingSeat,
						this.controllingCharacter.occupyingSeat.connectedSeats[0]
					)
				)
			}
			else
				this.controllingCharacter.stopControllingVehicle()
		}
	}

	public resetControls(): void {
		for (const action in this.actions) {
			if (this.actions.hasOwnProperty(action)) {
				this.triggerAction(action, false)
			}
		}
	}

	public allowSleep(value: boolean): void {
		this.collision.allowSleep = value

		if (value === false) {
			this.collision.wakeUp()
		}
	}

	public handleKeyboardEvent(code: string, isShift: boolean, pressed: boolean): void {
		// Free camera
		if (code === 'KeyC' && pressed === true && isShift === true) {
			this.resetControls()
			if ((this.controllingCharacter !== null) && (this.controllingCharacter.player !== null)) {
				this.controllingCharacter.player.cameraOperator.characterCaller = this.controllingCharacter
				this.controllingCharacter.player.inputManager.setInputReceiver(this.controllingCharacter.player.cameraOperator)
			}
		}
		else if (code === 'KeyR' && pressed === true && isShift === true) {
			if (this.world !== null) this.world.restartScenario()
		}
		else {
			for (const action in this.actions) {
				if (this.actions.hasOwnProperty(action)) {
					const binding = this.actions[action]

					if (_.includes(binding.eventCodes, code)) {
						this.triggerAction(action, pressed)
					}
				}
			}
		}
	}

	public setFirstPersonView(value: boolean): void {
		this.firstPerson = value
		if (this.controllingCharacter !== null) {

			if (this.controllingCharacter.player !== null) {
				if ((this.world !== null) && (this.world.player !== null) && (this.world.player.uID === this.controllingCharacter.player.uID))
					this.controllingCharacter.modelContainer.visible = !value
				this.controllingCharacter.player.cameraOperator.followMode = value
				if (value) {
					this.controllingCharacter.player.cameraOperator.setRadius(0.04, true)
				}
				else {
					this.controllingCharacter.player.cameraOperator.setRadius(3, true)
				}
			}
		}
	}

	public toggleFirstPersonView(): void {
		this.setFirstPersonView(!this.firstPerson)
	}

	public triggerAction(actionName: string, value: boolean): void {
		// Get action and set it's parameters
		let action = this.actions[actionName]

		if (action.isPressed !== value) {
			// Set value
			action.isPressed = value

			// Reset the 'just' attributes
			action.justPressed = false
			action.justReleased = false

			// Set the 'just' attributes
			if (value) action.justPressed = true
			else action.justReleased = true

			this.onInputChange()

			// Reset the 'just' attributes
			action.justPressed = false
			action.justReleased = false
		}
	}

	public handleMouseButton(code: string, pressed: boolean): void {
		return
	}
	public handleMouseMove(deltaX: number, deltaY: number): void {

		if ((this.controllingCharacter !== null) && (this.controllingCharacter.player !== null))
			this.controllingCharacter.player.cameraOperator.move(deltaX, deltaY)
	}

	public handleMouseWheel(value: number): void {
		if (this.world !== null) this.world.scrollTheTimeScale(value)
	}

	public inputReceiverInit(): void {
		this.collision.allowSleep = false
		this.setFirstPersonView(false)
	}

	public inputReceiverUpdate(timeStep: number): void {
		if ((this.controllingCharacter === null) || (this.controllingCharacter.player === null)) return
		if (this.firstPerson && (this.camera !== null)) {
			let temp = new THREE.Vector3().copy(this.camera.position)
			temp.applyQuaternion(this.quaternion)
			this.controllingCharacter.player.cameraOperator.target.copy(temp.add(this.position))
		}
		else {
			// Position camera
			this.controllingCharacter.player.cameraOperator.target.set(
				this.position.x,
				this.position.y + 0.5,
				this.position.z
			)
		}
	}

	public setPosition(x: number, y: number, z: number): void {
		this.collision.position.x = x
		this.collision.position.y = y
		this.collision.position.z = z
	}

	public setSteeringValue(val: number): void {
		this.wheels.forEach((wheel) => {
			if (wheel.steering) this.rayCastVehicle.setSteeringValue(val, wheel.rayCastWheelInfoIndex)
		})
	}

	public applyEngineForce(force: number): void {
		this.wheels.forEach((wheel) => {
			if (this.drive === wheel.drive || this.drive === 'awd') {
				this.rayCastVehicle.applyEngineForce(force, wheel.rayCastWheelInfoIndex)
			}
		})
	}

	public setBrake(brakeForce: number, driveFilter?: string): void {
		this.wheels.forEach((wheel) => {
			if (driveFilter === undefined || driveFilter === wheel.drive) {
				this.rayCastVehicle.setBrake(brakeForce, wheel.rayCastWheelInfoIndex)
			}
		})
	}

	public addToWorld(world: WorldBase): void {
		if (_.includes(world.vehicles, this)) {
			console.warn('Adding vehicle to a world in which it already exists.')
		}
		else if (this.rayCastVehicle === undefined) {
			console.error('Trying to create vehicle without raycastVehicleComponent')
		}
		else {
			this.world = world
			world.vehicles.push(this)
			world.addSceneObject(this)
			this.rayCastVehicle.addToWorld(world.world)

			this.wheels.forEach((wheel) => {
				world.scene.attach(wheel.wheelObject)
			})
		}
	}

	public removeFromWorld(world: WorldBase): void {
		if (!_.includes(world.vehicles, this)) {
			console.warn('Removing vehicle from a world in which it isn\'t present.')
		}
		else {
			this.world = null
			_.pull(world.vehicles, this)
			world.removeSceneObject(this)
			this.rayCastVehicle.removeFromWorld(world.world)

			this.wheels.forEach((wheel) => {
				world.scene.remove(wheel.wheelObject)
			})
		}
	}

	public readVehicleData(gltf: any): void {
		gltf.scene.traverse((child: any) => {
			if (child.isMesh) {
				Utility.setupMeshProperties(child)

				if (child.material !== undefined) {
					this.materials.push(child.material)
				}
			}

			if (child.hasOwnProperty('userData')) {
				if (child.userData.hasOwnProperty('data')) {
					if (child.userData.data === 'seat') {
						this.seats.push(new VehicleSeat(this, child, gltf))
					}
					if (child.userData.data === 'camera') {
						this.camera = child
					}
					if (child.userData.data === 'wheel') {
						this.wheels.push(new Wheel(child))
					}
					if (child.userData.data === 'collision') {
						if (child.userData.shape === 'box') {
							child.visible = false

							let phys = new CANNON.Box(new CANNON.Vec3(child.scale.x, child.scale.y, child.scale.z))
							phys.collisionFilterMask = ~CollisionGroups.TrimeshColliders
							this.collision.addShape(phys, new CANNON.Vec3(child.position.x, child.position.y, child.position.z))
						}
						else if (child.userData.shape === 'sphere') {
							child.visible = false

							let phys = new CANNON.Sphere(child.scale.x)
							phys.collisionFilterGroup = CollisionGroups.TrimeshColliders
							this.collision.addShape(phys, new CANNON.Vec3(child.position.x, child.position.y, child.position.z))
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

		if (this.collision.shapes.length === 0) {
			console.warn('Vehicle ' + typeof (this) + ' has no collision data.')
		}
		if (this.seats.length === 0) {
			console.warn('Vehicle ' + typeof (this) + ' has no seats.')
		}
		else {
			this.connectSeats()
		}
	}

	private connectSeats(): void {
		for (const firstSeat of this.seats) {
			if (firstSeat.connectedSeatsString !== null) {
				// Get list of connected seat names
				let conn_seat_names = firstSeat.connectedSeatsString.split(';')
				for (const conn_seat_name of conn_seat_names) {
					// If name not empty
					if (conn_seat_name.length > 0) {
						// Run through seat list and connect seats to this seat,
						// based on this seat's connected seats list
						for (const secondSeat of this.seats) {
							if (secondSeat.seatPointObject.name === conn_seat_name) {
								firstSeat.connectedSeats.push(secondSeat)
							}
						}
					}
				}
			}
		}
	}

	public Out(): { [id: string]: any } {
		return {
			uID: this.uID,
			msgType: this.msgType,
			timeStamp: this.timeStamp,
			ping: this.ping,

			data: {
				vehiclePosition: {
					x: this.position.x /* this.collision.interpolatedPosition.x */,
					y: this.position.y /* this.collision.interpolatedPosition.y */,
					z: this.position.z /* this.collision.interpolatedPosition.z */,
				},
				vehicleQuaternion: {
					x: this.quaternion.x /* this.collision.interpolatedQuaternion.x */,
					y: this.quaternion.y /* this.collision.interpolatedQuaternion.y */,
					z: this.quaternion.z /* this.collision.interpolatedQuaternion.z */,
					w: this.quaternion.w /* this.collision.interpolatedQuaternion.w */,
				},
			}
		}
	}
}
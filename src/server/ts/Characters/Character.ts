import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import * as _ from 'lodash'
import * as Utils from '../Core/FunctionLibrary'

import { KeyBinding } from '../Core/KeyBinding'
import { VectorSpringSimulator } from '../Physics/SpringSimulation/VectorSpringSimulator'
import { RelativeSpringSimulator } from '../Physics/SpringSimulation/RelativeSpringSimulator'
import { Idle } from './CharacterStates/_CharacterStateLibrary'
import * as VehicalState from './CharacterStates/Vehicles/_VehicleStateLibrary'
import { WorldBase } from '../World/WorldBase'
import { IControllable } from '../Interfaces/IControllable'
import { IWorldEntity } from '../Interfaces/IWorldEntity'
import { Vehicle } from '../Vehicles/Vehicle'
import { VehicleSeat } from '../Vehicles/VehicleSeat'
import { CollisionGroups } from '../Enums/CollisionGroups'
import { CapsuleCollider } from '../Physics/Colliders/CapsuleCollider'
import { VehicleEntryInstance } from './VehicleEntryInstance'
import { SeatType } from '../Enums/SeatType'
import { GroundImpactData } from './GroundImpactData'
import { ClosestObjectFinder } from '../Core/ClosestObjectFinder'
import { EntityType } from '../Enums/EntityType'
import { INetwork } from '../Interfaces/INetwork'
import { MessageTypes } from '../Enums/MessagesTypes'
import { IInputReceiver } from '../Interfaces/IInputReceiver'
import { ICharacterState } from '../Interfaces/ICharacterState'
import { ICharacterAI } from '../Interfaces/ICharacterAI'
import { Player } from '../Core/Player'

export class Character extends THREE.Object3D implements IWorldEntity, INetwork, IInputReceiver {
	public uID: string | null
	public msgType: MessageTypes = MessageTypes.Character
	public timeStamp: number
	public ping: number

	public updateOrder: number = 1
	public entityType: EntityType = EntityType.Character

	public height: number = 0
	public tiltContainer: THREE.Group
	public modelContainer: THREE.Group
	public materials: THREE.Material[] = []
	public mixer: THREE.AnimationMixer | null
	public animations: any[] = []
	public allAnim: { [id: string]: number } = {}
	public spawnPoint: THREE.Object3D | null

	// Movement
	public acceleration: THREE.Vector3 = new THREE.Vector3()
	public velocity: THREE.Vector3 = new THREE.Vector3()
	public arcadeVelocityInfluence: THREE.Vector3 = new THREE.Vector3()
	public velocityTarget: THREE.Vector3 = new THREE.Vector3()
	public arcadeVelocityIsAdditive: boolean = false

	public defaultVelocitySimulatorDamping: number = 0.8
	public defaultVelocitySimulatorMass: number = 50
	public velocitySimulator: VectorSpringSimulator
	public moveSpeed: number = 4
	public angularVelocity: number = 0
	public orientation: THREE.Vector3 = new THREE.Vector3(0, 0, 1)
	public orientationTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 1)
	public defaultRotationSimulatorDamping: number = 0.5
	public defaultRotationSimulatorMass: number = 10
	public rotationSimulator: RelativeSpringSimulator
	public viewVector: THREE.Vector3
	public actions: { [action: string]: KeyBinding }
	public characterCapsule: CapsuleCollider
	public firstPerson: boolean = false

	// Ray casting
	public rayResult: CANNON.RaycastResult = new CANNON.RaycastResult()
	public rayHasHit: boolean = false
	public rayCastLength: number = 0.57
	public raySafeOffset: number = 0.03
	public wantsToJump: boolean = false
	public initJumpSpeed: number = -1
	public groundImpactData: GroundImpactData = new GroundImpactData()
	public raycastBox: THREE.Mesh

	public player: Player | null
	public world: WorldBase | null
	public charState: ICharacterState
	public behaviour: ICharacterAI | null

	// Vehicles
	public controlledObject: Vehicle | null
	public occupyingSeat: VehicleSeat | null
	public vehicleEntryInstance: VehicleEntryInstance | null

	public physicsEnabled: boolean = true

	constructor(/* gltf: any */) {
		super()
		// bind functions
		this.setModel = this.setModel.bind(this)
		this.setAnimations = this.setAnimations.bind(this)
		this.setArcadeVelocityInfluence = this.setArcadeVelocityInfluence.bind(this)
		this.setViewVector = this.setViewVector.bind(this)
		this.setState = this.setState.bind(this)
		this.setPosition = this.setPosition.bind(this)
		this.resetVelocity = this.resetVelocity.bind(this)
		this.setArcadeVelocityTarget = this.setArcadeVelocityTarget.bind(this)
		this.setOrientation = this.setOrientation.bind(this)
		this.resetOrientation = this.resetOrientation.bind(this)
		this.setFirstPersonView = this.setFirstPersonView.bind(this)
		this.setBehaviour = this.setBehaviour.bind(this)
		this.setPhysicsEnabled = this.setPhysicsEnabled.bind(this)
		this.readCharacterData = this.readCharacterData.bind(this)
		this.handleKeyboardEvent = this.handleKeyboardEvent.bind(this)
		this.handleMouseButton = this.handleMouseButton.bind(this)
		this.handleMouseMove = this.handleMouseMove.bind(this)
		this.handleMouseWheel = this.handleMouseWheel.bind(this)
		this.triggerAction = this.triggerAction.bind(this)
		this.takeControl = this.takeControl.bind(this)
		this.resetControls = this.resetControls.bind(this)
		this.update = this.update.bind(this)
		this.inputReceiverInit = this.inputReceiverInit.bind(this)
		this.displayControls = this.displayControls.bind(this)
		this.inputReceiverUpdate = this.inputReceiverUpdate.bind(this)
		this.setAnimation = this.setAnimation.bind(this)
		this.springMovement = this.springMovement.bind(this)
		this.springRotation = this.springRotation.bind(this)
		this.getLocalMovementDirection = this.getLocalMovementDirection.bind(this)
		this.getCameraRelativeMovementVector = this.getCameraRelativeMovementVector.bind(this)
		this.setCameraRelativeOrientationTarget = this.setCameraRelativeOrientationTarget.bind(this)
		this.rotateModel = this.rotateModel.bind(this)
		this.jump = this.jump.bind(this)
		this.findVehicleToEnter = this.findVehicleToEnter.bind(this)
		this.enterVehicle = this.enterVehicle.bind(this)
		this.teleportToVehicle = this.teleportToVehicle.bind(this)
		this.startControllingVehicle = this.startControllingVehicle.bind(this)
		this.transferControls = this.transferControls.bind(this)
		this.stopControllingVehicle = this.stopControllingVehicle.bind(this)
		this.exitVehicle = this.exitVehicle.bind(this)
		this.occupySeat = this.occupySeat.bind(this)
		this.leaveSeat = this.leaveSeat.bind(this)
		this.physicsPreStep = this.physicsPreStep.bind(this)
		this.feetRaycast = this.feetRaycast.bind(this)
		this.physicsPostStep = this.physicsPostStep.bind(this)
		this.addToWorld = this.addToWorld.bind(this)
		this.removeFromWorld = this.removeFromWorld.bind(this)
		this.Out = this.Out.bind(this)

		// init
		this.uID = null
		this.timeStamp = Date.now()
		this.ping = 0

		this.player = null
		this.world = null
		this.spawnPoint = null
		this.behaviour = null
		this.controlledObject = null
		this.occupyingSeat = null
		this.vehicleEntryInstance = null

		// The visuals group is centered for easy character tilting
		this.tiltContainer = new THREE.Group()
		this.add(this.tiltContainer)

		// Model container is used to reliably ground the character, as animation can alter the position of the model itself
		this.modelContainer = new THREE.Group()
		this.modelContainer.position.y = -0.57
		this.tiltContainer.add(this.modelContainer)

		{
			// this.readCharacterData(gltf)
			// this.setAnimations(gltf.animations)
			// this.modelContainer.add(gltf.scene)
			// this.mixer = new THREE.AnimationMixer(gltf.scene)
		}
		this.mixer = null

		this.velocitySimulator = new VectorSpringSimulator(60, this.defaultVelocitySimulatorMass, this.defaultVelocitySimulatorDamping)
		this.rotationSimulator = new RelativeSpringSimulator(60, this.defaultRotationSimulatorMass, this.defaultRotationSimulatorDamping)

		this.viewVector = new THREE.Vector3()

		// Actions
		this.actions = {
			'up': new KeyBinding('KeyW'),
			'down': new KeyBinding('KeyS'),
			'left': new KeyBinding('KeyA'),
			'right': new KeyBinding('KeyD'),
			'run': new KeyBinding('ShiftLeft'),
			'jump': new KeyBinding('Space'),
			'use': new KeyBinding('KeyE'),
			'enter': new KeyBinding('KeyF'),
			'enter_passenger': new KeyBinding('KeyG'),
			'seat_switch': new KeyBinding('KeyX'),
			'primary': new KeyBinding('Mouse0'),
			'secondary': new KeyBinding('Mouse1'),
		}

		// Physics
		// Player Capsule
		this.characterCapsule = new CapsuleCollider({
			mass: 1,
			position: new CANNON.Vec3(),
			height: 0.5,
			radius: 0.25,
			segments: 8,
			friction: 0.0
		})
		this.characterCapsule.body.shapes.forEach((shape) => {
			// tslint:disable-next-line: no-bitwise
			shape.collisionFilterMask = ~CollisionGroups.TrimeshColliders
		})
		this.characterCapsule.body.allowSleep = false

		// Move character to different collision group for raycasting
		this.characterCapsule.body.collisionFilterGroup = CollisionGroups.Characters
		// this.characterCapsule.body.collisionFilterMask = CollisionGroups.Default | CollisionGroups.Characters | CollisionGroups.TrimeshColliders

		// Disable character rotation
		this.characterCapsule.body.fixedRotation = true
		this.characterCapsule.body.updateMassProperties()

		// Ray cast debug
		const boxGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1)
		const boxMat = new THREE.MeshLambertMaterial({
			color: 0xff0000
		})
		this.raycastBox = new THREE.Mesh(boxGeo, boxMat)
		this.raycastBox.visible = false

		// Physics pre/post step callback bindings
		// this.characterCapsule.body.preStep = () => { this.physicsPreStep(this.characterCapsule.body, this) }
		// this.characterCapsule.body.postStep = () => { this.physicsPostStep(this.characterCapsule.body, this) }

		// States
		{
			// this.setState(new Idle(this))
			this.charState = new Idle(this)
			this.charState.onInputChange()
		}
	}

	public setModel(gltf: any) {
		this.readCharacterData(gltf)
		this.setAnimations(gltf.animations)
		this.modelContainer.add(gltf.scene)
		this.mixer = new THREE.AnimationMixer(gltf.scene)
	}

	public setAnimations(animations: []): void {
		this.animations = animations
	}

	public setArcadeVelocityInfluence(x: number, y: number = x, z: number = x): void {
		this.arcadeVelocityInfluence.set(x, y, z)
	}

	public setViewVector(vector: THREE.Vector3): void {
		this.viewVector.copy(vector).normalize()
	}

	public setState(state: ICharacterState, checks: boolean = true): void {
		if (checks) if ((this.world !== null) && this.world.isClient) return
		this.charState = state
		this.charState.onInputChange()
	}

	public setPosition(x: number, y: number, z: number): void {
		if (this.physicsEnabled) {
			this.characterCapsule.body.previousPosition = new CANNON.Vec3(x, y, z)
			this.characterCapsule.body.position = new CANNON.Vec3(x, y, z)
			this.characterCapsule.body.interpolatedPosition = new CANNON.Vec3(x, y, z)
		}
		else {
			this.position.x = x
			this.position.y = y
			this.position.z = z
		}
	}

	public resetVelocity(): void {
		this.velocity.x = 0
		this.velocity.y = 0
		this.velocity.z = 0

		this.characterCapsule.body.velocity.x = 0
		this.characterCapsule.body.velocity.y = 0
		this.characterCapsule.body.velocity.z = 0

		this.velocitySimulator.init()
	}

	public setArcadeVelocityTarget(velZ: number, velX: number = 0, velY: number = 0): void {
		this.velocityTarget.z = velZ
		this.velocityTarget.x = velX
		this.velocityTarget.y = velY
	}

	public setOrientation(vector: THREE.Vector3, instantly: boolean = false): void {
		let lookVector = new THREE.Vector3().copy(vector).setY(0).normalize()
		this.orientationTarget.copy(lookVector)

		if (instantly) {
			this.orientation.copy(lookVector)
		}
	}

	public resetOrientation(): void {
		const forward = Utils.getForward(this)
		this.setOrientation(forward, true)
	}

	public setFirstPersonView(value: boolean): void {
		this.firstPerson = value

		if (this.player !== null) {
			if (value) {
				this.player.cameraOperator.setRadius(0.1, true)
			}
			else {
				this.player.cameraOperator.setRadius(1.6, true)
			}
		}
	}

	public setBehaviour(behaviour: ICharacterAI): void {
		this.behaviour = behaviour
	}

	public setPhysicsEnabled(value: boolean): void {
		if (this.world === null) return
		this.physicsEnabled = value
		if (value === true) {
			this.world.addWorldObject(this.characterCapsule.body)
		}
		else {
			this.world.removeWorldObject(this.characterCapsule.body)
		}
	}

	public readCharacterData(gltf: any): void {
		gltf.scene.traverse((child: any) => {
			if (child.isMesh) {
				Utils.setupMeshProperties(child)
				if (child.material !== undefined) {
					this.materials.push(child.material)
				}
			}
		})
	}

	public handleKeyboardEvent(code: string, isShift: boolean, pressed: boolean): void {
		if (this.controlledObject !== null) {
			this.controlledObject.handleKeyboardEvent(code, isShift, pressed)
		}
		else {
			// Free camera
			if (code === 'KeyC' && pressed === true && isShift === true) {
				this.resetControls()
				if (this.player !== null) {
					this.player.cameraOperator.characterCaller = this
					this.player.inputManager.setInputReceiver(this.player.cameraOperator)
				}
			}
			else if (code === 'KeyR' && pressed === true && isShift === true) {
				if (this.world !== null) this.world.restartScenario()
			}
			else if (code === 'KeyV' && pressed === true) {
				this.setFirstPersonView(!this.firstPerson)
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
	}

	public handleMouseButton(code: string, pressed: boolean): void {
		if (this.controlledObject !== null) {
			this.controlledObject.handleMouseButton(code, pressed)
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

	public handleMouseMove(deltaX: number, deltaY: number): void {
		if (this.controlledObject !== null) {
			this.controlledObject.handleMouseMove(deltaX, deltaY)
		}
		else {
			if (this.player !== null) this.player.cameraOperator.move(deltaX, deltaY)
		}
	}

	public handleMouseWheel(value: number): void {
		if (this.controlledObject !== null) {
			this.controlledObject.handleMouseWheel(value)
		}
		else {
			if (this.world !== null) this.world.scrollTheTimeScale(value)
		}
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

			// Tell player to handle states according to new input
			this.charState.onInputChange()

			// Reset the 'just' attributes
			action.justPressed = false
			action.justReleased = false
		}
	}

	public takeControl(): void {
		if (this.player !== null) {
			this.player.inputManager.setInputReceiver(this)
		}
		else {
			console.warn('Attempting to take control of a character that doesn\'t belong to a world.')
		}
	}

	public resetControls(): void {
		for (const action in this.actions) {
			if (this.actions.hasOwnProperty(action)) {
				this.triggerAction(action, false)
			}
		}
	}

	public update(timeStep: number): void {
		if (this.behaviour !== null) this.behaviour.update(timeStep)
		if (this.vehicleEntryInstance !== null) this.vehicleEntryInstance.update(timeStep)
		this.charState.update(timeStep)

		if (this.physicsEnabled) this.springMovement(timeStep)
		if (this.physicsEnabled) this.springRotation(timeStep)
		if (this.physicsEnabled) this.rotateModel()
		if (this.mixer !== null) this.mixer.update(timeStep)

		// Sync physics/graphics
		if (this.physicsEnabled) {
			this.position.set(
				this.characterCapsule.body.interpolatedPosition.x,
				this.characterCapsule.body.interpolatedPosition.y,
				this.characterCapsule.body.interpolatedPosition.z
			)
		} else {
			let newPos = new THREE.Vector3()
			this.getWorldPosition(newPos)
			this.characterCapsule.body.position.copy(Utils.cannonVector(newPos))
			this.characterCapsule.body.interpolatedPosition.copy(Utils.cannonVector(newPos))
		}

		this.updateMatrixWorld()
	}

	public inputReceiverInit(): void {
		if (this.controlledObject !== null) {
			this.controlledObject.inputReceiverInit()
			return
		}
		if (this.player !== null) {
			this.setFirstPersonView(false)
			// this.player.cameraOperator.setRadius(1.6, true)
			this.player.cameraOperator.followMode = false
		}
		if (this.world !== null) {
			this.world.dirLight.target = this
		}

		this.displayControls()
	}

	public displayControls(): void {
		if (this.world === null) return
		if (this.world.updateControlsCallBack === null) return
		this.world.updateControlsCallBack([
			{
				keys: ['W', 'A', 'S', 'D'],
				desc: 'Movement'
			},
			{
				keys: ['Shift'],
				desc: 'Sprint'
			},
			{
				keys: ['Space'],
				desc: 'Jump'
			},
			{
				keys: ['F', 'or', 'G'],
				desc: 'Enter vehicle'
			},
			{
				keys: ['Shift', '+', 'R'],
				desc: 'Respawn'
			},
			{
				keys: ['Shift', '+', 'C'],
				desc: 'Free camera'
			},
		])
	}

	public inputReceiverUpdate(timeStep: number): void {
		if (this.controlledObject !== null) {
			this.controlledObject.inputReceiverUpdate(timeStep)
		}
		else {
			// Look in camera's direction
			if (this.player !== null) {
				this.viewVector = new THREE.Vector3().subVectors(this.position, this.player.cameraOperator.camera.position)
				if (this.firstPerson) {
					let offset = new THREE.Vector3()
					this.getWorldPosition(offset)
					offset.y += 0.6
					this.player.cameraOperator.target = offset
				} else
					this.getWorldPosition(this.player.cameraOperator.target)
			}
		}
	}

	public setAnimation(clipName: string, fadeIn: number): number {
		let clip = THREE.AnimationClip.findByName(this.animations, clipName)
		
		if (this.mixer !== null) {
			let action = this.mixer.clipAction(clip)
			if (action === null) {
				console.error(`Animation ${clipName} not found!`)
				return 0
			}

			this.mixer.stopAllAction()
			action.fadeIn(fadeIn)
			action.play()

			return action.getClip().duration
		}
		let duration: number = 1.0
		if (this.allAnim[clipName] !== undefined)
			duration = this.allAnim[clipName]
		return duration
	}

	public springMovement(timeStep: number): void {
		// Simulator
		this.velocitySimulator.target.copy(this.velocityTarget)
		this.velocitySimulator.simulate(timeStep)

		// Update values
		this.velocity.copy(this.velocitySimulator.position)
		this.acceleration.copy(this.velocitySimulator.velocity)
	}

	public springRotation(timeStep: number): void {
		// Spring rotation
		// Figure out angle between current and target orientation
		let angle = Utils.getSignedAngleBetweenVectors(this.orientation, this.orientationTarget)

		// Simulator
		this.rotationSimulator.target = angle
		this.rotationSimulator.simulate(timeStep)
		let rot = this.rotationSimulator.position

		// Updating values
		this.orientation.applyAxisAngle(new THREE.Vector3(0, 1, 0), rot)
		this.angularVelocity = this.rotationSimulator.velocity
	}

	public getLocalMovementDirection(): THREE.Vector3 {
		const positiveX = this.actions.right.isPressed ? -1 : 0
		const negativeX = this.actions.left.isPressed ? 1 : 0
		const positiveZ = this.actions.up.isPressed ? 1 : 0
		const negativeZ = this.actions.down.isPressed ? -1 : 0

		return new THREE.Vector3(positiveX + negativeX, 0, positiveZ + negativeZ).normalize()
	}

	public getCameraRelativeMovementVector(): THREE.Vector3 {
		const localDirection = this.getLocalMovementDirection()
		const flatViewVector = new THREE.Vector3(this.viewVector.x, 0, this.viewVector.z).normalize()

		return Utils.appplyVectorMatrixXZ(flatViewVector, localDirection)
	}

	public setCameraRelativeOrientationTarget(): void {
		if (this.vehicleEntryInstance === null) {
			let moveVector = this.getCameraRelativeMovementVector()

			if (moveVector.x === 0 && moveVector.y === 0 && moveVector.z === 0) {
				this.setOrientation(this.orientation)
			}
			else {
				this.setOrientation(moveVector)
			}
		}
	}

	public rotateModel(): void {
		this.lookAt(this.position.x + this.orientation.x, this.position.y + this.orientation.y, this.position.z + this.orientation.z)
		this.tiltContainer.rotation.z = (-this.angularVelocity * 2.3 * this.velocity.length())
		this.tiltContainer.position.setY((Math.cos(Math.abs(this.angularVelocity * 2.3 * this.velocity.length())) / 2) - 0.5)
	}

	public jump(initJumpSpeed: number = -1): void {
		this.wantsToJump = true
		this.initJumpSpeed = initJumpSpeed
	}

	public findVehicleToEnter(wantsToDrive: boolean): void {
		// reusable world position variable
		let worldPos = new THREE.Vector3()

		// Find best vehicle
		let vehicleFinder = new ClosestObjectFinder<Vehicle>(this.position, 10)
		if (this.world !== null) {
			this.world.vehicles.forEach((vehicle) => {
				vehicleFinder.consider(vehicle, vehicle.position)
			})
		}

		if (vehicleFinder.closestObject !== null) {
			let vehicle = vehicleFinder.closestObject
			let vehicleEntryInstance = new VehicleEntryInstance(this)
			vehicleEntryInstance.wantsToDrive = wantsToDrive

			// Find best seat
			let seatFinder = new ClosestObjectFinder<VehicleSeat>(this.position)
			for (const seat of vehicle.seats) {
				if (wantsToDrive) {
					// Consider driver seats
					if (seat.type === SeatType.Driver) {
						seat.seatPointObject.getWorldPosition(worldPos)
						seatFinder.consider(seat, worldPos)
					}
					// Consider passenger seats connected to driver seats
					else if (seat.type === SeatType.Passenger) {
						for (const connSeat of seat.connectedSeats) {
							if (connSeat.type === SeatType.Driver) {
								seat.seatPointObject.getWorldPosition(worldPos)
								seatFinder.consider(seat, worldPos)
								break
							}
						}
					}
				}
				else {
					// Consider passenger seats
					if (seat.type === SeatType.Passenger) {
						seat.seatPointObject.getWorldPosition(worldPos)
						seatFinder.consider(seat, worldPos)
					}
				}
			}

			if (seatFinder.closestObject !== null) {
				let targetSeat = seatFinder.closestObject
				if (targetSeat.occupiedBy === null)
					vehicleEntryInstance.targetSeat = targetSeat

				let entryPointFinder = new ClosestObjectFinder<THREE.Object3D>(this.position)
				if (targetSeat !== null) {
					for (const point of targetSeat.entryPoints) {
						point.getWorldPosition(worldPos)
						entryPointFinder.consider(point, worldPos)
					}
				}

				if (entryPointFinder.closestObject !== null) {
					vehicleEntryInstance.entryPoint = entryPointFinder.closestObject
					this.triggerAction('up', true)
					this.vehicleEntryInstance = vehicleEntryInstance
				}
			}
		}
	}

	public enterVehicle(seat: VehicleSeat, entryPoint: THREE.Object3D): void {
		this.resetControls()
		if ((seat.door !== null) && (seat.door.rotation < 0.5)) {
			this.setState(new VehicalState.OpenVehicleDoor(this, seat, entryPoint))
		}
		else {
			this.setState(new VehicalState.EnteringVehicle(this, seat, entryPoint))
		}
	}

	public teleportToVehicle(vehicle: Vehicle, seat: VehicleSeat): void {
		this.resetVelocity()
		this.rotateModel()
		this.setPhysicsEnabled(false)
		vehicle.attach(this)

		this.setPosition(seat.seatPointObject.position.x, seat.seatPointObject.position.y + 0.6, seat.seatPointObject.position.z)
		this.quaternion.copy(seat.seatPointObject.quaternion)

		this.occupySeat(seat)
		this.setState(new VehicalState.Driving(this, seat));
		let tiems = 300
		let myInterval = setInterval(() => {
			(this.charState as VehicalState.Driving).playAnimation('driving', 0.1)
			if (tiems-- <= 0)
				clearInterval(myInterval)
		}, 15);
	}

	public startControllingVehicle(vehicle: Vehicle, seat: VehicleSeat): void {
		if (this.controlledObject !== vehicle) {
			this.transferControls(vehicle)
			this.resetControls()

			this.controlledObject = vehicle
			vehicle.controllingCharacter = this
			this.controlledObject.allowSleep(false)
			vehicle.inputReceiverInit()

		}
	}

	public transferControls(entity: IControllable): void {
		// Currently running through all actions of this character and the vehicle,
		// comparing keycodes of actions and based on that triggering vehicle's actions
		// Maybe we should ask input manager what's the current state of the keyboard
		// and read those values... TODO
		for (const action1 in this.actions) {
			if (this.actions.hasOwnProperty(action1)) {
				for (const action2 in entity.actions) {
					if (entity.actions.hasOwnProperty(action2)) {

						let a1 = this.actions[action1]
						let a2 = entity.actions[action2]

						a1.eventCodes.forEach((code1) => {
							a2.eventCodes.forEach((code2) => {
								if (code1 === code2) {
									entity.triggerAction(action2, a1.isPressed)
								}
							})
						})
					}
				}
			}
		}
	}

	public stopControllingVehicle(): void {
		if ((this.controlledObject !== null) && (this.controlledObject?.controllingCharacter === this)) {
			this.controlledObject.allowSleep(true)
			this.controlledObject.controllingCharacter = null
			this.controlledObject.resetControls()
			this.controlledObject = null
			this.inputReceiverInit()
		}
	}

	public exitVehicle(): void {
		if (this.occupyingSeat !== null) {
			if (this.occupyingSeat.vehicle.entityType === EntityType.Airplane) {
				this.setState(new VehicalState.ExitingAirplane(this, this.occupyingSeat))
			}
			else {
				this.setState(new VehicalState.ExitingVehicle(this, this.occupyingSeat))
			}
			this.stopControllingVehicle()
		}
	}

	public occupySeat(seat: VehicleSeat): void {
		this.occupyingSeat = seat
		seat.occupiedBy = this
	}

	public leaveSeat(): void {
		if (this.occupyingSeat !== null) {
			this.occupyingSeat.occupiedBy = null
			this.occupyingSeat = null
		}
	}

	public physicsPreStep(body: CANNON.Body, character: Character): void {
		character.feetRaycast()

		// Raycast debug
		if (character.rayHasHit) {
			if (character.raycastBox.visible) {
				character.raycastBox.position.x = character.rayResult.hitPointWorld.x
				character.raycastBox.position.y = character.rayResult.hitPointWorld.y
				character.raycastBox.position.z = character.rayResult.hitPointWorld.z
			}
		}
		else {
			if (character.raycastBox.visible) {
				character.raycastBox.position.set(body.position.x, body.position.y - character.rayCastLength - character.raySafeOffset, body.position.z)
			}
		}
	}

	public feetRaycast(): void {
		this.rayHasHit = false
		if (this.world === null || !this.physicsEnabled) return
		// Player ray casting
		// Create ray
		let body = this.characterCapsule.body
		const start = new CANNON.Vec3(body.position.x, body.position.y, body.position.z)
		const end = new CANNON.Vec3(body.position.x, body.position.y - this.rayCastLength - this.raySafeOffset, body.position.z)
		// Raycast options
		const rayCastOptions = {
			collisionFilterMask: CollisionGroups.Default,
			skipBackfaces: true      // ignore back faces
		}
		// Cast the ray
		this.rayHasHit = (this.world.world as CANNON.World).raycastClosest(start, end, rayCastOptions, this.rayResult)
	}

	public physicsPostStep(body: CANNON.Body, character: Character): void {
		// Get velocities
		let simulatedVelocity = new THREE.Vector3(body.velocity.x, body.velocity.y, body.velocity.z)

		// Take local velocity
		let arcadeVelocity = new THREE.Vector3().copy(character.velocity).multiplyScalar(character.moveSpeed)
		// Turn local into global
		arcadeVelocity = Utils.appplyVectorMatrixXZ(character.orientation, arcadeVelocity)

		let newVelocity = new THREE.Vector3()

		// Additive velocity mode
		if (character.arcadeVelocityIsAdditive) {
			newVelocity.copy(simulatedVelocity)

			let globalVelocityTarget = Utils.appplyVectorMatrixXZ(character.orientation, character.velocityTarget)
			let add = new THREE.Vector3().copy(arcadeVelocity).multiply(character.arcadeVelocityInfluence)

			if (Math.abs(simulatedVelocity.x) < Math.abs(globalVelocityTarget.x * character.moveSpeed) || Utils.haveDifferentSigns(simulatedVelocity.x, arcadeVelocity.x)) { newVelocity.x += add.x }
			if (Math.abs(simulatedVelocity.y) < Math.abs(globalVelocityTarget.y * character.moveSpeed) || Utils.haveDifferentSigns(simulatedVelocity.y, arcadeVelocity.y)) { newVelocity.y += add.y }
			if (Math.abs(simulatedVelocity.z) < Math.abs(globalVelocityTarget.z * character.moveSpeed) || Utils.haveDifferentSigns(simulatedVelocity.z, arcadeVelocity.z)) { newVelocity.z += add.z }
		}
		else {
			newVelocity = new THREE.Vector3(
				THREE.MathUtils.lerp(simulatedVelocity.x, arcadeVelocity.x, character.arcadeVelocityInfluence.x),
				THREE.MathUtils.lerp(simulatedVelocity.y, arcadeVelocity.y, character.arcadeVelocityInfluence.y),
				THREE.MathUtils.lerp(simulatedVelocity.z, arcadeVelocity.z, character.arcadeVelocityInfluence.z),
			)
		}

		// If we're hitting the ground, stick to ground
		if (character.rayHasHit) {
			// Flatten velocity
			newVelocity.y = 0

			// Move on top of moving objects
			if ((character.rayResult.body) && (character.rayResult.body.mass > 0)) {
				let pointVelocity = new CANNON.Vec3()
				character.rayResult.body.getVelocityAtWorldPoint(character.rayResult.hitPointWorld, pointVelocity)
				newVelocity.add(Utils.threeVector(pointVelocity))
			}

			// Measure the normal vector offset from direct "up" vector
			// and transform it into a matrix
			let up = new THREE.Vector3(0, 1, 0)
			let normal = new THREE.Vector3(character.rayResult.hitNormalWorld.x, character.rayResult.hitNormalWorld.y, character.rayResult.hitNormalWorld.z)
			let q = new THREE.Quaternion().setFromUnitVectors(up, normal)
			let m = new THREE.Matrix4().makeRotationFromQuaternion(q)

			// Rotate the velocity vector
			newVelocity.applyMatrix4(m)

			// Apply velocity
			body.velocity.x = newVelocity.x
			body.velocity.y = newVelocity.y
			body.velocity.z = newVelocity.z
			// Ground character
			if (character.world !== null) body.position.y = character.rayResult.hitPointWorld.y + character.rayCastLength + (newVelocity.y / character.world.physicsFrameRate)
		}
		else {
			// If we're in air
			body.velocity.x = newVelocity.x
			body.velocity.y = newVelocity.y
			body.velocity.z = newVelocity.z

			// Save last in-air information
			character.groundImpactData.velocity.x = body.velocity.x
			character.groundImpactData.velocity.y = body.velocity.y
			character.groundImpactData.velocity.z = body.velocity.z
		}

		// Jumping
		if (character.wantsToJump) {
			// If initJumpSpeed is set
			if (character.initJumpSpeed > -1) {
				// Flatten velocity
				body.velocity.y = 0
				let speed = Math.max(character.velocitySimulator.position.length() * 4, character.initJumpSpeed)
				body.velocity = Utils.cannonVector(character.orientation.clone().multiplyScalar(speed))
			}
			else if (character.rayResult.body !== null) {
				// Moving objects compensation
				let add = new CANNON.Vec3()
				character.rayResult.body.getVelocityAtWorldPoint(character.rayResult.hitPointWorld, add)
				body.velocity.vsub(add, body.velocity)
			}

			// Add positive vertical velocity 
			body.velocity.y += 4
			// Move above ground by 2x safe offset value
			body.position.y += character.raySafeOffset * 2
			// Reset flag
			character.wantsToJump = false
		}
	}

	public addToWorld(world: WorldBase): void {
		if (_.includes(world.characters, this)) {
			console.warn('Adding character to a world in which it already exists.')
		}
		else {
			// Set world
			this.world = world

			// Add Event Listeners
			world.world.addEventListener('preStep', () => { this.physicsPreStep(this.characterCapsule.body, this) })
			world.world.addEventListener('postStep', () => { this.physicsPostStep(this.characterCapsule.body, this) })

			// Register character
			world.characters.push(this)

			// Register physics
			world.addWorldObject(this.characterCapsule.body)

			// Add to graphicsWorld
			world.addSceneObject(this)
			world.addSceneObject(this.raycastBox)
		}
	}

	public removeFromWorld(world: WorldBase): void {
		if (!_.includes(world.characters, this)) {
			console.warn('Removing character from a world in which it isn\'t present.')
		}
		else {
			if (this.player !== null) {
				if (this.player.inputManager.inputReceiver === this) {
					this.player.inputManager.inputReceiver = null
				}
			}

			this.world = null

			// Remove from characters
			_.pull(world.characters, this)

			// Remove physics
			world.removeWorldObject(this.characterCapsule.body)

			// Remove visuals
			world.removeSceneObject(this)
			world.removeSceneObject(this.raycastBox)

			// Remove Event Listeners
			world.world.removeEventListener('preStep', () => { this.physicsPreStep(this.characterCapsule.body, this) })
			world.world.removeEventListener('postStep', () => { this.physicsPostStep(this.characterCapsule.body, this) })
		}
	}

	public Out() {
		let newPos = new THREE.Vector3()
		this.getWorldPosition(newPos)

		let csc = this.charState.state
		let vehicalState: { [id: string]: any } = {}
		if (false) this
		else if ("CloseVehicleDoorInside" === csc) {
			let ovd = (this.charState as VehicalState.CloseVehicleDoorInside)
			vehicalState['vehical'] = ovd.seat.vehicle.uID
			vehicalState['seat'] = ovd.seat.seatPointObject.userData
		} else if ("CloseVehicleDoorOutside" === csc) {
			let ovd = (this.charState as VehicalState.CloseVehicleDoorOutside)
			vehicalState['vehical'] = ovd.seat.vehicle.uID
			vehicalState['seat'] = ovd.seat.seatPointObject.userData
		} else if ("Driving" === csc) {
			let ovd = (this.charState as VehicalState.Driving)
			vehicalState['vehical'] = ovd.seat.vehicle.uID
			vehicalState['seat'] = ovd.seat.seatPointObject.userData
		} else if ("EnteringVehicle" === csc) {
			let ovd = (this.charState as VehicalState.EnteringVehicle)
			vehicalState['vehical'] = ovd.seat.vehicle.uID
			vehicalState['seat'] = ovd.seat.seatPointObject.userData
			vehicalState['entryPoint'] = ovd.entryPoint.userData
		} else if ("ExitingAirplane" === csc) {
			let ovd = (this.charState as VehicalState.ExitingAirplane)
			vehicalState['vehical'] = ovd.seat.vehicle.uID
			vehicalState['seat'] = ovd.seat.seatPointObject.userData
		} else if ("ExitingVehicle" === csc) {
			let ovd = (this.charState as VehicalState.ExitingVehicle)
			vehicalState['vehical'] = ovd.seat.vehicle.uID
			vehicalState['seat'] = ovd.seat.seatPointObject.userData
		} else if ("OpenVehicleDoor" === csc) {
			let ovd = (this.charState as VehicalState.OpenVehicleDoor)
			vehicalState['vehical'] = ovd.seat.vehicle.uID
			vehicalState['seat'] = ovd.seat.seatPointObject.userData
			vehicalState['entryPoint'] = ovd.entryPoint.userData
		} else if ("Sitting" === csc) {
			let ovd = (this.charState as VehicalState.Sitting)
			vehicalState['vehical'] = ovd.seat.vehicle.uID
			vehicalState['seat'] = ovd.seat.seatPointObject.userData
		} else if ("SwitchingSeats" === csc) {
			let ovd = (this.charState as VehicalState.SwitchingSeats)
			vehicalState['vehical'] = ovd.fromSeat.vehicle.uID
			vehicalState['fromSeat'] = ovd.fromSeat.seatPointObject.userData
			vehicalState['toSeat'] = ovd.toSeat.seatPointObject.userData
		}

		let charAi: { action: string, isPressed: boolean } | null = null
		let ctrlObjAi: { action: string, isPressed: boolean } | null = null
		if (this.behaviour !== null) {
			charAi = this.behaviour.currentCharacterControl
			ctrlObjAi = this.behaviour.currentVehicalControl
		}

		return {
			uID: this.uID,
			msgType: this.msgType,
			timeStamp: this.timeStamp,
			ping: this.ping,

			data: {
				AiData: {
					character: charAi,
					controlledObject: ctrlObjAi,
				},
				charState: csc,
				vehicalState: vehicalState,
				physicsEnabled: this.physicsEnabled,
				characterPosition: {
					x: (/* (this.player !== null) && */ !this.physicsEnabled) ? newPos.x : this.position.x,
					y: (/* (this.player !== null) && */ !this.physicsEnabled) ? newPos.y : this.position.y,
					z: (/* (this.player !== null) && */ !this.physicsEnabled) ? newPos.z : this.position.z,
				},
				characterQuaternion: {
					x: /* (this.controlledObject !== null) ? this.controlledObject.quaternion.x : */ this.quaternion.x,
					y: /* (this.controlledObject !== null) ? this.controlledObject.quaternion.y : */ this.quaternion.y,
					z: /* (this.controlledObject !== null) ? this.controlledObject.quaternion.z : */ this.quaternion.z,
					w: /* (this.controlledObject !== null) ? this.controlledObject.quaternion.w : */ this.quaternion.w,
				},
			}
		}
	}
}
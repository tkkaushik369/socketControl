import * as CANNON from 'cannon-es'

import { Vehicle } from './Vehicle'
import { IControllable } from '../Interfaces/IControllable'
import { KeyBinding } from '../Core/KeyBinding'
import * as THREE from 'three'
import { Utility } from '../Core/Utility'
import { SpringSimulator } from '../Physics/SpringSimulation/SpringSimulator'
import { WorldBase } from '../World/WorldBase'
import { EntityType } from '../Enums/EntityType'
import { UiControlsGroup } from '../Enums/UiControlsGroup'

export class Car extends Vehicle implements IControllable {
	public entityType: EntityType = EntityType.Car
	public drive: string = 'awd'
	get speed(): number {
		return this._speed
	}
	private _speed: number = 0

	private wheelsDebug: THREE.Mesh[] = []
	public steeringWheel: THREE.Object3D | null
	private airSpinTimer: number = 0

	private steeringSimulator: SpringSimulator
	private gear: number = 1

	// Transmission
	private shiftTimer: number = 0
	private timeToShift: number = 0.2

	private canTiltForwards: boolean = false
	private characterWantsToExit: boolean = false

	// Engine
	public engineForce = 500
	public maxGears = 5
	public gearsMaxSpeeds: { [id: number]: number } = {
		'-1': -4,
		'0': 0,
		'1': 5,
		'2': 9,
		'3': 13,
		'4': 17,
		'5': 22,
	}

	constructor(gltf: any, mass: number = 50) {
		super(gltf, mass, {
			radius: 0.25,
			suspensionStiffness: 20,
			suspensionRestLength: 0.35,
			maxSuspensionTravel: 1,
			frictionSlip: 0.8,
			dampingRelaxation: 2,
			dampingCompression: 2,
			rollInfluence: 0.8
		})
		// binid functions
		this.noDirectionPressed = this.noDirectionPressed.bind(this)
		this.update = this.update.bind(this)
		this.shiftUp = this.shiftUp.bind(this)
		this.shiftDown = this.shiftDown.bind(this)
		this.physicsPreStep = this.physicsPreStep.bind(this)
		this.onInputChange = this.onInputChange.bind(this)
		this.inputReceiverInit = this.inputReceiverInit.bind(this)
		this.readCarData = this.readCarData.bind(this)
		this.addToWorld = this.addToWorld.bind(this)
		this.removeFromWorld = this.removeFromWorld.bind(this)
		this.Out = this.Out.bind(this)
		this.Set = this.Set.bind(this)

		// init
		this.steeringWheel = null

		this.readCarData(gltf)

		this.actions = {
			'throttle': new KeyBinding('KeyW'),
			'reverse': new KeyBinding('KeyS'),
			'brake': new KeyBinding('Space'),
			'left': new KeyBinding('KeyA'),
			'right': new KeyBinding('KeyD'),
			'exitVehicle': new KeyBinding('KeyF'),
			'seat_switch': new KeyBinding('KeyX'),
			'view': new KeyBinding('KeyV'),
		}

		this.steeringSimulator = new SpringSimulator(60, 10, 0.6)
	}

	public noDirectionPressed(): boolean {
		let result =
			!this.actions.throttle.isPressed &&
			!this.actions.reverse.isPressed &&
			!this.actions.left.isPressed &&
			!this.actions.right.isPressed

		return result
	}

	public update(timeStep: number): void {
		super.update(timeStep)
		if (this.world !== null && this.world.isClient) return

		const tiresHaveContact = this.rayCastVehicle.numWheelsOnGround > 0

		// Air spin
		if (!tiresHaveContact) {
			// Timer grows when car is off ground, resets once you touch the ground again
			this.airSpinTimer += timeStep
			if (!this.actions.throttle.isPressed) this.canTiltForwards = true
		}
		else {
			this.canTiltForwards = false
			this.airSpinTimer = 0
		}

		if (this.shiftTimer > 0) {
			this.shiftTimer -= timeStep
			if (this.shiftTimer < 0) this.shiftTimer = 0
		}
		else {
			// Transmission 
			if (this.actions.reverse.isPressed) {
				const powerFactor = (this.gearsMaxSpeeds['-1'] - this.speed) / Math.abs(this.gearsMaxSpeeds['-1'])
				const force = (this.engineForce / this.gear) * (Math.abs(powerFactor) ** 1)

				this.applyEngineForce(force)
			}
			else {
				const powerFactor = (this.gearsMaxSpeeds[this.gear] - this.speed) / (this.gearsMaxSpeeds[this.gear] - this.gearsMaxSpeeds[this.gear - 1])

				if (powerFactor < 0.1 && this.gear < this.maxGears) this.shiftUp()
				else if (this.gear > 1 && powerFactor > 1.2) this.shiftDown()
				else if (this.actions.throttle.isPressed) {
					const force = (this.engineForce / this.gear) * (powerFactor ** 1)
					this.applyEngineForce(-force)
				}
			}
		}

		// Steering
		this.steeringSimulator.simulate(timeStep)
		this.setSteeringValue(this.steeringSimulator.position)
		if (this.steeringWheel !== null) this.steeringWheel.rotation.z = -this.steeringSimulator.position * 2

		if (this.rayCastVehicle.numWheelsOnGround < 3 && Math.abs(this.collision.velocity.length()) < 0.5) {
			this.collision.quaternion.copy(this.collision.initQuaternion)
		}

		// Getting out
		if (this.characterWantsToExit && this.controllingCharacter !== null && this.controllingCharacter.charState.canLeaveVehicles) {
			let speed = this.collision.velocity.length()

			if (speed > 0.1 && speed < 4) {
				this.triggerAction('brake', true)
			}
			else {
				this.forceCharacterOut()
			}
		}
	}

	public shiftUp(): void {
		this.gear++
		this.shiftTimer = this.timeToShift

		this.applyEngineForce(0)
	}

	public shiftDown(): void {
		this.gear--
		this.shiftTimer = this.timeToShift

		this.applyEngineForce(0)
	}

	public physicsPreStep(body: CANNON.Body, car: Car): void {
		// Constants
		const quat = Utility.threeQuat(body.quaternion)
		const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(quat)
		const right = new THREE.Vector3(1, 0, 0).applyQuaternion(quat)
		const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quat)

		// Measure speed
		this._speed = this.collision.velocity.dot(Utility.cannonVector(forward))

		// Air spin
		// It takes 2 seconds until you have max spin air control since you leave the ground
		let airSpinInfluence = THREE.MathUtils.clamp(this.airSpinTimer / 2, 0, 1)
		airSpinInfluence *= THREE.MathUtils.clamp(this.speed, 0, 1)

		const flipSpeedFactor = THREE.MathUtils.clamp(1 - this.speed, 0, 1)
		const upFactor = (up.dot(new THREE.Vector3(0, -1, 0)) / 2) + 0.5
		const flipOverInfluence = flipSpeedFactor * upFactor * 3

		const maxAirSpinMagnitude = 2.0
		const airSpinAcceleration = 0.15
		const angVel = this.collision.angularVelocity.scale(0.8)

		const spinVectorForward = Utility.cannonVector(forward.clone())
		const spinVectorRight = Utility.cannonVector(right.clone())

		const effectiveSpinVectorForward = Utility.cannonVector(forward.clone().multiplyScalar(airSpinAcceleration * (airSpinInfluence + flipOverInfluence)))
		const effectiveSpinVectorRight = Utility.cannonVector(right.clone().multiplyScalar(airSpinAcceleration * (airSpinInfluence)))

		// Right
		if (this.actions.right.isPressed && !this.actions.left.isPressed) {
			if (angVel.dot(spinVectorForward) < maxAirSpinMagnitude) {
				angVel.vadd(effectiveSpinVectorForward, angVel)
			}
		} else
			// Left
			if (this.actions.left.isPressed && !this.actions.right.isPressed) {
				if (angVel.dot(spinVectorForward) > -maxAirSpinMagnitude) {
					angVel.vsub(effectiveSpinVectorForward, angVel)
				}
			}

		// Forwards
		if (this.canTiltForwards && this.actions.throttle.isPressed && !this.actions.reverse.isPressed) {
			if (angVel.dot(spinVectorRight) < maxAirSpinMagnitude) {
				angVel.vadd(effectiveSpinVectorRight, angVel)
			}
		} else
			// Backwards
			if (this.actions.reverse.isPressed && !this.actions.throttle.isPressed) {
				if (angVel.dot(spinVectorRight) > -maxAirSpinMagnitude) {
					angVel.vsub(effectiveSpinVectorRight, angVel)
				}
			}

		// Steering
		const velocity = new CANNON.Vec3().copy(this.collision.velocity)
		velocity.normalize()
		let driftCorrection = Utility.getSignedAngleBetweenVectors(Utility.threeVector(velocity), forward)

		const maxSteerVal = 0.8
		let speedFactor = THREE.MathUtils.clamp(this.speed * 0.3, 1, Number.MAX_VALUE)

		if (this.actions.right.isPressed) {
			let steering = Math.min(-maxSteerVal / speedFactor, -driftCorrection)
			this.steeringSimulator.target = THREE.MathUtils.clamp(steering, -maxSteerVal, maxSteerVal)
		}
		else if (this.actions.left.isPressed) {
			let steering = Math.max(maxSteerVal / speedFactor, -driftCorrection)
			this.steeringSimulator.target = THREE.MathUtils.clamp(steering, -maxSteerVal, maxSteerVal)
		}
		else this.steeringSimulator.target = 0

		// Update doors
		this.seats.forEach((seat) => {
			if (seat.door !== null)
				seat.door.preStepCallback()
		})
	}

	public onInputChange(): void {
		super.onInputChange()

		const brakeForce = 1000000

		if (this.actions.exitVehicle.justPressed) {
			this.characterWantsToExit = true
		}
		if (this.actions.exitVehicle.justReleased) {
			this.characterWantsToExit = false
			this.triggerAction('brake', false)
		}
		if (this.actions.throttle.justReleased || this.actions.reverse.justReleased) {
			this.applyEngineForce(0)
		}
		if (this.actions.brake.justPressed) {
			this.setBrake(brakeForce, 'rwd')
		}
		if (this.actions.brake.justReleased) {
			this.setBrake(0, 'rwd')
		}
		if (this.actions.view.justPressed) {
			this.toggleFirstPersonView()
		}
	}

	public inputReceiverInit(): void {
		super.inputReceiverInit()
		if (this.controllingCharacter === null) return
		if (this.controllingCharacter.player !== null) this.controllingCharacter.player.uiControls = UiControlsGroup.Car
	}

	public readCarData(gltf: any): void {
		gltf.scene.traverse((child: any) => {
			if (child.hasOwnProperty('userData')) {
				if (child.userData.hasOwnProperty('data')) {
					if (child.userData.data === 'steering_wheel') {
						this.steeringWheel = child
					}
				}
			}
		})
	}

	public addToWorld(world: WorldBase): void {
		super.addToWorld(world)
		world.world.addEventListener('preStep', () => { this.physicsPreStep(this.collision, this) })
	}

	public removeFromWorld(world: WorldBase): void {
		super.removeFromWorld(world)
		world.world.removeEventListener('preStep', () => { this.physicsPreStep(this.collision, this) })
	}

	public Out() {
		const msg = super.Out()
		const wheels: { [id: string]: any }[] = []
		this.wheels.forEach((wheel) => {
			wheels.push({
				position: {
					x: wheel.wheelObject.position.x,
					y: wheel.wheelObject.position.y,
					z: wheel.wheelObject.position.z
				},
				quaternion: {
					x: wheel.wheelObject.quaternion.x,
					y: wheel.wheelObject.quaternion.y,
					z: wheel.wheelObject.quaternion.z,
					w: wheel.wheelObject.quaternion.w
				}
			})
		})
		const doors: { [id: string]: any }[] = []
		this.seats.forEach((seat) => {
			if ((seat.door !== null) && (seat.door.doorObject !== null)) doors.push({
				position: {
					x: seat.door.doorObject.position.x,
					y: seat.door.doorObject.position.y,
					z: seat.door.doorObject.position.z
				},
				quaternion: {
					x: seat.door.doorObject.quaternion.x,
					y: seat.door.doorObject.quaternion.y,
					z: seat.door.doorObject.quaternion.z,
					w: seat.door.doorObject.quaternion.w
				}
			})
		})
		const steeringWheel = {
			quaternion: {
				x: (this.steeringWheel === null) ? 0 : this.steeringWheel.quaternion.x,
				y: (this.steeringWheel === null) ? 0 : this.steeringWheel.quaternion.y,
				z: (this.steeringWheel === null) ? 0 : this.steeringWheel.quaternion.z,
				w: (this.steeringWheel === null) ? 0 : this.steeringWheel.quaternion.w
			}
		}

		msg.data['entity'] = this.entityType
		msg.data['wheels'] = wheels
		msg.data['doors'] = doors
		msg.data['steeringWheel'] = steeringWheel
		return msg
	}

	public Set(messages: any) {
		super.Set(messages)
		if (messages.data.entity === this.entityType) {
			for (let i = 0; i < messages.data.wheels.length; i++) {
				this.wheels[i].wheelObject.position.set(
					messages.data.wheels[i].position.x,
					messages.data.wheels[i].position.y,
					messages.data.wheels[i].position.z,
				)
				this.wheels[i].wheelObject.quaternion.set(
					messages.data.wheels[i].quaternion.x,
					messages.data.wheels[i].quaternion.y,
					messages.data.wheels[i].quaternion.z,
					messages.data.wheels[i].quaternion.w,
				)
			}
			for (let i = 0; i < messages.data.doors.length; i++) {
				if (this.seats[i].door !== null) {
					if (this.seats[i].door!.doorObject !== null) {
						this.seats[i].door!.doorObject.position.set(
							messages.data.doors[i].position.x,
							messages.data.doors[i].position.y,
							messages.data.doors[i].position.z,
						)
						this.seats[i].door!.doorObject.quaternion.set(
							messages.data.doors[i].quaternion.x,
							messages.data.doors[i].quaternion.y,
							messages.data.doors[i].quaternion.z,
							messages.data.doors[i].quaternion.w,
						)
					}
				}
			}
			if (this.steeringWheel !== null) {
				this.steeringWheel!.quaternion.set(
					messages.data.steeringWheel.quaternion.x,
					messages.data.steeringWheel.quaternion.y,
					messages.data.steeringWheel.quaternion.z,
					messages.data.steeringWheel.quaternion.w,
				)
			}
		}
	}
}
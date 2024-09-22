import * as THREE from 'three'
import * as CANNON from 'cannon-es'

import { Vehicle } from './Vehicle'
import { IWorldEntity } from '../Interfaces/IWorldEntity'
import { KeyBinding } from '../Core/KeyBinding'
import { SpringSimulator } from '../Physics/SpringSimulation/SpringSimulator'
import { Utility } from '../Core/Utility'
import { EntityType } from '../Enums/EntityType'
import { WorldBase } from '../World/WorldBase'
import { MessageTypes } from '../Enums/MessagesTypes'

export class Airplane extends Vehicle implements IWorldEntity {
	public entityType: EntityType = EntityType.Airplane
	public rotor: THREE.Object3D | null
	public leftAileron: THREE.Object3D | null
	public rightAileron: THREE.Object3D | null
	public elevators: THREE.Object3D[] = []
	public rudder: THREE.Object3D | null

	private steeringSimulator: SpringSimulator
	private aileronSimulator: SpringSimulator
	private elevatorSimulator: SpringSimulator
	private rudderSimulator: SpringSimulator

	private enginePower: number = 0
	private lastDrag: number = 0

	constructor(gltf: any, mass: number = 50) {
		super(gltf, mass, {
			radius: 0.12,
			suspensionStiffness: 150,
			suspensionRestLength: 0.25,
			dampingRelaxation: 5,
			dampingCompression: 5,
			directionLocal: new CANNON.Vec3(0, -1, 0),
			axleLocal: new CANNON.Vec3(-1, 0, 0),
			chassisConnectionPointLocal: new CANNON.Vec3(),
		})
		// bind functions
		this.noDirectionPressed = this.noDirectionPressed.bind(this)
		this.update = this.update.bind(this)
		this.physicsPreStep = this.physicsPreStep.bind(this)
		this.onInputChange = this.onInputChange.bind(this)
		this.readAirplaneData = this.readAirplaneData.bind(this)
		this.inputReceiverInit = this.inputReceiverInit.bind(this)
		this.addToWorld = this.addToWorld.bind(this)
		this.removeFromWorld = this.removeFromWorld.bind(this)
		this.Out = this.Out.bind(this)
		this.Set = this.Set.bind(this)

		// init
		this.rotor = null
		this.leftAileron = null
		this.rightAileron = null
		this.rudder = null

		this.readAirplaneData(gltf)

		this.actions = {
			'throttle': new KeyBinding('ShiftLeft'),
			'brake': new KeyBinding('Space'),
			'wheelBrake': new KeyBinding('KeyB'),
			'pitchUp': new KeyBinding('KeyS'),
			'pitchDown': new KeyBinding('KeyW'),
			'yawLeft': new KeyBinding('KeyQ'),
			'yawRight': new KeyBinding('KeyE'),
			'rollLeft': new KeyBinding('KeyA'),
			'rollRight': new KeyBinding('KeyD'),
			'exitVehicle': new KeyBinding('KeyF'),
			'seat_switch': new KeyBinding('KeyX'),
			'view': new KeyBinding('KeyV'),
		}

		this.steeringSimulator = new SpringSimulator(60, 10, 0.6)
		this.aileronSimulator = new SpringSimulator(60, 5, 0.6)
		this.elevatorSimulator = new SpringSimulator(60, 7, 0.6)
		this.rudderSimulator = new SpringSimulator(60, 10, 0.6)
	}

	public noDirectionPressed(): boolean {
		let result =
			!this.actions.throttle.isPressed &&
			!this.actions.brake.isPressed &&
			!this.actions.yawLeft.isPressed &&
			!this.actions.yawRight.isPressed &&
			!this.actions.rollLeft.isPressed &&
			!this.actions.rollRight.isPressed

		return result
	}

	public update(timeStep: number): void {
		super.update(timeStep)
		if (this.world !== null && this.world.isClient) return

		// Rotors visuals
		if (this.controllingCharacter !== null) {
			if (this.enginePower < 1) this.enginePower += timeStep * 0.4
			if (this.enginePower > 1) this.enginePower = 1
		}
		else {
			if (this.enginePower > 0) this.enginePower -= timeStep * 0.12
			if (this.enginePower < 0) this.enginePower = 0
		}
		if (this.rotor !== null) this.rotor.rotateX(this.enginePower * timeStep * 60)

		// Steering
		if (this.rayCastVehicle.numWheelsOnGround > 0) {
			if ((this.actions.yawLeft.isPressed || this.actions.rollLeft.isPressed)
				&& !this.actions.yawRight.isPressed && !this.actions.rollRight.isPressed) {
				this.steeringSimulator.target = 0.8
			}
			else if ((this.actions.yawRight.isPressed || this.actions.rollRight.isPressed)
				&& !this.actions.yawLeft.isPressed && !this.actions.rollLeft.isPressed) {
				this.steeringSimulator.target = -0.8
			}
			else {
				this.steeringSimulator.target = 0
			}
		}
		else {
			this.steeringSimulator.target = 0
		}
		this.steeringSimulator.simulate(timeStep)
		this.setSteeringValue(this.steeringSimulator.position)

		const partsRotationAmount = 0.7

		// Ailerons
		if (this.actions.rollLeft.isPressed && !this.actions.rollRight.isPressed) {
			this.aileronSimulator.target = partsRotationAmount
		}
		else if (!this.actions.rollLeft.isPressed && this.actions.rollRight.isPressed) {
			this.aileronSimulator.target = -partsRotationAmount
		}
		else {
			this.aileronSimulator.target = 0
		}

		// Elevators
		if (this.actions.pitchUp.isPressed && !this.actions.pitchDown.isPressed) {
			this.elevatorSimulator.target = partsRotationAmount
		}
		else if (!this.actions.pitchUp.isPressed && this.actions.pitchDown.isPressed) {
			this.elevatorSimulator.target = -partsRotationAmount
		}
		else {
			this.elevatorSimulator.target = 0
		}

		// Rudder
		if (this.actions.yawLeft.isPressed && !this.actions.yawRight.isPressed) {
			this.rudderSimulator.target = partsRotationAmount
		}
		else if (!this.actions.yawLeft.isPressed && this.actions.yawRight.isPressed) {
			this.rudderSimulator.target = -partsRotationAmount
		}
		else {
			this.rudderSimulator.target = 0
		}

		// Run rotation simulators
		this.aileronSimulator.simulate(timeStep)
		this.elevatorSimulator.simulate(timeStep)
		this.rudderSimulator.simulate(timeStep)

		// Rotate parts
		if (this.leftAileron !== null)
			this.leftAileron.rotation.y = this.aileronSimulator.position
		if (this.rightAileron !== null)
			this.rightAileron.rotation.y = -this.aileronSimulator.position
		this.elevators.forEach((elevator) => {
			elevator.rotation.y = this.elevatorSimulator.position
		})
		if (this.rudder !== null)
			this.rudder.rotation.y = this.rudderSimulator.position
	}

	public physicsPreStep(body: CANNON.Body, plane: Airplane): void {
		let quat = Utility.threeQuat(body.quaternion)
		let right = new THREE.Vector3(1, 0, 0).applyQuaternion(quat)
		let up = new THREE.Vector3(0, 1, 0).applyQuaternion(quat)
		let forward = new THREE.Vector3(0, 0, 1).applyQuaternion(quat)

		const velocity = new CANNON.Vec3().copy(this.collision.velocity)
		let velLength1 = body.velocity.length()
		const currentSpeed = velocity.dot(Utility.cannonVector(forward))

		// Rotation controls influence
		let flightModeInfluence = currentSpeed / 10
		flightModeInfluence = THREE.MathUtils.clamp(flightModeInfluence, 0, 1)

		let lowerMassInfluence = currentSpeed / 10
		lowerMassInfluence = THREE.MathUtils.clamp(lowerMassInfluence, 0, 1)
		this.collision.mass = 50 * (1 - (lowerMassInfluence * 0.6))

		// Rotation stabilization
		let lookVelocity = body.velocity.clone()
		lookVelocity.normalize()
		let rotStabVelocity = new THREE.Quaternion().setFromUnitVectors(forward, Utility.threeVector(lookVelocity))
		rotStabVelocity.x *= 0.3
		rotStabVelocity.y *= 0.3
		rotStabVelocity.z *= 0.3
		rotStabVelocity.w *= 0.3
		let rotStabEuler = new THREE.Euler().setFromQuaternion(rotStabVelocity)

		let rotStabInfluence = THREE.MathUtils.clamp(velLength1 - 1, 0, 0.1)  // Only with speed greater than 1 UPS
		rotStabInfluence *= (this.rayCastVehicle.numWheelsOnGround > 0 && currentSpeed < 0 ? 0 : 1)    // Reverse fix
		let loopFix = (this.actions.throttle.isPressed && currentSpeed > 0 ? 0 : 1)

		body.angularVelocity.x += rotStabEuler.x * rotStabInfluence * loopFix
		body.angularVelocity.y += rotStabEuler.y * rotStabInfluence
		body.angularVelocity.z += rotStabEuler.z * rotStabInfluence * loopFix

		// Pitch
		if (plane.actions.pitchUp.isPressed) {
			body.angularVelocity.x -= right.x * 0.04 * flightModeInfluence * this.enginePower
			body.angularVelocity.y -= right.y * 0.04 * flightModeInfluence * this.enginePower
			body.angularVelocity.z -= right.z * 0.04 * flightModeInfluence * this.enginePower
		}
		if (plane.actions.pitchDown.isPressed) {
			body.angularVelocity.x += right.x * 0.04 * flightModeInfluence * this.enginePower
			body.angularVelocity.y += right.y * 0.04 * flightModeInfluence * this.enginePower
			body.angularVelocity.z += right.z * 0.04 * flightModeInfluence * this.enginePower
		}

		// Yaw
		if (plane.actions.yawLeft.isPressed) {
			body.angularVelocity.x += up.x * 0.02 * flightModeInfluence * this.enginePower
			body.angularVelocity.y += up.y * 0.02 * flightModeInfluence * this.enginePower
			body.angularVelocity.z += up.z * 0.02 * flightModeInfluence * this.enginePower
		}
		if (plane.actions.yawRight.isPressed) {
			body.angularVelocity.x -= up.x * 0.02 * flightModeInfluence * this.enginePower
			body.angularVelocity.y -= up.y * 0.02 * flightModeInfluence * this.enginePower
			body.angularVelocity.z -= up.z * 0.02 * flightModeInfluence * this.enginePower
		}

		// Roll
		if (plane.actions.rollLeft.isPressed) {
			body.angularVelocity.x -= forward.x * 0.055 * flightModeInfluence * this.enginePower
			body.angularVelocity.y -= forward.y * 0.055 * flightModeInfluence * this.enginePower
			body.angularVelocity.z -= forward.z * 0.055 * flightModeInfluence * this.enginePower
		}
		if (plane.actions.rollRight.isPressed) {
			body.angularVelocity.x += forward.x * 0.055 * flightModeInfluence * this.enginePower
			body.angularVelocity.y += forward.y * 0.055 * flightModeInfluence * this.enginePower
			body.angularVelocity.z += forward.z * 0.055 * flightModeInfluence * this.enginePower
		}

		// Thrust
		let speedModifier = 0.02
		if (plane.actions.throttle.isPressed && !plane.actions.brake.isPressed) {
			speedModifier = 0.06
		}
		else if (!plane.actions.throttle.isPressed && plane.actions.brake.isPressed) {
			speedModifier = -0.05
		}
		else if (this.rayCastVehicle.numWheelsOnGround > 0) {
			speedModifier = 0
		}

		body.velocity.x += (velLength1 * this.lastDrag + speedModifier) * forward.x * this.enginePower
		body.velocity.y += (velLength1 * this.lastDrag + speedModifier) * forward.y * this.enginePower
		body.velocity.z += (velLength1 * this.lastDrag + speedModifier) * forward.z * this.enginePower

		// Drag
		let velLength2 = body.velocity.length()
		const drag = Math.pow(velLength2, 1) * 0.003 * this.enginePower
		body.velocity.x -= body.velocity.x * drag
		body.velocity.y -= body.velocity.y * drag
		body.velocity.z -= body.velocity.z * drag
		this.lastDrag = drag

		// Lift
		let lift = Math.pow(velLength2, 1) * 0.005 * this.enginePower
		lift = THREE.MathUtils.clamp(lift, 0, 0.05)
		body.velocity.x += up.x * lift
		body.velocity.y += up.y * lift
		body.velocity.z += up.z * lift

		// Angular damping
		body.angularVelocity.x = THREE.MathUtils.lerp(body.angularVelocity.x, body.angularVelocity.x * 0.98, flightModeInfluence)
		body.angularVelocity.y = THREE.MathUtils.lerp(body.angularVelocity.y, body.angularVelocity.y * 0.98, flightModeInfluence)
		body.angularVelocity.z = THREE.MathUtils.lerp(body.angularVelocity.z, body.angularVelocity.z * 0.98, flightModeInfluence)
	}

	public onInputChange(): void {
		super.onInputChange()

		const brakeForce = 100

		if (this.actions.exitVehicle.justPressed && this.controllingCharacter !== null) {
			this.forceCharacterOut()
		}
		if (this.actions.wheelBrake.justPressed) {
			this.setBrake(brakeForce)
		}
		if (this.actions.wheelBrake.justReleased) {
			this.setBrake(0)
		}
		if (this.actions.view.justPressed) {
			this.toggleFirstPersonView()
		}
	}

	public readAirplaneData(gltf: any): void {
		gltf.scene.traverse((child: any) => {
			if (child.hasOwnProperty('userData')) {
				if (child.userData.hasOwnProperty('data')) {
					if (child.userData.data === 'rotor') {
						this.rotor = child
					}
					if (child.userData.data === 'rudder') {
						this.rudder = child
					}
					if (child.userData.data === 'elevator') {
						this.elevators.push(child)
					}
					if (child.userData.data === 'aileron') {
						if (child.userData.hasOwnProperty('side')) {
							if (child.userData.side === 'left') {
								this.leftAileron = child
							}
							else if (child.userData.side === 'right') {
								this.rightAileron = child
							}
						}
					}
				}
			}
		})
	}

	public inputReceiverInit(): void {
		super.inputReceiverInit()
		if (this.world === null) return
		if (this.world.updateControlsCallBack === null) return
		this.world.updateControlsCallBack([
			{
				keys: ['Shift'],
				desc: 'Accelerate'
			},
			{
				keys: ['Space'],
				desc: 'Decelerate'
			},
			{
				keys: ['W', 'S'],
				desc: 'Elevators'
			},
			{
				keys: ['A', 'D'],
				desc: 'Ailerons'
			},
			{
				keys: ['Q', 'E'],
				desc: 'Rudder / Steering'
			},
			{
				keys: ['B'],
				desc: 'Brake'
			},
			{
				keys: ['V'],
				desc: 'View select'
			},
			{
				keys: ['F'],
				desc: 'Exit vehicle'
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
		const rotor: { [id: string]: any } = {
			quaternion: {
				x: (this.rotor === null) ? 0 : this.rotor.quaternion.x,
				y: (this.rotor === null) ? 0 : this.rotor.quaternion.y,
				z: (this.rotor === null) ? 0 : this.rotor.quaternion.z,
				w: (this.rotor === null) ? 0 : this.rotor.quaternion.w
			}
		}
		const leftaileron: { [id: string]: any } = {
			quaternion: {
				x: (this.leftAileron === null) ? 0 : this.leftAileron.quaternion.x,
				y: (this.leftAileron === null) ? 0 : this.leftAileron.quaternion.y,
				z: (this.leftAileron === null) ? 0 : this.leftAileron.quaternion.z,
				w: (this.leftAileron === null) ? 0 : this.leftAileron.quaternion.w
			}
		}
		const rightaileron: { [id: string]: any } = {
			quaternion: {
				x: (this.rightAileron === null) ? 0 : this.rightAileron.quaternion.x,
				y: (this.rightAileron === null) ? 0 : this.rightAileron.quaternion.y,
				z: (this.rightAileron === null) ? 0 : this.rightAileron.quaternion.z,
				w: (this.rightAileron === null) ? 0 : this.rightAileron.quaternion.w
			}
		}
		const rudder: { [id: string]: any } = {
			quaternion: {
				x: (this.rudder === null) ? 0 : this.rudder.quaternion.x,
				y: (this.rudder === null) ? 0 : this.rudder.quaternion.y,
				z: (this.rudder === null) ? 0 : this.rudder.quaternion.z,
				w: (this.rudder === null) ? 0 : this.rudder.quaternion.w
			}
		}
		const elevators: { [id: string]: any }[] = []
		this.elevators.forEach((elevator) => {
			elevators.push({
				quaternion: {
					x: elevator.quaternion.x,
					y: elevator.quaternion.y,
					z: elevator.quaternion.z,
					w: elevator.quaternion.w
				}
			})
		})
		msg.data['entity'] = this.entityType
		msg.data['wheels'] = wheels
		msg.data['rotor'] = rotor
		msg.data['leftaileron'] = leftaileron
		msg.data['rightaileron'] = rightaileron
		msg.data['rudder'] = rudder
		msg.data['elevators'] = elevators
		return msg
	}

	public Set(messages: any) {
		super.Set(messages)

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
		if (this.rotor) {
			this.rotor!.quaternion.set(
				messages.data.rotor.quaternion.x,
				messages.data.rotor.quaternion.y,
				messages.data.rotor.quaternion.z,
				messages.data.rotor.quaternion.w,
			)
		}
		if (this.leftAileron) {
			this.leftAileron!.quaternion.set(
				messages.data.leftaileron.quaternion.x,
				messages.data.leftaileron.quaternion.y,
				messages.data.leftaileron.quaternion.z,
				messages.data.leftaileron.quaternion.w,
			)
		}
		if (this.rightAileron) {
			this.rightAileron!.quaternion.set(
				messages.data.rightaileron.quaternion.x,
				messages.data.rightaileron.quaternion.y,
				messages.data.rightaileron.quaternion.z,
				messages.data.rightaileron.quaternion.w,
			)
		}
		if (this.rudder) {
			this.rudder!.quaternion.set(
				messages.data.rudder.quaternion.x,
				messages.data.rudder.quaternion.y,
				messages.data.rudder.quaternion.z,
				messages.data.rudder.quaternion.w,
			)
		}
		for (let i = 0; i < messages.data.elevators.length; i++) {
			this.elevators[i].quaternion.set(
				messages.data.elevators[i].quaternion.x,
				messages.data.elevators[i].quaternion.y,
				messages.data.elevators[i].quaternion.z,
				messages.data.elevators[i].quaternion.w,
			)
		}
	}
}
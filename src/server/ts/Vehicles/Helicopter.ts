import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { Utility } from '../Core/Utility'

import { Vehicle } from './Vehicle'
import { IControllable } from '../Interfaces/IControllable'
import { IWorldEntity } from '../Interfaces/IWorldEntity'
import { KeyBinding } from '../Core/KeyBinding'
import { WorldBase } from '../World/WorldBase'
import { EntityType } from '../Enums/EntityType'
import { UiControlsGroup } from '../Enums/UiControlsGroup'

export class Helicopter extends Vehicle implements IControllable, IWorldEntity {
	public entityType: EntityType = EntityType.Helicopter
	public rotors: THREE.Object3D[] = []
	private enginePower: number = 0

	constructor(gltf: any, mass: number = 50) {
		super(gltf, mass)
		// bind functions
		this.noDirectionPressed = this.noDirectionPressed.bind(this)
		this.update = this.update.bind(this)
		this.onInputChange = this.onInputChange.bind(this)
		this.physicsPreStep = this.physicsPreStep.bind(this)
		this.readHelicopterData = this.readHelicopterData.bind(this)
		this.inputReceiverInit = this.inputReceiverInit.bind(this)
		this.addToWorld = this.addToWorld.bind(this)
		this.removeFromWorld = this.removeFromWorld.bind(this)
		this.Out = this.Out.bind(this)
		this.Set = this.Set.bind(this)

		// init
		this.readHelicopterData(gltf)

		this.actions = {
			'ascend': new KeyBinding('ShiftLeft'),
			'descend': new KeyBinding('Space'),
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
	}

	public noDirectionPressed(): boolean {
		let result =
			!this.actions.ascend.isPressed &&
			!this.actions.descend.isPressed

		return result
	}

	public update(timeStep: number): void {
		super.update(timeStep)
		if (this.world !== null && (this.world.isClient && (this.world.worldId !== null))) return

		// Rotors visuals
		if (this.controllingCharacter !== null) {
			if (this.enginePower < 1) this.enginePower += timeStep * 0.2
			if (this.enginePower > 1) this.enginePower = 1
		} else {
			if (this.enginePower > 0) this.enginePower -= timeStep * 0.06
			if (this.enginePower < 0) this.enginePower = 0
		}

		this.rotors.forEach((rotor) => {
			rotor.rotateX(this.enginePower * timeStep * 30)
		})
	}

	public onInputChange(): void {
		super.onInputChange()

		if (this.actions.exitVehicle.justPressed && this.controllingCharacter !== null) {
			this.forceCharacterOut()
		}
		if (this.actions.view.justPressed) {
			this.toggleFirstPersonView()
		}
	}

	public physicsPreStep(body: CANNON.Body, heli: Helicopter): void {
		let quat = Utility.threeQuat(body.quaternion)
		let right = new THREE.Vector3(1, 0, 0).applyQuaternion(quat)
		let globalUp = new THREE.Vector3(0, 1, 0)
		let up = new THREE.Vector3(0, 1, 0).applyQuaternion(quat)
		let forward = new THREE.Vector3(0, 0, 1).applyQuaternion(quat)

		// Throttle
		if (heli.actions.ascend.isPressed) {
			body.velocity.x += up.x * 0.15 * this.enginePower
			body.velocity.y += up.y * 0.15 * this.enginePower
			body.velocity.z += up.z * 0.15 * this.enginePower
		}
		if (heli.actions.descend.isPressed) {
			body.velocity.x -= up.x * 0.15 * this.enginePower
			body.velocity.y -= up.y * 0.15 * this.enginePower
			body.velocity.z -= up.z * 0.15 * this.enginePower
		}

		// Vertical stabilization
		if (heli.world !== null) {
			let gravity = heli.world.world.gravity
			let gravityCompensation = new CANNON.Vec3(-gravity.x, -gravity.y, -gravity.z).length()
			gravityCompensation *= heli.world.physicsFrameTime
			gravityCompensation *= 0.98
			let dot = globalUp.dot(up)
			gravityCompensation *= Math.sqrt(THREE.MathUtils.clamp(dot, 0, 1))

			let vertDamping = new THREE.Vector3(0, body.velocity.y, 0).multiplyScalar(-0.01)
			let vertStab = up.clone()
			vertStab.multiplyScalar(gravityCompensation)
			vertStab.add(vertDamping)
			vertStab.multiplyScalar(heli.enginePower)

			body.velocity.x += vertStab.x
			body.velocity.y += vertStab.y
			body.velocity.z += vertStab.z
		}

		// Positional damping
		body.velocity.x *= THREE.MathUtils.lerp(1, 0.995, this.enginePower)
		body.velocity.z *= THREE.MathUtils.lerp(1, 0.995, this.enginePower)

		// Rotation stabilization
		if (this.controllingCharacter !== null) {
			let rotStabVelocity = new THREE.Quaternion().setFromUnitVectors(up, globalUp)
			rotStabVelocity.x *= 0.3
			rotStabVelocity.y *= 0.3
			rotStabVelocity.z *= 0.3
			rotStabVelocity.w *= 0.3
			let rotStabEuler = new THREE.Euler().setFromQuaternion(rotStabVelocity)

			body.angularVelocity.x += rotStabEuler.x * this.enginePower
			body.angularVelocity.y += rotStabEuler.y * this.enginePower
			body.angularVelocity.z += rotStabEuler.z * this.enginePower
		}

		// Pitch
		if (heli.actions.pitchUp.isPressed) {
			body.angularVelocity.x -= right.x * 0.07 * this.enginePower
			body.angularVelocity.y -= right.y * 0.07 * this.enginePower
			body.angularVelocity.z -= right.z * 0.07 * this.enginePower
		}
		if (heli.actions.pitchDown.isPressed) {
			body.angularVelocity.x += right.x * 0.07 * this.enginePower
			body.angularVelocity.y += right.y * 0.07 * this.enginePower
			body.angularVelocity.z += right.z * 0.07 * this.enginePower
		}

		// Yaw
		if (heli.actions.yawLeft.isPressed) {
			body.angularVelocity.x += up.x * 0.07 * this.enginePower
			body.angularVelocity.y += up.y * 0.07 * this.enginePower
			body.angularVelocity.z += up.z * 0.07 * this.enginePower
		}
		if (heli.actions.yawRight.isPressed) {
			body.angularVelocity.x -= up.x * 0.07 * this.enginePower
			body.angularVelocity.y -= up.y * 0.07 * this.enginePower
			body.angularVelocity.z -= up.z * 0.07 * this.enginePower
		}

		// Roll
		if (heli.actions.rollLeft.isPressed) {
			body.angularVelocity.x -= forward.x * 0.07 * this.enginePower
			body.angularVelocity.y -= forward.y * 0.07 * this.enginePower
			body.angularVelocity.z -= forward.z * 0.07 * this.enginePower
		}
		if (heli.actions.rollRight.isPressed) {
			body.angularVelocity.x += forward.x * 0.07 * this.enginePower
			body.angularVelocity.y += forward.y * 0.07 * this.enginePower
			body.angularVelocity.z += forward.z * 0.07 * this.enginePower
		}

		// Angular damping
		body.angularVelocity.x *= 0.97
		body.angularVelocity.y *= 0.97
		body.angularVelocity.z *= 0.97
	}

	public readHelicopterData(gltf: any): void {
		gltf.scene.traverse((child: any) => {
			if (child.hasOwnProperty('userData')) {
				if (child.userData.hasOwnProperty('data')) {
					if (child.userData.data === 'rotor') {
						this.rotors.push(child)
					}
				}
			}
		})
	}

	public inputReceiverInit(): void {
		super.inputReceiverInit()
		if (this.controllingCharacter === null) return
		if (this.controllingCharacter.player !== null) this.controllingCharacter.player.uiControls = UiControlsGroup.Helicopter
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
		const rotors: { [id: string]: any }[] = []
		this.rotors.forEach((rotor) => {
			rotors.push({
				quaternion: {
					x: rotor.quaternion.x,
					y: rotor.quaternion.y,
					z: rotor.quaternion.z,
					w: rotor.quaternion.w
				}
			})
		})
		msg.data['entity'] = this.entityType
		msg.data['doors'] = doors
		msg.data['rotors'] = rotors
		return msg
	}

	public Set(messages: any) {
		super.Set(messages)

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
		for (let i = 0; i < messages.data.rotors.length; i++) {
			if (this.rotors[i]) {
				this.rotors[i].quaternion.set(
					messages.data.rotors[i].quaternion.x,
					messages.data.rotors[i].quaternion.y,
					messages.data.rotors[i].quaternion.z,
					messages.data.rotors[i].quaternion.w,
				)
			}
		}
	}
}
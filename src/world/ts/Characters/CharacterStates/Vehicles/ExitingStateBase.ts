import * as THREE from 'three'
import { Utility } from '../../../Core/Utility'

import { CharacterStateBase } from '../_CharacterStateLibrary'
import { Character } from '../../Character'
import { VehicleSeat } from '../../../Vehicles/VehicleSeat'
import { Vehicle } from '../../../Vehicles/Vehicle'

export abstract class ExitingStateBase extends CharacterStateBase {
	state = 'ExitingStateBase'
	public vehicle: Vehicle
	public seat: VehicleSeat
	protected startPosition: THREE.Vector3 = new THREE.Vector3()
	protected endPosition: THREE.Vector3 = new THREE.Vector3()
	protected startRotation: THREE.Quaternion = new THREE.Quaternion()
	protected endRotation: THREE.Quaternion = new THREE.Quaternion()
	protected exitPoint: THREE.Object3D
	protected dummyObj: THREE.Object3D

	constructor(character: Character, seat: VehicleSeat) {
		super(character)
		// bind functions
		this.detachCharacterFromVehicle = this.detachCharacterFromVehicle.bind(this)
		this.updateEndRotation = this.updateEndRotation.bind(this)

		// init
		this.canFindVehiclesToEnter = false
		this.seat = seat
		this.vehicle = seat.vehicle

		if (this.seat.door !== null) this.seat.door.open()

		this.startPosition.copy(this.character.position)
		this.startRotation.copy(this.character.quaternion)

		this.exitPoint = new THREE.Object3D()
		this.dummyObj = new THREE.Object3D()
	}

	public detachCharacterFromVehicle(): void {
		this.character.controlledObject = null
		this.character.resetOrientation()
		if (
			this.character.world !== null &&
			(!this.character.world.isClient || (this.character.world.isClient && this.character.world.worldId === null))
		)
			this.character.world.scene.attach(this.character)
		this.character.resetVelocity()
		this.character.setPhysicsEnabled(true)
		if (
			this.character.world !== null &&
			(!this.character.world.isClient || (this.character.world.isClient && this.character.world.worldId === null))
		)
			this.character.setPosition(this.character.position.x, this.character.position.y, this.character.position.z)
		this.character.inputReceiverUpdate(16)
		this.character.characterCapsule.body.velocity.copy(this.vehicle.rayCastVehicle.chassisBody.velocity)
		this.character.feetRaycast()
	}

	public updateEndRotation(): void {
		const forward = Utility.getForward(this.exitPoint)
		forward.y = 0
		forward.normalize()

		if (
			this.character.world !== null &&
			(!this.character.world.isClient || (this.character.world.isClient && this.character.world.worldId === null))
		)
			this.character.world.scene.attach(this.dummyObj)
		this.exitPoint.getWorldPosition(this.dummyObj.position)
		let target = this.dummyObj.position.clone().add(forward)
		this.dummyObj.lookAt(target)
		if (this.seat.seatPointObject.parent !== null)
			if (
				this.character.world !== null &&
				(!this.character.world.isClient ||
					(this.character.world.isClient && this.character.world.worldId === null))
			)
				this.seat.seatPointObject.parent.attach(this.dummyObj)
		this.endRotation.copy(this.dummyObj.quaternion)
	}
}

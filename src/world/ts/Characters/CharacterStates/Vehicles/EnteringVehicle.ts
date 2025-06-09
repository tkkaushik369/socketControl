import * as THREE from 'three'
import { CharacterStateBase } from '../_CharacterStateLibrary'
import { Driving, Sitting } from './_VehicleStateLibrary'
import { Character } from '../../Character'
import { VehicleSeat } from '../../../Vehicles/VehicleSeat'
import { Side } from '../../../Enums/Side'
import { SeatType } from '../../../Enums/SeatType'
import { EntityType } from '../../../Enums/EntityType'
import { Utility } from '../../../Core/Utility'
import { SpringSimulator } from '../../../Physics/SpringSimulation/SpringSimulator'
import { Vehicle } from '../../../Vehicles/Vehicle'

export class EnteringVehicle extends CharacterStateBase {
	state = 'EnteringVehicle'
	public vehicle: Vehicle
	private animData: any
	public seat: VehicleSeat
	public entryPoint: THREE.Object3D

	private initialPositionOffset: THREE.Vector3 = new THREE.Vector3()
	private startPosition: THREE.Vector3 = new THREE.Vector3()
	private endPosition: THREE.Vector3 = new THREE.Vector3()
	private startRotation: THREE.Quaternion = new THREE.Quaternion()
	private endRotation: THREE.Quaternion = new THREE.Quaternion()

	private factorSimulator: SpringSimulator

	constructor(character: Character, seat: VehicleSeat, entryPoint: THREE.Object3D) {
		super(character)
		// bind functions
		this.update = this.update.bind(this)
		this.getEntryAnimations = this.getEntryAnimations.bind(this)

		// init
		this.canFindVehiclesToEnter = false
		this.vehicle = seat.vehicle
		this.seat = seat
		this.entryPoint = entryPoint

		const side = Utility.detectRelativeSide(this.entryPoint, seat.seatPointObject)
		this.animData = this.getEntryAnimations(this.seat.vehicle.entityType)
		this.playAnimation(this.animData[side], 0.1)

		this.character.resetVelocity()
		this.character.tiltContainer.rotation.z = 0
		this.character.setPhysicsEnabled(false)
		if (
			this.character.world !== null &&
			(!this.character.world.isClient || (this.character.world.isClient && this.character.world.worldId === null))
		)
			this.seat.vehicle.attach(this.character)

		this.startPosition.copy(this.entryPoint.position)
		this.startPosition.y += 0.53
		this.endPosition.copy(seat.seatPointObject.position)
		this.endPosition.y += 0.6
		this.initialPositionOffset.copy(this.startPosition).sub(this.character.position)

		this.startRotation.copy(this.character.quaternion)
		this.endRotation.copy(this.seat.seatPointObject.quaternion)

		this.factorSimulator = new SpringSimulator(60, 10, 0.5)
		this.factorSimulator.target = 1
	}

	public async update(timeStep: number): Promise<void> {
		await super.update(timeStep)

		if (this.animationEnded(timeStep)) {
			this.character.occupySeat(this.seat)
			if (
				this.character.world !== null &&
				(!this.character.world.isClient ||
					(this.character.world.isClient && this.character.world.worldId === null))
			)
				this.character.setPosition(this.endPosition.x, this.endPosition.y, this.endPosition.z)

			if (this.seat.type === SeatType.Driver) {
				if (this.seat.door) this.seat.door.physicsEnabled = true
				this.character.setState(new Driving(this.character, this.seat))
			} else if (this.seat.type === SeatType.Passenger) {
				this.character.setState(new Sitting(this.character, this.seat))
			}
		} else {
			if (this.seat.door) {
				this.seat.door.physicsEnabled = false
				this.seat.door.rotation = 1
			}

			let factor = THREE.MathUtils.clamp(this.timer / (this.animationLength - this.animData.end_early), 0, 1)
			let sineFactor = Utility.easeInOutSine(factor)
			this.factorSimulator.simulate(timeStep)

			let currentPosOffset = new THREE.Vector3().lerpVectors(
				this.initialPositionOffset,
				new THREE.Vector3(),
				this.factorSimulator.position
			)
			let lerpPosition = new THREE.Vector3().lerpVectors(
				this.startPosition.clone().sub(currentPosOffset),
				this.endPosition,
				sineFactor
			)

			if (
				this.character.world !== null &&
				(!this.character.world.isClient ||
					(this.character.world.isClient && this.character.world.worldId === null))
			) {
				this.character.setPosition(lerpPosition.x, lerpPosition.y, lerpPosition.z)
				this.character.quaternion.slerp(this.endRotation, this.factorSimulator.position)
			}
		}
	}

	private getEntryAnimations(type: EntityType): any {
		switch (type) {
			case EntityType.Airplane:
				return {
					[Side.Left]: 'enter_airplane_left',
					[Side.Right]: 'enter_airplane_right',
					end_early: 0.3,
				}
			default:
				return {
					[Side.Left]: 'sit_down_left',
					[Side.Right]: 'sit_down_right',
					end_early: 0.0,
				}
		}
	}
}

import * as THREE from 'three'
import { CharacterStateBase, Idle } from '../_CharacterStateLibrary'
import { EnteringVehicle } from './_VehicleStateLibrary'
import { Character } from '../../Character'
import { VehicleSeat } from '../../../Vehicles/VehicleSeat'
import { Side } from '../../../Enums/Side'
import { Utility } from '../../../Core/Utility'
import { SpringSimulator } from '../../../Physics/SpringSimulation/SpringSimulator'

export class OpenVehicleDoor extends CharacterStateBase {
	state = 'OpenVehicleDoor'

	public seat: VehicleSeat
	public entryPoint: THREE.Object3D
	private hasOpenedDoor: boolean = false

	private startPosition: THREE.Vector3 = new THREE.Vector3()
	private endPosition: THREE.Vector3 = new THREE.Vector3()
	private startRotation: THREE.Quaternion = new THREE.Quaternion()
	private endRotation: THREE.Quaternion = new THREE.Quaternion()

	private factorSimluator: SpringSimulator

	constructor(character: Character, seat: VehicleSeat, entryPoint: THREE.Object3D) {
		super(character)
		// bind functions
		this.update = this.update.bind(this)

		// init
		this.canFindVehiclesToEnter = false
		this.seat = seat
		this.entryPoint = entryPoint

		const side = Utility.detectRelativeSide(entryPoint, seat.seatPointObject)
		if (side === Side.Left) {
			this.playAnimation('open_door_standing_left', 0.1)
		} else if (side === Side.Right) {
			this.playAnimation('open_door_standing_right', 0.1)
		}

		this.character.resetVelocity()
		this.character.rotateModel()
		this.character.setPhysicsEnabled(false)

		if (
			this.character.world !== null &&
			(!this.character.world.isClient || (this.character.world.isClient && this.character.world.worldId === null))
		)
			this.seat.vehicle.attach(this.character)

		this.startPosition.copy(this.character.position)
		this.endPosition.copy(this.entryPoint.position)
		this.endPosition.y += 0.53

		this.startRotation.copy(this.character.quaternion)
		this.endRotation.copy(this.entryPoint.quaternion)

		this.factorSimluator = new SpringSimulator(60, 10, 0.5)
		this.factorSimluator.target = 1
	}

	public async update(timeStep: number): Promise<void> {
		await super.update(timeStep)

		if (this.timer > 0.3 && !this.hasOpenedDoor) {
			this.hasOpenedDoor = true
			if (this.seat.door !== null) this.seat.door.open()
		}

		if (this.animationEnded(timeStep)) {
			if (this.anyDirection()) {
				this.character.vehicleEntryInstance = null
				this.character.setPhysicsEnabled(true)
				if (
					this.character.world !== null &&
					(!this.character.world.isClient ||
						(this.character.world.isClient && this.character.world.worldId === null))
				)
					this.character.world.scene.attach(this.character)
				this.character.setState(new Idle(this.character))
			} else {
				this.character.setState(new EnteringVehicle(this.character, this.seat, this.entryPoint))
			}
		} else {
			this.factorSimluator.simulate(timeStep)

			let lerpPosition = new THREE.Vector3().lerpVectors(
				this.startPosition,
				this.endPosition,
				this.factorSimluator.position
			)
			if (
				this.character.world !== null &&
				(!this.character.world.isClient ||
					(this.character.world.isClient && this.character.world.worldId === null))
			) {
				this.character.setPosition(lerpPosition.x, lerpPosition.y, lerpPosition.z)
				this.character.quaternion.slerp(this.endRotation, this.factorSimluator.position)
			}
		}
	}
}

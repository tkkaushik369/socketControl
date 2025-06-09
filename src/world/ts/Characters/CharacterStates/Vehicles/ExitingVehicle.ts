import * as THREE from 'three'
import { Utility } from '../../../Core/Utility'

import { Character } from '../../Character'
import { Side } from '../../../Enums/Side'
import { VehicleSeat } from '../../../Vehicles/VehicleSeat'
import { CloseVehicleDoorOutside, ExitingStateBase } from './_VehicleStateLibrary'
import { Falling, DropRolling, Idle } from '../_CharacterStateLibrary'

export class ExitingVehicle extends ExitingStateBase {
	state = 'ExitingVehicle'

	constructor(character: Character, seat: VehicleSeat) {
		super(character, seat)
		// bind functions
		this.update = this.update.bind(this)

		// init
		this.exitPoint = seat.entryPoints[0]

		this.endPosition.copy(this.exitPoint.position)
		this.endPosition.y += 0.52

		const side = Utility.detectRelativeSide(seat.seatPointObject, this.exitPoint)
		if (side === Side.Left) {
			this.playAnimation('stand_up_left', 0.1)
		} else if (side === Side.Right) {
			this.playAnimation('stand_up_right', 0.1)
		}
	}

	public async update(timeStep: number): Promise<void> {
		await super.update(timeStep)

		if (this.animationEnded(timeStep)) {
			this.detachCharacterFromVehicle()

			if (this.seat.door !== null) this.seat.door.physicsEnabled = true

			if (!this.character.rayHasHit) {
				this.character.leaveSeat()
				this.character.setState(new Falling(this.character))
			} else if (this.vehicle.collision.velocity.length() > 1) {
				this.character.leaveSeat()
				this.character.setState(new DropRolling(this.character))
			} else if (this.anyDirection() || this.seat.door === null) {
				this.character.leaveSeat()
				this.character.setState(new Idle(this.character))
			} else {
				this.character.setState(new CloseVehicleDoorOutside(this.character, this.seat))
			}
		} else {
			// Door
			if (this.seat.door) {
				this.seat.door.physicsEnabled = false
			}

			// Position
			let factor = this.timer / this.animationLength
			let smoothFactor = Utility.easeInOutSine(factor)
			let lerpPosition = new THREE.Vector3().lerpVectors(this.startPosition, this.endPosition, smoothFactor)
			if (
				this.character.world !== null &&
				(!this.character.world.isClient ||
					(this.character.world.isClient && this.character.world.worldId === null))
			) {
				this.character.setPosition(lerpPosition.x, lerpPosition.y, lerpPosition.z)

				// Rotation
				this.updateEndRotation()
				this.character.quaternion.slerp(this.endRotation, smoothFactor)
			}
		}
	}
}

import * as THREE from 'three'
import * as Utils from '../../../Core/FunctionLibrary'

import { Falling } from '../_CharacterStateLibrary'
import { ExitingStateBase } from './_VehicleStateLibrary'
import { Character } from '../../Character'
import { VehicleSeat } from '../../../Vehicles/VehicleSeat'

export class ExitingAirplane extends ExitingStateBase {
	state = 'ExitingAirplane'

	constructor(character: Character, seat: VehicleSeat) {
		super(character, seat)
		// bind functions
		this.update = this.update.bind(this)

		// init
		this.endPosition.copy(this.startPosition)
		this.endPosition.y += 1

		const quat = Utils.threeQuat(seat.vehicle.collision.quaternion)
		const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(quat)
		this.exitPoint = new THREE.Object3D()
		this.exitPoint.lookAt(forward)
		this.exitPoint.position.copy(this.endPosition)

		this.playAnimation('jump_idle', 0.1)
	}

	public update(timeStep: number): void {
		super.update(timeStep)

		if (this.animationEnded(timeStep)) {
			this.detachCharacterFromVehicle()
			this.character.setState(new Falling(this.character))
			this.character.leaveSeat()
		}
		else {
			let beginningCutoff = 0.3
			let factor = THREE.MathUtils.clamp(((this.timer / this.animationLength) - beginningCutoff) * (1 / (1 - beginningCutoff)), 0, 1)
			let smoothFactor = Utils.easeOutQuad(factor)
			let lerpPosition = new THREE.Vector3().lerpVectors(this.startPosition, this.endPosition, smoothFactor)
			this.character.setPosition(lerpPosition.x, lerpPosition.y, lerpPosition.z)

			// Rotation
			this.updateEndRotation()
			this.character.quaternion.slerp(this.endRotation, smoothFactor)
		}
	}
}
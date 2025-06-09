import { CharacterStateBase } from '../_CharacterStateLibrary'
import { Character } from '../../Character'
import { VehicleSeat } from '../../../Vehicles/VehicleSeat'
import { CloseVehicleDoorInside } from './_VehicleStateLibrary'

export class Driving extends CharacterStateBase {
	state = 'Driving'
	public seat: VehicleSeat

	constructor(character: Character, seat: VehicleSeat) {
		super(character)
		// bind functions
		this.update = this.update.bind(this)

		// init
		this.seat = seat
		this.canFindVehiclesToEnter = false
		this.playAnimation('driving', 0.1)

		this.character.startControllingVehicle(seat.vehicle, this.seat)
		this.seat.vehicle.onInputChange()
		this.character.vehicleEntryInstance = null
	}

	public async update(timeStep: number): Promise<void> {
		await super.update(timeStep)
		if (this.seat.door === null) return

		if (
			!this.seat.door.achievingTargetRotation &&
			this.seat.door.rotation > 0 &&
			this.seat.vehicle.noDirectionPressed()
		) {
			this.character.setState(new CloseVehicleDoorInside(this.character, this.seat))
		}
	}
}

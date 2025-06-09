import { CharacterStateBase } from '../_CharacterStateLibrary'
import { Driving, Sitting } from './_VehicleStateLibrary'
import { Character } from '../../Character'
import { VehicleSeat } from '../../../Vehicles/VehicleSeat'
import { Side } from '../../../Enums/Side'
import { SeatType } from '../../../Enums/SeatType'
import { Utility } from '../../../Core/Utility'

export class CloseVehicleDoorInside extends CharacterStateBase {
	state = 'CloseVehicleDoorInside'
	public seat: VehicleSeat
	private hasClosedDoor: boolean = false

	constructor(character: Character, seat: VehicleSeat) {
		super(character)
		// bind functions
		this.update = this.update.bind(this)

		// init
		this.seat = seat
		this.canFindVehiclesToEnter = false
		this.canLeaveVehicles = false

		if (this.seat.door !== null) {
			const side = Utility.detectRelativeSide(this.seat.seatPointObject, this.seat.door.doorObject)
			if (side === Side.Left) {
				this.playAnimation('close_door_sitting_left', 0.1)
			} else if (side === Side.Right) {
				this.playAnimation('close_door_sitting_right', 0.1)
			}
			this.seat.door.open()
		}
	}

	public async update(timeStep: number): Promise<void> {
		await super.update(timeStep)

		if (this.timer > 0.4 && !this.hasClosedDoor) {
			this.hasClosedDoor = true
			if (this.seat.door !== null) this.seat.door.close()
		}

		if (this.animationEnded(timeStep)) {
			if (this.seat.type === SeatType.Driver) {
				this.character.setState(new Driving(this.character, this.seat))
			} else if (this.seat.type === SeatType.Passenger) {
				this.character.setState(new Sitting(this.character, this.seat))
			}
		}
	}
}

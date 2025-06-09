import { CharacterStateBase } from '../_CharacterStateLibrary'
import { Character } from '../../Character'
import { VehicleSeat } from '../../../Vehicles/VehicleSeat'
import { Side } from '../../../Enums/Side'
import { Idle } from '../Idle'
import { Utility } from '../../../Core/Utility'

export class CloseVehicleDoorOutside extends CharacterStateBase {
	state = 'CloseVehicleDoorOutside'
	public seat: VehicleSeat
	private hasClosedDoor: boolean = false

	constructor(character: Character, seat: VehicleSeat) {
		super(character)
		// bind functions
		this.update = this.update.bind(this)

		// init
		this.seat = seat
		this.canFindVehiclesToEnter = false

		if (this.seat.door !== null) {
			const side = Utility.detectRelativeSide(this.seat.seatPointObject, this.seat.door.doorObject)
			if (side === Side.Left) {
				this.playAnimation('close_door_standing_right', 0.1)
			} else if (side === Side.Right) {
				this.playAnimation('close_door_standing_left', 0.1)
			}
		}
	}

	public async update(timeStep: number): Promise<void> {
		await super.update(timeStep)

		if (this.timer > 0.3 && !this.hasClosedDoor) {
			this.hasClosedDoor = true
			if (this.seat.door !== null) this.seat.door.close()
		}

		if (this.animationEnded(timeStep)) {
			this.character.setState(new Idle(this.character))
			this.character.leaveSeat()
		}
	}
}

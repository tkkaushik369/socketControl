import {
	CharacterStateBase,
} from '../_CharacterStateLibrary'
import {
	CloseVehicleDoorInside,
	SwitchingSeats
} from './_VehicleStateLibrary'
import { Character } from '../../Character'
import { VehicleSeat } from '../../../Vehicles/VehicleSeat'
import { SeatType } from '../../../Enums/SeatType'

export class Sitting extends CharacterStateBase {
	state = 'Sitting'
	public seat: VehicleSeat

	constructor(character: Character, seat: VehicleSeat) {
		super(character)
		// bind functions
		this.update = this.update.bind(this)
		this.onInputChange = this.onInputChange.bind(this)

		// init
		this.seat = seat
		this.canFindVehiclesToEnter = false

		if (this.character.world !== null) {
			if (this.character.world.updateControlsCallBack !== null) {
				this.character.world.updateControlsCallBack([
					{
						keys: ['X'],
						desc: 'Switch seats',
					},
					{
						keys: ['F'],
						desc: 'Leave seat',
					}
				])
			}
		}

		this.playAnimation('sitting', 0.1)
	}

	public update(timeStep: number): void {
		super.update(timeStep)
		if ((this.seat.door !== null) && !this.seat.door.achievingTargetRotation && (this.seat.door.rotation > 0) && this.noDirection()) {
			this.character.setState(new CloseVehicleDoorInside(this.character, this.seat))
		}
		else if (this.character.vehicleEntryInstance !== null) {
			if (this.character.vehicleEntryInstance.wantsToDrive) {
				for (const possibleDriverSeat of this.seat.connectedSeats) {
					if (possibleDriverSeat.type === SeatType.Driver) {
						if ((this.seat.door !== null) && this.seat.door.rotation > 0) this.seat.door.physicsEnabled = true
						if (possibleDriverSeat.occupiedBy === null)
							this.character.setState(new SwitchingSeats(this.character, this.seat, possibleDriverSeat))
						break
					}
				}
			}
			else {
				this.character.vehicleEntryInstance = null
			}
		}
	}

	public onInputChange(): void {
		if (this.character.actions.seat_switch.justPressed && this.seat.connectedSeats.length > 0) {
			if (this.seat.connectedSeats[0].occupiedBy === null)
				this.character.setState(new SwitchingSeats(this.character, this.seat, this.seat.connectedSeats[0]))
		}

		if (this.character.actions.enter.justPressed) {
			this.character.exitVehicle()
			this.character.displayControls()
		}
	}
}
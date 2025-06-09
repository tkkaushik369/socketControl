import * as THREE from 'three'
import { Character } from '../Characters/Character'
import { IInputReceiver } from './IInputReceiver'
import { VehicleSeat } from '../Vehicles/VehicleSeat'
import { EntityType } from '../Enums/EntityType'

export interface IControllable extends IInputReceiver {
	entityType: EntityType
	seats: VehicleSeat[]
	position: THREE.Vector3
	controllingCharacter: Character | null

	triggerAction(actionName: string, value: boolean): void
	resetControls(): void
	allowSleep(value: boolean): void
	onInputChange(): void
	noDirectionPressed(): boolean
}

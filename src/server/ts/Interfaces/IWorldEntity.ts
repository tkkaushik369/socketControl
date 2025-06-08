import { WorldBase } from '@WorldBase'
import { EntityType } from '../Enums/EntityType'
import { IUpdatable } from './IUpdatable'

export interface IWorldEntity extends IUpdatable {
	entityType: EntityType

	addToWorld(world: WorldBase): void
	removeFromWorld(world: WorldBase): void
}

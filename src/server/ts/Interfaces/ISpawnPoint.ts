import { WorldBase } from '../World/WorldBase'

export interface ISpawnPoint {
	spawn(world: WorldBase): any
}
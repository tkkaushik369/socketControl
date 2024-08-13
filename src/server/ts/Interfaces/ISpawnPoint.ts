import { WorldBase } from '../World/WorldBase'

export interface ISpawnPoint {
	userData: { [id: string]: any }
	spawn(world: WorldBase): any
}
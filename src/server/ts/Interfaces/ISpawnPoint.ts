import { WorldBase } from '../World/WorldBase'
import * as THREE from 'three'

export interface ISpawnPoint {
	object: THREE.Object3D
	userData: { [id: string]: any }
	spawn(world: WorldBase): any
}
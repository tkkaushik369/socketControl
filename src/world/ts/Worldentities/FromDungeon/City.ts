import * as THREE from 'three'
import { Building } from './Building'

export class City {
	data: {
		pos: { x: number; z: number }[]
		cubes: { w: number; h: number; d: number; y: number; pos: number }[]
		lines: { pos1: number; pos2: number; color: number }[]
	}
	buildings: Building[]

	constructor(
		scene: THREE.Object3D,
		scene_data: {
			pos: { x: number; z: number }[]
			cubes: { w: number; h: number; d: number; y: number; pos: number }[]
			lines: { pos1: number; pos2: number; color: number }[]
		},
		scale: number = 1
	) {
		this.data = scene_data
		this.buildings = []
		scene_data.cubes.forEach((cube) => this.buildings.push(new Building(scene, scene_data.pos, cube, scale)))
	}
}

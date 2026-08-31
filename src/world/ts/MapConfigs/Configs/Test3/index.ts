import { MapConfigType, MapConfigFOType } from '../../index'
import { Test3Scene } from './Test3Scene'

export const Test3Config: MapConfigType = {
	name: 'test3',
	subMaps: [
		{
			isMain: true,
			subName: 'test3',
			mapCaller: new Test3Scene(),
			position: { x: 0, y: 0, z: 0 },
			rotation: { x: 0, y: 0, z: 0 },
			portal: [],
		},
	],
	isCallback: true,
	isLaunched: true,
	characters: [],
	vehicles: [],
	trains: [],
}

const character: MapConfigFOType = {
	objCaller: 'boxman.glb',
	type: 'character',
	subtype: null,
}

const car: MapConfigFOType = {
	objCaller: 'car.glb',
	type: 'car',
	subtype: null,
}

const heli: MapConfigFOType = {
	objCaller: 'heli.glb',
	type: 'heli',
	subtype: null,
}

Test3Config.characters.push(character)
Test3Config.vehicles.push(car)
Test3Config.vehicles.push(heli)

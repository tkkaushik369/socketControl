import { MapConfigType, MapConfigFOType } from '../../index'
import { Test3Scene } from './Test3Scene'

export const Test3Config: MapConfigType = {
	name: 'test3',
	mapCaller: new Test3Scene(),
	isCallback: true,
	isLaunched: true,
	characters: [],
	vehicles: [],
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

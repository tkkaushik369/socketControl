import { MapConfigType, MapConfigFOType } from '../../index'
import { Test2Scene } from './Test3Scene'

export const Test3Config: MapConfigType = {
	name: 'test3',
	mapCaller: new Test2Scene(),
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

Test3Config.characters.push(character)
Test3Config.vehicles.push(car)

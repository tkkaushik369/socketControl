import { MapConfigType, MapConfigFOType } from '../../index'
import { Example } from '../Example/ExampleScene'
import { GridWorldScene } from './GridWorldScene'

export const GridWorldConfig: MapConfigType = {
	name: 'Grid World',
	subMaps: [
		{
			isMain: true,
			subName: 'Grid World',
			mapCaller: new GridWorldScene(),
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

const car_test: MapConfigFOType = {
	objCaller: new Example(),
	type: 'car',
	subtype: 'car_test',
}

GridWorldConfig.characters.push(character)
GridWorldConfig.vehicles.push(car)
GridWorldConfig.vehicles.push(car_test)

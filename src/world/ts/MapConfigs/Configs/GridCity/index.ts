import { MapConfigType, MapConfigFOType } from '../../index'
import { Example } from '../Example/ExampleScene'
import { GridCityScene } from './GridCityScene'

export const GridCityConfig: MapConfigType = {
	name: 'Grid City',
	subMaps: [
		{
			isMain: true,
			subName: 'Grid City',
			mapCaller: new GridCityScene(),
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

GridCityConfig.characters.push(character)
GridCityConfig.vehicles.push(car)
GridCityConfig.vehicles.push(car_test)

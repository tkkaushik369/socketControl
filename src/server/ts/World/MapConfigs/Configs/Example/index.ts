import { MapConfigType, MapConfigFOType } from '../../'
import { Example } from './ExampleScene'

export const ExampleConfig: MapConfigType = {
	name: 'example',
	mapCaller: new Example(),
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
const airplane: MapConfigFOType = {
	objCaller: 'airplane.glb',
	type: 'airplane',
	subtype: null,
}

const car_test: MapConfigFOType = {
	objCaller: new Example(),
	type: 'car',
	subtype: 'car_test',
}

const heli_test: MapConfigFOType = {
	objCaller: new Example(),
	type: 'heli',
	subtype: 'heli_test',
}

const airplane_test: MapConfigFOType = {
	objCaller: new Example(),
	type: 'airplane',
	subtype: 'airplane_test',
}

ExampleConfig.characters.push(character)
ExampleConfig.vehicles.push(car)
ExampleConfig.vehicles.push(car_test)
ExampleConfig.vehicles.push(heli)
ExampleConfig.vehicles.push(heli_test)
ExampleConfig.vehicles.push(airplane)
ExampleConfig.vehicles.push(airplane_test)
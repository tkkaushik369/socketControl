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

const car_lego: MapConfigFOType = {
	objCaller: new Example(),
	type: 'car',
	subtype: 'car_lego',
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

ExampleConfig.vehicles.push(car)
ExampleConfig.vehicles.push(car_test)
ExampleConfig.vehicles.push(car_lego)
ExampleConfig.vehicles.push(heli)
ExampleConfig.vehicles.push(heli_test)
ExampleConfig.vehicles.push(airplane)
ExampleConfig.vehicles.push(airplane_test)
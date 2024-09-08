import { MapConfigType, MapConfigFOType } from '../../'

export const SketchBookConfig: MapConfigType = {
	name: 'sketchbook',
	mapCaller: 'world.glb',
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


SketchBookConfig.vehicles.push(car)
SketchBookConfig.vehicles.push(heli)
SketchBookConfig.vehicles.push(airplane)
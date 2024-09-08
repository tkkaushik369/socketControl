import { MapConfigType, MapConfigFOType } from '../..'

export const SketchBookV4Config: MapConfigType = {
	name: 'sketchbook v0.4',
	mapCaller: 'world_v4.glb',
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


SketchBookV4Config.vehicles.push(car)
SketchBookV4Config.vehicles.push(heli)
SketchBookV4Config.vehicles.push(airplane)
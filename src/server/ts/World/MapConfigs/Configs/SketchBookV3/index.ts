import { MapConfigType, MapConfigFOType } from '../..'

export const SketchBookV3Config: MapConfigType = {
	name: 'sketchbook v0.3',
	mapCaller: 'world_v3.1.glb',
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

SketchBookV3Config.characters.push(character)
SketchBookV3Config.vehicles.push(car)
SketchBookV3Config.vehicles.push(heli)
SketchBookV3Config.vehicles.push(airplane)
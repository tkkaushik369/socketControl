import { MapConfigType, MapConfigFOType } from '../../'
import { TestScene } from "./TestScene";

export const TestConfig: MapConfigType = {
	name: 'test',
	// mapCaller: 'boxman.glb',
	mapCaller: new TestScene(),
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

TestConfig.characters.push(character)
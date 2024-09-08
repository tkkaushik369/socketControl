import { MapConfigType } from '../../'
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
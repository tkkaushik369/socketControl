import { MapConfigType, MapConfigFOType } from '../../index'
import { TestScene } from './TestScene'

export const TestConfig: MapConfigType = {
	name: 'test',
	// mapCaller: 'boxman.glb',
	subMaps: [
		{
			isMain: true,
			subName: 'test',
			mapCaller: new TestScene(),
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

/* const character: MapConfigFOType = {
	objCaller: 'boxman.glb',
	type: 'character',
	subtype: null,
}

TestConfig.characters.push(character) */

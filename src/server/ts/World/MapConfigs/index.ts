import { BaseScene } from '../BaseScene'
import * as Config from './Configs'

export type MapConfigFOType = {
	objCaller: string | BaseScene,
	type: string,
	subtype: string | null,
}

export type MapConfigType = {
	name: string,
	isCallback: boolean,
	mapCaller: string | BaseScene
	isLaunched: boolean,
	characters: MapConfigFOType[],
	vehicles: MapConfigFOType[],
}

export var MapConfig: { [id: string]: MapConfigType } = {}

Object.keys(Config).forEach((mapName) => {
	// console.log("MapLoader: ", mapName)
	let mc =  (Config as { [id: string]: unknown })[mapName] as MapConfigType
	MapConfig[mc.name] = mc
});
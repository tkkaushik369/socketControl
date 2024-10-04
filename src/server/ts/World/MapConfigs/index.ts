import { BaseScene } from '../BaseScene'
import { ExampleConfig } from './Configs/Example'
import { SketchBookV3Config } from './Configs/SketchBookV3'
import { SketchBookV4Config } from './Configs/SketchBookV4'
import { TestConfig } from './Configs/Test'
import { Test2Config } from './Configs/Test2'

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

MapConfig[Test2Config.name] = Test2Config
MapConfig[ExampleConfig.name] = ExampleConfig
MapConfig[SketchBookV4Config.name] = SketchBookV4Config
MapConfig[SketchBookV3Config.name] = SketchBookV3Config
MapConfig[TestConfig.name] = TestConfig
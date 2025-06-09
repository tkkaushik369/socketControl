import { BaseScene } from './BaseScene'
import { ExampleConfig } from './Configs/Example/index'
import { SketchBookV3Config } from './Configs/SketchBookV3/index'
import { SketchBookV4Config } from './Configs/SketchBookV4/index'
import { TestConfig } from './Configs/Test/index'
import { Test2Config } from './Configs/Test2/index'
import { Test3Config } from './Configs/Test3/index'

export type MapConfigFOType = {
	objCaller: string | BaseScene
	type: string
	subtype: string | null
}

export type MapConfigType = {
	name: string
	isCallback: boolean
	mapCaller: string | BaseScene
	isLaunched: boolean
	characters: MapConfigFOType[]
	vehicles: MapConfigFOType[]
}

export var MapConfig: { [id: string]: MapConfigType } = {}

MapConfig[Test2Config.name] = Test2Config
MapConfig[Test3Config.name] = Test3Config
MapConfig[ExampleConfig.name] = ExampleConfig
MapConfig[SketchBookV3Config.name] = SketchBookV3Config
MapConfig[SketchBookV4Config.name] = SketchBookV4Config
MapConfig[TestConfig.name] = TestConfig

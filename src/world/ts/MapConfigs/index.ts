// import test from '../../../client/models/MapConfigs/test.json'
// import test2 from '../../../client/models/MapConfigs/test2.json'
// import test3 from '../../../client/models/MapConfigs/test3.json'
// import example from '../../../client/models/MapConfigs/example.json'
// import sketchbookv3 from '../../../client/models/MapConfigs/sketchbookv3.json'
// import sketchbookv4 from '../../../client/models/MapConfigs/sketchbookv4.json'

import { WorldBase } from '../WorldBase'
import { BaseScene } from './BaseScene'

// import { ExampleConfig } from './Configs/Example/index'
// import { SketchBookV3Config } from './Configs/SketchBookV3/index'
// import { SketchBookV4Config } from './Configs/SketchBookV4/index'
// import { TestConfig } from './Configs/Test/index'
// import { Test2Config } from './Configs/Test2/index'
// import { Test3Config } from './Configs/Test3/index'

import { Example } from './Configs/Example/ExampleScene'
import { TestScene } from './Configs/Test/TestScene'
import { Test2Scene } from './Configs/Test2/Test2Scene'
import { Test3Scene } from './Configs/Test3/Test3Scene'

export type MapConfigFOType = {
	objCaller: string | BaseScene
	type: string
	subtype: string | null
}

export type MapConfigType = {
	name: string
	isCallback: boolean
	isLaunched: boolean
	mapCaller: string | BaseScene
	characters: MapConfigFOType[]
	vehicles: MapConfigFOType[]
}

function MapConfigurator(conf: { [id: string]: any }): MapConfigType {
	let config: MapConfigType = {
		name: conf.name,
		isCallback: Boolean(conf.isCallback),
		isLaunched: Boolean(conf.isLaunched),
		mapCaller: '',
		characters: [],
		vehicles: [],
	}
	if (typeof conf.mapCaller === 'string' && conf.mapCaller.includes('class:')) {
		let mapCaller = conf.mapCaller.replace('class:', '')
		switch (mapCaller) {
			case 'Example': {
				config.mapCaller = new Example()
				break
			}
			case 'TestScene': {
				config.mapCaller = new TestScene()
				break
			}
			case 'Test2Scene': {
				config.mapCaller = new Test2Scene()
				break
			}
			case 'Test3Scene': {
				config.mapCaller = new Test3Scene()
				break
			}
			default: {
				config.mapCaller = new TestScene()
				break
			}
		}
	} else config.mapCaller = conf.mapCaller
	conf.characters.forEach((character: any) => {
		let charConf: MapConfigFOType = {
			objCaller: 'boxman.glb',
			type: 'character',
			subtype: null,
		}
		if (typeof character.objCaller === 'string' && character.objCaller.includes('class:')) {
			/* let objCaller = character.objCaller.replace('class:', '')
			switch (objCaller) {
				default: {
					charConf.objCaller = new TestScene()
					break
				}
			} */
		} else charConf.objCaller = character.objCaller
		charConf.type = character.type
		charConf.subtype = character.subtype
		config.characters.push(charConf)
	})
	conf.vehicles.forEach((vehicles: any) => {
		let vehiConf: MapConfigFOType = {
			objCaller: 'car.glb',
			type: 'car',
			subtype: null,
		}
		if (typeof vehicles.objCaller === 'string' && vehicles.objCaller.includes('class:')) {
			let objCaller = vehicles.objCaller.replace('class:', '')
			switch (objCaller) {
				case 'Example': {
					vehiConf.objCaller = new Example()
					break
				}
				case 'TestScene': {
					vehiConf.objCaller = new TestScene()
					break
				}
				case 'Test2Scene': {
					vehiConf.objCaller = new Test2Scene()
					break
				}
				case 'Test3Scene': {
					vehiConf.objCaller = new Test3Scene()
					break
				}
				default: {
					vehiConf.objCaller = new Example()
					break
				}
			}
		} else vehiConf.objCaller = vehicles.objCaller
		vehiConf.type = vehicles.type
		vehiConf.subtype = vehicles.subtype
		config.vehicles.push(vehiConf)
	})
	return config
}

export function getMapConfig(world: WorldBase, maps: MapConfigType[]): { [id: string]: MapConfigType } {
	var MapConfig: { [id: string]: MapConfigType } = {}

	// const allConfigs = [test2, test3, example, sketchbookv3, sketchbookv4, test]
	/* const allConfigs: MapConfigType[] = [
		Test2Config,
		Test3Config,
		ExampleConfig,
		SketchBookV3Config,
		SketchBookV4Config,
		TestConfig,
	] */

	/* const test2Conf = MapConfigurator(test2)
	MapConfig[test2Conf.name] = test2Conf
	// MapConfig[Test2Config.name] = Test2Config

	const test3Conf = MapConfigurator(test3)
	MapConfig[test3Conf.name] = test3Conf
	// MapConfig[Test3Config.name] = Test3Config

	const exampleConf = MapConfigurator(example)
	MapConfig[exampleConf.name] = exampleConf
	// MapConfig[ExampleConfig.name] = ExampleConfig

	const sketchbookv3Conf = MapConfigurator(sketchbookv3)
	MapConfig[sketchbookv3Conf.name] = sketchbookv3Conf
	// MapConfig[SketchBookV3Config.name] = SketchBookV3Config

	const sketchbookv4Conf = MapConfigurator(sketchbookv4)
	MapConfig[sketchbookv4Conf.name] = sketchbookv4Conf
	// MapConfig[SketchBookV4Config.name] = SketchBookV4Config

	const testConf = MapConfigurator(test)
	MapConfig[testConf.name] = testConf
	// MapConfig[TestConfig.name] = TestConfig */

	/* allConfigs.forEach((key: MapConfigType) => {
		const config = MapConfigurator(key)
		MapConfig[config.name] = config
		// MapConfig[key.name] = key
	}) */

	for (let i = 0; i < maps.length; i++) {
		const config = MapConfigurator(maps[i])
		MapConfig[config.name] = config
		// MapConfig[key.name] = key
	}

	/* const names = ['test', 'test2', 'test3', 'example', 'sketchbookv3', 'sketchbookv4']

	for (let i = 0; i < names.length; i++) {
		world.getJSON(`${names[i]}.json`, (data: any) => {
			const config = MapConfigurator(data)
			MapConfig[config.name] = config
			// console.log(config, typeof config)
		})
	} */
	return MapConfig
}

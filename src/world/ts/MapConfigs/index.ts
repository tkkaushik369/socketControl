import * as THREE from 'three'

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
import { GridCityScene } from './Configs/GridCity/GridCityScene'
import { GridWorldScene } from './Configs/GridWorld/GridWorldScene'
import { TestScene } from './Configs/Test/TestScene'
import { Test2Scene } from './Configs/Test2/Test2Scene'
import { Test3Scene } from './Configs/Test3/Test3Scene'

export type MapConfigFOType = {
	objCaller: string | BaseScene
	type: string
	subtype: string | null
}

export type MapInstanceConfig = {
	isMain: boolean
	subName: string
	mapCaller: string | BaseScene
	position: { x: number; y: number; z: number }
	rotation: { x: number; y: number; z: number }
	portal: {
		color: number
		name: string
		link_name: string
		position: { x: number; y: number; z: number }
		rotation: { x: number; y: number; z: number }
	}[]
}

export type MapConfigType = {
	name: string
	isCallback: boolean
	isLaunched: boolean
	subMaps: MapInstanceConfig[]
	characters: MapConfigFOType[]
	vehicles: MapConfigFOType[]
	trains: MapConfigFOType[]
}

function createMapCaller(world: WorldBase, caller: string): any {
	switch (caller.replace('class:', '')) {
		case 'Example':
			return new Example()

		case 'TestScene':
			return new TestScene()

		case 'Test2Scene':
			return new Test2Scene()

		case 'Test3Scene':
			return new Test3Scene()

		case 'GridCityScene':
			return new GridCityScene(world)

		case 'GridWorldScene':
			return new GridWorldScene(world)

		default:
			return new TestScene()
	}
}

function MapConfigurator(world: WorldBase, conf: { [id: string]: any }): MapConfigType {
	let config: MapConfigType = {
		name: conf.name,
		isCallback: Boolean(conf.isCallback),
		isLaunched: Boolean(conf.isLaunched),
		subMaps: [],
		characters: [],
		vehicles: [],
		trains: [],
	}

	for (let i = 0; i < conf.subMaps.length; i++) {
		let mapInstConf: MapInstanceConfig = {
			isMain: Boolean(conf.subMaps[i].isMain),
			subName: conf.subMaps[i].subName,
			mapCaller: conf.subMaps[i].mapCaller,
			position: { x: conf.subMaps[i].position.x, y: conf.subMaps[i].position.y, z: conf.subMaps[i].position.z },
			rotation: { x: conf.subMaps[i].rotation.x, y: conf.subMaps[i].rotation.y, z: conf.subMaps[i].rotation.z },
			portal: [],
		}

		if (typeof mapInstConf.mapCaller === 'string' && mapInstConf.mapCaller.includes('class:')) {
			let mapCaller = mapInstConf.mapCaller.replace('class:', '')
			switch (mapCaller) {
				case 'Example': {
					mapInstConf.mapCaller = new Example()
					break
				}
				case 'TestScene': {
					mapInstConf.mapCaller = new TestScene()
					break
				}
				case 'Test2Scene': {
					mapInstConf.mapCaller = new Test2Scene()
					break
				}
				case 'Test3Scene': {
					mapInstConf.mapCaller = new Test3Scene()
					break
				}
				case 'GridCityScene': {
					mapInstConf.mapCaller = new GridCityScene(world)
					break
				}
				case 'GridWorldScene': {
					mapInstConf.mapCaller = new GridWorldScene(world)
					break
				}
				default: {
					mapInstConf.mapCaller = new TestScene()
					break
				}
			}
		}

		mapInstConf.position = { x: mapInstConf.position.x, y: mapInstConf.position.y, z: mapInstConf.position.z }
		mapInstConf.rotation = { x: mapInstConf.rotation.x, y: mapInstConf.rotation.y, z: mapInstConf.rotation.z }

		conf.subMaps[i].portal.forEach((portal: any) => {
			const portal_data = {
				color: portal.color,
				name: portal.name,
				link_name: portal.link_name,
				position: {
					x: portal.position.x,
					y: portal.position.y,
					z: portal.position.z,
				},
				rotation: {
					x: portal.rotation.x,
					y: portal.rotation.y,
					z: portal.rotation.z,
				},
			}
			mapInstConf.portal.push(portal_data)
		})

		config.subMaps.push(mapInstConf)
	}

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
			/* switch (objCaller) {
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
				case 'GridCityScene': {
					vehiConf.objCaller = new GridCityScene(world)
					break
				}
				case 'GridWorldScene': {
					vehiConf.objCaller = new GridWorldScene(world)
					break
				}
				default: {
					vehiConf.objCaller = new Example()
					break
				}
			} */
			vehiConf.objCaller = createMapCaller(world, objCaller)
		} else vehiConf.objCaller = vehicles.objCaller
		vehiConf.type = vehicles.type
		vehiConf.subtype = vehicles.subtype
		config.vehicles.push(vehiConf)
	})

	conf.trains.forEach((trains: any) => {
		let trainConf: MapConfigFOType = {
			objCaller: 'class:Example',
			type: 'train',
			subtype: 'train_test',
		}
		if (typeof trains.objCaller === 'string' && trains.objCaller.includes('class:')) {
			let objCaller = trains.objCaller.replace('class:', '')
			/* switch (objCaller) {
				case 'Example': {
					trainConf.objCaller = new Example()
					break
				}
				case 'TestScene': {
					trainConf.objCaller = new TestScene()
					break
				}
				case 'Test2Scene': {
					trainConf.objCaller = new Test2Scene()
					break
				}
				case 'Test3Scene': {
					trainConf.objCaller = new Test3Scene()
					break
				}
				case 'GridCityScene': {
					trainConf.objCaller = new GridCityScene()
					break
				}
				case 'GridWorldScene': {
					trainConf.objCaller = new GridWorldScene()
					break
				}
				default: {
					trainConf.objCaller = new Example()
					break
				}
			} */
			trainConf.objCaller = createMapCaller(world, objCaller)
		} else trainConf.objCaller = trains.objCaller
		trainConf.type = trains.type
		trainConf.subtype = trains.subtype
		config.trains.push(trainConf)
	})
	return config
}

export function getMapConfig(world: WorldBase, subMaps: MapConfigType[]): { [id: string]: MapConfigType } {
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

	for (let i = 0; i < subMaps.length; i++) {
		const config = MapConfigurator(world, subMaps[i])
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

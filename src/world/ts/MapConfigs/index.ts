// import * as THREE from 'three'

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
	switch (caller) {
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
			throw new Error(`Unknown map caller: ${caller}`)
	}
}

function resolveCaller(world: WorldBase, caller: unknown): string | BaseScene {
	if (typeof caller !== 'string') {
		return caller as BaseScene
	}

	if (!caller.startsWith('class:')) {
		return caller
	}

	return createMapCaller(world, caller.slice('class:'.length))
}

function MapConfigurator(world: WorldBase, conf: any): MapConfigType {
	if (!conf || typeof conf !== 'object') {
		throw new Error('Invalid map config')
	}

	let config: MapConfigType = {
		name: conf.name ?? '',
		isCallback: conf.isCallback === true,
		isLaunched: conf.isLaunched === true,
		subMaps: [],
		characters: [],
		vehicles: [],
		trains: [],
	}

	const subMaps = Array.isArray(conf.subMaps) ? conf.subMaps : []
	const characters = Array.isArray(conf.characters) ? conf.characters : []
	const vehicles = Array.isArray(conf.vehicles) ? conf.vehicles : []
	const trains = Array.isArray(conf.trains) ? conf.trains : []

	for (const subMap of subMaps) {
		const position = subMap.position ?? { x: 0, y: 0, z: 0 }
		const rotation = subMap.rotation ?? { x: 0, y: 0, z: 0 }

		let mapInstConf: MapInstanceConfig = {
			isMain: Boolean(subMap.isMain),
			subName: subMap.subName,
			mapCaller: resolveCaller(world, subMap.mapCaller ?? 'class:TestScene'),
			position: { x: position.x ?? 0, y: position.y ?? 0, z: position.z ?? 0 },
			rotation: { x: rotation.x ?? 0, y: rotation.y ?? 0, z: rotation.z ?? 0 },
			portal: [],
		}

		// if (typeof mapInstConf.mapCaller === 'string' && mapInstConf.mapCaller.includes('class:')) {
		// 	/* let mapCaller = mapInstConf.mapCaller.slice('class:'.length)
		// 	switch (mapCaller) {
		// 		case 'Example': {
		// 			mapInstConf.mapCaller = new Example()
		// 			break
		// 		}
		// 		case 'TestScene': {
		// 			mapInstConf.mapCaller = new TestScene()
		// 			break
		// 		}
		// 		case 'Test2Scene': {
		// 			mapInstConf.mapCaller = new Test2Scene()
		// 			break
		// 		}
		// 		case 'Test3Scene': {
		// 			mapInstConf.mapCaller = new Test3Scene()
		// 			break
		// 		}
		// 		case 'GridCityScene': {
		// 			mapInstConf.mapCaller = new GridCityScene(world)
		// 			break
		// 		}
		// 		case 'GridWorldScene': {
		// 			mapInstConf.mapCaller = new GridWorldScene(world)
		// 			break
		// 		}
		// 		default: {
		// 			mapInstConf.mapCaller = new TestScene()
		// 			break
		// 		}
		// 	} */
		// 	const caller = mapInstConf.mapCaller.slice('class:'.length)
		// 	mapInstConf.mapCaller = createMapCaller(world, caller)
		// }

		const portals = Array.isArray(subMap.portal) ? subMap.portal : []

		for (const portal of portals) {
			const portalPosition = portal.position ?? {
				x: 0,
				y: 0,
				z: 0,
			}

			const portalRotation = portal.rotation ?? {
				x: 0,
				y: 0,
				z: 0,
			}
			mapInstConf.portal.push({
				color: portal.color ?? 0xffffff,
				name: portal.name ?? '',
				link_name: portal.link_name ?? '',
				position: {
					x: portal.position.x ?? 0,
					y: portal.position.y ?? 0,
					z: portal.position.z ?? 0,
				},
				rotation: {
					x: portal.rotation.x ?? 0,
					y: portal.rotation.y ?? 0,
					z: portal.rotation.z ?? 0,
				},
			})
		}

		config.subMaps.push(mapInstConf)
	}

	for (const character of characters) {
		// let charConf: MapConfigFOType = {
		// 	objCaller: 'boxman.glb',
		// 	type: 'character',
		// 	subtype: null,
		// }
		// if (typeof character.objCaller === 'string' && character.objCaller.includes('class:')) {
		// 	/* let objCaller = character.objCaller.slice('class:'.length)
		// 	switch (objCaller) {
		// 		default: {
		// 			charConf.objCaller = new TestScene()
		// 			break
		// 		}
		// 	} */
		// } else charConf.objCaller = character.objCaller
		// charConf.type = character.type
		// charConf.subtype = character.subtype
		// config.characters.push(charConf)

		config.characters.push({
			objCaller: resolveCaller(world, character.objCaller ?? 'boxman.glb'),

			type: character.type ?? 'character',
			subtype: character.subtype ?? null,
		})
	}

	for (const vehicle of vehicles) {
		// let vehiConf: MapConfigFOType = {
		// 	objCaller: 'car.glb',
		// 	type: 'car',
		// 	subtype: null,
		// }
		// if (typeof vehicle.objCaller === 'string' && vehicle.objCaller.includes('class:')) {
		// 	let objCaller = vehicle.objCaller.slice('class:'.length)
		// 	/* switch (objCaller) {
		// 		case 'Example': {
		// 			vehiConf.objCaller = new Example()
		// 			break
		// 		}
		// 		case 'TestScene': {
		// 			vehiConf.objCaller = new TestScene()
		// 			break
		// 		}
		// 		case 'Test2Scene': {
		// 			vehiConf.objCaller = new Test2Scene()
		// 			break
		// 		}
		// 		case 'Test3Scene': {
		// 			vehiConf.objCaller = new Test3Scene()
		// 			break
		// 		}
		// 		case 'GridCityScene': {
		// 			vehiConf.objCaller = new GridCityScene(world)
		// 			break
		// 		}
		// 		case 'GridWorldScene': {
		// 			vehiConf.objCaller = new GridWorldScene(world)
		// 			break
		// 		}
		// 		default: {
		// 			vehiConf.objCaller = new Example()
		// 			break
		// 		}
		// 	} */
		// 	vehiConf.objCaller = createMapCaller(world, objCaller)
		// } else vehiConf.objCaller = vehicle.objCaller
		// vehiConf.type = vehicle.type
		// vehiConf.subtype = vehicle.subtype
		// config.vehicles.push(vehiConf)

		config.vehicles.push({
			objCaller: resolveCaller(world, vehicle.objCaller ?? 'car.glb'),

			type: vehicle.type ?? 'car',
			subtype: vehicle.subtype ?? null,
		})
	}

	for (const train of trains) {
		// let trainConf: MapConfigFOType = {
		// 	objCaller: 'class:Example',
		// 	type: 'train',
		// 	subtype: 'train_test',
		// }
		// if (typeof train.objCaller === 'string' && train.objCaller.includes('class:')) {
		// 	let objCaller = train.objCaller.slice('class:'.length)
		// 	/* switch (objCaller) {
		// 		case 'Example': {
		// 			trainConf.objCaller = new Example()
		// 			break
		// 		}
		// 		case 'TestScene': {
		// 			trainConf.objCaller = new TestScene()
		// 			break
		// 		}
		// 		case 'Test2Scene': {
		// 			trainConf.objCaller = new Test2Scene()
		// 			break
		// 		}
		// 		case 'Test3Scene': {
		// 			trainConf.objCaller = new Test3Scene()
		// 			break
		// 		}
		// 		case 'GridCityScene': {
		// 			trainConf.objCaller = new GridCityScene()
		// 			break
		// 		}
		// 		case 'GridWorldScene': {
		// 			trainConf.objCaller = new GridWorldScene()
		// 			break
		// 		}
		// 		default: {
		// 			trainConf.objCaller = new Example()
		// 			break
		// 		}
		// 	} */
		// 	trainConf.objCaller = createMapCaller(world, objCaller)
		// } else trainConf.objCaller = train.objCaller
		// trainConf.type = train.type
		// trainConf.subtype = train.subtype
		// config.trains.push(trainConf)

		config.trains.push({
			objCaller: resolveCaller(world, train.objCaller ?? 'class:Example'),

			type: train.type ?? 'train',
			subtype: train.subtype ?? 'train_test',
		})
	}
	return config
}

export function getMapConfig(world: WorldBase, subMaps: MapConfigType[]): Record<string, MapConfigType> {
	var MapConfig: Record<string, MapConfigType> = {}

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

	for (const subMap of subMaps) {
		const config = MapConfigurator(world, subMap)
		if (!config) {
			continue
		}

		if (!config.name) {
			console.warn('Skipping config without name:', subMap)
			continue
		}
		if (MapConfig[config.name]) {
			console.warn(`Duplicate map config name "${config.name}"`, {
				previous: MapConfig[config.name],
				current: config,
			})
		}
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

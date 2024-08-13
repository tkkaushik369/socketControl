export type MapConfigFOType = {
	isFile: boolean,
	type: string,
	subtype: string | null,
}

export type MapConfigType = {
	name: string,
	isCallback: boolean,
	isLaunched: boolean,
	characters: MapConfigFOType[],
	vehicles: MapConfigFOType[],
}

export var MapConfig: MapConfigType[] = []

MapConfig.push({
	name: 'sketchbook',
	isCallback: true,
	isLaunched: true,
	characters: [],
	vehicles: [],
})

MapConfig.push({
	name: 'test',
	isCallback: true,
	isLaunched: true,
	characters: [],
	vehicles: [],
})
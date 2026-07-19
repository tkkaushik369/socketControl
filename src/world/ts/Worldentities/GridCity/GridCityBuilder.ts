import * as THREE from 'three'
import { WorldBase } from '@World'
import { LoadingTrackerEntry } from '../../Core/LoadingTrackerEntry'
import ParkMiller from 'park-miller'
import { Prefabs, clear_cache, MAX_INSTANCE } from './Prefabs'
import { Utility } from '../../Core/Utility'

const useWorker = true
const loaderGeo = new THREE.BufferGeometryLoader()
// var offWork: Worker | null = null
var offWork: any | null = null
var cityBuilder: { [id: string]: CityBuilder } = {}

function FromWorker(msg: any) {
	const builder = cityBuilder[msg.data.cityId]
	if (builder === undefined) return
	switch (msg.type) {
		case 'init': {
			if (builder.Init_Return !== null) builder.Init_Return(msg.data)
			break
		}
		case 'prefab_geo': {
			if (builder.Prefab_Geo_Return !== null) builder.Prefab_Geo_Return(msg.data)
			break
		}
		default: {
			console.log(msg)
			break
		}
	}
}

// Worker
// if (useWorker) {
// 	offWork = new Worker(new URL('./offscreen.js' /* , import.meta.url */), {
// 		type: 'module',
// 	})
// 	offWork.onmessage = FromWorker
// }

function getColor(color: string) {
	return Number('0x' + new THREE.Color(color).getHexString())
}

const colors = {
	0: getColor('#5a3d07'),
	1: getColor('#989b10'),
	2: getColor('#832d8f'),
	3: getColor('#1a1a1a'),
	31: getColor('#7a7a7a'),

	100: getColor('#989b10'),
	101: getColor('#1c47a5'),
	102: getColor('#439b10'),
	103: getColor('#8f2d35'),
}

export enum AllyBlockType {
	Empty = 0,
	Ally = 1,
	Corner = 2,
	Footpath = 3,

	Size0 = 100,
	Size1 = 101,
	Size2 = 102,
	Size3 = 103,
}

export type Settings = {
	preload_buildins: number
	seed: number
	size: number
	corner_size: number
	allysize: number
	floorsize: number
	corner: number
	footpath: number
	block_types_1: number
	block_types_2: number
	block_types_3: number
	renderDebug: number
	renderBuildings: boolean
	renderBuildingsRoofs: boolean
	renderBuildingsWindows: boolean
	simple_geometry: boolean
	renderDebugsBuildings: boolean
	renderDebugsBuildingsWireframe: boolean
	renderDebugsWireframe: boolean
	renderHelper: boolean
	renderLights: boolean
	renderNodePaths: boolean
}

export enum Orientation {
	Current = 0,
	North = 1,
	East = 2,
	South = 3,
	West = 4,
	NorthEast = 5,
	NorthWest = 6,
	SouthEast = 7,
	SouthWest = 8,
}

export class AllyBlock {
	private random: ParkMiller

	private settings: Settings

	public grid: number[][][]
	public buildings: {
		x: number
		z: number
		size: number
		o: Orientation
		floors: number
		type: number
	}[]
	public lights: { x: number; z: number; o: Orientation }[]
	public path_nodes: { x: number; z: number; ns: number[]; isc: boolean }[]
	public depth: number

	private geo: THREE.BoxGeometry
	public offset_position: THREE.Vector3
	public render_running: number
	public builder: CityBuilder

	constructor(builder: CityBuilder, random: ParkMiller, settings: Settings) {
		// bind functions
		this.startGrid = this.startGrid.bind(this)
		this.addCorners = this.addCorners.bind(this)
		this.addFootPath = this.addFootPath.bind(this)
		this.addConvergePoint = this.addConvergePoint.bind(this)
		this.copyConvergePoint = this.copyConvergePoint.bind(this)
		this.addBuildingsConfig = this.addBuildingsConfig.bind(this)
		this.addLightsConfig = this.addLightsConfig.bind(this)
		this.addPathNodesConfig = this.addPathNodesConfig.bind(this)
		this.generate = this.generate.bind(this)
		this.render = this.render.bind(this)
		this.renderReduce = this.renderReduce.bind(this)
		this.getData = this.getData.bind(this)
		this.setData = this.setData.bind(this)

		// init
		this.random = random
		this.render_running = 0
		this.builder = builder
		this.settings = settings
		this.grid = []
		this.buildings = []
		this.lights = []
		this.path_nodes = []
		this.depth = 2
		this.offset_position = new THREE.Vector3(0, 0, 0)

		this.geo = new THREE.BoxGeometry(0.5, 0.2, 0.5)
	}

	private startGrid() {
		const grid: number[][] = []
		for (let i = 0; i < this.settings.allysize; i++) {
			grid[i] = []
			for (let j = 0; j < this.settings.allysize; j++) {
				grid[i][j] = 0
			}
		}
		return grid
	}

	private addCorners(grid: number[][]) {
		// top left
		for (let i = 0; i < this.settings.corner; i++) {
			for (let j = 0; j < this.settings.corner; j++) {
				grid[i][j] = AllyBlockType.Corner
			}
		}

		// top right
		for (let i = 0; i < this.settings.corner; i++) {
			for (let j = 0; j < this.settings.corner; j++) {
				grid[i][j + this.settings.allysize - this.settings.corner] = AllyBlockType.Corner
			}
		}

		// bottom left
		for (let i = 0; i < this.settings.corner; i++) {
			for (let j = 0; j < this.settings.corner; j++) {
				grid[i + this.settings.allysize - this.settings.corner][j] = AllyBlockType.Corner
			}
		}

		// bottom right
		for (let i = 0; i < this.settings.corner; i++) {
			for (let j = 0; j < this.settings.corner; j++) {
				grid[i + this.settings.allysize - this.settings.corner][
					j + this.settings.allysize - this.settings.corner
				] = AllyBlockType.Corner
			}
		}
	}

	private addFootPath(grid: number[][], corner_gap: number = 0) {
		for (let i = corner_gap; i < this.settings.allysize - corner_gap; i++) {
			for (let j = 0; j < this.settings.footpath; j++) {
				grid[i][j] = AllyBlockType.Footpath
				grid[i][this.settings.allysize - j - 1] = AllyBlockType.Footpath
				grid[j][i] = AllyBlockType.Footpath
				grid[this.settings.allysize - j - 1][i] = AllyBlockType.Footpath
			}
		}
	}

	private addConvergePoint(grid: number[][]) {
		const doubleCorner = this.settings.corner * 2
		const entryRange = this.settings.allysize - doubleCorner

		const entryPointX = this.random.integerInRange(0, entryRange - 1)
		const entryPointZ = this.random.integerInRange(0, entryRange - 1)

		grid[entryPointX + this.settings.corner][entryPointZ + this.settings.corner] = AllyBlockType.Ally

		let foundAllyRoute = false
		let dir1 = 0
		let dir2 = 0
		while (!foundAllyRoute) {
			dir1 = this.random.integerInRange(0, 3)
			dir2 = this.random.integerInRange(0, 3)
			if (dir1 == dir2) continue
			foundAllyRoute = true
		}

		const self = this

		function go_x_plus() {
			for (
				let i = entryPointX + self.settings.corner + 1;
				i < entryRange - 1 - (self.settings.footpath - 1) + 2 * self.settings.corner;
				i++
			) {
				grid[i][entryPointZ + self.settings.corner] = AllyBlockType.Ally
			}
		}
		function go_x_minux() {
			for (let i = self.settings.footpath; i < self.settings.corner + entryPointX; i++) {
				grid[i][entryPointZ + self.settings.corner] = AllyBlockType.Ally
			}
		}
		function go_z_plus() {
			for (
				let i = entryPointZ + self.settings.corner + 1;
				i < entryRange - 1 - (self.settings.footpath - 1) + 2 * self.settings.corner;
				i++
			) {
				grid[entryPointX + self.settings.corner][i] = AllyBlockType.Ally
			}
		}
		function go_z_minux() {
			for (let i = self.settings.footpath; i < self.settings.corner + entryPointZ; i++) {
				grid[entryPointX + self.settings.corner][i] = AllyBlockType.Ally
			}
		}
		function go_dir(dir: number) {
			switch (dir) {
				default:
					break
				case 0:
					go_x_plus()
					break
				case 1:
					go_x_minux()
					break
				case 2:
					go_z_plus()
					break
				case 3:
					go_z_minux()
					break
			}
		}
		go_dir(dir1)
		go_dir(dir2)
	}

	private copyConvergePoint(gridFrom: number[][], gridTo: number[][]) {
		for (let i = 0; i < gridFrom.length; i++) {
			for (let j = 0; j < gridFrom[i].length; j++) {
				if (gridFrom[i][j] == AllyBlockType.Ally) {
					gridTo[i][j] = AllyBlockType.Ally
				}
			}
		}
	}

	private addBuildingsConfig(grid: number[][]) {
		const doubleCorner = this.settings.corner * 2
		const entryRange = this.settings.allysize - doubleCorner
		const self = this

		function checkForRoutes(x: number, z: number, buildingSize: number, dir: number) {
			if (dir == 0) {
				// console.log(x + buildingSize, entryRange - 1 - (self.footpath - 1) + 2 * self.corner)
				if (x + buildingSize > entryRange - 1 - (self.settings.footpath - 1) + 2 * self.settings.corner)
					return true
				for (let i = 0; i < buildingSize; i++) {
					for (let j = 0; j < buildingSize; j++) {
						// console.log( x + i, z + j, grid[x + i][z + j] == AllyBlockType.Ally, grid[x + i][z + j] == AllyBlockType.Footpath )
						if (
							grid[x + i][z + j] == AllyBlockType.Ally ||
							grid[x + i + j][z] == AllyBlockType.Footpath ||
							grid[x + i][z + j] > 100
						)
							return true
					}
				}
				return false
			} else if (dir == 1) {
				// console.log(z + buildingSize, entryRange - 1 - (self.footpath - 1) + 2 * self.corner)
				if (z + buildingSize > entryRange - 1 - (self.settings.footpath - 1) + 2 * self.settings.corner)
					return true
				for (let i = 0; i < buildingSize; i++) {
					for (let j = 0; j < buildingSize; j++) {
						// console.log( x - i, z + j, grid[x - i][z + j] == AllyBlockType.Ally, grid[x - i][z + j] == AllyBlockType.Footpath, grid[x - i][z + j], grid[x - i][z + j] > 100)
						if (
							grid[x - i][z + j] == AllyBlockType.Ally ||
							grid[x - i][z + j] == AllyBlockType.Footpath ||
							grid[x - i][z + j] > 100
						)
							return true
					}
				}
				return false
			} else if (dir == 2) {
				// console.log(x, z,  buildingSize, self.footpath, "left", x - buildingSize <= self.footpath)
				if (x - buildingSize < self.settings.footpath - 1) return true
				for (let i = 0; i < buildingSize; i++) {
					for (let j = 0; j < buildingSize; j++) {
						// console.log( x - i, z - j, grid[x - i][z - j] == AllyBlockType.Ally, grid[x - i][z - j] == AllyBlockType.Footpath )
						if (
							grid[x - i][z - j] == AllyBlockType.Ally ||
							grid[x - i][z - j] == AllyBlockType.Footpath ||
							grid[x - i][z - j] > 100
						)
							return true
					}
				}
				return false
			} else if (dir == 3) {
				// console.log(z - buildingSize, self.footpath)
				if (z - buildingSize < self.settings.footpath - 1) return true
				for (let i = 0; i < buildingSize; i++) {
					for (let j = 0; j < buildingSize; j++) {
						// console.log( x + i, z - j, grid[x + i][z - j] == AllyBlockType.Ally, grid[x + i][z - j] == AllyBlockType.Footpath, grid[x + i][z - j] > 100 )
						if (
							grid[x + i][z - j] == AllyBlockType.Ally ||
							grid[x + i][z - j] == AllyBlockType.Footpath ||
							grid[x + i][z - j] > 100
						)
							return true
					}
				}
				return false
			}
		}

		function checkOrientation(grid: number[][], i: number, j: number, s: number, s2: number) {
			if (grid[i][j] != AllyBlockType.Empty) return Orientation.Current
			let xs = 0,
				ys = 0

			let sxp = 1,
				sxm = 1
			let syp = 1,
				sym = 1

			if (s2 == 0) {
				sxp = s
				sxm = 1
				syp = s
				sym = 1
			} else if (s2 == 1) {
				sxp = 1
				sxm = s
				syp = s
				sym = 1
			} else if (s2 == 2) {
				sxp = 1
				sxm = s
				syp = 1
				sym = s
			} else if (s2 == 3) {
				sxp = s
				sxm = 1
				syp = 1
				sym = s
			}

			if (0 <= j - sym && grid[i][j - sym] == AllyBlockType.Footpath) {
				ys -= 1
			} else if (j + syp < grid[i].length && grid[i][j + syp] == AllyBlockType.Footpath) {
				ys += 1
			}
			if (0 <= i - sxm && grid[i - sxm][j] == AllyBlockType.Footpath) {
				xs -= 1
			} else if (i + sxp < grid.length && grid[i + sxp][j] == AllyBlockType.Footpath) {
				xs += 1
			}

			if (xs == 0 && ys == -1) {
				return Orientation.North
			} else if (xs == 1 && ys == -1) {
				return Orientation.NorthEast
			} else if (xs == 1 && ys == 0) {
				return Orientation.East
			} else if (xs == 1 && ys == 1) {
				return Orientation.SouthEast
			} else if (xs == 0 && ys == 1) {
				return Orientation.South
			} else if (xs == -1 && ys == 1) {
				return Orientation.SouthWest
			} else if (xs == -1 && ys == 0) {
				return Orientation.West
			} else if (xs == -1 && ys == -1) {
				return Orientation.NorthWest
			} else return Orientation.Current
		}

		function getBuildingData(buildingSize: number) {
			const floors = self.random.integerInRange(0, self.settings.floorsize)
			let building_type = 0
			if (buildingSize == 1) building_type = self.random.integerInRange(0, self.settings.block_types_1 - 1)
			else if (buildingSize == 2) building_type = self.random.integerInRange(0, self.settings.block_types_2 - 1)
			else if (buildingSize == 3) building_type = self.random.integerInRange(0, self.settings.block_types_3 - 1)
			return {
				building_type: building_type,
				floors: floors,
			}
		}

		// top: left - right
		for (
			let i = this.settings.footpath;
			i < entryRange - 1 - (this.settings.footpath - 1) + 2 * this.settings.corner;
			i++
		) {
			if (grid[i][this.settings.footpath] == AllyBlockType.Ally || grid[i][this.settings.footpath] > 100) continue

			let buildingSize = this.random.integerInRange(1, 3)
			let properSize = false
			// console.log(i, this.footpath, buildingSize)
			let loopCountLR = 0
			if (checkForRoutes(i, this.settings.footpath, buildingSize, 0)) {
				while (!properSize) {
					buildingSize = this.random.integerInRange(1, 3)
					loopCountLR++
					if (loopCountLR > 100) {
						console.log('loopCountLR')
						break
					}
					if (checkForRoutes(i, this.settings.footpath, buildingSize, 0)) continue
					properSize = true
				}
			}
			let posX = i
			let posY = this.settings.footpath
			posX -= this.settings.allysize / 2
			posY -= this.settings.allysize / 2
			posX += buildingSize / 2
			posY += buildingSize / 2
			const building_data = getBuildingData(buildingSize)

			this.buildings.push({
				x: posX,
				z: posY,
				size: buildingSize,
				o: checkOrientation(grid, i, this.settings.footpath, buildingSize, 0),
				floors: building_data.floors,
				type: building_data.building_type,
			})
			for (let j = 0; j < buildingSize; j++) {
				for (let k = 0; k < buildingSize; k++) {
					grid[i + j][this.settings.footpath + k] = 100 + buildingSize
				}
			}
			if (buildingSize > 1) i += buildingSize - 1
		}

		// right: top - bottom
		for (
			let i = this.settings.footpath + 1;
			i < entryRange - 1 - (self.settings.footpath - 1) + 2 * self.settings.corner;
			i++
		) {
			if (
				grid[this.settings.allysize - this.settings.footpath - 1][i] == AllyBlockType.Ally ||
				grid[this.settings.allysize - this.settings.footpath - 1][i] > 100
			)
				continue

			let buildingSize = this.random.integerInRange(1, 3)
			let properSize = false
			// console.log(this.allysize - this.footpath - 1, i, buildingSize)
			let loopCountTB = 0
			if (checkForRoutes(this.settings.allysize - this.settings.footpath - 1, i, buildingSize, 1)) {
				while (!properSize) {
					buildingSize = this.random.integerInRange(1, 3)
					loopCountTB++
					if (loopCountTB > 100) {
						console.log('loopCountTB')
						break
					}
					if (checkForRoutes(this.settings.allysize - this.settings.footpath - 1, i, buildingSize, 1))
						continue
					// console.log(this.allysize - this.footpath - 1, i, buildingSize, 'conf')
					properSize = true
				}
			}
			let posX = this.settings.allysize - this.settings.footpath - 1
			let posY = i
			posX -= this.settings.allysize / 2
			posY -= this.settings.allysize / 2
			posX -= buildingSize / 2 - 1
			posY += buildingSize / 2
			const building_data = getBuildingData(buildingSize)

			this.buildings.push({
				x: posX,
				z: posY,
				size: buildingSize,
				o: checkOrientation(grid, this.settings.allysize - this.settings.footpath - 1, i, buildingSize, 1),
				floors: building_data.floors,
				type: building_data.building_type,
			})
			for (let j = 0; j < buildingSize; j++) {
				for (let k = 0; k < buildingSize; k++) {
					grid[this.settings.allysize - this.settings.footpath - 1 - j][i + k] = 100 + buildingSize
				}
			}
			if (buildingSize > 1) i += buildingSize - 1
		}

		// bottom: right - left
		for (let i = this.settings.allysize - this.settings.footpath - 2; i >= this.settings.footpath; i--) {
			// console.log(i, this.allysize - this.footpath - 1)
			if (
				grid[i][this.settings.allysize - this.settings.footpath - 1] == AllyBlockType.Ally ||
				grid[i][this.settings.allysize - this.settings.footpath - 1] > 100
			)
				continue

			let buildingSize = this.random.integerInRange(1, 3)
			let properSize = false
			// console.log(i, this.allysize - this.footpath - 1, buildingSize)
			let loopCountBR = 0
			if (checkForRoutes(i, this.settings.allysize - this.settings.footpath - 1, buildingSize, 2)) {
				while (!properSize) {
					buildingSize = this.random.integerInRange(1, 3)
					loopCountBR++
					if (loopCountBR > 100) {
						console.log('loopCountBR')
						break
					}
					// console.log(i, this.allysize - this.footpath - 1, buildingSize, "cont")
					if (checkForRoutes(i, this.settings.allysize - this.settings.footpath - 1, buildingSize, 2))
						continue
					properSize = true
				}
			}
			let posX = i
			let posY = this.settings.allysize - this.settings.footpath - 1
			posX -= this.settings.allysize / 2
			posY -= this.settings.allysize / 2
			posX -= buildingSize / 2 - 1
			posY -= buildingSize / 2 - 1
			const building_data = getBuildingData(buildingSize)

			this.buildings.push({
				x: posX,
				z: posY,
				size: buildingSize,
				o: checkOrientation(grid, i, this.settings.allysize - this.settings.footpath - 1, buildingSize, 2),
				floors: building_data.floors,
				type: building_data.building_type,
			})
			for (let j = 0; j < buildingSize; j++) {
				for (let k = 0; k < buildingSize; k++) {
					// console.log("fix", i-j, this.allysize - this.footpath - 1 - k)
					grid[i - j][this.settings.allysize - this.settings.footpath - 1 - k] = 100 + buildingSize
				}
			}
			// console.log(i, buildingSize)
			if (buildingSize > 2) i -= buildingSize - 1
			// console.log(i, buildingSize)
		}

		// left: bottom - top
		for (let i = this.settings.allysize - this.settings.footpath - 2; i >= this.settings.footpath; i--) {
			// console.log(this.footpath, i)
			if (grid[this.settings.footpath][i] == AllyBlockType.Ally || grid[this.settings.footpath][i] > 100) continue

			let buildingSize = this.random.integerInRange(1, 3)
			let properSize = false
			// console.log(this.footpath, i, buildingSize)
			let loopCountBL = 0
			if (checkForRoutes(this.settings.footpath, i, buildingSize, 3)) {
				while (!properSize) {
					buildingSize = this.random.integerInRange(1, 3)
					loopCountBL++
					if (loopCountBL > 100) {
						console.log('loopCountBL')
						break
					}
					// console.log(this.footpath, i, buildingSize)
					if (checkForRoutes(this.settings.footpath, i, buildingSize, 3)) continue
					properSize = true
				}
			}
			let posX = this.settings.footpath
			let posY = i
			posX -= this.settings.allysize / 2
			posY -= this.settings.allysize / 2
			posX += buildingSize / 2
			posY -= buildingSize / 2 - 1
			const building_data = getBuildingData(buildingSize)

			this.buildings.push({
				x: posX,
				z: posY,
				size: buildingSize,
				o: checkOrientation(grid, this.settings.footpath, i, buildingSize, 3),
				floors: building_data.floors,
				type: building_data.building_type,
			})
			for (let j = 0; j < buildingSize; j++) {
				for (let k = 0; k < buildingSize; k++) {
					// console.log("fix", this.footpath + j, i - k)
					grid[this.settings.footpath + j][i - k] = 100 + buildingSize
				}
			}
			if (buildingSize > 1) i += buildingSize - 1
		}
	}

	private addLightsConfig() {
		const is_odd = this.settings.allysize % 2
		for (
			let i = this.settings.footpath;
			i < this.settings.allysize - this.settings.footpath - (is_odd ? 0 : 1);
			i++, i++
		) {
			this.lights.push({
				x: i - this.settings.allysize / 2 + (is_odd ? 1 / 2 : 1),
				z: this.settings.footpath - this.settings.allysize / 2 - 3 / 8,
				o: Orientation.North,
			})
			this.lights.push({
				x: i - this.settings.allysize / 2 + (is_odd ? 1 / 2 : 1),
				z: this.settings.allysize / 2 - this.settings.footpath + 3 / 8,
				o: Orientation.South,
			})
			this.lights.push({
				x: this.settings.allysize / 2 - this.settings.footpath + 3 / 8,
				z: i - this.settings.allysize / 2 + (is_odd ? 1 / 2 : 1),
				o: Orientation.East,
			})
			this.lights.push({
				x: this.settings.footpath - this.settings.allysize / 2 - 3 / 8,
				z: i - this.settings.allysize / 2 + (is_odd ? 1 / 2 : 1),
				o: Orientation.West,
			})
		}
		if (!is_odd) {
			this.lights.push({
				x: this.settings.footpath - this.settings.allysize / 2 - 3 / 8,
				z: this.settings.footpath - this.settings.allysize / 2 - 3 / 8,
				o: Orientation.NorthWest,
			})
			this.lights.push({
				x: this.settings.allysize / 2 - this.settings.footpath + 3 / 8,
				z: this.settings.footpath - this.settings.allysize / 2 - 3 / 8,
				o: Orientation.NorthEast,
			})
			this.lights.push({
				x: this.settings.allysize / 2 - this.settings.footpath + 3 / 8,
				z: this.settings.allysize / 2 - this.settings.footpath + 3 / 8,
				o: Orientation.SouthEast,
			})
			this.lights.push({
				x: this.settings.footpath - this.settings.allysize / 2 - 3 / 8,
				z: this.settings.allysize / 2 - this.settings.footpath + 3 / 8,
				o: Orientation.SouthWest,
			})
		}
	}

	private addPathNodesConfig() {
		// top: left - right
		// const is_odd = this.settings.allysize % 2
		if (true) {
			for (let i = 0; i < this.settings.allysize - 2 * this.settings.footpath; i++) {
				this.path_nodes.push({
					x: i - this.settings.allysize / 2 + this.settings.footpath + 1 / 2,
					z: -this.settings.allysize / 2 + this.settings.footpath - 1 / 4,
					ns: [],
					isc: false,
				})

				if (i == 0) {
					this.path_nodes.push({
						x: i - this.settings.allysize / 2 + this.settings.footpath - 1 / 4,
						z: -this.settings.allysize / 2 + this.settings.footpath - 1 / 4,
						ns: [],
						isc: false,
					})
					this.path_nodes.push({
						x: i - this.settings.allysize / 2 + this.settings.footpath + 1 / 2,
						z: -this.settings.allysize / 2 + this.settings.footpath - 3 / 8,
						ns: [],
						isc: true,
					})
					this.path_nodes.push({
						x: i - this.settings.allysize / 2 + this.settings.footpath - 3 / 8,
						z: -this.settings.allysize / 2 + this.settings.footpath + 1 / 2,
						ns: [],
						isc: true,
					})
				}
			}
		}

		// right: top - bottom
		if (true) {
			for (let i = 0; i < this.settings.allysize - 2 * this.settings.footpath; i++) {
				this.path_nodes.push({
					x: this.settings.allysize / 2 - this.settings.footpath + 1 / 4,
					z: i - this.settings.allysize / 2 + this.settings.footpath + 1 / 2,
					ns: [],
					isc: false,
				})
				if (i == 0) {
					this.path_nodes.push({
						x: this.settings.allysize / 2 - this.settings.footpath + 1 / 4,
						z: i - this.settings.allysize / 2 + this.settings.footpath - 1 / 4,
						ns: [],
						isc: false,
					})
					this.path_nodes.push({
						x: this.settings.allysize / 2 - this.settings.footpath + 3 / 8,
						z: i - this.settings.allysize / 2 + this.settings.footpath + 1 / 2,
						ns: [],
						isc: true,
					})
					this.path_nodes.push({
						x: this.settings.allysize / 2 - this.settings.footpath - 1 / 2,
						z: i - this.settings.allysize / 2 + this.settings.footpath - 3 / 8,
						ns: [],
						isc: true,
					})
				}
			}
		}

		// bottom: right - left
		if (true) {
			for (let i = 1; i < this.settings.allysize - 2 * this.settings.footpath + 1; i++) {
				this.path_nodes.push({
					x: i - this.settings.allysize / 2 + this.settings.footpath - 1 / 2,
					z: this.settings.allysize / 2 - this.settings.footpath + 1 / 4,
					ns: [],
					isc: false,
				})
				if (i == this.settings.allysize - 2 * this.settings.footpath) {
					this.path_nodes.push({
						x: i - this.settings.allysize / 2 + this.settings.footpath + 1 / 4,
						z: this.settings.allysize / 2 - this.settings.footpath + 1 / 4,
						ns: [],
						isc: false,
					})
					this.path_nodes.push({
						x: i - this.settings.allysize / 2 + this.settings.footpath - 1 / 2,
						z: this.settings.allysize / 2 - this.settings.footpath + 3 / 8,
						ns: [],
						isc: true,
					})
					this.path_nodes.push({
						x: i - this.settings.allysize / 2 + this.settings.footpath + 3 / 8,
						z: this.settings.allysize / 2 - this.settings.footpath - 1 / 2,
						ns: [],
						isc: true,
					})
				}
			}
		}

		// left: bottom - top
		if (true) {
			for (let i = 1; i < this.settings.allysize - 2 * this.settings.footpath + 1; i++) {
				this.path_nodes.push({
					x: -this.settings.allysize / 2 + this.settings.footpath - 1 / 4,
					z: i - this.settings.allysize / 2 + this.settings.footpath - 1 / 2,
					ns: [],
					isc: false,
				})
				if (i == this.settings.allysize - 2 * this.settings.footpath) {
					this.path_nodes.push({
						x: -this.settings.allysize / 2 + this.settings.footpath - 1 / 4,
						z: i - this.settings.allysize / 2 + this.settings.footpath + 1 / 4,
						ns: [],
						isc: false,
					})
					this.path_nodes.push({
						x: -this.settings.allysize / 2 + this.settings.footpath + 1 / 2,
						z: i - this.settings.allysize / 2 + this.settings.footpath + 3 / 8,
						ns: [],
						isc: true,
					})
					this.path_nodes.push({
						x: -this.settings.allysize / 2 + this.settings.footpath - 3 / 8,
						z: i - this.settings.allysize / 2 + this.settings.footpath - 1 / 2,
						ns: [],
						isc: true,
					})
				}
			}
		}
	}

	public generate(_render: boolean = true) {
		this.grid = []
		this.grid.push(this.startGrid())
		this.grid.push(this.startGrid())

		const l1 = 1
		const l2 = 0

		this.addCorners(this.grid[l1])
		this.addFootPath(this.grid[l1], this.settings.corner)

		this.addFootPath(this.grid[l2])
		this.addConvergePoint(this.grid[l2])
		this.copyConvergePoint(this.grid[l2], this.grid[l1])

		this.addBuildingsConfig(this.grid[l2])
		this.addLightsConfig()
		this.addPathNodesConfig()
	}

	public render(inx: number = 0) {
		const half = this.settings.allysize / 2

		if (this.settings.renderHelper) {
			const gridHelper = new THREE.GridHelper(this.settings.allysize, 10, 0xaaaaaa, 0x888888)
			gridHelper.material.linewidth = 2
			gridHelper.position.copy(this.offset_position)
			this.builder.addObject(gridHelper)
		}

		const self = this

		this.builder.Prefab_Geo_Return = function (msg) {
			const group = self.builder.group_data[msg.inx][msg.i]
			if (group == undefined) return
			// console.log(msg.mesh_type, msg.prefab)
			let prefab_cache_geo = self.builder.get_cache_geo(
				msg.size,
				msg.floors,
				msg.type,
				msg.corner,
				msg.renderBuildingsRoofs,
				msg.renderBuildingsWindows
			)
			let prefab_cache_mesh = self.builder.get_cache_mesh(
				msg.size,
				msg.floors,
				msg.type,
				msg.corner,
				msg.renderBuildingsRoofs,
				msg.renderBuildingsWindows
			)

			if (prefab_cache_geo === null) {
				const prefab_geo =
					msg.mesh_type === 'BoxGeometry' ? new THREE.BoxGeometry() : loaderGeo.parse(msg.prefab)
				self.builder.set_cache_geo(
					msg.size,
					msg.floors,
					msg.type,
					msg.corner,
					msg.renderBuildingsRoofs,
					msg.renderBuildingsWindows,
					prefab_geo
				)
				prefab_cache_geo = { geo: prefab_geo }
			}

			if (prefab_cache_geo !== null) {
				if (prefab_cache_geo.geo.type === 'BoxGeometry') {
					if (self.builder.inst_mesh == null) {
						const prefab = Prefabs.Prefab_Front(
							msg.renderBuildingsRoofs,
							msg.renderBuildingsWindows,
							msg.size,
							msg.floors,
							msg.type,
							prefab_cache_geo.geo
						)
						self.builder.inst_mesh = prefab.children[0] as THREE.InstancedMesh
						self.builder.inst_mesh.position.set(0, -0.25, 0)
						self.builder.inst_mesh.count--
						group.ally.builder.addObject(prefab)
					}

					if (self.builder.inst_mesh.count > 0 && (self.builder.inst_mesh.count + 1) % MAX_INSTANCE === 0) {
						const new_inst_mesh = new THREE.InstancedMesh(
							self.builder.inst_mesh.geometry,
							self.builder.inst_mesh.material,
							self.builder.inst_mesh.count + MAX_INSTANCE
						)
						new_inst_mesh.count = 0
						const matrix = new THREE.Matrix4()
						// const color = new THREE.Color()
						for (let j = 0; j < self.builder.inst_mesh.count; j++) {
							self.builder.inst_mesh.getMatrixAt(j, matrix)
							// self.builder.inst_mesh.getColorAt(j, color)
							new_inst_mesh.setMatrixAt(j, matrix)
							// new_inst_mesh.setColorAt(j, color)
							new_inst_mesh.count++
						}
						new_inst_mesh.instanceMatrix.needsUpdate = true
						const parent = self.builder.inst_mesh.parent
						if (parent !== null) parent.remove(self.builder.inst_mesh)
						// group.ally.builder.disposeMesh(self.builder.inst_mesh)
						// const index = group.ally.builder.visuals.indexOf(self.builder.inst_mesh)
						// if (index > -1) group.ally.builder.visuals.splice(index, 1)
						if (parent !== null) parent.add(new_inst_mesh)
						new_inst_mesh.userData = self.builder.inst_mesh.userData
						new_inst_mesh.position.copy(self.builder.inst_mesh.position)
						self.builder.inst_mesh = new_inst_mesh
					}
					const dummy = new THREE.Object3D()
					dummy.position.set(msg.pos.x, msg.pos.y, msg.pos.z)
					dummy.position.add(group.ally.offset_position)
					// dummy.position.add(self.builder.position)
					dummy.position.add(self.builder.offset_position)
					if (msg.mesh_type === 'BoxGeometry') {
						dummy.scale.set(msg.prefab.w, msg.prefab.h, msg.prefab.d)
						dummy.position.y -= msg.size * 0.5 - (msg.floors * 0.5 + 1) / 2
						self.builder.inst_mesh.userData.type = 'box'
					}
					dummy.rotateY(msg.rot)
					dummy.updateMatrix()
					self.builder.inst_mesh.count++
					self.builder.inst_mesh.setMatrixAt(self.builder.inst_mesh.count - 1, dummy.matrix)
					// self.builder.inst_mesh.setColorAt(
					//	self.builder.inst_mesh.count - 1,
					// 	new THREE.Color(`hsl(${group.ally.random.floatInRange(0, 360)}, 50%, 66%)`)
					// )
					self.builder.inst_mesh.instanceMatrix.needsUpdate = true
				} else {
					// if (prefab_cache_mesh !== null) {
					// if (prefab_cache_mesh.mesh === null) {
					if (prefab_cache_mesh === null) {
						let prefab: THREE.Object3D
						if (msg.corner == 0) {
							prefab = Prefabs.Prefab_Front(
								msg.renderBuildingsRoofs,
								msg.renderBuildingsWindows,
								msg.size,
								msg.floors,
								msg.type,
								prefab_cache_geo.geo
							)
						} else {
							prefab = Prefabs.Prefab_Corner(
								msg.renderBuildingsRoofs,
								msg.renderBuildingsWindows,
								msg.size,
								msg.corner_size,
								msg.floors,
								prefab_cache_geo.geo
							)
						}
						prefab_cache_mesh = { mesh: prefab.children[0] as THREE.InstancedMesh }
						prefab_cache_mesh.mesh.count--
						self.builder.set_cache_mesh(
							msg.size,
							msg.floors,
							msg.type,
							msg.corner,
							msg.renderBuildingsRoofs,
							msg.renderBuildingsWindows,
							prefab_cache_mesh.mesh
						)
						group.ally.builder.addObject(prefab)
					}
					// }
					if (prefab_cache_mesh.mesh !== null) {
						const dummy = new THREE.Object3D()
						dummy.position.set(msg.pos.x, msg.pos.y, msg.pos.z)
						dummy.position.add(group.ally.offset_position)
						// dummy.position.add(self.builder.position)
						dummy.position.add(self.builder.offset_position)
						if (msg.mesh_type === 'BoxGeometry') {
							dummy.scale.set(msg.prefab.w, msg.prefab.h, msg.prefab.d)
							dummy.position.y -= msg.size * 0.5 - (msg.floors * 0.5 + 1) / 2
							prefab_cache_mesh.mesh.userData.type = 'box'
						}
						dummy.rotateY(msg.rot)
						dummy.updateMatrix()
						prefab_cache_mesh.mesh.count++
						prefab_cache_mesh.mesh.setMatrixAt(prefab_cache_mesh.mesh.count - 1, dummy.matrix)
						// prefab_cache_mesh.mesh.setColorAt(
						// 	prefab_cache_mesh.mesh.count - 1,
						// 	new THREE.Color(`hsl(${group.ally.random.floatInRange(0, 360)}, 50%, 66%)`)
						// )
						prefab_cache_mesh.mesh.instanceMatrix.needsUpdate = true
					}
					// }
				}
				group.ally.renderReduce()
			}
		}

		function drawLevel(depth: number) {
			for (let j = 0; j < self.grid[depth].length; j++) {
				for (let k = 0; k < self.grid[depth][j].length; k++) {
					let mat: THREE.MeshBasicMaterial | THREE.LineBasicMaterial
					if (self.settings.renderDebugsWireframe) {
						mat = new THREE.LineBasicMaterial({
							color: colors[AllyBlockType.Empty],
							opacity: 0.35,
						})
					} else {
						mat = new THREE.MeshBasicMaterial({
							color: colors[AllyBlockType.Empty],
							wireframe: false,
						})
					}

					switch (self.grid[depth][j][k]) {
						case AllyBlockType.Corner: {
							mat.color = new THREE.Color(colors[AllyBlockType.Corner])
							break
						}
						case AllyBlockType.Footpath: {
							mat.color = new THREE.Color(colors[AllyBlockType.Footpath])
							break
						}
						case AllyBlockType.Ally: {
							mat.color = new THREE.Color(colors[AllyBlockType.Ally])
							break
						}
						case AllyBlockType.Size1: {
							mat.color = new THREE.Color(colors[AllyBlockType.Size1])
							break
						}
						case AllyBlockType.Size2: {
							mat.color = new THREE.Color(colors[AllyBlockType.Size2])
							break
						}
						case AllyBlockType.Size3: {
							mat.color = new THREE.Color(colors[AllyBlockType.Size3])
							break
						}
						default: {
							mat.color = new THREE.Color(colors[AllyBlockType.Empty])
							break
						}
					}
					const w = self.geo.parameters.width / 2
					const h = self.geo.parameters.height / 2
					const d = self.geo.parameters.depth / 2
					for (let l = 0; l < 2; l++) {
						for (let m = 0; m < 2; m++) {
							let block: THREE.Mesh | THREE.LineSegments
							const cmat = mat.clone()
							if (self.settings.renderDebugsWireframe) {
								block = new THREE.LineSegments(new THREE.EdgesGeometry(self.geo), cmat)
							} else {
								block = new THREE.Mesh(self.geo, cmat)
							}
							block.scale.set(0.8, 1, 0.8)
							block.position.set(
								j + w - half + l * w + 0.25 * l,
								-h - depth * h * 4,
								k + d - half + m * d + 0.25 * m
							)
							const darkFootpath = new THREE.Color(colors[31])
							if (self.grid[depth][j][k] == AllyBlockType.Footpath) {
								let lm = 0,
									lm1 = 0
								if (l == 0) {
									lm = 0
									if ((j > lm && self.grid[depth][j][k] !== self.grid[depth][j - 1][k]) || j == lm) {
										cmat.color = darkFootpath
									}
								} else if (l == 1) {
									lm = self.grid[depth].length - 1
									if ((j < lm && self.grid[depth][j][k] !== self.grid[depth][j + 1][k]) || j == lm) {
										cmat.color = darkFootpath
									}
								}
								if (m == 0) {
									lm = 0
									if ((k > lm && self.grid[depth][j][k] !== self.grid[depth][j][k - 1]) || k == lm) {
										cmat.color = darkFootpath
									}
								} else if (m == 1) {
									lm = self.grid[depth].length - 1
									if ((k < lm && self.grid[depth][j][k] !== self.grid[depth][j][k + 1]) || k == lm) {
										cmat.color = darkFootpath
									}
								}

								const lmColor = new THREE.Color(0x884488)
								if (l == 0 && m == 0) {
									lm = 0
									lm1 = 0
									if (
										j > lm &&
										k > lm1 &&
										self.grid[depth][j - 1][k - 1] != AllyBlockType.Footpath &&
										self.grid[depth][j][k] == self.grid[depth][j][k - 1] &&
										self.grid[depth][j][k] == self.grid[depth][j - 1][k]
									) {
										cmat.color = lmColor
									}
								} else if (l == 1 && m == 0) {
									lm = self.grid[depth].length - 1
									lm1 = 0
									if (
										j < lm &&
										k > lm1 &&
										self.grid[depth][j + 1][k - 1] != AllyBlockType.Footpath &&
										self.grid[depth][j][k] == self.grid[depth][j][k - 1] &&
										self.grid[depth][j][k] == self.grid[depth][j + 1][k]
									) {
										cmat.color = lmColor
									}
								} else if (l == 0 && m == 1) {
									lm = 0
									lm1 = self.grid[depth].length - 1
									if (
										j > lm &&
										k < lm1 &&
										self.grid[depth][j - 1][k + 1] != AllyBlockType.Footpath &&
										self.grid[depth][j][k] == self.grid[depth][j][k + 1] &&
										self.grid[depth][j][k] == self.grid[depth][j - 1][k]
									) {
										cmat.color = lmColor
									}
								} else if (l == 1 && m == 1) {
									lm = self.grid[depth].length - 1
									lm1 = self.grid[depth].length - 1
									if (
										j < lm &&
										k < lm1 &&
										self.grid[depth][j + 1][k + 1] != AllyBlockType.Footpath &&
										self.grid[depth][j][k] == self.grid[depth][j][k + 1] &&
										self.grid[depth][j][k] == self.grid[depth][j + 1][k]
									) {
										cmat.color = lmColor
									}
								}
							}
							block.position.add(self.offset_position).add(self.builder.offset_position)
							self.builder.addObject(block)
						}
					}
				}
			}
		}

		if (self.settings.renderDebug >= 0) {
			if (self.settings.renderDebug >= this.depth) {
				for (let i = 0; i < this.grid.length; i++) {
					drawLevel(i)
				}
			} else drawLevel(this.depth - 1 - self.settings.renderDebug)
		}

		if (this.settings.renderDebugsBuildings || this.settings.renderBuildings) {
			for (let i = 0; i < this.buildings.length; i++) {
				const building = this.buildings[i]
				if (this.builder.group_data[inx] == undefined) this.builder.group_data[inx] = []
				this.builder.group_data[inx][i] = {
					ally: this,
				}

				if (this.settings.renderDebugsBuildings) {
					function drawDebugBuilding() {
						const geo = new THREE.BoxGeometry(building.size, building.size, building.size)
						if (self.settings.renderDebugsBuildingsWireframe) {
							const edges = new THREE.EdgesGeometry(geo)
							const line = new THREE.LineSegments(
								edges,
								new THREE.LineBasicMaterial({
									color: colors[(building.size + 100) as AllyBlockType],
									opacity: 0.35,
								})
							)
							line.position.set(building.x, building.size / 2, building.z)
							line.position.add(self.offset_position)
							self.builder.addObject(line)
						} else {
							const block = new THREE.Mesh(
								geo,
								new THREE.MeshStandardMaterial({
									color: colors[(building.size + 100) as AllyBlockType],
								})
							)
							block.position.set(building.x, building.size / 2, building.z)
							block.position.add(self.offset_position)
							self.builder.addObject(block)
						}
					}

					// setTimeout(drawDebugBuilding, 0)
					drawDebugBuilding()
				}

				if (this.settings.renderBuildings) {
					if (i == 0) self.render_running += self.buildings.length
					function drawFront(pos: THREE.Vector3, rot: number) {
						if (useWorker && offWork !== null) {
							if (
								!self.builder.check_cache_geo(
									building.size,
									building.floors,
									building.type,
									false,
									self.settings.renderBuildingsRoofs,
									self.settings.renderBuildingsWindows
								)
							) {
								offWork.postMessage({
									type: 'Prefab_Front_Geo',
									data: {
										cityId: self.builder.cityId,
										simple_geometry: self.settings.simple_geometry,
										renderBuildingsRoofs: self.settings.renderBuildingsRoofs,
										renderBuildingsWindows: self.settings.renderBuildingsWindows,
										size: building.size,
										floors: building.floors,
										type: building.type,
										inx: inx,
										i: i,
										o: building.o,
										pos: {
											x: pos.x,
											y: pos.y,
											z: pos.z,
										},
										rot: rot,
									},
								})
							} else {
								const prefab_cache_geo = self.builder.get_cache_geo(
									building.size,
									building.floors,
									building.type,
									false,
									self.settings.renderBuildingsRoofs,
									self.settings.renderBuildingsWindows
								)
								let prefab_cache_mesh = self.builder.get_cache_mesh(
									building.size,
									building.floors,
									building.type,
									false,
									self.settings.renderBuildingsRoofs,
									self.settings.renderBuildingsWindows
								)
								if (prefab_cache_geo !== null) {
									if (prefab_cache_geo.geo.type === 'BoxGeometry') {
										if (self.builder.inst_mesh == null) {
											const prefab = Prefabs.Prefab_Front(
												self.settings.renderBuildingsRoofs,
												self.settings.renderBuildingsWindows,
												building.size,
												building.floors,
												building.type,
												prefab_cache_geo.geo
											)
											self.builder.inst_mesh = prefab.children[0] as THREE.InstancedMesh
											self.builder.inst_mesh.position.set(0, -0.25, 0)
											self.builder.inst_mesh.count--
											self.builder.addObject(prefab)
										}

										if (
											self.builder.inst_mesh.count > 0 &&
											(self.builder.inst_mesh.count + 1) % MAX_INSTANCE === 0
										) {
											const new_inst_mesh = new THREE.InstancedMesh(
												self.builder.inst_mesh.geometry,
												self.builder.inst_mesh.material,
												self.builder.inst_mesh.count + MAX_INSTANCE
											)
											new_inst_mesh.count = 0
											const matrix = new THREE.Matrix4()
											// const color = new THREE.Color()
											for (let j = 0; j < self.builder.inst_mesh.count; j++) {
												self.builder.inst_mesh.getMatrixAt(j, matrix)
												// self.builder.inst_mesh.getColorAt(j, color)
												new_inst_mesh.setMatrixAt(j, matrix)
												// new_inst_mesh.setColorAt(j, color)
												new_inst_mesh.count++
											}
											new_inst_mesh.instanceMatrix.needsUpdate = true
											const parent = self.builder.inst_mesh.parent
											if (parent !== null) parent.remove(self.builder.inst_mesh)
											// group.ally.builder.disposeMesh(self.builder.inst_mesh)
											// const index = group.ally.builder.visuals.indexOf(self.builder.inst_mesh)
											// if (index > -1) group.ally.builder.visuals.splice(index, 1)
											if (parent !== null) parent.add(new_inst_mesh)
											new_inst_mesh.userData = self.builder.inst_mesh.userData
											new_inst_mesh.position.copy(self.builder.inst_mesh.position)
											self.builder.inst_mesh = new_inst_mesh
										}
										const dummy = new THREE.Object3D()
										dummy.position.copy(pos)
										dummy.position.add(self.offset_position)
										dummy.scale.set(building.size, 0.5 * (building.floors + 1), building.size)
										dummy.position.y -= building.size * 0.5 - (building.floors * 0.5 + 1) / 2
										// dummy.position.add(self.builder.position)
										dummy.position.add(self.builder.offset_position)
										self.builder.inst_mesh.userData.type = 'box'
										dummy.rotateY(rot)
										dummy.updateMatrix()
										self.builder.inst_mesh.count++
										self.builder.inst_mesh.setMatrixAt(
											self.builder.inst_mesh.count - 1,
											dummy.matrix
										)
										// self.builder.inst_mesh.setColorAt(
										// 	self.builder.inst_mesh.count - 1,
										// 	new THREE.Color(`hsl(${self.random.floatInRange(0, 360)}, 50%, 66%)`)
										// )
										self.builder.inst_mesh.instanceMatrix.needsUpdate = true
									} else {
										if (prefab_cache_mesh !== null) {
											if (prefab_cache_mesh.mesh === null) {
												const prefab = Prefabs.Prefab_Front(
													self.settings.renderBuildingsRoofs,
													self.settings.renderBuildingsWindows,
													building.size,
													building.floors,
													building.type,
													prefab_cache_geo.geo
												)
												prefab_cache_mesh = { mesh: prefab.children[0] as THREE.InstancedMesh }
												prefab_cache_mesh.mesh.count--
												self.builder.set_cache_mesh(
													building.size,
													building.floors,
													building.type,
													false,
													self.settings.renderBuildingsRoofs,
													self.settings.renderBuildingsWindows,
													prefab_cache_mesh.mesh
												)
												self.builder.addObject(prefab)
											}
											if (prefab_cache_mesh.mesh !== null) {
												const dummy = new THREE.Object3D()
												dummy.position.copy(pos)
												dummy.position.add(self.offset_position)
												dummy.rotateY(rot)
												if (prefab_cache_mesh.mesh.geometry.type === 'BoxGeometry') {
													dummy.scale.set(
														building.size,
														0.5 * (building.floors + 1),
														building.size
													)
													prefab_cache_mesh.mesh.userData.type = 'box'
													dummy.position.y -=
														building.size * 0.5 - (building.floors * 0.5 + 1) / 2
												}
												dummy.updateMatrix()
												prefab_cache_mesh.mesh.count++
												prefab_cache_mesh.mesh.setMatrixAt(
													prefab_cache_mesh.mesh.count - 1,
													dummy.matrix
												)
												// prefab_cache_mesh.mesh.setColorAt(
												// 	prefab_cache_mesh.mesh.count - 1,
												// 	new THREE.Color(
												// 		`hsl(${self.random.floatInRange(0, 360)}, 50%, 66%)`
												// 	)
												// )
												prefab_cache_mesh.mesh.instanceMatrix.needsUpdate = true
											}
										}
									}
								}
								self.renderReduce()
							}
						} else {
							if (
								!self.builder.check_cache_geo(
									building.size,
									building.floors,
									building.type,
									false,
									self.settings.renderBuildingsRoofs,
									self.settings.renderBuildingsWindows
								)
							) {
								const prefab_geo = Prefabs.Prefab_Front_Geo(
									self.settings.simple_geometry,
									self.settings.renderBuildingsRoofs,
									self.settings.renderBuildingsWindows,
									building.size,
									building.floors,
									building.type
								)
								self.builder.set_cache_geo(
									building.size,
									building.floors,
									building.type,
									false,
									self.settings.renderBuildingsRoofs,
									self.settings.renderBuildingsWindows,
									prefab_geo.geo.type === 'BoxGeometry' ? new THREE.BoxGeometry() : prefab_geo.geo
								)
							}

							const prefab_cache_geo = self.builder.get_cache_geo(
								building.size,
								building.floors,
								building.type,
								false,
								self.settings.renderBuildingsRoofs,
								self.settings.renderBuildingsWindows
							)
							let prefab_cache_mesh = self.builder.get_cache_mesh(
								building.size,
								building.floors,
								building.type,
								false,
								self.settings.renderBuildingsRoofs,
								self.settings.renderBuildingsWindows
							)
							if (prefab_cache_geo !== null) {
								if (prefab_cache_geo.geo.type === 'BoxGeometry') {
									if (self.builder.inst_mesh == null) {
										const prefab = Prefabs.Prefab_Front(
											self.settings.renderBuildingsRoofs,
											self.settings.renderBuildingsWindows,
											building.size,
											building.floors,
											building.type,
											prefab_cache_geo.geo
										)
										self.builder.inst_mesh = prefab.children[0] as THREE.InstancedMesh
										self.builder.inst_mesh.position.set(0, -0.25, 0)
										self.builder.inst_mesh.count--
										self.builder.addObject(prefab)
									}

									if (
										self.builder.inst_mesh.count > 0 &&
										(self.builder.inst_mesh.count + 1) % MAX_INSTANCE === 0
									) {
										const new_inst_mesh = new THREE.InstancedMesh(
											self.builder.inst_mesh.geometry,
											self.builder.inst_mesh.material,
											self.builder.inst_mesh.count + MAX_INSTANCE
										)
										new_inst_mesh.count = 0
										const matrix = new THREE.Matrix4()
										// const color = new THREE.Color()
										for (let j = 0; j < self.builder.inst_mesh.count; j++) {
											self.builder.inst_mesh.getMatrixAt(j, matrix)
											// self.builder.inst_mesh.getColorAt(j, color)
											new_inst_mesh.setMatrixAt(j, matrix)
											// new_inst_mesh.setColorAt(j, color)
											new_inst_mesh.count++
										}
										new_inst_mesh.instanceMatrix.needsUpdate = true
										const parent = self.builder.inst_mesh.parent
										if (parent !== null) parent.remove(self.builder.inst_mesh)
										// group.ally.builder.disposeMesh(self.builder.inst_mesh)
										// const index = group.ally.builder.visuals.indexOf(self.builder.inst_mesh)
										// if (index > -1) group.ally.builder.visuals.splice(index, 1)
										if (parent !== null) parent.add(new_inst_mesh)
										new_inst_mesh.userData = self.builder.inst_mesh.userData
										new_inst_mesh.position.copy(self.builder.inst_mesh.position)
										self.builder.inst_mesh = new_inst_mesh
									}
									const dummy = new THREE.Object3D()
									dummy.position.copy(pos)
									dummy.position.add(self.offset_position)
									dummy.scale.set(building.size, 0.5 * (building.floors + 1), building.size)
									dummy.position.y -= building.size * 0.5 - (building.floors * 0.5 + 1) / 2
									// dummy.position.add(self.builder.position)
									dummy.position.add(self.builder.offset_position)
									self.builder.inst_mesh.userData.type = 'box'
									dummy.rotateY(rot)
									dummy.updateMatrix()
									self.builder.inst_mesh.count++
									self.builder.inst_mesh.setMatrixAt(self.builder.inst_mesh.count - 1, dummy.matrix)
									// self.builder.inst_mesh.setColorAt(
									// 	self.builder.inst_mesh.count - 1,
									// 	new THREE.Color(`hsl(${self.random.floatInRange(0, 360)}, 50%, 66%)`)
									// )
									self.builder.inst_mesh.instanceMatrix.needsUpdate = true
								} else {
									// if (prefab_cache_mesh !== null) {
									// if (prefab_cache_mesh.mesh === null) {
									if (prefab_cache_mesh == null) {
										const prefab = Prefabs.Prefab_Front(
											self.settings.renderBuildingsRoofs,
											self.settings.renderBuildingsWindows,
											building.size,
											building.floors,
											building.type,
											prefab_cache_geo.geo
										)
										prefab_cache_mesh = { mesh: prefab.children[0] as THREE.InstancedMesh }
										prefab_cache_mesh.mesh.count--
										self.builder.set_cache_mesh(
											building.size,
											building.floors,
											building.type,
											false,
											self.settings.renderBuildingsRoofs,
											self.settings.renderBuildingsWindows,
											prefab_cache_mesh.mesh
										)
										self.builder.addObject(prefab)
									}
									// }
									if (prefab_cache_mesh.mesh !== null) {
										const dummy = new THREE.Object3D()
										dummy.position.copy(pos)
										dummy.position.add(self.offset_position)
										dummy.rotateY(rot)
										if (prefab_cache_mesh.mesh.geometry.type === 'BoxGeometry') {
											dummy.scale.set(building.size, 0.5 * (building.floors + 1), building.size)
											prefab_cache_mesh.mesh.userData.type = 'box'
											dummy.position.y -= building.size * 0.5 - (building.floors * 0.5 + 1) / 2
										}
										// dummy.position.add(self.builder.position)
										dummy.position.add(self.builder.offset_position)
										dummy.updateMatrix()
										prefab_cache_mesh.mesh.count++
										prefab_cache_mesh.mesh.setMatrixAt(
											prefab_cache_mesh.mesh.count - 1,
											dummy.matrix
										)
										// prefab_cache_mesh.mesh.setColorAt(
										// 	prefab_cache_mesh.mesh.count - 1,
										// 	new THREE.Color(`hsl(${self.random.floatInRange(0, 360)}, 50%, 66%)`)
										// )
										prefab_cache_mesh.mesh.instanceMatrix.needsUpdate = true
									}
									// }
								}
							}
							self.renderReduce()
						}
					}

					function drawCorner(pos: THREE.Vector3, rot: number) {
						if (useWorker && offWork !== null) {
							if (
								!self.builder.check_cache_geo(
									building.size,
									building.floors,
									building.type,
									true,
									self.settings.renderBuildingsRoofs,
									self.settings.renderBuildingsWindows
								)
							) {
								offWork.postMessage({
									type: 'Prefab_Corner_Geo',
									data: {
										cityId: self.builder.cityId,
										simple_geometry: self.settings.simple_geometry,
										renderBuildingsRoofs: self.settings.renderBuildingsRoofs,
										renderBuildingsWindows: self.settings.renderBuildingsWindows,
										size: building.size,
										corner: self.settings.corner_size,
										floors: building.floors,
										type: building.type,
										inx: inx,
										i: i,
										o: building.o,
										pos: {
											x: pos.x,
											y: pos.y,
											z: pos.z,
										},
										rot: rot,
									},
								})
							} else {
								const prefab_cache_geo = self.builder.get_cache_geo(
									building.size,
									building.floors,
									building.type,
									true,
									self.settings.renderBuildingsRoofs,
									self.settings.renderBuildingsWindows
								)
								let prefab_cache_mesh = self.builder.get_cache_mesh(
									building.size,
									building.floors,
									building.type,
									true,
									self.settings.renderBuildingsRoofs,
									self.settings.renderBuildingsWindows
								)
								if (prefab_cache_geo !== null) {
									if (prefab_cache_geo.geo.type === 'BoxGeometry') {
										if (self.builder.inst_mesh == null) {
											const prefab = Prefabs.Prefab_Front(
												self.settings.renderBuildingsRoofs,
												self.settings.renderBuildingsWindows,
												building.size,
												building.floors,
												building.type,
												prefab_cache_geo.geo
											)
											self.builder.inst_mesh = prefab.children[0] as THREE.InstancedMesh
											self.builder.inst_mesh.position.set(0, -0.25, 0)
											self.builder.inst_mesh.count--
											self.builder.addObject(prefab)
										}

										if (
											self.builder.inst_mesh.count > 0 &&
											(self.builder.inst_mesh.count + 1) % MAX_INSTANCE === 0
										) {
											const new_inst_mesh = new THREE.InstancedMesh(
												self.builder.inst_mesh.geometry,
												self.builder.inst_mesh.material,
												self.builder.inst_mesh.count + MAX_INSTANCE
											)
											new_inst_mesh.count = 0
											const matrix = new THREE.Matrix4()
											// const color = new THREE.Color()
											for (let j = 0; j < self.builder.inst_mesh.count; j++) {
												self.builder.inst_mesh.getMatrixAt(j, matrix)
												// self.builder.inst_mesh.getColorAt(j, color)
												new_inst_mesh.setMatrixAt(j, matrix)
												// new_inst_mesh.setColorAt(j, color)
												new_inst_mesh.count++
											}
											new_inst_mesh.instanceMatrix.needsUpdate = true
											const parent = self.builder.inst_mesh.parent
											if (parent !== null) parent.remove(self.builder.inst_mesh)
											// group.ally.builder.disposeMesh(self.builder.inst_mesh)
											// const index = group.ally.builder.visuals.indexOf(self.builder.inst_mesh)
											// if (index > -1) group.ally.builder.visuals.splice(index, 1)
											if (parent !== null) parent.add(new_inst_mesh)
											new_inst_mesh.userData = self.builder.inst_mesh.userData
											new_inst_mesh.position.copy(self.builder.inst_mesh.position)
											self.builder.inst_mesh = new_inst_mesh
										}
										const dummy = new THREE.Object3D()
										dummy.position.copy(pos)
										dummy.position.add(self.offset_position)
										dummy.scale.set(building.size, 0.5 * (building.floors + 1), building.size)
										dummy.position.y -= building.size * 0.5 - (building.floors * 0.5 + 1) / 2
										// dummy.position.add(self.builder.position)
										dummy.position.add(self.builder.offset_position)
										self.builder.inst_mesh.userData.type = 'box'
										dummy.rotateY(rot)
										dummy.updateMatrix()
										self.builder.inst_mesh.count++
										self.builder.inst_mesh.setMatrixAt(
											self.builder.inst_mesh.count - 1,
											dummy.matrix
										)
										// self.builder.inst_mesh.setColorAt(
										// 	self.builder.inst_mesh.count - 1,
										// 	new THREE.Color(`hsl(${self.random.floatInRange(0, 360)}, 50%, 66%)`)
										// )
										self.builder.inst_mesh.instanceMatrix.needsUpdate = true
									} else {
										// if (prefab_cache_mesh !== null) {
										// if (prefab_cache_mesh.mesh === null) {
										const prefab = Prefabs.Prefab_Corner(
											self.settings.renderBuildingsRoofs,
											self.settings.renderBuildingsWindows,
											building.size,
											self.settings.corner_size,
											building.floors,
											prefab_cache_geo.geo
										)
										prefab_cache_mesh = { mesh: prefab.children[0] as THREE.InstancedMesh }
										prefab_cache_mesh.mesh.count--
										self.builder.addObject(prefab)
										// }
										if (prefab_cache_mesh.mesh !== null) {
											const dummy = new THREE.Object3D()
											dummy.position.copy(pos)
											dummy.position.add(self.offset_position)
											dummy.rotateY(rot)
											if (prefab_cache_mesh.mesh.geometry.type === 'BoxGeometry') {
												dummy.scale.set(
													building.size,
													0.5 * (building.floors + 1),
													building.size
												)
												prefab_cache_mesh.mesh.userData.type = 'box'
												dummy.position.y -=
													building.size * 0.5 - (building.floors * 0.5 + 1) / 2
											}
											dummy.updateMatrix()
											prefab_cache_mesh.mesh.count++
											prefab_cache_mesh.mesh.setMatrixAt(
												prefab_cache_mesh.mesh.count - 1,
												dummy.matrix
											)
											// prefab_cache_mesh.mesh.setColorAt(
											// 	prefab_cache_mesh.mesh.count - 1,
											// 	new THREE.Color(
											// 		`hsl(${self.random.floatInRange(0, 360)}, 50%, 66%)`
											// 	)
											// )
											prefab_cache_mesh.mesh.instanceMatrix.needsUpdate = true
										}
										// }
									}
								}
								self.renderReduce()
							}
						} else {
							if (
								!self.builder.check_cache_geo(
									building.size,
									building.floors,
									building.type,
									true,
									self.settings.renderBuildingsRoofs,
									self.settings.renderBuildingsWindows
								)
							) {
								const prefab_geo = Prefabs.Prefab_Corner_Geo(
									self.settings.simple_geometry,
									self.settings.renderBuildingsRoofs,
									self.settings.renderBuildingsWindows,
									building.size,
									self.settings.corner_size,
									building.floors
								)
								self.builder.set_cache_geo(
									building.size,
									building.floors,
									building.type,
									true,
									self.settings.renderBuildingsRoofs,
									self.settings.renderBuildingsWindows,
									prefab_geo.geo.type === 'BoxGeometry' ? new THREE.BoxGeometry() : prefab_geo.geo
								)
							}

							const prefab_cache_geo = self.builder.get_cache_geo(
								building.size,
								building.floors,
								building.type,
								true,
								self.settings.renderBuildingsRoofs,
								self.settings.renderBuildingsWindows
							)
							let prefab_cache_mesh = self.builder.get_cache_mesh(
								building.size,
								building.floors,
								building.type,
								true,
								self.settings.renderBuildingsRoofs,
								self.settings.renderBuildingsWindows
							)
							if (prefab_cache_geo !== null) {
								if (prefab_cache_geo.geo.type === 'BoxGeometry') {
									if (self.builder.inst_mesh == null) {
										const prefab = Prefabs.Prefab_Front(
											self.settings.renderBuildingsRoofs,
											self.settings.renderBuildingsWindows,
											building.size,
											building.floors,
											building.type,
											prefab_cache_geo.geo
										)
										self.builder.inst_mesh = prefab.children[0] as THREE.InstancedMesh
										self.builder.inst_mesh.position.set(0, -0.25, 0)
										self.builder.inst_mesh.count--
										self.builder.addObject(prefab)
									}

									if (
										self.builder.inst_mesh.count > 0 &&
										(self.builder.inst_mesh.count + 1) % MAX_INSTANCE === 0
									) {
										const new_inst_mesh = new THREE.InstancedMesh(
											self.builder.inst_mesh.geometry,
											self.builder.inst_mesh.material,
											self.builder.inst_mesh.count + MAX_INSTANCE
										)
										new_inst_mesh.count = 0
										const matrix = new THREE.Matrix4()
										// const color = new THREE.Color()
										for (let j = 0; j < self.builder.inst_mesh.count; j++) {
											self.builder.inst_mesh.getMatrixAt(j, matrix)
											// self.builder.inst_mesh.getColorAt(j, color)
											new_inst_mesh.setMatrixAt(j, matrix)
											// new_inst_mesh.setColorAt(j, color)
											new_inst_mesh.count++
										}
										new_inst_mesh.instanceMatrix.needsUpdate = true
										const parent = self.builder.inst_mesh.parent
										if (parent !== null) parent.remove(self.builder.inst_mesh)
										// group.ally.builder.disposeMesh(self.builder.inst_mesh)
										// const index = group.ally.builder.visuals.indexOf(self.builder.inst_mesh)
										// if (index > -1) group.ally.builder.visuals.splice(index, 1)
										if (parent !== null) parent.add(new_inst_mesh)
										new_inst_mesh.userData = self.builder.inst_mesh.userData
										new_inst_mesh.position.copy(self.builder.inst_mesh.position)
										self.builder.inst_mesh = new_inst_mesh
									}
									const dummy = new THREE.Object3D()
									dummy.position.copy(pos)
									dummy.position.add(self.offset_position)
									dummy.scale.set(building.size, 0.5 * (building.floors + 1), building.size)
									dummy.position.y -= building.size * 0.5 - (building.floors * 0.5 + 1) / 2
									// dummy.position.add(self.builder.position)
									dummy.position.add(self.builder.offset_position)
									self.builder.inst_mesh.userData.type = 'box'
									dummy.rotateY(rot)
									dummy.updateMatrix()
									self.builder.inst_mesh.count++
									self.builder.inst_mesh.setMatrixAt(self.builder.inst_mesh.count - 1, dummy.matrix)
									// self.builder.inst_mesh.setColorAt(
									// 	self.builder.inst_mesh.count - 1,
									// 	new THREE.Color(`hsl(${self.random.floatInRange(0, 360)}, 50%, 66%)`)
									// )
									self.builder.inst_mesh.instanceMatrix.needsUpdate = true
								} else {
									// if (prefab_cache_mesh !== null) {
									// if (prefab_cache_mesh.mesh === null) {
									if (prefab_cache_mesh === null) {
										const prefab = Prefabs.Prefab_Corner(
											self.settings.renderBuildingsRoofs,
											self.settings.renderBuildingsWindows,
											building.size,
											self.settings.corner_size,
											building.floors,
											prefab_cache_geo.geo
										)
										prefab_cache_mesh = { mesh: prefab.children[0] as THREE.InstancedMesh }
										prefab_cache_mesh.mesh.count--
										self.builder.set_cache_mesh(
											building.size,
											building.floors,
											building.type,
											true,
											self.settings.renderBuildingsRoofs,
											self.settings.renderBuildingsWindows,
											prefab_cache_mesh.mesh
										)
										self.builder.addObject(prefab)
									}
									// }
									if (prefab_cache_mesh.mesh !== null) {
										const dummy = new THREE.Object3D()
										dummy.position.copy(pos)
										dummy.position.add(self.offset_position)
										dummy.rotateY(rot)
										if (prefab_cache_mesh.mesh.geometry.type === 'BoxGeometry') {
											dummy.scale.set(building.size, 0.5 * (building.floors + 1), building.size)
											prefab_cache_mesh.mesh.userData.type = 'box'
											dummy.position.y -= building.size * 0.5 - (building.floors * 0.5 + 1) / 2
										}
										// dummy.position.add(self.builder.position)
										dummy.position.add(self.builder.offset_position)
										dummy.updateMatrix()
										prefab_cache_mesh.mesh.count++
										prefab_cache_mesh.mesh.setMatrixAt(
											prefab_cache_mesh.mesh.count - 1,
											dummy.matrix
										)
										// prefab_cache_mesh.mesh.setColorAt(
										// 	prefab_cache_mesh.mesh.count - 1,
										// 	new THREE.Color(`hsl(${self.random.floatInRange(0, 360)}, 50%, 66%)`)
										// )
										prefab_cache_mesh.mesh.instanceMatrix.needsUpdate = true
									}
									// }
								}
							}
							self.renderReduce()
						}
					}

					function drawBuilding() {
						const pos = new THREE.Vector3(building.x, building.size / 2, building.z)
						if (building.o == Orientation.North) {
							drawFront(pos, Math.PI)
						} else if (building.o == Orientation.South) {
							drawFront(pos, 0)
						} else if (building.o == Orientation.East) {
							drawFront(pos, Math.PI / 2)
						} else if (building.o == Orientation.West) {
							drawFront(pos, (Math.PI * 3) / 2)
						} else if (building.o == Orientation.NorthEast) {
							drawCorner(pos, Math.PI)
						} else if (building.o == Orientation.SouthEast) {
							drawCorner(pos, Math.PI / 2)
						} else if (building.o == Orientation.SouthWest) {
							drawCorner(pos, 0)
						} else if (building.o == Orientation.NorthWest) {
							drawCorner(pos, (Math.PI * 3) / 2)
						} else {
							self.renderReduce()
						}
					}

					if (useWorker) {
						setTimeout(drawBuilding, 0)
					} else {
						drawBuilding()
					}
				}
			}
		}

		if (this.settings.renderLights) {
			for (let i = 0; i < this.lights.length; i++) {
				if (this.lights[i].o == Orientation.North) {
					let light = Prefabs.Prefab_Lights()
					light.position.set(this.lights[i].x, 0.25, this.lights[i].z)
					light.rotateY(Math.PI)
					light.position.add(self.offset_position)
					light.position.add(self.builder.offset_position)
					self.builder.addObject(light)
				} else if (this.lights[i].o == Orientation.South) {
					let light = Prefabs.Prefab_Lights()
					light.position.set(this.lights[i].x, 0.25, this.lights[i].z)
					light.position.add(self.offset_position)
					light.position.add(self.builder.offset_position)
					self.builder.addObject(light)
				} else if (this.lights[i].o == Orientation.East) {
					let light = Prefabs.Prefab_Lights()
					light.position.set(this.lights[i].x, 0.25, this.lights[i].z)
					light.rotateY(Math.PI / 2)
					light.position.add(self.offset_position)
					light.position.add(self.builder.offset_position)
					self.builder.addObject(light)
				} else if (this.lights[i].o == Orientation.West) {
					let light = Prefabs.Prefab_Lights()
					light.position.set(this.lights[i].x, 0.25, this.lights[i].z)
					light.rotateY(-Math.PI / 2)
					light.position.add(self.offset_position)
					light.position.add(self.builder.offset_position)
					self.builder.addObject(light)
				} else if (this.lights[i].o == Orientation.NorthWest) {
					let light = Prefabs.Prefab_Lights()
					light.position.set(this.lights[i].x, 0.25, this.lights[i].z)
					light.rotateY((5 * Math.PI) / 4)
					light.position.add(self.offset_position)
					light.position.add(self.builder.offset_position)
					self.builder.addObject(light)
				} else if (this.lights[i].o == Orientation.NorthEast) {
					let light = Prefabs.Prefab_Lights()
					light.position.set(this.lights[i].x, 0.25, this.lights[i].z)
					light.rotateY((3 * Math.PI) / 4)
					light.position.add(self.offset_position)
					light.position.add(self.builder.offset_position)
					self.builder.addObject(light)
				} else if (this.lights[i].o == Orientation.SouthWest) {
					let light = Prefabs.Prefab_Lights()
					light.position.set(this.lights[i].x, 0.25, this.lights[i].z)
					light.rotateY(-Math.PI / 4)
					light.position.add(self.offset_position)
					light.position.add(self.builder.offset_position)
					self.builder.addObject(light)
				} else if (this.lights[i].o == Orientation.SouthEast) {
					let light = Prefabs.Prefab_Lights()
					light.position.set(this.lights[i].x, 0.25, this.lights[i].z)
					light.rotateY(Math.PI / 4)
					light.position.add(self.offset_position)
					light.position.add(self.builder.offset_position)
					self.builder.addObject(light)
				}
			}
		}

		if (this.settings.renderNodePaths) {
			for (let i = 0; i < this.path_nodes.length; i++) {
				let path_node = Prefabs.Prefab_PathNode(this.path_nodes[i].isc)
				path_node.position.set(this.path_nodes[i].x, 0, this.path_nodes[i].z)
				path_node.position.add(self.offset_position)
				path_node.position.add(self.builder.offset_position)
				self.builder.addObject(path_node)
			}
		}
	}

	public renderReduce() {
		this.render_running--
		// console.log(this.render_running)
		if (this.render_running === 0) {
			this.builder.ally_render_done()
		}
	}

	public getData() {
		return {
			grid: this.grid,
			buildings: this.buildings,
			lights: this.lights,
			path_nodes: this.path_nodes,
			depth: this.depth,
			offset_position: {
				x: this.offset_position.x,
				y: this.offset_position.y,
				z: this.offset_position.z,
			},
		}
	}

	public setData(allyBlockData: {
		grid: number[][][]
		buildings: {
			x: number
			z: number
			size: number
			o: Orientation
			floors: number
			type: number
		}[]
		lights: { x: number; z: number; o: Orientation }[]
		path_nodes: { x: number; z: number; ns: number[]; isc: boolean }[]
		depth: number
		offset_position: { x: number; y: number; z: number }
	}) {
		this.grid = allyBlockData.grid
		this.buildings = allyBlockData.buildings
		this.lights = allyBlockData.lights
		this.path_nodes = allyBlockData.path_nodes
		this.depth = allyBlockData.depth
		this.offset_position.set(
			allyBlockData.offset_position.x,
			allyBlockData.offset_position.y,
			allyBlockData.offset_position.z
		)
	}
}

export class CityBuilder extends THREE.Object3D {
	public cityId: string

	private settings: Settings
	public allyBlocks: AllyBlock[]
	public visuals: THREE.Object3D[]
	public offset_position: THREE.Vector3
	private random: ParkMiller
	public render_running: number
	public render_done: (() => void) | null

	public last_simple_geometry = false

	public inst_mesh: THREE.InstancedMesh | null = null
	public group_data: { [i: number]: { [j: number]: { ally: AllyBlock } } } = {}
	public cache_geo: {
		[is_corner: number]: {
			[size: number]: {
				[floorsize: number]: {
					[roof: number]: {
						[windows: number]: {
							[type: number]: {
								geo: THREE.BufferGeometry | THREE.BoxGeometry
							}
						}
					}
				}
			}
		}
	} = {}
	public cache_mesh: {
		[is_corner: number]: {
			[size: number]: {
				[floorsize: number]: {
					[roof: number]: {
						[windows: number]: {
							[type: number]: {
								mesh: THREE.InstancedMesh
							}
						}
					}
				}
			}
		}
	} = {}
	public Update_Max: ((message: any) => void) | null = null
	public Init_Return: ((message: any) => void) | null = null
	public Prefab_Geo_Return: ((message: any) => void) | null = null

	constructor(
		world: WorldBase | null,
		cityId: string,
		settings: Settings,
		init_done: (() => void) | null = null,
		init_progress: ((progress: number) => void) | null = null
	) {
		super()

		// bind functions
		this.check_cache_geo = this.check_cache_geo.bind(this)
		this.check_cache_mesh = this.check_cache_mesh.bind(this)
		this.set_cache_geo = this.set_cache_geo.bind(this)
		this.set_cache_mesh = this.set_cache_mesh.bind(this)
		this.get_cache_geo = this.get_cache_geo.bind(this)
		this.get_cache_mesh = this.get_cache_mesh.bind(this)
		this.generate = this.generate.bind(this)
		this.getData = this.getData.bind(this)
		this.setData = this.setData.bind(this)

		// init
		this.cityId = cityId
		cityBuilder[cityId] = this
		this.settings = settings
		this.allyBlocks = []
		this.visuals = []
		this.offset_position = new THREE.Vector3(0, 0, 0)
		this.random = new ParkMiller(this.settings.seed)
		this.render_running = 0
		this.render_done = null

		// console.log(`useWorker: ${useWorker}`)
		if (useWorker && world && offWork === null) {
			offWork = world.CreateWorker(FromWorker)
			// console.log(`offWork: ${offWork}`)
			// offWork = new Worker(new URL('./offscreen.js' /* , import.meta.url */), {
			// 	type: 'module',
			// })
			// offWork.onmessage = FromWorker
		}

		let init_render = 0
		let init_max = 0
		let trackerEntry: LoadingTrackerEntry | null = null

		this.Update_Max = function (addRender: number) {
			if (world !== null && init_max == 0) trackerEntry = world.loadingManager.addLoadingEntry(this.cityId)
			init_render += addRender
			init_max = init_render
		}

		this.Init_Return = function (_msg) {
			let progress_val = (init_max - init_render) / init_max
			init_render--
			if (trackerEntry !== null) {
				if (world !== null) {
					world.loadingManager.dispatchEvent(
						new CustomEvent('loading_progress', { detail: { progress: progress_val, name: this.cityId } })
					)
				}
				trackerEntry.progress = progress_val
			}
			// console.log(this.cityId, progress_val)
			// const prefab_geo = loaderGeo.parse(msg.prefab)
			if (init_progress !== null) {
				init_progress(progress_val * 100)
			}
			if (init_render == 0 && init_done !== null) {
				init_done()
				if (world !== null && trackerEntry !== null) {
					world.loadingManager.doneLoading(trackerEntry)
				}
			}
		}

		if (this.settings.preload_buildins > 0) {
			for (let i = 3; i >= 1; i--) {
				for (let j = this.settings.floorsize; j >= 0; j--) {
					let types = 0
					if (i == 1) {
						types = this.settings.block_types_1
					} else if (i == 2) {
						types = this.settings.block_types_2
					} else if (i == 3) {
						types = this.settings.block_types_3
					}
					for (let k = types; k >= 0; k--) {
						for (let l = 1; l >= 0; l--) {
							if (this.settings.preload_buildins > 1) {
								for (let m = 1; m >= 0; m--) {
									for (let n = 1; n >= 0; n--) {
										if (useWorker && offWork !== null) {
											this.Update_Max(2)
											offWork.postMessage({
												type: 'init_Prefab_Front_Geo',
												data: {
													cityId: this.cityId,
													simple_geometry: l == 1,
													renderBuildingsRoofs: m == 1,
													renderBuildingsWindows: n == 1,
													size: i,
													floors: j,
													type: k,
													is_corner: 0,
												},
											})
											offWork.postMessage({
												type: 'init_Prefab_Corner_Geo',
												data: {
													cityId: this.cityId,
													simple_geometry: l == 1,
													renderBuildingsRoofs: m == 1,
													renderBuildingsWindows: n == 1,
													size: i,
													corner: this.settings.corner_size,
													floors: j,
													type: k,
													is_corner: 1,
												},
											})
										} else {
											if (this.check_cache_geo(i, j, k, false, m == 1, n == 1)) {
												const prefab_geo = Prefabs.Prefab_Front_Geo(
													l == 1,
													m == 1,
													n == 1,
													i,
													j,
													k
												)
												this.set_cache_geo(
													i,
													j,
													k,
													false,
													m == 1,
													n == 1,
													prefab_geo.geo.type == 'BoxGeometry'
														? new THREE.BoxGeometry()
														: prefab_geo.geo
												)
											}
											this.Init_Return(undefined)
											if (this.check_cache_geo(i, j, k, true, m == 1, n == 1)) {
												const prefab_geo = Prefabs.Prefab_Corner_Geo(
													l == 1,
													m == 1,
													n == 1,
													i,
													0,
													j
												)
												this.set_cache_geo(
													i,
													j,
													k,
													true,
													m == 1,
													n == 1,
													prefab_geo.geo.type == 'BoxGeometry'
														? new THREE.BoxGeometry()
														: prefab_geo.geo
												)
											}
											this.Init_Return(undefined)
										}
									}
								}
							} else {
								if (useWorker && offWork !== null) {
									this.Update_Max(2)
									offWork.postMessage({
										type: 'init_Prefab_Front_Geo',
										data: {
											cityId: this.cityId,
											simple_geometry: this.settings.simple_geometry,
											renderBuildingsRoofs: this.settings.renderBuildingsRoofs,
											renderBuildingsWindows: this.settings.renderBuildingsWindows,
											size: i,
											floors: j,
											type: k,
											is_corner: 0,
										},
									})
									offWork.postMessage({
										type: 'init_Prefab_Corner_Geo',
										data: {
											cityId: this.cityId,
											simple_geometry: this.settings.simple_geometry,
											renderBuildingsRoofs: this.settings.renderBuildingsRoofs,
											renderBuildingsWindows: this.settings.renderBuildingsWindows,
											size: i,
											corner: this.settings.corner_size,
											floors: j,
											type: k,
											is_corner: 1,
										},
									})
								} else {
									if (
										this.check_cache_geo(
											i,
											j,
											k,
											false,
											this.settings.renderBuildingsRoofs,
											this.settings.renderBuildingsWindows
										)
									) {
										const prefab_geo = Prefabs.Prefab_Front_Geo(
											this.settings.simple_geometry,
											this.settings.renderBuildingsRoofs,
											this.settings.renderBuildingsWindows,
											i,
											j,
											k
										)
										this.set_cache_geo(
											i,
											j,
											k,
											false,
											this.settings.renderBuildingsRoofs,
											this.settings.renderBuildingsWindows,
											prefab_geo.geo.type == 'BoxGeometry'
												? new THREE.BoxGeometry()
												: prefab_geo.geo
										)
									}
									this.Init_Return(undefined)
									if (
										this.check_cache_geo(
											i,
											j,
											k,
											true,
											this.settings.renderBuildingsRoofs,
											this.settings.renderBuildingsWindows
										)
									) {
										const prefab_geo = Prefabs.Prefab_Corner_Geo(
											this.settings.simple_geometry,
											this.settings.renderBuildingsRoofs,
											this.settings.renderBuildingsWindows,
											i,
											0,
											j
										)
										this.set_cache_geo(
											i,
											j,
											k,
											true,
											this.settings.renderBuildingsRoofs,
											this.settings.renderBuildingsWindows,
											prefab_geo.geo.type == 'BoxGeometry'
												? new THREE.BoxGeometry()
												: prefab_geo.geo
										)
									}
									this.Init_Return(undefined)
								}
							}
						}
					}
				}
			}
		}
	}

	public check_cache_geo(
		size: number,
		floorsize: number,
		type: number,
		corner: boolean,
		addRoofs: boolean,
		addWindows: boolean
	) {
		const corner_inx = corner ? 1 : 0
		const addRoofs_inx = addRoofs ? 1 : 0
		const addWindows_inx = addWindows ? 1 : 0
		return (
			this.cache_geo[corner_inx] !== undefined &&
			this.cache_geo[corner_inx][size] !== undefined &&
			this.cache_geo[corner_inx][size][floorsize] !== undefined &&
			this.cache_geo[corner_inx][size][floorsize][addRoofs_inx] !== undefined &&
			this.cache_geo[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx] !== undefined &&
			this.cache_geo[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][type] !== undefined
		)
	}

	public check_cache_mesh(
		size: number,
		floorsize: number,
		type: number,
		corner: boolean,
		addRoofs: boolean,
		addWindows: boolean
	) {
		const corner_inx = corner ? 1 : 0
		const addRoofs_inx = addRoofs ? 1 : 0
		const addWindows_inx = addWindows ? 1 : 0
		return (
			this.cache_mesh[corner_inx] !== undefined &&
			this.cache_mesh[corner_inx][size] !== undefined &&
			this.cache_mesh[corner_inx][size][floorsize] !== undefined &&
			this.cache_mesh[corner_inx][size][floorsize][addRoofs_inx] !== undefined &&
			this.cache_mesh[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx] !== undefined &&
			this.cache_mesh[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][type] !== undefined
		)
	}

	public set_cache_geo(
		size: number,
		floorsize: number,
		type: number,
		corner: boolean,
		addRoofs: boolean,
		addWindows: boolean,
		geo: THREE.BufferGeometry
	) {
		// console.log('set', size, floorsize, type, corner, addRoofs, addWindows)
		// console.log(geo.type)
		const corner_inx = corner ? 1 : 0
		const addRoofs_inx = addRoofs ? 1 : 0
		const addWindows_inx = addWindows ? 1 : 0
		if (this.cache_geo[corner_inx] === undefined) this.cache_geo[corner_inx] = {}
		if (this.cache_geo[corner_inx][size] === undefined) this.cache_geo[corner_inx][size] = {}
		if (this.cache_geo[corner_inx][size][floorsize] === undefined) this.cache_geo[corner_inx][size][floorsize] = {}
		if (this.cache_geo[corner_inx][size][floorsize][addRoofs_inx] === undefined)
			this.cache_geo[corner_inx][size][floorsize][addRoofs_inx] = {}
		if (this.cache_geo[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx] === undefined)
			this.cache_geo[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx] = {}
		// if (this.cache_geo[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][type] === undefined)
		this.cache_geo[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][type] = {
			geo: geo,
		}
	}

	public set_cache_mesh(
		size: number,
		floorsize: number,
		type: number,
		corner: boolean,
		addRoofs: boolean,
		addWindows: boolean,
		mesh: THREE.InstancedMesh
	) {
		// console.log('set', size, floorsize, type, corner, addRoofs, addWindows)
		// console.log(geo.type)
		const corner_inx = corner ? 1 : 0
		const addRoofs_inx = addRoofs ? 1 : 0
		const addWindows_inx = addWindows ? 1 : 0
		if (this.cache_mesh[corner_inx] === undefined) this.cache_mesh[corner_inx] = {}
		if (this.cache_mesh[corner_inx][size] === undefined) this.cache_mesh[corner_inx][size] = {}
		if (this.cache_mesh[corner_inx][size][floorsize] === undefined)
			this.cache_mesh[corner_inx][size][floorsize] = {}
		if (this.cache_mesh[corner_inx][size][floorsize][addRoofs_inx] === undefined)
			this.cache_mesh[corner_inx][size][floorsize][addRoofs_inx] = {}
		if (this.cache_mesh[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx] === undefined)
			this.cache_mesh[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx] = {}
		// if (this.cache_mesh[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][type] === undefined)
		this.cache_mesh[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][type] = {
			mesh: mesh,
		}
	}

	public get_cache_geo(
		size: number,
		floorsize: number,
		type: number,
		corner: boolean,
		addRoofs: boolean,
		addWindows: boolean
	) {
		// console.log('get', size, floorsize, type, corner, addRoofs, addWindows)
		const corner_inx = corner ? 1 : 0
		const addRoofs_inx = addRoofs ? 1 : 0
		const addWindows_inx = addWindows ? 1 : 0
		if (
			this.cache_geo[corner_inx] !== undefined &&
			this.cache_geo[corner_inx][size] !== undefined &&
			this.cache_geo[corner_inx][size][floorsize] !== undefined &&
			this.cache_geo[corner_inx][size][floorsize][addRoofs_inx] !== undefined &&
			this.cache_geo[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx] !== undefined &&
			this.cache_geo[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][type] !== undefined
		) {
			// console.log(this.cache_geo[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][type].geo.type)
			return this.cache_geo[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][type]
		}
		return null
	}

	public get_cache_mesh(
		size: number,
		floorsize: number,
		type: number,
		corner: boolean,
		addRoofs: boolean,
		addWindows: boolean
	) {
		// console.log('get', size, floorsize, type, corner, addRoofs, addWindows)
		const corner_inx = corner ? 1 : 0
		const addRoofs_inx = addRoofs ? 1 : 0
		const addWindows_inx = addWindows ? 1 : 0
		if (
			this.cache_mesh[corner_inx] !== undefined &&
			this.cache_mesh[corner_inx][size] !== undefined &&
			this.cache_mesh[corner_inx][size][floorsize] !== undefined &&
			this.cache_mesh[corner_inx][size][floorsize][addRoofs_inx] !== undefined &&
			this.cache_mesh[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx] !== undefined &&
			this.cache_mesh[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][type] !== undefined
		) {
			// console.log(this.cache_mesh[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][type].geo.type)
			return this.cache_mesh[corner_inx][size][floorsize][addRoofs_inx][addWindows_inx][type]
		}
		return null
	}

	public clearCity() {
		for (let i = 0; i < this.visuals.length; i++) {
			this.remove(this.visuals[i])
			this.visuals[i].traverse((obj: any) => {
				if (obj.isMesh) {
					Utility.disposeMesh(obj)
				}
			})
		}
		this.visuals = []

		const change_simple_geometry = this.settings.simple_geometry !== this.last_simple_geometry
		// console.log(change_simple_geometry, this.settings.simple_geometry, last_simple_geometry)

		for (let i = 3; i >= 1; i--) {
			for (let j = this.settings.floorsize; j >= 0; j--) {
				let types = 0
				if (i == 1) {
					types = this.settings.block_types_1
				} else if (i == 2) {
					types = this.settings.block_types_2
				} else if (i == 3) {
					types = this.settings.block_types_3
				}
				for (let k = types; k >= 0; k--) {
					for (let l = 1; l >= 0; l--) {
						for (let m = 1; m >= 0; m--) {
							if (change_simple_geometry) {
								if (this.check_cache_geo(i, j, k, false, l == 1, m == 1))
									this.cache_geo[0][i][j][l][m][k].geo.dispose()

								if (this.check_cache_geo(i, j, k, true, l == 1, m == 1))
									this.cache_geo[1][i][j][l][m][k].geo.dispose()
							} else {
								if (this.check_cache_geo(i, j, k, false, l == 1, m == 1))
									Utility.disposeMesh(this.cache_mesh[0][i][j][l][m][k].mesh)
								if (this.check_cache_geo(i, j, k, true, l == 1, m == 1))
									Utility.disposeMesh(this.cache_mesh[0][i][j][l][m][k].mesh)
							}
						}
					}
				}
			}
		}

		if (change_simple_geometry) {
			this.cache_geo = {}
			if (useWorker && offWork !== null) offWork.postMessage({ type: 'clear_cache' })
			else clear_cache()
		}

		if (this.inst_mesh !== null) {
			Utility.disposeMesh(this.inst_mesh)
			this.inst_mesh = null
		}
	}

	public generate(render: boolean = true) {
		this.allyBlocks = []
		this.random = new ParkMiller(this.settings.seed)
		for (let i = 0; i < this.settings.size; i++) {
			for (let j = 0; j < this.settings.size; j++) {
				const ally = new AllyBlock(this, this.random, this.settings)
				// ally.render_done = this.ally_render_done
				ally.offset_position.set(i * this.settings.allysize, 0, j * this.settings.allysize)
				ally.offset_position.x -= ((this.settings.size - 1) / 2) * this.settings.allysize
				ally.offset_position.z -= ((this.settings.size - 1) / 2) * this.settings.allysize
				this.allyBlocks.push(ally)
			}
		}
		for (let i = 0; i < this.allyBlocks.length; i++) {
			this.allyBlocks[i].generate(render)
		}
	}

	public ally_render_done() {
		// console.log(this.render_done, !this.is_render_ready())
		if (this.render_done === null) return
		if (!this.is_render_ready()) return
		this.render_done()
	}

	public is_render_ready() {
		if (this.render_running !== 0) return false
		for (let i = 0; i < this.allyBlocks.length; i++) {
			if (this.allyBlocks[i].render_running !== 0) return false
		}
		return true
	}

	public addObject(obj: THREE.Object3D) {
		this.add(obj)
		this.visuals.push(obj)
	}

	public render() {
		this.clearCity()
		const self = this
		self.render_running += this.allyBlocks.length
		for (let i = 0; i < this.allyBlocks.length; i++) {
			function doRender() {
				self.allyBlocks[i].render(i)
				self.render_running--
				if (self.render_running === 0 && self.render_done !== null) {
					self.render_done()
				}
			}
			// setTimeout(doRender, 0)
			doRender()
		}
		this.last_simple_geometry = this.settings.simple_geometry
		return this
	}

	public getData() {
		const ally_data = []
		for (let i = 0; i < this.allyBlocks.length; i++) {
			ally_data.push(this.allyBlocks[i].getData())
		}
		return { ally_data: ally_data, settings: this.settings }
	}

	public setData(
		ally_data: {
			grid: number[][][]
			buildings: {
				x: number
				z: number
				size: number
				o: Orientation
				floors: number
				type: number
			}[]
			lights: { x: number; z: number; o: Orientation }[]
			path_nodes: { x: number; z: number; ns: number[]; isc: boolean }[]
			depth: number
			offset_position: { x: number; y: number; z: number }
		}[],
		settings: Settings
	) {
		this.allyBlocks = []
		this.settings = settings
		this.random = new ParkMiller(this.settings.seed)
		for (let i = 0; i < ally_data.length; i++) {
			const allyBlock = new AllyBlock(this, this.random, this.settings)
			allyBlock.setData(ally_data[i])
			this.allyBlocks.push(allyBlock)
		}
	}
}

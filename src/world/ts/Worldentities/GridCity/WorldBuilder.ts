import * as THREE from 'three'
// import * as THREE from 'three/webgpu'
import ParkMiller from 'park-miller'
import { CityBuilder } from './GridCityBuilder'
// import { RoadMaterial } from './textures'

const transparent = false
const wireframe = false
const y_offset = 0.003

export const laneMat = new THREE.MeshPhongMaterial({
	// color: 0x2b2b2b,
	color: 0x444444,
	// roughness: 0.8,
	// metalness: 0.0,
	transparent: transparent,
	wireframe: wireframe,
	opacity: transparent ? 0.4 : 1,
	// side: THREE.DoubleSide,
})

export const roadMat = new THREE.MeshPhongMaterial({
	color: 0x444444,
	// roughness: 0.8,
	// metalness: 0.0,
	transparent: transparent,
	wireframe: wireframe,
	opacity: transparent ? 0.4 : 1,
	// side: THREE.DoubleSide,
})

// export const roadMat = RoadMaterial()

export const junctionMat = new THREE.MeshPhongMaterial({
	// color: 0x770077,
	color: 0x444444,
	// roughness: 0.7,
	// visible: false,
	transparent: transparent,
	wireframe: wireframe,
	opacity: transparent ? 0.4 : 1,
	// side: THREE.DoubleSide,
})

export const cityBoundsMat = new THREE.LineBasicMaterial({
	color: 0x00ff88,
})

export type Lane = {
	index: number
	direction: 1 | -1
	offset: number
}

export type Pair = [number, number]

export type Road = {
	from: Pair
	to: Pair
	type: 'street' | 'connector'
	start_end: number
	direction: 'vertical' | 'horizontal'
	mesh: THREE.Mesh[]
}

export type Junction = {
	x: number
	z: number
	connections: number
	mesh: THREE.Mesh[]
}

export type City = {
	id: string
	size: number
	origin: Pair
	roads: Road[]
	junctions: Junction[]
	cityBuilder: CityBuilder // | null
}

export class WorldBuilder extends THREE.Object3D {
	private settings: any

	private LANE_WIDTH = 0.5
	private ROAD_THICKNESS = 0.22
	private WORLD_GRID_SIZE = 5 // 10
	private MIN_GRID_SIZE = 2
	private MAX_GRID_SIZE = 5
	private WORLD_BUFFER_GAP = 40
	private CITY_DENSITY = 0.35
	private BLOCK = 9
	private ROAD = 1

	private CITY_ROAD_SIZE = 2
	private WORLD_ROAD_SIZE = 4

	private random: ParkMiller

	public cities: City[]
	private worldRoads: Road[]
	private worldJunctions: Junction[]

	private _all_city_ids: string[] = []
	private _callback: (() => void) | null = null

	constructor(settings: any) {
		super()

		// bind functions
		this.world_progress = this.world_progress.bind(this)
		this.getBoundingBox = this.getBoundingBox.bind(this)
		this.getAllRoads = this.getAllRoads.bind(this)
		this.getAllJunctions = this.getAllJunctions.bind(this)
		this.generate = this.generate.bind(this)
		this.createRoadMesh = this.createRoadMesh.bind(this)
		this.buildWorldConnectors = this.buildWorldConnectors.bind(this)
		this.computeLanes = this.computeLanes.bind(this)
		this.createLaneMesh = this.createLaneMesh.bind(this)
		this.buildLaneRoad = this.buildLaneRoad.bind(this)
		this.createJunctionMesh = this.createJunctionMesh.bind(this)
		this.createCityBounds = this.createCityBounds.bind(this)
		this.buildCityMeshes = this.buildCityMeshes.bind(this)
		this.getCityFootprint = this.getCityFootprint.bind(this)
		this.getCityCoreSize = this.getCityCoreSize.bind(this)
		this.getCityExtents = this.getCityExtents.bind(this)
		this.generateCity = this.generateCity.bind(this)
		this.connectCities = this.connectCities.bind(this)
		this.getCityCenter = this.getCityCenter.bind(this)
		this.buildCityGraph = this.buildCityGraph.bind(this)
		this.connectCityPair = this.connectCityPair.bind(this)
		this.generateWorld = this.generateWorld.bind(this)
		this.generateWorldSparse = this.generateWorldSparse.bind(this)
		this.generateWorldSparseConnected = this.generateWorldSparseConnected.bind(this)

		// init
		this.settings = settings
		this.random = new ParkMiller(0)
		this.cities = []
		this.worldRoads = []
		this.worldJunctions = []
	}

	private world_progress(cid: string) {
		const index = this._all_city_ids.indexOf(cid)
		if (index > -1) {
			this._all_city_ids.splice(index, 1)
		} else {
			console.log(`City ${cid} not found in world`)
		}
		if (this._all_city_ids.length == 0 && this._callback) this._callback()
	}

	public getBoundingBox(cities: City[]) {
		const fill = this.ROAD + this.BLOCK
		const xs = []
		const zs = []
		for (const city of cities) {
			xs.push(city.origin[0])
			zs.push(city.origin[1])
			xs.push(city.origin[0] + fill * city.size)
			zs.push(city.origin[1] + fill * city.size)
		}
		const minX = Math.min(...xs)
		const maxX = Math.max(...xs)
		const minZ = Math.min(...zs)
		const maxZ = Math.max(...zs)
		return {
			minX,
			maxX,
			minZ,
			maxZ,
			centX: (minX + maxX) / 2,
			centZ: (minZ + maxZ) / 2,
		}
	}

	public getAllRoads() {
		const roads: Road[] = []
		this.worldRoads.forEach((road) => {
			roads.push(road)
		})
		this.cities.forEach((city) => {
			city.roads.forEach((road) => {
				roads.push(road)
			})
		})
		return roads
	}

	public getAllJunctions() {
		const junctions: Junction[] = []
		this.worldJunctions.forEach((junction) => {
			junctions.push(junction)
		})
		this.cities.forEach((city) => {
			city.junctions.forEach((junction) => {
				junctions.push(junction)
			})
		})
		return junctions
	}

	public generate(type: number = 1, callback: (() => void) | null = null, logs: boolean = false) {
		let cities: City[], worldRoads: Road[], worldJunctions: Junction[]
		this._callback = callback

		if (type === 0) {
			const cw = this.generateWorld(this.WORLD_GRID_SIZE, logs)
			cities = cw.cities
			worldRoads = cw.worldRoads
			worldJunctions = cw.worldJunctions
		} else if (type === 1) {
			const cw = this.generateWorldSparse(this.WORLD_GRID_SIZE, logs)
			cities = cw.cities
			worldRoads = cw.worldRoads
			worldJunctions = cw.worldJunctions
		} else if (type === 2) {
			const cw = this.generateWorldSparseConnected(this.WORLD_GRID_SIZE, logs)
			cities = cw.cities
			worldRoads = cw.worldRoads
			worldJunctions = cw.worldJunctions
		} else {
			cities = []
			worldRoads = []
			worldJunctions = []
		}

		const worldBox = this.getBoundingBox(cities)
		for (const city of cities) {
			this.add(this.buildCityMeshes(city, worldBox))
		}
		this.add(this.buildWorldConnectors(worldRoads, worldBox))
		for (const junction of worldJunctions) {
			const world_junctions = this.createJunctionMesh(junction, this.WORLD_ROAD_SIZE)
			world_junctions.position.x -= worldBox.centX
			world_junctions.position.z -= worldBox.centZ
			world_junctions.position.x += 10 - (worldBox.centX % 10)
			world_junctions.position.z += 10 - (worldBox.centZ % 10)
			this.add(world_junctions)
		}

		this.cities = cities
		this.worldRoads = worldRoads
		this.worldJunctions = worldJunctions

		/* const self = this;
        function checkRoads(roads: Road[]) {
            roads.forEach(road => {
                road.mesh.forEach(mesh => {
                    mesh.material.color = new THREE.Color(
                        self.random.float() * 0x7f7f7f + 0x7f7f7f
                    );
                });
            });
        }
        checkRoads(this.getAllRoads()); */
	}

	private createRoadMesh(road: Road, width = this.CITY_ROAD_SIZE, _solid = false) {
		const dx = road.to[0] - road.from[0]
		const dz = road.to[1] - road.from[1]
		const length = Math.sqrt(dx * dx + dz * dz)

		let geometry: THREE.PlaneGeometry | THREE.BoxGeometry
		if (_solid == true) {
			geometry = new THREE.BoxGeometry(width, 0.1, length)
		} else {
			geometry = new THREE.PlaneGeometry(width, length, width, length)
		}
		const mesh = new THREE.Mesh(geometry, roadMat.clone())

		const offsetX = 0 // road.from[0] - road.to[0] == 0 ? width / 4 : 0;
		const offsetZ = 0 // road.from[1] - road.to[1] == 0 ? width / 4 : 0;

		mesh.position.set(
			(road.from[0] + road.to[0]) / 2 - offsetX,
			y_offset,
			(road.from[1] + road.to[1]) / 2 - offsetZ
		)

		if (geometry.type == 'PlaneGeometry') {
			mesh.rotation.x = -Math.PI / 2
			mesh.rotation.z = Math.atan2(dx, dz)
		} else if (geometry.type == 'BoxGeometry') {
			mesh.rotation.y = Math.atan2(dx, dz)
		}
		mesh.receiveShadow = true

		road.mesh = []
		road.mesh.push(mesh)

		return mesh
	}

	private buildWorldConnectors(
		connectors: Road[],
		worldBox: {
			minX: number
			maxX: number
			minZ: number
			maxZ: number
			centX: number
			centZ: number
		}
	) {
		const group = new THREE.Group()
		group.name = 'world-connectors'

		for (const road of connectors) {
			const world_road = this.createRoadMesh(road, this.WORLD_ROAD_SIZE)
			world_road.position.x -= worldBox.centX
			world_road.position.z -= worldBox.centZ
			world_road.position.x += 10 - (worldBox.centX % 10)
			world_road.position.z += 10 - (worldBox.centZ % 10)
			group.add(world_road)
			// const lanes = road.type === 'connector' ? this.WORLD_ROAD_SIZE * 2 : this.CITY_ROAD_SIZE * 2
			// group.add(this.buildLaneRoad(road, lanes))
		}

		return group
	}

	private computeLanes(count: number): Lane[] {
		const lanes: Lane[] = []
		const half = count / 2

		for (let i = 0; i < count; i++) {
			const side = i < half ? -1 : 1
			const offsetIndex = i % half
			lanes.push({
				index: i,
				direction: side === -1 ? 1 : -1,
				offset: side * (this.LANE_WIDTH * (offsetIndex + 0.5 + 0.1)),
			})
		}
		return lanes
	}

	private createLaneMesh(from: Pair, to: Pair, offset: number, width = this.LANE_WIDTH, solid = false) {
		const dx = to[0] - from[0]
		const dz = to[1] - from[1]
		const length = Math.sqrt(dx * dx + dz * dz)

		let geometry: THREE.PlaneGeometry | THREE.BoxGeometry
		if (solid == true) {
			geometry = new THREE.BoxGeometry(width - 0.1, this.ROAD_THICKNESS, length)
		} else {
			geometry = new THREE.PlaneGeometry(width - 0.1, length)
		}
		const mesh = new THREE.Mesh(geometry, laneMat)

		// Direction vectors
		const dirX = dx / length
		const dirZ = dz / length

		// Perpendicular vector
		const perpX = -dirZ
		const perpZ = dirX

		mesh.position.x = (from[0] + to[0]) / 2 + perpX * offset
		if (solid) mesh.position.y = this.ROAD_THICKNESS / 2
		mesh.position.z = (from[1] + to[1]) / 2 + perpZ * offset

		if (geometry.type === 'BoxGeometry') {
			mesh.rotation.y = Math.atan2(dx, dz)
		} else if (geometry.type === 'PlaneGeometry') {
			mesh.rotation.x = -Math.PI / 2
			mesh.rotation.z = Math.atan2(dx, dz)
		}
		mesh.receiveShadow = true

		return mesh
	}

	private buildLaneRoad(road: Road, laneCount = this.CITY_ROAD_SIZE) {
		const group = new THREE.Group()
		const lanes: Lane[] = this.computeLanes(laneCount)

		for (const lane of lanes) {
			const mesh = this.createLaneMesh(road.from, road.to, lane.offset)

			mesh.userData = {
				laneIndex: lane.index,
				direction: lane.direction,
			}

			group.add(mesh)
		}

		return group
	}
	private createJunctionMesh(junction: Junction, size = this.CITY_ROAD_SIZE, solid: boolean = false) {
		let geometry: THREE.PlaneGeometry | THREE.BoxGeometry
		if (solid == true) {
			geometry = new THREE.BoxGeometry(size, 0.12, size)
		} else {
			geometry = new THREE.PlaneGeometry(size, size, size, size)
		}

		const mesh = new THREE.Mesh(geometry, junctionMat)
		if (solid == false) {
			mesh.rotation.x = -Math.PI / 2
		}

		mesh.position.set(junction.x, y_offset, junction.z)
		mesh.receiveShadow = true

		junction.mesh = []
		junction.mesh.push(mesh)

		return mesh
	}

	private createCityBounds(origin: [number, number], gridSize: number) {
		const cityCoreSize = gridSize * this.BLOCK + (gridSize + 1) * this.ROAD
		const minX = origin[0] - 1
		const minZ = origin[1] - 1
		const maxX = origin[0] + cityCoreSize
		const maxZ = origin[1] + cityCoreSize

		const points = [
			new THREE.Vector3(minX, 0.25, minZ),
			new THREE.Vector3(maxX, 0.25, minZ),
			new THREE.Vector3(maxX, 0.25, maxZ),
			new THREE.Vector3(minX, 0.25, maxZ),
			new THREE.Vector3(minX, 0.25, minZ),
		]

		const geometry = new THREE.BufferGeometry().setFromPoints(points)
		return new THREE.Line(geometry, cityBoundsMat)
	}

	private buildCityMeshes(
		city: City,
		worldBox: {
			minX: number
			maxX: number
			minZ: number
			maxZ: number
			centX: number
			centZ: number
		}
	) {
		const group = new THREE.Group()
		group.name = city.id

		// City
		const core = city.size * (this.BLOCK + this.ROAD)
		// if (city.cityBuilder !== null) {
		if (this.settings.renderCity) {
			group.add(city.cityBuilder)
			city.cityBuilder.offset_position.x = city.origin[0] + core / 2
			city.cityBuilder.offset_position.z = city.origin[1] + core / 2
			city.cityBuilder.offset_position.x -= worldBox.centX
			city.cityBuilder.offset_position.z -= worldBox.centZ
			city.cityBuilder.offset_position.x += 10 - (worldBox.centX % 10)
			city.cityBuilder.offset_position.z += 10 - (worldBox.centZ % 10)
			city.cityBuilder.render()
		}

		// Roads
		for (let i = 0; i < city.roads.length; i++) {
			const city_road = this.createRoadMesh(city.roads[i], this.CITY_ROAD_SIZE)
			city_road.position.x -= worldBox.centX
			city_road.position.z -= worldBox.centZ
			city_road.position.x += 10 - (worldBox.centX % 10)
			city_road.position.z += 10 - (worldBox.centZ % 10)
			group.add(city_road)
			// const lanes = city.roads[i].type === 'connector' ? this.WORLD_ROAD_SIZE * 2 : this.CITY_ROAD_SIZE * 2
			// group.add(this.buildLaneRoad(city.roads[i], lanes))
		}

		// Junctions
		for (const j of city.junctions) {
			const city_junctions = this.createJunctionMesh(j)
			city_junctions.position.x -= worldBox.centX
			city_junctions.position.z -= worldBox.centZ
			city_junctions.position.x += 10 - (worldBox.centX % 10)
			city_junctions.position.z += 10 - (worldBox.centZ % 10)
			group.add(city_junctions)
		}

		const helper = new THREE.AxesHelper(20)
		helper.position.x = city.origin[0] + core / 2
		helper.position.z = city.origin[1] + core / 2
		helper.position.x -= worldBox.centX
		helper.position.z -= worldBox.centZ
		helper.position.x += 10 - (worldBox.centX % 10)
		helper.position.z += 10 - (worldBox.centZ % 10)
		//		group.add(helper);

		// Debug bounds
		if (false) {
			const debug_bounds = this.createCityBounds(city.origin, city.size)
			debug_bounds.position.x -= worldBox.centX
			debug_bounds.position.z -= worldBox.centZ
			debug_bounds.position.x += 10 - (worldBox.centX % 10)
			debug_bounds.position.z += 10 - (worldBox.centZ % 10)
			group.add(debug_bounds)
		}

		return group
	}

	private getCityFootprint(size: number, maxLanes = Math.max(this.CITY_ROAD_SIZE, this.WORLD_ROAD_SIZE)) {
		const core = size * this.BLOCK + (size + 1) * this.ROAD
		const margin = this.ROAD / 2 + (this.LANE_WIDTH * maxLanes) / 2 + 1
		return core + margin * 2
	}

	private getCityCoreSize(city: City) {
		return city.size * this.BLOCK + (city.size + 1) * this.ROAD
	}

	private getCityExtents(city: any) {
		const cityCoreSize = this.getCityCoreSize(city)
		return {
			minX: city.origin[0] - 1,
			maxX: city.origin[0] + cityCoreSize,
			minZ: city.origin[1] - 1,
			maxZ: city.origin[1] + cityCoreSize,
			cx: city.origin[0] + (cityCoreSize - 1) / 2,
			cz: city.origin[1] + (cityCoreSize - 1) / 2,
		}
	}

	private generateCity(
		cityId: string,
		gridSize: number,
		originX: number,
		originZ: number,
		callback: ((id: string) => void) | null = null,
		logs = false
	): City {
		const roads: Road[] = []
		const junctions = []

		// const citySize = gridSize * this.BLOCK + (gridSize + 1) * this.ROAD

		// City
		function cityDone() {
			if (logs) console.log(`City Done: ${cityId}`)
			if (callback !== null) callback(cityId)
		}
		function cityProgress(prog: number) {
			if (logs) console.log(`City Prpg: ${cityId}|${Number(prog).toFixed(2) + '%'}`)
		}
		const settings = JSON.parse(JSON.stringify(this.settings))
		settings.size = gridSize
		const cityBuilder = new CityBuilder(cityId, settings, cityDone, cityProgress)
		cityBuilder.generate()

		// Vertical roads
		for (let i = 0; i <= gridSize; i++) {
			for (let j = 0; j < gridSize; j++) {
				const x = originX + i * (this.BLOCK + this.ROAD)
				const z = originZ + j * (this.BLOCK + this.ROAD)
				let start_end = 0
				if (i == 0 || j == 0) start_end++
				if (i == gridSize || j == gridSize) start_end--
				roads.push({
					from: [x, z + 1],
					to: [x, z + this.BLOCK],
					type: 'street',
					start_end: start_end,
					direction: 'vertical',
					mesh: [],
				})
			}
		}
		// Hirizontal roads
		for (let i = 0; i < gridSize; i++) {
			for (let j = 0; j <= gridSize; j++) {
				const x = originX + i * (this.BLOCK + this.ROAD)
				const z = originZ + j * (this.BLOCK + this.ROAD)
				let start_end = 0
				if (i == 0 || j == 0) start_end++
				if (i == gridSize || j == gridSize) start_end--
				roads.push({
					from: [x + 1, z],
					to: [x + this.BLOCK, z],
					type: 'street',
					start_end: start_end,
					direction: 'vertical',
					mesh: [],
				})
			}
		}

		// Junctions
		for (let i = 0; i <= gridSize; i++) {
			for (let j = 0; j <= gridSize; j++) {
				junctions.push({
					x: originX + i * (this.BLOCK + this.ROAD),
					z: originZ + j * (this.BLOCK + this.ROAD),
					connections: 4,
					mesh: [],
				})
			}
		}

		return {
			id: cityId,
			size: gridSize,
			origin: [originX, originZ],
			roads,
			junctions,
			cityBuilder: cityBuilder,
		}
	}

	private connectCities(cityA: City, cityB: City, direction: string) {
		const connectors: Road[] = []

		const a = this.getCityExtents(cityA)
		const b = this.getCityExtents(cityB)

		if (direction === 'horizontal') {
			connectors.push({
				from: [a.maxX, a.cz],
				to: [b.minX, a.cz],
				type: 'connector',
				start_end: 0,
				direction: direction,
				mesh: [],
			})
		}

		if (direction === 'vertical') {
			connectors.push({
				from: [a.cx, a.maxZ],
				to: [a.cx, b.minZ],
				type: 'connector',
				start_end: 0,
				direction: direction,
				mesh: [],
			})
		}

		return connectors
	}

	private getCityCenter(city: City) {
		const core = city.size * this.BLOCK + (city.size + 1) * this.ROAD

		return {
			x: city.origin[0] + core / 2,
			z: city.origin[1] + core / 2,
		}
	}

	private buildCityGraph(cities: City[]) {
		const connected = new Set<number>([0])
		const edges: [City, City][] = []

		while (connected.size < cities.length) {
			let best: [number, number] | null = null
			let bestDist = Infinity

			for (const i of connected) {
				for (let j = 0; j < cities.length; j++) {
					if (connected.has(j)) continue

					const A = this.getCityExtents(cities[i])
					const B = this.getCityExtents(cities[j])
					const d = Math.hypot(A.cx - B.cx, A.cz - B.cz)

					if (d < bestDist) {
						bestDist = d
						best = [i, j]
					}
				}
			}

			if (!best) break
			connected.add(best[1])
			edges.push([cities[best[0]], cities[best[1]]])
		}

		return edges
	}

	private connectCityPair(cityA: City, cityB: City): { roads: Road[]; junctions: Junction[] } {
		const A = this.getCityExtents(cityA)
		const B = this.getCityExtents(cityB)

		const dx = B.cx - A.cx
		const dz = B.cz - A.cz

		const roads: Road[] = []
		const junctions: Junction[] = []
		const off = 0.3
		const turn_dir_x = (this.WORLD_ROAD_SIZE / 2) * (dx > 0 ? 1 : -1)
		const turn_dir_z = (this.WORLD_ROAD_SIZE / 2) * (dz > 0 ? 1 : -1)

		const fillGap = this.BLOCK + this.ROAD

		let exitMoveA = 0
		let exitMoveB = 0

		if (cityA.size % 2 != 0) exitMoveA = (this.BLOCK + 1) / 2
		if (cityB.size % 2 != 0) exitMoveB = (this.BLOCK + 1) / 2

		// Decide dominant direction
		if (Math.abs(dx) > Math.abs(dz)) {
			// HORIZONTAL EXIT FIRST
			const exitX = dx > 0 ? A.maxX : A.minX
			const exitZ = A.cz + (A.cz - B.cz > 0 ? 1 : -1) * exitMoveA
			const entryX = dx > 0 ? B.minX : B.maxX
			const entryZ = B.cz + (A.cz - B.cz > 0 ? -1 : 1) * exitMoveB

			let midX = exitX + dx * off
			midX += fillGap - (midX % fillGap)

			if (exitZ == entryZ) {
				roads.push({
					from: [exitX, exitZ],
					to: [entryX, exitZ],
					type: 'connector',
					direction: 'horizontal',
					start_end: 0,
					mesh: [],
				})
			} else {
				// Perpendicular exit (horizontal)
				roads.push({
					from: [exitX, exitZ],
					to: [midX - turn_dir_x, exitZ],
					type: 'connector',
					direction: 'horizontal',
					start_end: 0,
					mesh: [],
				})
				junctions.push({
					x: midX,
					z: exitZ,
					connections: 1,
					mesh: [],
				})

				// Turn vertical toward target
				roads.push({
					from: [midX, exitZ + turn_dir_z],
					to: [midX, entryZ - turn_dir_z],
					type: 'connector',
					direction: 'vertical',
					start_end: 0,
					mesh: [],
				})
				junctions.push({
					x: midX,
					z: entryZ,
					connections: 1,
					mesh: [],
				})

				// Final horizontal into city B
				roads.push({
					from: [midX + turn_dir_x, entryZ],
					to: [entryX, entryZ],
					type: 'connector',
					direction: 'horizontal',
					start_end: 0,
					mesh: [],
				})
			}
		} else {
			// VERTICAL EXIT FIRST
			const exitX = A.cx + (A.cx - B.cx > 0 ? 1 : -1) * exitMoveA
			const exitZ = dz > 0 ? A.maxZ : A.minZ
			const entryX = B.cx + (A.cx - B.cx > 0 ? -1 : 1) * exitMoveB
			const entryZ = dz > 0 ? B.minZ : B.maxZ

			let midZ = exitZ + dz * off
			midZ += fillGap - (midZ % fillGap)

			if (exitX == entryX) {
				roads.push({
					from: [exitX, exitZ],
					to: [entryX, entryZ],
					type: 'connector',
					direction: 'vertical',
					start_end: 0,
					mesh: [],
				})
			} else {
				// Perpendicular exit (vertical)
				roads.push({
					from: [exitX, exitZ],
					to: [exitX, midZ - turn_dir_z],
					type: 'connector',
					direction: 'vertical',
					start_end: 0,
					mesh: [],
				})
				junctions.push({
					x: exitX,
					z: midZ,
					connections: 1,
					mesh: [],
				})

				// Turn horizontal toward target
				roads.push({
					from: [exitX + turn_dir_x, midZ],
					to: [entryX - turn_dir_x, midZ],
					type: 'connector',
					direction: 'horizontal',
					start_end: 0,
					mesh: [],
				})
				junctions.push({
					x: entryX,
					z: midZ,
					connections: 1,
					mesh: [],
				})

				// Final vertical into city B
				roads.push({
					from: [entryX, midZ + turn_dir_z],
					to: [entryX, entryZ],
					type: 'connector',
					direction: 'vertical',
					start_end: 0,
					mesh: [],
				})
			}
		}

		return { roads: roads, junctions }
	}

	private generateWorld(cityGridSize: number = 3, logs: boolean = false) {
		const cities: City[] = []
		const worldRoads: Road[] = []
		const worldJunctions: Junction[] = []

		const grid: City[][] = []

		const fillGap = this.BLOCK + this.ROAD
		let zOffset = []

		for (let z = 0; z <= cityGridSize; z++) {
			let xOffset = 0
			grid[z] = []

			for (let x = 0; x <= cityGridSize; x++) {
				if (z == 0) zOffset.push(0)
				const size = this.MIN_GRID_SIZE + Math.floor(this.random.float() * this.MAX_GRID_SIZE)
				const footprint = this.getCityFootprint(size)
				const city = this.generateCity(`city_${x}_${z}`, size, xOffset, zOffset[x], this.world_progress, logs)
				this._all_city_ids.push(city.id)

				grid[z][x] = city
				if (z !== 0 && x !== 0) cities.push(city)

				xOffset += footprint + this.WORLD_BUFFER_GAP // gap buffer
				zOffset[x] += footprint + this.WORLD_BUFFER_GAP // gap buffer

				xOffset += fillGap - (xOffset % fillGap)
				zOffset[x] += fillGap - (zOffset[x] % fillGap)
			}

			// advance row by tallest city in row
			// const rowMax = Math.max(...grid[z].map((c) => this.getCityFootprint(c.size)))

			// zOffset[z] += rowMax + this.WORLD_BUFFER_GAP
		}

		if (false) {
			// Connect neighbors
			for (let z = 0; z < cityGridSize; z++) {
				for (let x = 0; x < cityGridSize; x++) {
					const city = grid[z][x]

					if (x + 1 < cityGridSize) {
						worldRoads.push(...this.connectCities(city, grid[z][x + 1], 'horizontal'))
					}

					if (z + 1 < cityGridSize) {
						worldRoads.push(...this.connectCities(city, grid[z + 1][x], 'vertical'))
					}
				}
			}
		} else {
			const edges = this.buildCityGraph(cities)
			for (const [a, b] of edges) {
				const wordl_connections = this.connectCityPair(a, b)
				worldRoads.push(...wordl_connections.roads)
				worldJunctions.push(...wordl_connections.junctions)
			}
		}

		return { cities, worldRoads, worldJunctions }
	}

	private generateWorldSparse(cityGridSize: number = 3, logs: boolean = false) {
		const cities: City[] = []
		const worldRoads: Road[] = []
		const worldJunctions: Junction[] = []

		const grid: (any | null)[][] = []

		// Decide which grid cells get cities
		for (let z = 0; z < cityGridSize; z++) {
			grid[z] = []
			for (let x = 0; x < cityGridSize; x++) {
				if (this.random.float() < this.CITY_DENSITY) {
					const size = this.MIN_GRID_SIZE + Math.floor(this.random.float() * this.MAX_GRID_SIZE)
					grid[z][x] = { size }
				} else {
					grid[z][x] = null
				}
			}
		}

		// Compute physical positions (row by row)
		const fillGap = this.BLOCK + this.ROAD
		let zOffset = 0

		for (let z = 0; z < cityGridSize; z++) {
			let xOffset = 0

			// tallest city in this row
			const rowCities = grid[z].filter(Boolean)
			const rowHeight =
				rowCities.length === 0 ? 120 : Math.max(...rowCities.map((c) => this.getCityFootprint(c.size)))

			for (let x = 0; x < cityGridSize; x++) {
				const cell = grid[z][x]

				if (!cell) {
					xOffset += 120 // empty tile space
					continue
				}

				const city = this.generateCity(`city_${x}_${z}`, cell.size, xOffset, zOffset, this.world_progress, logs)
				this._all_city_ids.push(city.id)

				grid[z][x] = city
				cities.push(city)

				xOffset += this.getCityFootprint(cell.size) + this.WORLD_BUFFER_GAP
				xOffset += fillGap - (xOffset % fillGap)
			}

			zOffset += rowHeight + this.WORLD_BUFFER_GAP
			zOffset += fillGap - (zOffset % fillGap)
		}

		if (false) {
			// Connect only existing neighbors
			for (let z = 0; z < cityGridSize; z++) {
				for (let x = 0; x < cityGridSize; x++) {
					const city = grid[z][x]
					if (!city) continue

					if (grid[z][x + 1]) {
						worldRoads.push(...this.connectCities(city, grid[z][x + 1], 'horizontal'))
					}

					if (grid[z + 1]?.[x]) {
						worldRoads.push(...this.connectCities(city, grid[z + 1][x], 'vertical'))
					}
				}
			}
		} else {
			const edges = this.buildCityGraph(cities)
			for (const [a, b] of edges) {
				const wordl_connections = this.connectCityPair(a, b)
				worldRoads.push(...wordl_connections.roads)
				worldJunctions.push(...wordl_connections.junctions)
			}
		}

		return { cities, worldRoads, worldJunctions }
	}

	private generateWorldSparseConnected(cityGridSize: number = 3, logs: boolean = false) {
		const cities: City[] = []
		const worldRoads: Road[] = []
		const worldJunctions: Junction[] = []

		let x = 0
		let z = 0

		for (let i = 0; i < cityGridSize; i++) {
			for (let j = 0; j < cityGridSize; j++) {
				if (this.random.float() < this.CITY_DENSITY) {
					const size = this.MIN_GRID_SIZE + Math.floor(this.random.float() * this.MAX_GRID_SIZE)
					const city = this.generateCity(`city_${i}_${j}`, size, x, z, this.world_progress, logs)
					cities.push(city)
					this._all_city_ids.push(city.id)
				}
				x += 120
			}
			x = 0
			z += 120
		}

		const edges = this.buildCityGraph(cities)
		for (const [a, b] of edges) {
			const wordl_connections = this.connectCityPair(a, b)
			worldRoads.push(...wordl_connections.roads)
			worldJunctions.push(...wordl_connections.junctions)
		}

		return { cities, worldRoads, worldJunctions }
	}
}

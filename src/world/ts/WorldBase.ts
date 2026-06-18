import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import * as _ from 'lodash'
import { Player } from './Core/Player'
import { IUpdatable } from './Interfaces/IUpdatable'
import { Utility } from './Core/Utility'
import { BoxCollider } from './Physics/Colliders/BoxCollider'
import { SphereCollider } from './Physics/Colliders/SphereCollider'
import { CylinderCollider } from './Physics/Colliders/CylinderCollider'
import { TrimeshCollider } from './Physics/Colliders/TrimeshCollider'
import { HeightMapCollider } from './Physics/Colliders/HeightMapCollider'
import { CollisionGroups } from './Enums/CollisionGroups'
import { EntityType } from './Enums/EntityType'
import { Path } from './Worldentities/Path'
import { Scenario } from './Worldentities/Scenario'
import { TabPageApi } from 'tweakpane'
import { IWorldEntity } from './Interfaces/IWorldEntity'
import { Character } from './Characters/Character'
import { Vehicle } from './Vehicles/Vehicle'
import { Train } from './Vehicles/Train'
import { getMapConfig, MapConfigType } from './MapConfigs'
import { Water } from './Worldentities/Water'
import { BaseScene } from './MapConfigs/BaseScene'
import { ShapeEntityBase } from './Physics/ShapeEntity/ShapeEntityBase'
import { LoadingManager } from './Core/LoadingManager'
import { ICollider } from './Interfaces/ICollider'
import { Terrain } from './Worldentities/GridCity/Terrain'

export abstract class WorldBase {
	public worldId: string | null = null
	public physicsFrameRate: number
	public physicsFrameTime: number
	private worldClock: THREE.Clock
	private requestDelta: number
	private logicDelta: number
	private sinceLastFrame: number
	public timeScaleTarget: number

	public sunConf = {
		elevation: 60,
		azimuth: 45,
	}
	public scene: THREE.Scene
	public world: CANNON.World
	public users: { [id: string]: Player } = {}

	public settings: { [id: string]: any }
	public updatables: IUpdatable[]
	public paths: Path[]
	public scenarios: Scenario[]
	public scenariosCalls: { [id: string]: any }
	public lastScenarioID: string | null
	public mapLoadFinishCallBack: Function | null
	public MapConfig: { [id: string]: MapConfigType }
	public maps: { [id: string]: any }
	private mapAnimation: any[]
	private mapMixer: THREE.AnimationMixer | null
	public lastMapID: string | null
	public characters: Character[]
	public vehicles: Vehicle[]
	public trains: Train[]
	public waters: Water[]
	public shapes: ShapeEntityBase[]
	protected clientEntity: IWorldEntity[] = []

	private terrain: Terrain
	private chunks: { collider: ICollider; is_inside: boolean }[]

	public sceneObjects: THREE.Object3D[]
	public worldObjects: CANNON.Body[]

	public chatData: { from: string; message: string }[]
	public loadingManager: LoadingManager

	// server
	protected updatePhysicsCallback: Function | null
	public runner: ReturnType<typeof setInterval> | null

	// client
	public player: Player | null
	public isClient: boolean
	protected doPhysics: boolean
	public scenarioGUIFolderCallback: TabPageApi | null
	public launchMapCallback: Function | null
	public launchScenarioCallback: Function | null
	public boxSize: THREE.Vector3 = new THREE.Vector3()
	public listener: THREE.AudioListener | null

	constructor(maps: MapConfigType[], isClient: boolean = false) {
		// bind functions
		this.getPATH = this.getPATH.bind(this)
		this.getGLTF = this.getGLTF.bind(this)
		this.getJSON = this.getJSON.bind(this)
		this.registerUpdatable = this.registerUpdatable.bind(this)
		this.unregisterUpdatable = this.unregisterUpdatable.bind(this)
		this.addTerrainFollower = this.addTerrainFollower.bind(this)
		this.removeTerrainFollower = this.removeTerrainFollower.bind(this)
		this.scrollTheTimeScale = this.scrollTheTimeScale.bind(this)
		this.addSceneObject = this.addSceneObject.bind(this)
		this.removeSceneObject = this.removeSceneObject.bind(this)
		this.addWorldObject = this.addWorldObject.bind(this)
		this.removeWorldObject = this.removeWorldObject.bind(this)
		this.isOutOfBounds = this.isOutOfBounds.bind(this)
		this.outOfBoundsRespawn = this.outOfBoundsRespawn.bind(this)
		this.zeroBody = this.zeroBody.bind(this)
		this.clearScene = this.clearScene.bind(this)
		this.loadScene = this.loadScene.bind(this)
		this.launchScenario = this.launchScenario.bind(this)
		this.restartScenario = this.restartScenario.bind(this)
		this.clearEntities = this.clearEntities.bind(this)
		this.update = this.update.bind(this)
		this.updatePhysics = this.updatePhysics.bind(this)

		// init
		this.player = null
		this.physicsFrameRate = 35
		this.physicsFrameTime = 1 / this.physicsFrameRate
		this.worldClock = new THREE.Clock()
		this.requestDelta = this.worldClock.getDelta()
		this.logicDelta = this.requestDelta
		this.sinceLastFrame = 0
		this.timeScaleTarget = 1
		this.updatables = []
		this.paths = []
		this.scenarios = []
		this.lastScenarioID = null
		this.mapLoadFinishCallBack = null
		this.maps = {}

		this.mapAnimation = []
		this.mapMixer = null
		this.lastMapID = null
		this.characters = []
		this.vehicles = []
		this.trains = []
		this.waters = []
		this.shapes = []
		this.clientEntity = []

		this.terrain = new Terrain()
		this.chunks = []

		this.sceneObjects = []
		this.worldObjects = []
		this.chatData = []

		this.updatePhysicsCallback = null
		this.runner = null

		this.isClient = isClient
		this.doPhysics = true
		this.scenarioGUIFolderCallback = null
		this.launchMapCallback = null
		this.launchScenarioCallback = null
		this.listener = null
		this.loadingManager = new LoadingManager(this)

		// Maps
		this.MapConfig = getMapConfig(this, maps)
		Object.keys(this.MapConfig).forEach((mn) => {
			this.maps[this.MapConfig[mn].name] = async () => {
				await this.launchMap(
					this.MapConfig[mn].name,
					this.MapConfig[mn].isCallback,
					this.MapConfig[mn].isLaunched
				)
			}
		})
		// console.log(this.maps, MapConfig)

		// Settings
		this.settings = {
			Time_Scale: 1,

			// Client
			Pointer_Lock: true,
			Mouse_Sensitivity: 0.2,
			Debug_Physics_Engine: false,
			Debug_Physics: false,
			Debug_Physics_Wireframe: true,
			Debug_Physics_MeshOpacity: 1,
			Debug_Physics_MeshEdges: false,
			Debug_FPS: true,
			Debug_Helper: true,
			Debug_Pings: true,
			Debug_Controls: true,
			Debug_Console: true,
			PostProcess: false,
			Textures: true,
			Shadows: true,
			FXAA: false,
			Outline: false,
			UnrealBloom: true,
			UnrealBloom_threshold: 0.6,
			UnrealBloom_strength: 0.2,
			UnrealBloom_radius: 0.3,
			SyncSun: true,
			SyncInputs: true,
		}
		this.scenariosCalls = {}

		// fog
		let fog = new THREE.Fog(0x222222, 100, 2000)

		// Scene
		this.scene = new THREE.Scene()
		this.scene.fog = fog

		// World
		this.world = new CANNON.World()
		this.world.gravity.set(0, -9.81, 0)
		this.world.broadphase = new CANNON.SAPBroadphase(this.world)

		const solver = new CANNON.GSSolver()
		solver.iterations = 50
		solver.tolerance = 0.0001

		this.world.solver = solver
		this.world.allowSleep = true
	}

	public getPATH(path: string) {
		// return this.isClient ? './models/' + path : './dist/' + 'client/models/' + path + '.json'
		return this.isClient ? '../' + path : (!Utility.isElectron() ? './dist/' : './.webpack/renderer/') + path
	}

	public getGLTF(path: string, callback: Function) {
		return this.getPATH('client/models/' + path) + (this.isClient ? '' : '.json')
	}

	public getJSON(path: string, callback: Function) {
		return { path: this.getPATH('client/models/MapConfigs/' + path) }
	}

	public add(worldEntity: IWorldEntity): void {
		worldEntity.addToWorld(this)
		this.registerUpdatable(worldEntity)
		this.addTerrainFollower(worldEntity)
	}

	public remove(worldEntity: IWorldEntity): void {
		worldEntity.removeFromWorld(this)
		this.unregisterUpdatable(worldEntity)
		this.removeTerrainFollower(worldEntity)
	}

	public registerUpdatable(registree: IUpdatable): void {
		this.updatables.push(registree)
		this.updatables.sort((a, b) => (a.updateOrder > b.updateOrder ? 1 : -1))
	}

	public unregisterUpdatable(registree: IUpdatable): void {
		_.pull(this.updatables, registree)
	}

	private addTerrainFollower(worldEntity: IWorldEntity) {
		switch (worldEntity.entityType) {
			case EntityType.Character: {
				this.terrain.followObject.push(worldEntity as Character)
				break
			}
			case EntityType.Airplane:
			case EntityType.Car:
			case EntityType.Helicopter:
			case EntityType.Train: {
				this.terrain.followObject.push(worldEntity as Vehicle)
				break
			}
			case EntityType.Shape: {
				this.terrain.followObject.push((worldEntity as ShapeEntityBase).obj)
				break
			}
			default: {
				break
			}
		}
	}
	private removeTerrainFollower(worldEntity: IWorldEntity) {
		switch (worldEntity.entityType) {
			case EntityType.Character: {
				_.pull(this.terrain.followObject, worldEntity as Character)
				break
			}
			case EntityType.Airplane:
			case EntityType.Car:
			case EntityType.Helicopter:
			case EntityType.Train: {
				_.pull(this.terrain.followObject, worldEntity as Vehicle)
				break
			}
			case EntityType.Shape: {
				_.pull(this.terrain.followObject, (worldEntity as ShapeEntityBase).obj)
				break
			}
			default: {
				break
			}
		}
	}

	public scrollTheTimeScale(scrollAmount: number): void {
		// Changing time scale with scroll wheel
		const timeScaleBottomLimit = 0.003
		const timeScaleChangeSpeed = 1.3

		if (scrollAmount > 0) {
			this.timeScaleTarget /= timeScaleChangeSpeed
			if (this.timeScaleTarget < timeScaleBottomLimit) this.timeScaleTarget = 0
		} else {
			this.timeScaleTarget *= timeScaleChangeSpeed
			if (this.timeScaleTarget < timeScaleBottomLimit) this.timeScaleTarget = timeScaleBottomLimit
			this.timeScaleTarget = Math.min(this.timeScaleTarget, 1)
		}
	}

	public addSceneObject(object: any) {
		if (_.includes(this.sceneObjects, object)) return
		this.sceneObjects.push(object)
		this.scene.add(object)
	}

	public removeSceneObject(object: any) {
		if (!_.includes(this.sceneObjects, object)) return
		this.scene.remove(object)
		_.pull(this.sceneObjects, object)
	}

	public addWorldObject(object: CANNON.Body) {
		if (!this.settings.Debug_Physics_Engine && this.isClient && this.worldId !== null) return
		if (_.includes(this.worldObjects, object)) return
		this.worldObjects.push(object)
		this.world.addBody(object)
	}

	public removeWorldObject(object: CANNON.Body) {
		// if (!this.settings.Debug_Physics_Engine && (this.isClient && this.worldId !== null)) return
		if (!_.includes(this.worldObjects, object)) return
		this.world.removeBody(object)
		_.pull(this.worldObjects, object)
	}

	public isOutOfBounds(position: CANNON.Vec3): boolean {
		let inside = true
		let belowSeaLevel = false

		switch (this.lastMapID) {
			case 'sketchbook': {
				inside =
					position.x > -211.882 &&
					position.x < 211.882 &&
					position.z > -169.098 &&
					position.z < 153.232 &&
					position.y > 0.107
				belowSeaLevel = position.y < 14.989
				break
			}
			default: {
				let equi = new THREE.Vector3().copy(this.boxSize)
				equi = equi.multiplyScalar(2)
				inside =
					position.x > -equi.x &&
					position.x < equi.x &&
					position.z > -equi.z &&
					position.z < equi.z &&
					position.y > -equi.y
				belowSeaLevel = position.y < equi.y
				break
			}
		}

		return !inside && belowSeaLevel
	}

	public outOfBoundsRespawn(body: CANNON.Body, position?: CANNON.Vec3): void {
		let newPos = position || new CANNON.Vec3(0, 16, 0)
		let newQuat = new CANNON.Quaternion(0, 0, 0, 1)

		body.position.copy(newPos)
		body.interpolatedPosition.copy(newPos)
		body.quaternion.copy(newQuat)
		body.interpolatedQuaternion.copy(newQuat)
		body.velocity.setZero()
		body.angularVelocity.setZero()
	}
	public outOfBoundsRespawnTrain(train: Train, position?: CANNON.Vec3): void {
		let newPos = position || new CANNON.Vec3(0, 16, 0)
		let newQuat = new CANNON.Quaternion(0, 0, 0, 1)

		train.setPosition(newPos.x, newPos.y, newPos.z)
		train.resetRotation(newQuat)

		train.setMotorSpeed(1, false)
		setTimeout(() => {
			train.setMotorSpeed(train.maxMotorSpeed)
		}, 3000)
	}

	public zeroBody(body: CANNON.Body) {
		// Position
		body.position.setZero()
		body.previousPosition.setZero()
		body.interpolatedPosition.setZero()
		body.initPosition.setZero()

		// orientation
		body.quaternion.set(0, 0, 0, 1)
		body.initQuaternion.set(0, 0, 0, 1)
		body.previousQuaternion.set(0, 0, 0, 1)
		body.interpolatedQuaternion.set(0, 0, 0, 1)

		// Velocity
		body.velocity.setZero()
		body.initVelocity.setZero()
		body.angularVelocity.setZero()
		body.initAngularVelocity.setZero()

		// Force
		body.force.setZero()
		body.torque.setZero()

		// Sleep state reset
		body.sleepState = 0
		body.timeLastSleepy = 0
		body.wakeUpAfterNarrowphase = false
	}

	public clearScene() {
		for (let i = 0; i < this.worldObjects.length; i++) {
			this.removeWorldObject(this.worldObjects[i])
			i--
		}
		for (let i = 0; i < this.sceneObjects.length; i++) {
			this.removeSceneObject(this.sceneObjects[i])
			i--
		}
		if (this.scenarioGUIFolderCallback !== null) {
			for (let i = 0; i < this.scenarioGUIFolderCallback.children.length; i++) {
				this.scenarioGUIFolderCallback.children[i].dispose()
				i--
			}
		}
		Object.keys(this.scenariosCalls).forEach((key) => {
			delete this.scenariosCalls[key]
		})
	}

	public launchMap(mapID: string, isCallback: boolean, isLaunched: boolean = true) {
		const onSceneCollect = (map: MapConfigType, gltf: any) => {
			this.lastMapID = map.name
			this.mapAnimation = gltf.animations
			this.mapMixer = new THREE.AnimationMixer(gltf.scene)
			if (this.mapAnimation.length > 0) {
				let clip = THREE.AnimationClip.findByName(this.mapAnimation, 'idle')
				if (clip === null) clip = THREE.AnimationClip.findByName(this.mapAnimation, this.mapAnimation[0].name)
				if (clip !== null) {
					let action = this.mapMixer.clipAction(clip)
					this.mapMixer.stopAllAction()
					action.fadeIn(0.3)
					action.play()
				}
			}
			this.loadScene(gltf, isLaunched)
			if (this.mapLoadFinishCallBack) this.mapLoadFinishCallBack()
		}
		if (isCallback) {
			if (this.launchMapCallback !== null) {
				this.launchMapCallback(mapID)
			}
		} else {
			// const MapConfig = getMapConfig(this)
			const MapConfig = this.MapConfig
			if (MapConfig[mapID] !== undefined) {
				const map = MapConfig[mapID]
				if (map.name == mapID) {
					if (map.mapCaller instanceof BaseScene) {
						const gltf = map.mapCaller.getScene()
						onSceneCollect(map, gltf)
					} else {
						if (typeof map.mapCaller === 'object' && Object.keys(map.mapCaller).length == 2) {
							onSceneCollect(map, map.mapCaller)
						} else {
							this.getGLTF(map.mapCaller, (gltf: any) => {
								onSceneCollect(map, gltf)
							})
						}
					}
				}
			}
		}
	}

	public loadScene(gltf: any, isLaunmch: boolean = true) {
		this.clearEntities(true)
		this.clearScene()

		gltf.scene.traverse((child: any) => {
			if (child.hasOwnProperty('userData')) {
				if (child.type === 'Mesh') {
					Utility.setupMeshProperties(child, this.isClient)

					if (child.material.name === 'ocean') {
						if (false) {
							const width = 100,
								length = 100
							const water = new Water(new THREE.PlaneGeometry(width, length, 100, 100), {
								textureWidth: width,
								textureHeight: length,
								/* waterNormals: new THREE.TextureLoader().load(
									'./images/waternormals.jpg',
									function (texture) {
										texture.wrapS = texture.wrapT = THREE.RepeatWrapping
									}
								), */
								sunDirection: new THREE.Vector3(),
								sunColor: 0xffffff,
								waterColor: 0x001e0f,
								distortionScale: 8,
								fog: this.scene.fog !== undefined,
								side: THREE.DoubleSide,
							})
							water.uID = 'test'
							water.rotateX(-Math.PI / 2)
							water.position.set(110, 25, -160)
							water.addFloaters(8)
							this.add(water)
						}
					}
				}

				if (child.userData.hasOwnProperty('data')) {
					if (child.userData.data === 'physics') {
						let optimize = null
						if (child.userData.hasOwnProperty('optimize')) {
							optimize = child.userData.optimize
						}
						if (child.userData.hasOwnProperty('type')) {
							child.visible = false
							if (child.userData.type === 'box') {
								let mass = 0
								if (child.userData.hasOwnProperty('mass')) {
									mass = child.userData.mass
								}
								let phys = new BoxCollider({
									size: new THREE.Vector3(child.scale.x, child.scale.y, child.scale.z),
									mass: mass,
								})
								phys.body.position.copy(Utility.cannonVector(child.position))
								phys.body.quaternion.copy(Utility.cannonQuat(child.quaternion))
								phys.body.updateAABB()

								phys.body.shapes.forEach((shape) => {
									shape.collisionFilterMask = ~CollisionGroups.TrimeshColliders
									// shape.collisionFilterMask = CollisionGroups.Default | CollisionGroups.Characters | CollisionGroups.TrimeshColliders
									// shape.collisionFilterGroup = CollisionGroups.Default
								})
								this.addWorldObject(phys.body)

								if (optimize !== null && optimize === 'chunk') {
									this.chunks.push({
										collider: phys,
										is_inside: true,
									})
								}
							} else if (child.userData.type === 'sphere') {
								let mass = 0
								if (child.userData.hasOwnProperty('mass')) {
									mass = child.userData.mass
								}
								let phys = new SphereCollider({
									radius: child.radius,
									mass: child.mass,
								})
								phys.body.position.copy(Utility.cannonVector(child.position))
								phys.body.quaternion.copy(Utility.cannonQuat(child.quaternion))
								phys.body.updateAABB()

								phys.body.shapes.forEach((shape) => {
									shape.collisionFilterMask = ~CollisionGroups.TrimeshColliders
									// shape.collisionFilterMask = CollisionGroups.Default | CollisionGroups.Characters | CollisionGroups.TrimeshColliders
									// shape.collisionFilterGroup = CollisionGroups.Default
								})

								this.addWorldObject(phys.body)

								if (optimize !== null && optimize === 'chunk') {
									this.chunks.push({
										collider: phys,
										is_inside: true,
									})
								}
							} else if (child.userData.type === 'cylinder') {
								let radius = 1
								let height = 1
								let segment = 6

								if (child.userData.hasOwnProperty('radius')) {
									radius = child.userData.radius
								}
								if (child.userData.hasOwnProperty('height')) {
									height = child.userData.height
								}
								if (child.userData.hasOwnProperty('segment')) {
									segment = child.userData.segment
								}

								let phys = new CylinderCollider({
									radius1: radius,
									radius2: radius,
									height: height,
									segment: segment,
								})
								phys.body.position.copy(Utility.cannonVector(child.position))
								phys.body.quaternion.copy(Utility.cannonQuat(child.quaternion))
								phys.body.updateAABB()

								phys.body.shapes.forEach((shape) => {
									shape.collisionFilterMask = ~CollisionGroups.TrimeshColliders
									// shape.collisionFilterMask = CollisionGroups.Default | CollisionGroups.Characters | CollisionGroups.TrimeshColliders
									// shape.collisionFilterGroup = CollisionGroups.Default
								})

								this.addWorldObject(phys.body)

								if (optimize !== null && optimize === 'chunk') {
									this.chunks.push({
										collider: phys,
										is_inside: true,
									})
								}
							} else if (child.userData.type === 'trimesh') {
								let phys = new TrimeshCollider(child, {})
								phys.body.shapes.forEach((shape) => {
									shape.collisionFilterMask =
										CollisionGroups.Default |
										CollisionGroups.Characters |
										CollisionGroups.TrimeshColliders
									// shape.collisionFilterGroup = CollisionGroups.TrimeshColliders
								})
								this.addWorldObject(phys.body)

								if (optimize !== null && optimize === 'chunk') {
									this.chunks.push({
										collider: phys,
										is_inside: true,
									})
								}
							} else if (child.userData.type === 'heightfield') {
								child.visible = true
								let scale = 1
								if (child.userData.hasOwnProperty('scale')) scale = child.userData.scale
								let phys = new HeightMapCollider(child, { scale: scale })
								this.addWorldObject(phys.body)

								if (optimize !== null && optimize === 'chunk') {
									this.chunks.push({
										collider: phys,
										is_inside: true,
									})
								}
							}
						}
					} else if (child.userData.data === 'physics_instance') {
						let optimize = null
						if (child.userData.hasOwnProperty('optimize')) {
							optimize = child.userData.optimize
						}
						if (child.userData.hasOwnProperty('type')) {
							child.visible = false
							if (child.userData.type === 'box') {
								let mass = 0
								let scale_times = 1
								if (child.userData.hasOwnProperty('mass')) {
									mass = child.userData.mass
								}
								if (child.userData.hasOwnProperty('force_scale')) {
									if (child.userData.force_scale.hasOwnProperty('times')) {
										scale_times = Number(child.userData.force_scale.times)
									}
								}
								const entI = child as THREE.InstancedMesh
								const pos = new THREE.Vector3()
								const scale = new THREE.Vector3()
								const quat = new THREE.Quaternion()
								const matrix = new THREE.Matrix4()
								for (let i = 0; i < entI.count; i++) {
									entI.getMatrixAt(i, matrix)
									matrix.decompose(pos, quat, scale)

									let phys = new BoxCollider({
										size: new THREE.Vector3(
											(child.scale.x * scale_times * scale.x) / 2,
											(child.scale.y * scale_times * scale.y) / 2,
											(child.scale.z * scale_times * scale.z) / 2
										),
										mass: mass,
									})
									// pos.add(child.position)
									phys.body.position.copy(
										Utility.cannonVector(pos.add(child.position).multiplyScalar(scale_times))
									)
									phys.body.quaternion.copy(Utility.cannonQuat(quat))
									phys.body.updateAABB()

									phys.body.shapes.forEach((shape) => {
										shape.collisionFilterMask = ~CollisionGroups.TrimeshColliders
										// shape.collisionFilterMask = CollisionGroups.Default | CollisionGroups.Characters | CollisionGroups.TrimeshColliders
										// shape.collisionFilterGroup = CollisionGroups.Default
									})
									this.addWorldObject(phys.body)

									if (optimize !== null && optimize === 'chunk') {
										this.chunks.push({
											collider: phys,
											is_inside: true,
										})
									}
								}
							} else if (child.userData.type === 'trimesh') {
								let scale_times = 1
								if (child.userData.hasOwnProperty('force_scale')) {
									if (child.userData.force_scale.hasOwnProperty('times')) {
										scale_times = Number(child.userData.force_scale.times)
									}
								}
								const entI = child as THREE.InstancedMesh
								const pos = new THREE.Vector3()
								const scale = new THREE.Vector3()
								const quat = new THREE.Quaternion()
								const matrix = new THREE.Matrix4()
								for (let i = 0; i < entI.count; i++) {
									entI.getMatrixAt(i, matrix)
									matrix.decompose(pos, quat, scale)
									let phys = new TrimeshCollider(child, {})
									// pos.add(child.position)
									phys.body.position.copy(
										Utility.cannonVector(pos.add(child.position).multiplyScalar(scale_times))
									)
									phys.body.quaternion.copy(Utility.cannonQuat(quat))
									phys.body.updateAABB()
									phys.body.shapes.forEach((shape) => {
										shape.collisionFilterMask =
											CollisionGroups.Default |
											CollisionGroups.Characters |
											CollisionGroups.TrimeshColliders
										// shape.collisionFilterGroup = CollisionGroups.TrimeshColliders
									})
									this.addWorldObject(phys.body)

									if (optimize !== null && optimize === 'chunk') {
										this.chunks.push({
											collider: phys,
											is_inside: true,
										})
									}
								}
							}
						}
					} else if (child.userData.data === 'path') {
						this.paths.push(new Path(child))
					} else if (child.userData.data === 'scenario') {
						this.scenarios.push(new Scenario(child, this))
					}
				}
			}
		})

		this.addSceneObject(gltf.scene)
		let boundingBox = new THREE.Box3().setFromObject(gltf.scene, true)
		boundingBox.getSize(this.boxSize)

		let defaultScenarioID: string | null = null
		for (const scenario of this.scenarios) {
			if (scenario.default) {
				defaultScenarioID = scenario.name
				break
			}
		}
		if (isLaunmch) if (defaultScenarioID !== null) this.launchScenario(defaultScenarioID, false)
	}

	public launchScenario(scenarioID: string | null, isCallback: boolean): void {
		if (scenarioID === null) return
		if (isCallback) {
			if (this.launchScenarioCallback !== null) {
				this.launchScenarioCallback(scenarioID)
			}
		} else {
			this.lastScenarioID = scenarioID
			this.clearEntities(false)

			// Launch default scenario
			for (const scenario of this.scenarios) {
				if (scenario.name === scenarioID || scenario.spawnAlways) {
					scenario.launch(this)

					if (this.isClient) {
						Object.keys(this.users).forEach((sID) => {
							if (this.users[sID] !== undefined) {
								this.users[sID].inputManager.onKeyDown({ code: 'w' } as KeyboardEvent)
								this.users[sID].inputManager.update(
									this.physicsFrameTime * this.settings.Time_Scale,
									this.physicsFrameTime
								)
								this.users[sID].inputManager.onKeyUp({ code: 'w' } as KeyboardEvent)
								this.users[sID].inputManager.update(
									this.physicsFrameTime * this.settings.Time_Scale,
									this.physicsFrameTime
								)
							}
						})
					}
				}
			}
		}
	}

	public restartScenario(): void {
		if (this.lastScenarioID !== null) {
			if (this.isClient) document.exitPointerLock()
			this.launchScenario(this.lastScenarioID, false)
		} else {
			console.warn("Can't restart scenario. Last scenarioID is undefined.")
		}
	}

	public clearEntities(isClean: boolean): void {
		for (let i = 0; i < this.characters.length; i++) {
			this.remove(this.characters[i])
			i--
		}

		for (let i = 0; i < this.vehicles.length; i++) {
			this.remove(this.vehicles[i])
			i--
		}

		for (let i = 0; i < this.trains.length; i++) {
			this.remove(this.trains[i])
			i--
		}

		for (let i = 0; i < this.shapes.length; i++) {
			this.remove(this.shapes[i])
			i--
		}

		for (let i = 0; i < this.scenarios.length; i++) {
			const raceContent = this.scenarios[i].raceContent
			if (raceContent !== null) {
				this.remove(raceContent)
			}
		}

		if (isClean) {
			for (let i = 0; i < this.scenarios.length; i++) {
				for (let j = 0; j < this.scenarios[i].spawnPoints.length; j++) {
					_.pull(this.scenarios[i].spawnPoints, this.scenarios[i].spawnPoints[j])
					j--
				}
				this.scenarios[i].spawnPoints = []
				_.pull(this.scenarios, this.scenarios[i])
				i--
			}

			for (let i = 0; i < this.waters.length; i++) {
				this.remove(this.waters[i])
				i--
			}

			for (let i = 0; i < this.clientEntity.length; i++) {
				this.remove(this.clientEntity[i])
			}
			this.characters = []
			this.vehicles = []
			this.trains = []
			this.shapes = []
			this.chunks = []
			this.clientEntity = []
			this.waters = []
			this.scenarios = []
		}
	}

	public update() {
		if (!this.isClient && this.worldId === null) return
		if (!this.isClient) {
			let count = 0

			Object.keys(this.users).forEach((sID) => {
				if (this.users[sID] !== undefined) count++
			})

			if (count === 0) {
				if (this.runner !== null) {
					clearInterval(this.runner)
					console.log(`Stopping: ${this.worldId}`)
				}
				this.runner = null
			}
		}

		this.requestDelta = this.worldClock.getDelta()

		let unscaledTimeStep = this.requestDelta + this.logicDelta
		let timeStep = unscaledTimeStep * this.settings.Time_Scale
		timeStep = Math.min(timeStep, 1 / 30)

		if (this.settings.Debug_Physics_Engine || !this.isClient || (this.isClient && this.worldId === null))
			this.updatePhysics(timeStep, unscaledTimeStep)

		// Update registred objects
		if (!this.isClient || (this.isClient && this.worldId == null)) {
			this.updatables.forEach((entity) => {
				if (
					'entityType' in entity &&
					['water', 'grass', 'ocean'].includes((entity as IWorldEntity).entityType)
				) {
					if (this.settings.Textures) entity.update(timeStep, unscaledTimeStep)
				} else {
					entity.update(timeStep, unscaledTimeStep)
				}
			})

			// Sun Update
			if (this.settings.SyncSun) {
				// if (this.worldId !== null) {
				this.sunConf.elevation += Math.sign(this.sunConf.azimuth) * this.timeScaleTarget * 0.005
				if (this.sunConf.elevation >= 90 || this.sunConf.elevation <= -90) {
					this.sunConf.azimuth = -this.sunConf.azimuth
				}
				// }
				this.settings.UnrealBloom_threshold = this.sunConf.elevation < -5 ? 0.6 : 1.0
				this.settings.UnrealBloom_strength = this.sunConf.elevation < -5 ? 0.2 : 0.0
			}
		} else {
			this.characters.forEach((char) => {
				char.charState.update(timeStep)
				if (char.mixer !== null) char.mixer.update(timeStep)
			})
			this.vehicles.forEach((vehi) => {
				vehi.update(timeStep)
			})
			this.trains.forEach((train) => {
				train.update(timeStep)
			})
			this.shapes.forEach((shape) => {
				shape.update(timeStep, unscaledTimeStep)
			})
			if (this.player !== null && !this.settings.SyncInputs) {
				this.player.inputManager.update(timeStep, unscaledTimeStep)
				this.player.cameraOperator.update(timeStep, unscaledTimeStep)
			}
			this.clientEntity.forEach((entity) => {
				entity.update(timeStep, unscaledTimeStep)
			})
		}
		if (this.mapMixer !== null) this.mapMixer.update(timeStep)

		// Lerp time scale
		this.settings.Time_Scale = THREE.MathUtils.lerp(this.settings.Time_Scale, this.timeScaleTarget, 0.2)

		// Measuring logic time
		this.logicDelta = this.worldClock.getDelta()

		// Frame limiting
		let interval = 1 / 60
		this.sinceLastFrame += this.requestDelta + this.logicDelta
		this.sinceLastFrame %= interval

		if (this.updatePhysicsCallback !== null) this.updatePhysicsCallback(this.worldId)
	}

	private updatePhysics(timeStep: number, unscaledTimeStep: number) {
		const chunk_pos = this.terrain.getFollowChunkRad(this.terrain.getFollowChunk(this.terrain.followObject))
		if (chunk_pos.length > 0) {
			this.chunks.forEach((chunk) => {
				if (this.terrain !== null) {
					const x = Math.round(chunk.collider.body.position.x / this.terrain.CHUNK_SIZE)
					const y = Math.round(chunk.collider.body.position.z / this.terrain.CHUNK_SIZE)
					let is_inside = false
					for (let i = 0; i < chunk_pos.length; i++) {
						if (x == chunk_pos[i].x && y == chunk_pos[i].y) {
							is_inside = true
							break
						}
					}
					if (is_inside && !chunk.is_inside) {
						chunk.is_inside = true
						this.addWorldObject(chunk.collider.body)
					} else if (!is_inside && chunk.is_inside) {
						chunk.is_inside = false
						this.removeWorldObject(chunk.collider.body)
					}
				}
			})
		}

		if (this.doPhysics) {
			this.world.step(this.physicsFrameTime, timeStep)
		}

		this.characters.forEach((char) => {
			if (this.isOutOfBounds(char.characterCapsule.body.position)) {
				this.outOfBoundsRespawn(char.characterCapsule.body)
			}
		})

		this.vehicles.forEach((vehicle) => {
			if (this.isOutOfBounds(vehicle.rayCastVehicle.chassisBody.position)) {
				let worldPos = new THREE.Vector3()
				if (vehicle.spawnPoint !== null) vehicle.spawnPoint.getWorldPosition(worldPos)
				worldPos.y += 1
				this.outOfBoundsRespawn(vehicle.rayCastVehicle.chassisBody, Utility.cannonVector(worldPos))
			}
		})

		this.trains.forEach((train) => {
			if (this.isOutOfBounds(train.collision.position)) {
				let worldPos = new THREE.Vector3()
				if (train.spawnPoint !== null) train.spawnPoint.getWorldPosition(worldPos)
				worldPos.y += 1
				this.outOfBoundsRespawnTrain(train, Utility.cannonVector(worldPos))
			}
		})

		this.shapes.forEach((shape) => {
			if (shape.phys !== null) {
				if (this.isOutOfBounds(shape.phys.body.position)) {
					this.outOfBoundsRespawn(shape.phys.body)
				}
			}
		})

		this.terrain.update()
		// console.log('chunks:', this.chunks.length)
	}
}

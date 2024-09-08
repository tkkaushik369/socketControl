import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import * as _ from 'lodash'
import { Player } from '../Core/Player'
import { IUpdatable } from '../Interfaces/IUpdatable'
import { Utility } from '../Core/Utility'
import { BoxCollider } from '../Physics/Colliders/BoxCollider'
import { TrimeshCollider } from '../Physics/Colliders/TrimeshCollider'
import { CollisionGroups } from '../Enums/CollisionGroups'
import { Path } from './Path'
import { Scenario } from './Scenario'
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js'
import { IWorldEntity } from '../Interfaces/IWorldEntity'
import { Character } from '../Characters/Character'
import { Vehicle } from '../Vehicles/Vehicle'
import { VehicleSeat } from '../Vehicles/VehicleSeat'
import { MapConfig, MapConfigType } from './MapConfigs'
import { Water } from './Water'
import { BaseScene } from './BaseScene'

export abstract class WorldBase {
	public physicsFrameRate: number
	public physicsFrameTime: number
	private worldClock: THREE.Clock
	private requestDelta: number
	private logicDelta: number
	private sinceLastFrame: number
	public timeScaleTarget: number

	public subConf = {
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
	public maps: { [id: string]: any }
	private mapAnimation: any[]
	private mapMixer: THREE.AnimationMixer | null
	public lastMapID: string | null
	public characters: Character[]
	public vehicles: Vehicle[]
	public waters: Water[]

	public sceneObjects: THREE.Object3D[]
	public worldObjects: CANNON.Body[]

	// server
	protected updatePhysicsCallback: Function | null

	// client
	public player: Player | null
	public isClient: boolean
	protected doPhysics: boolean
	public updateControlsCallBack: Function | null
	public scenarioGUIFolderCallback: GUI | null
	public launchMapCallback: Function | null
	public launchScenarioCallback: Function | null
	public boxSize: THREE.Vector3 = new THREE.Vector3()

	constructor() {
		// bind functions
		this.getGLTF = this.getGLTF.bind(this)
		this.registerUpdatable = this.registerUpdatable.bind(this)
		this.unregisterUpdatable = this.unregisterUpdatable.bind(this)
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
		this.physicsFrameRate = 60
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
		Object.keys(MapConfig).forEach((mn) => {
			this.maps[MapConfig[mn].name] = () => {
				this.launchMap(MapConfig[mn].name, MapConfig[mn].isCallback, MapConfig[mn].isLaunched)
			}
		})
		this.mapAnimation = []
		this.mapMixer = null
		this.lastMapID = null
		this.characters = []
		this.vehicles = []
		this.waters = []

		this.sceneObjects = []
		this.worldObjects = []

		this.updatePhysicsCallback = null

		this.isClient = false
		this.doPhysics = true
		this.updateControlsCallBack = null
		this.scenarioGUIFolderCallback = null
		this.launchMapCallback = null
		this.launchScenarioCallback = null

		// Settings
		this.settings = {
			Time_Scale: 1,

			// Client
			Pointer_Lock: true,
			Mouse_Sensitivity: 0.2,
			Debug_Physics: false,
			Debug_Physics_Wireframe: true,
			Debug_Physics_MeshOpacity: 1,
			Debug_Physics_MeshEdges: false,
			Debug_FPS: true,
			Debug_Helper: true,
			PostProcess: true,
		}
		this.scenariosCalls = {}

		// fog
		let fog = new THREE.Fog(0x222222, 1000, 2000)

		// Scene
		this.scene = new THREE.Scene()
		this.scene.fog = fog

		// World
		this.world = new CANNON.World();
		this.world.gravity.set(0, -10.0, 0);
		this.world.broadphase = new CANNON.SAPBroadphase(this.world);

		const solver = new CANNON.GSSolver()
		solver.iterations = 50
		solver.tolerance = 0.0001

		this.world.solver = solver
		this.world.allowSleep = true;

		this.world.defaultContactMaterial.contactEquationStiffness = 1e7
		this.world.defaultContactMaterial.contactEquationRelaxation = 5

		// setInterval(this.update, this.physicsFrameTime * 1000)
		setTimeout(this.update, this.physicsFrameTime * 1000)
	}

	public getGLTF(path: string, callback: Function) {
		return this.isClient ? ('./models/' + path) : ('./dist/server/models/' + path + '.json')
	}

	public add(worldEntity: IWorldEntity): void {
		worldEntity.addToWorld(this)
		this.registerUpdatable(worldEntity)
	}

	public remove(worldEntity: IWorldEntity): void {
		worldEntity.removeFromWorld(this)
		this.unregisterUpdatable(worldEntity)
	}

	public registerUpdatable(registree: IUpdatable): void {
		this.updatables.push(registree)
		this.updatables.sort((a, b) => (a.updateOrder > b.updateOrder) ? 1 : -1)
	}

	public unregisterUpdatable(registree: IUpdatable): void {
		_.pull(this.updatables, registree)
	}

	public scrollTheTimeScale(scrollAmount: number): void {
		// Changing time scale with scroll wheel
		const timeScaleBottomLimit = 0.003
		const timeScaleChangeSpeed = 1.3

		if (scrollAmount > 0) {
			this.timeScaleTarget /= timeScaleChangeSpeed
			if (this.timeScaleTarget < timeScaleBottomLimit) this.timeScaleTarget = 0
		}
		else {
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
		if (_.includes(this.worldObjects, object)) return
		this.worldObjects.push(object)
		this.world.addBody(object)
	}

	public removeWorldObject(object: CANNON.Body) {
		if (!_.includes(this.worldObjects, object)) return
		this.world.removeBody(object)
		_.pull(this.worldObjects, object)
	}

	public isOutOfBounds(position: CANNON.Vec3): boolean {
		let inside = true
		let belowSeaLevel = false

		switch (this.lastMapID) {
			case 'sketchbook': {
				inside = position.x > -211.882 && position.x < 211.882 &&
					position.z > -169.098 && position.z < 153.232 &&
					position.y > 0.107
				belowSeaLevel = position.y < 14.989
				break
			}
			default: {
				let equi = new THREE.Vector3().copy(this.boxSize)
				equi = equi.multiplyScalar(2)
				inside = position.x > -equi.x && position.x < equi.x &&
					position.z > -equi.z && position.z < equi.z &&
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

	public zeroBody(body: CANNON.Body) {
		// Position
		body.position.setZero();
		body.previousPosition.setZero();
		body.interpolatedPosition.setZero();
		body.initPosition.setZero();

		// orientation
		body.quaternion.set(0, 0, 0, 1);
		body.initQuaternion.set(0, 0, 0, 1);
		body.previousQuaternion.set(0, 0, 0, 1);
		body.interpolatedQuaternion.set(0, 0, 0, 1);

		// Velocity
		body.velocity.setZero();
		body.initVelocity.setZero();
		body.angularVelocity.setZero();
		body.initAngularVelocity.setZero();

		// Force
		body.force.setZero();
		body.torque.setZero();

		// Sleep state reset
		body.sleepState = 0;
		body.timeLastSleepy = 0;
		body.wakeUpAfterNarrowphase = false;
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
		if (this.scenarioGUIFolderCallback) {
			for (let i = 0; i < this.scenarioGUIFolderCallback.children.length; i++) {
				this.scenarioGUIFolderCallback.children[i].destroy()
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
			if (MapConfig[mapID] !== undefined) {
				const map = MapConfig[mapID]
				if (map.name == mapID) {
					if (map.mapCaller instanceof BaseScene) {
						const gltf = map.mapCaller.getScene()
						onSceneCollect(map, gltf)
					} else {
						this.getGLTF(map.mapCaller, (gltf: any) => {
							onSceneCollect(map, gltf)
						})
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
					Utility.setupMeshProperties(child)

					if (child.material.name === 'ocean') {
						if (true) {
							const width = 100, length = 100
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
								side: THREE.DoubleSide
							});
							water.uID = "test"
							water.rotateX(-Math.PI / 2)
							water.position.set(110, 25, -160)
							water.addFloaters(8)
							this.add(water)
						}
					}
				}

				if (child.userData.hasOwnProperty('data')) {
					if (child.userData.data === 'physics') {
						if (child.userData.hasOwnProperty('type')) {
							if (child.userData.type === 'box') {
								let phys = new BoxCollider({ size: new THREE.Vector3(child.scale.x, child.scale.y, child.scale.z) })
								phys.body.position.copy(Utility.cannonVector(child.position))
								phys.body.quaternion.copy(Utility.cannonQuat(child.quaternion))
								phys.body.updateAABB()

								phys.body.shapes.forEach((shape) => {
									shape.collisionFilterMask = ~CollisionGroups.TrimeshColliders
									// shape.collisionFilterMask = CollisionGroups.Default | CollisionGroups.Characters | CollisionGroups.TrimeshColliders
									// shape.collisionFilterGroup = CollisionGroups.Default
								})

								this.addWorldObject(phys.body)
							}
							else if (child.userData.type === 'trimesh') {
								let phys = new TrimeshCollider(child, {})
								// phys.body.shapes.forEach((shape) => {
								// 	shape.collisionFilterMask = CollisionGroups.Default | CollisionGroups.Characters | CollisionGroups.TrimeshColliders
								// 	shape.collisionFilterGroup = CollisionGroups.Default
								// })
								this.addWorldObject(phys.body)
							}
							child.visible = false
						}
					} else if (child.userData.data === 'path') {
						this.paths.push(new Path(child))
					} else if (child.userData.data === 'scenario') {
						this.scenarios.push(new Scenario(child, this))
					}
				}
			}
		})

		this.addSceneObject(gltf.scene);
		let boundingBox = new THREE.Box3().setFromObject(gltf.scene, true);
		boundingBox.getSize(this.boxSize);

		let defaultScenarioID: string | null = null
		for (const scenario of this.scenarios) {
			if (scenario.default) {
				defaultScenarioID = scenario.name
				break
			}
		}
		if (isLaunmch) if (defaultScenarioID !== null) this.launchScenario(defaultScenarioID, false)
	}

	public launchScenario(scenarioID: string, isCallback: boolean): void {
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
				}
			}

			// Spawn players
			Object.keys(this.users).forEach((sID) => {
				if (this.users[sID].spawnPoint !== null) {
					this.users[sID].addUser()
				}
			})
		}
	}

	public restartScenario(): void {
		if (this.lastScenarioID !== null) {
			if (this.isClient)
				document.exitPointerLock()
			this.launchScenario(this.lastScenarioID, false)
		}
		else {
			console.warn('Can\'t restart scenario. Last scenarioID is undefined.')
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
			this.characters = []
			this.vehicles = []
			this.waters = []
			this.scenarios = []
		}
	}

	private update() {
		this.requestDelta = this.worldClock.getDelta()

		let unscaledTimeStep = (this.requestDelta + this.logicDelta)
		let timeStep = unscaledTimeStep * this.settings.Time_Scale
		timeStep = Math.min(timeStep, 1 / 30)

		this.updatePhysics(timeStep, unscaledTimeStep)

		// Update registred objects
		if (!this.isClient) {
			this.updatables.forEach((entity) => { entity.update(timeStep, unscaledTimeStep) })
		} else {
			this.characters.forEach((char) => {
				char.charState.update(timeStep)
				if (char.mixer !== null) char.mixer.update(timeStep)
			})
			this.vehicles.forEach((vehi) => {
				vehi.update(timeStep)
			})
			/* if (this.player !== null) {
				this.player.inputManager.update(timeStep, unscaledTimeStep)
				this.player.cameraOperator.update(timeStep, unscaledTimeStep)
			} */
		}
		if (this.mapMixer !== null) this.mapMixer.update(timeStep)

		// Lerp time scale
		this.settings.Time_Scale = THREE.MathUtils.lerp(this.settings.Time_Scale, this.timeScaleTarget, 0.2)

		// Measuring logic time
		this.logicDelta = this.worldClock.getDelta()

		// Sun Update
		this.subConf.elevation += (Math.sign(this.subConf.azimuth)) * this.timeScaleTarget * 0.1
		if ((this.subConf.elevation >= 90) || (this.subConf.elevation <= -90))
			this.subConf.azimuth = -this.subConf.azimuth

		// Frame limiting
		let interval = 1 / 60
		this.sinceLastFrame += this.requestDelta + this.logicDelta
		this.sinceLastFrame %= interval

		if (this.updatePhysicsCallback !== null)
			this.updatePhysicsCallback()
		
		setTimeout(this.update)
	}

	private updatePhysics(timeStep: number, unscaledTimeStep: number) {
		if (this.doPhysics) {
			this.world.step(this.physicsFrameTime, timeStep)
		}

		this.characters.forEach((char) => {
			/* if (char.uID == 'car_ai_driver') {
				let full: any[] = []
				if (char.controlledObject !== null)
					console.log(char.controlledObject.seats)
			} */
			if (this.isOutOfBounds(char.characterCapsule.body.position)) {
				this.outOfBoundsRespawn(char.characterCapsule.body)
			}
		})

		this.vehicles.forEach((vehicle) => {
			/* if (vehicle.uID == 'car_ai') {
				let full: any[] = []
				vehicle.seats.forEach((seat) => {
					let data: { [id: string]: any } = {}
					data['name'] = seat.seatPointObject.userData.name
					data['occupies'] = (seat.occupiedBy !== null) ? seat.occupiedBy.uID : null
					full.push(data)
				})
				console.log(full)
			} */
			if (this.isOutOfBounds(vehicle.rayCastVehicle.chassisBody.position)) {
				let worldPos = new THREE.Vector3()
				if (vehicle.spawnPoint !== null) vehicle.spawnPoint.getWorldPosition(worldPos)
				worldPos.y += 1
				this.outOfBoundsRespawn(vehicle.rayCastVehicle.chassisBody, Utility.cannonVector(worldPos))
			}
		})
	}
}
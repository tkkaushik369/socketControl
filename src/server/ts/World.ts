import * as CANNON from 'cannon-es'
import * as THREE from 'three'
import { Player } from "./Player"
import WorldObject from './WorldObjects/WorldObjects'
import * as WorldObjectPhysics from './WorldObjects/WorldObjectPhysics'
import * as _ from 'lodash'
import Utility from './Utils/Utility'
import { messageTypes } from './Enums/messageTypes'

export default class World {

	protected worldPhysicsUpdate: boolean

	protected clients: { [id: string]: Player }
	protected scenario: Function[]
	public currentScenarioIndex: number
	public world: CANNON.World

	protected resetCallTime: boolean
	protected lastCallTime: number
	protected allBodies: { [id: string]: CANNON.Body }
	public ballId: number
	public ballMax: number
	public allBalls: WorldObject[]
	public allWorldObjects: { [id: string]: WorldObject }
	public settings: { [id: string]: any }
	public timeScaleTarget: number;

	// client
	protected allHelpersCallBack: Function | undefined
	protected addMeshCallBack: Function | undefined
	protected removeMeshCallBack: Function | undefined
	protected removeAllMeshesCallBack: Function | undefined
	protected addScenariosCallBack: Function | undefined

	public constructor(clients: { [id: string]: Player }, worldPhysicsUpdate: boolean = true) {
		// Bind Functions
		this.updatePhysics = this.updatePhysics.bind(this)
		this.addScene = this.addScene.bind(this)
		this.buildScene = this.buildScene.bind(this)
		this.addScenario = this.addScenario.bind(this)
		this.addBody = this.addBody.bind(this)
		this.removeBody = this.removeBody.bind(this)
		this.removeAllBodies = this.removeAllBodies.bind(this)
		this.zeroBody = this.zeroBody.bind(this)
		this.addWorldObject = this.addWorldObject.bind(this)
		this.removeWorldObject = this.removeWorldObject.bind(this)
		this.removeAllWorldObjects = this.removeAllWorldObjects.bind(this)
		this.createBalls = this.createBalls.bind(this)
		this.addBallMesh = this.addBallMesh.bind(this)
		this.shootBall = this.shootBall.bind(this)
		this.updatePhysics = this.updatePhysics.bind(this)

		// Init
		this.clients = clients
		this.settings = {
			stepFrequency: 60,
			TimeScale: 1,
			// client
			PointerLock: true,
			MouseSensitivity: 0.2,
			showStats: true,
			showDebug: false
		}
		this.resetCallTime = false
		this.lastCallTime = 0
		this.timeScaleTarget = 1
		this.worldPhysicsUpdate = worldPhysicsUpdate

		// Init cannon.js
		this.world = new CANNON.World();
		this.world.gravity.set(0, -9.81, 0)

		// Init allBodies
		this.scenario = []
		this.allBodies = {}
		this.allWorldObjects = {}
		this.allBalls = []
		this.ballId = 0
		this.ballMax = 5

		this.currentScenarioIndex = 0

		setInterval(this.updatePhysics, (1 / this.settings.stepFrequency) * 1000)
	}

	public addScene(scene: THREE.Scene) {
		var listMesh: any[] = []
		scene.children.forEach((child: any) => {
			if (child.isMesh) {
				listMesh.push(child)
			}
		})
		listMesh.forEach((child: any) => {
			if (child.userData.name !== undefined) {
				if (child.userData.visible === "false")
					child.visible = false
				if (this.addMeshCallBack !== undefined)
					this.addMeshCallBack(child, child.userData.name)

				if ((child.userData.physics !== undefined)) {
					let physics: WorldObjectPhysics.Physics | undefined;
					let mass = child.userData.mass != undefined ? Number(child.userData.mass) : 0
					switch (child.userData.physics) {
						case 'box': {
							const parameter = (child.geometry as THREE.BoxGeometry).parameters
							let size = new CANNON.Vec3(parameter.width / 2, parameter.height / 2, parameter.depth / 2)
							physics = new WorldObjectPhysics.Box({ mass: mass, size: size })
							break;
						}
						case 'sphere': {
							const parameter = (child.geometry as THREE.SphereGeometry).parameters
							physics = new WorldObjectPhysics.Sphere({ mass: mass, radius: parameter.radius })
							break;
						}
						case 'capsule': {
							physics = new WorldObjectPhysics.Capsule({ mass: mass })
							break;
						}
						case 'convex': {
							physics = new WorldObjectPhysics.Convex(child, { mass: mass })
							break;
						}
						case 'trimesh': {
							physics = new WorldObjectPhysics.Trimesh(child, { mass: mass })
							break;
						}
					}
					if (physics != undefined) {
						let worldObject = new WorldObject(child, physics);
						this.addWorldObject(worldObject, child.userData.name)
						if (worldObject.physics != undefined) {
							this.addBody(worldObject.physics.physical, child.userData.name)
							worldObject.physics.physical.position.x = child.position.x
							worldObject.physics.physical.position.y = child.position.y
							worldObject.physics.physical.position.z = child.position.z
							worldObject.physics.physical.quaternion.x = child.quaternion.x
							worldObject.physics.physical.quaternion.y = child.quaternion.y
							worldObject.physics.physical.quaternion.z = child.quaternion.z
							worldObject.physics.physical.quaternion.w = child.quaternion.w
						}
					}
				}
			}
		})
	}

	public buildScene(inx: number) {
		if (this.removeAllMeshesCallBack != undefined) this.removeAllMeshesCallBack()
		this.removeAllBodies();
		this.removeAllWorldObjects();
		if (this.allHelpersCallBack != undefined) this.allHelpersCallBack(true)
		this.addBallMesh()

		if (inx == -1) return
		if (this.allHelpersCallBack != undefined) this.allHelpersCallBack(false)
		this.scenario[inx]();
		this.currentScenarioIndex = inx
	}

	public addScenario(title: string, initfunc: Function) {
		this.scenario.push(initfunc)
		const index = this.scenario.length - 1
		if (this.addScenariosCallBack !== undefined) {
			this.addScenariosCallBack(title, index)
		}
	}

	public addBody(body: CANNON.Body, name: string) {
		if ((this.addMeshCallBack == undefined) || this.worldPhysicsUpdate) {
			this.allBodies[name] = body
			this.world.addBody(body)
		}
	}

	public removeBody(name: string) {
		if (this.allBodies[name] === undefined) return
		this.world.removeBody(this.allBodies[name])
		delete this.allBodies[name]
	}

	public removeAllBodies() {
		Object.keys(this.allBodies).forEach((p) => {
			this.removeBody(p)
		});
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

	public addWorldObject(object: WorldObject, name: string) {
		this.allWorldObjects[name] = object
	}

	public removeWorldObject(name: string) {
		if (this.allWorldObjects[name] === undefined) return
		delete this.allWorldObjects[name]
	}

	public removeAllWorldObjects() {
		Object.keys(this.allWorldObjects).forEach((p) => {
			this.removeWorldObject(p)
		});
	}

	public createBalls(addMesh: boolean = true) {
		for (let i = 0; i < this.ballMax; ++i) {
			let forward = new THREE.Vector3(0, 0, -1).applyQuaternion(new THREE.Quaternion);
			let ball = new WorldObject(undefined, undefined);
			ball.messageType = messageTypes.worldObjectBallData
			this.allBalls.push(ball)
			ball.name = "ball_" + i.toString()

			ball.setPhysics(new WorldObjectPhysics.Sphere({
				mass: 0.08,
				radius: 0.03,
				position: new CANNON.Vec3(0, -1, 0).vadd(new CANNON.Vec3(forward.x, forward.y, forward.z))
			}));
			ball.setModelFromPhysicsShape()

			if ((this.addMeshCallBack == undefined) || this.worldPhysicsUpdate)
				this.world.addBody(ball.physics!.physical)
		}
		if (addMesh)
			this.addBallMesh()
	}

	protected addBallMesh() {
		this.allBalls.forEach((ball) => {
			if (this.addMeshCallBack != undefined) {
				this.addMeshCallBack(ball.model, ball.name)
			}
		})
	}

	public shootBall(position: THREE.Vector3, quaternion: THREE.Quaternion, dirVec: THREE.Vector3): void {
		let forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion);
		let ball = this.allBalls[this.ballId++]
		if (this.ballId >= this.ballMax) this.ballId = 0
		this.zeroBody(ball.physics!.physical)
		ball.physics!.physical.position.set(position.x, position.y, position.z)
		ball.physics!.physical.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w)

		if ((ball.model !== undefined) && (ball.physics !== undefined) && (ball.physics.physical !== undefined)) {
			const strength = 100//300
			const ray = new THREE.Ray(forward, dirVec.sub(forward).normalize())
			const impulse = new CANNON.Vec3(ray.direction.x * strength, ray.direction.y * strength, ray.direction.z * strength)
			ball.physics.physical.applyForce(impulse)
		}
	}

	protected updatePhysics() {
		if (!this.worldPhysicsUpdate) return;

		// Step world
		const timeStep = 1 / this.settings.stepFrequency
		const now = performance.now() / 1000

		if (!this.lastCallTime) {
			// last call time not saved, cant guess elapsed time. Take a simple step.
			this.world.step(timeStep)
			this.lastCallTime = now
			return
		}

		let timeSinceLastCall = now - this.lastCallTime
		if (this.resetCallTime) {
			timeSinceLastCall = 0
			this.resetCallTime = false
		}

		this.world.step(timeStep, timeSinceLastCall, this.settings.maxSubSteps)

		// Update all WorldObjects
		this.allBalls.forEach((p) => { p.update(0) })
		Object.keys(this.allWorldObjects).forEach((p) => { this.allWorldObjects[p].update(0) })

		this.lastCallTime = now
	}
}
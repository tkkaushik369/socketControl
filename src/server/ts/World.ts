import * as CANNON from 'cannon-es'
import * as THREE from 'three'
import { Player } from "./Player"
import WorldObject from './WorldObjects/WorldObjects'
import * as WorldObjectPhysics from './WorldObjects/WorldObjectPhysics'
import Character from './Characters/Character'
import * as _ from 'lodash'
import { messageTypes } from './Enums/messageTypes'


export default class World {

	public worldPhysicsUpdate: boolean

	protected clients: { [id: string]: Player }
	protected scenario: Function[]
	public currentScenarioIndex: number
	public world: CANNON.World
	public clock: THREE.Clock

	protected resetCallTime: boolean
	protected lastCallTime: number
	protected allBodies: { [id: string]: CANNON.Body }
	public ballId: number
	public ballMax: number
	public allZeroMassBodies: CANNON.Body[]
	public allBalls: WorldObject[]
	public allWorldObjects: { [id: string]: WorldObject }
	public allCharacters: { [id: string]: Character }
	public settings: { [id: string]: any }
	public timeScaleTarget: number;

	// client
	protected allHelpersCallBack: Function | undefined
	protected addMeshCallBack: Function | undefined
	protected removeMeshCallBack: Function | undefined
	protected removeAllMeshesCallBack: Function | undefined
	protected addScenariosCallBack: Function | undefined
	protected addBoxHelperCallBack: Function | undefined
	protected removeBoxHelperCallBack: Function | undefined
	protected RemoveAllBoxHelpersCallBack: Function | undefined
	public setGameModeCallBack: Function | undefined
	public isClient: boolean
	protected addBoxHelperMesh: boolean = false
	public WorldClient: any

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
		this.addWorldCharacter = this.addWorldCharacter.bind(this)
		this.removeWorldCharacter = this.removeWorldCharacter.bind(this)
		this.removeAllWorldCharacter = this.removeAllWorldCharacter.bind(this)
		this.createBalls = this.createBalls.bind(this)
		this.addBallMesh = this.addBallMesh.bind(this)
		this.addCharactersMesh = this.addCharactersMesh.bind(this)
		this.shootBall = this.shootBall.bind(this)
		this.changeTimeScale = this.changeTimeScale.bind(this)
		this.setTimeScaleTarget = this.setTimeScaleTarget.bind(this)
		this.updatePhysics = this.updatePhysics.bind(this)

		// Init
		this.clients = clients
		this.settings = {
			stepFrequency: 45, // >= 32
			TimeScale: 1,
			// client
			PointerLock: true,
			MouseSensitivity: 0.2,
			showStats: true,
			showDebug: false,
		}
		this.resetCallTime = false
		this.lastCallTime = 0
		this.timeScaleTarget = 1
		this.worldPhysicsUpdate = worldPhysicsUpdate
		this.clock = new THREE.Clock();
		this.isClient = false

		// Init cannon.js
		this.world = new CANNON.World();
		this.world.gravity.set(0, -9.81, 0)

		// Init allBodies
		this.scenario = []
		this.allZeroMassBodies = []
		this.allBodies = {}
		this.allWorldObjects = {}
		this.allBalls = []
		this.ballId = 0
		this.ballMax = 20 // 5
		this.allCharacters = {}

		this.currentScenarioIndex = 0

		setInterval(this.updatePhysics, (1 / this.settings.stepFrequency) * 1000)
	}

	public addScene(scene: THREE.Scene) {
		var listMesh: THREE.Mesh[] = []
		var listNoMesh: any[] = []
		scene.children.forEach((child: any) => {
			if (child.isMesh) {
				listMesh.push(child)
			} else {
				listNoMesh.push(child)
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
		})
			listNoMesh.forEach((child: any) => {
			if((child.userData.name != undefined) && (this.addMeshCallBack != undefined)) {
				this.addMeshCallBack(child, child.userData.name)
			}
		})
	}

	public buildScene(inx: number) {
		if (this.removeAllMeshesCallBack != undefined) this.removeAllMeshesCallBack()
		this.removeAllBodies();
		this.removeAllWorldObjects();
		if (this.allHelpersCallBack != undefined) this.allHelpersCallBack(true)
		this.addBallMesh()
		if (this.RemoveAllBoxHelpersCallBack != undefined) this.RemoveAllBoxHelpersCallBack();
		this.addCharactersMesh()

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
			if (body.mass == 0) this.allZeroMassBodies.push(body)
			this.allBodies[name] = body
			this.world.addBody(body)
		}
	}

	public removeBody(name: string) {
		if (this.allBodies[name] === undefined) return
		this.world.removeBody(this.allBodies[name])
		const index = this.allZeroMassBodies.indexOf(this.allBodies[name]);
		if (index > -1)
			this.allZeroMassBodies.splice(index, 1);
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

	public addWorldCharacter(character: Character, name: string) {
		if (_.includes(this.allCharacters, character)) {
			console.warn('Adding character to a world in which it already exists.');
		} else {
			// Set world
			character.world = this;

			this.world.addEventListener('preStep', character.physicsPreStep);
			this.world.addEventListener('postStep', character.physicsPostStep);

			character.name = name

			// Register physics
			this.addBody(character.characterCapsule.physics.physical, name);


			// Register characters physical capsule object
			this.addWorldObject(character.characterCapsule, name);

			// Register character
			this.allCharacters[name] = character

			if (this.addMeshCallBack !== undefined) {
				if ((this.addBoxHelperCallBack !== undefined) && this.addBoxHelperMesh) {
					this.addBoxHelperCallBack(new THREE.BoxHelper(character, 0xffff00), name)
					this.addBoxHelperCallBack(new THREE.BoxHelper(character.characterCapsule.physics.visual, 0xff00ff), name + "_visual")
					this.addBoxHelperCallBack(new THREE.BoxHelper(character.raycastBox, 0x00ffff), name + "_raycast")
				}
				this.addMeshCallBack(character, name)
				this.addMeshCallBack(character.characterCapsule.physics.visual, name + "_visual");
				this.addMeshCallBack(character.raycastBox, name + "_raycast");
			}
		}
	}

	public removeWorldCharacter(name: string) {
		if (this.allCharacters[name] === undefined) return
		let character = this.allCharacters[name]
		character.world = undefined;

		this.world.removeEventListener('preStep', character.physicsPreStep);
		this.world.removeEventListener('postStep', character.physicsPostStep);

		// Remove visuals
		if (this.removeMeshCallBack) {
			if ((this.removeBoxHelperCallBack !== undefined) && this.addBoxHelperMesh) {
				this.removeBoxHelperCallBack(character.name)
				this.removeBoxHelperCallBack(character.name + "_visual")
				this.removeBoxHelperCallBack(character.name + "_raycast")
			}
			this.removeMeshCallBack(character.name);
			this.removeMeshCallBack(character.name + "_visual");
			this.removeMeshCallBack(character.name + "_raycast");
		}

		// Remove capsule object
		this.removeWorldObject(name)

		// Remove physics
		this.removeBody(name);

		delete this.allCharacters[name]
	}

	public removeAllWorldCharacter() {
		Object.keys(this.allCharacters).forEach((p) => {
			this.removeWorldCharacter(p)
		});
	}

	public createBalls(addMesh: boolean = true) {
		for (let i = 0; i < this.ballMax; ++i) {
			let forward = new THREE.Vector3(0, 0, -1).applyQuaternion(new THREE.Quaternion);
			let ballPhysics = new WorldObjectPhysics.Sphere({
				mass: 0.08,
				radius: 0.5, // 0.03,
				position: new CANNON.Vec3(0, -1, 0).vadd(new CANNON.Vec3(forward.x, forward.y, forward.z))
			});
			let ball = new WorldObject(undefined, ballPhysics);
			ball.messageType = messageTypes.worldObjectBallData
			this.allBalls.push(ball)
			ball.name = "ball_" + i.toString()
			ball.setModelFromPhysicsShape()

			if ((this.addMeshCallBack == undefined) || this.worldPhysicsUpdate)
				this.world.addBody(ball.physics.physical)
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

	protected addCharactersMesh() {
		Object.keys(this.allCharacters).forEach((p) => {
			let character = this.allCharacters[p]
			let body = character.characterCapsule.physics.physical;
			if (this.addMeshCallBack != undefined) {
				this.addMeshCallBack(character, character.name)
				this.addMeshCallBack(character.characterCapsule.physics.visual, character.name + "_visual")
				this.addMeshCallBack(character.raycastBox, character.name + "_raycast")
				if ((this.addBoxHelperCallBack !== undefined) && this.addBoxHelperMesh) {
					this.addBoxHelperCallBack(new THREE.BoxHelper(character, 0xffff00), character.name)
					this.addBoxHelperCallBack(new THREE.BoxHelper(character.characterCapsule.physics.visual, 0xff00ff), character.name + "_visual")
					this.addBoxHelperCallBack(new THREE.BoxHelper(character.raycastBox, 0x00ffff), character.name + "_raycast")
				}
			}
			this.zeroBody(body)
			this.addBody(body, character.name)
			if (character.originalPos != null) body.position.set(character.originalPos.x, character.originalPos.y, character.originalPos.z)
		})
	}

	public shootBall(position: THREE.Vector3, quaternion: THREE.Quaternion, isOffset: boolean): void {
		let forward = new THREE.Vector3(0, 0, -1)
		if (isOffset) forward.set(0, 0.4, -0.5)
		forward.applyQuaternion(quaternion);
		let ball = this.allBalls[this.ballId++]
		if (this.ballId >= this.ballMax) this.ballId = 0
		this.zeroBody(ball.physics.physical)
		let offsetPosition = position.clone().add(forward);
		ball.physics.physical.position.set(offsetPosition.x, offsetPosition.y, offsetPosition.z)
		ball.physics.physical.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w)

		if (ball.model !== undefined) {
			const strength = 10 // 100
			const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion).normalize();
			const impulse = new CANNON.Vec3(direction.x * strength, direction.y * strength, direction.z * strength)
			ball.physics.physical.applyForce(impulse)
			ball.update(0, true, true)
		}
	}

	public changeTimeScale(scrollAmount: number) {
		// scrollAmount = (scrollAmount > 0)? 30: -30
		const timeScaleBottomLimit = 0.003;
		const timeScaleChangeSpeed = 1.3;

		if (scrollAmount > 0) {
			this.timeScaleTarget /= timeScaleChangeSpeed;
			if (this.timeScaleTarget < timeScaleBottomLimit) this.timeScaleTarget = 0;
		}
		else {
			this.timeScaleTarget *= timeScaleChangeSpeed;
			if (this.timeScaleTarget < timeScaleBottomLimit) this.timeScaleTarget = timeScaleBottomLimit;
			this.timeScaleTarget = Math.min(this.timeScaleTarget, 1);
			if (this.settings.TimeScale > 0.9) this.settings.TimeScale *= timeScaleChangeSpeed;
		}
	}

	public setTimeScaleTarget(value: number) {
		this.timeScaleTarget = value
	}

	protected updatePhysics() {
		if (!this.worldPhysicsUpdate) return;

		let dt = this.clock.getDelta();
		let tdt = dt * this.settings.TimeScale
		// let sec = dt * (1.01 - this.settings.TimeScale) * 1000

		this.settings.TimeScale = THREE.MathUtils.lerp(this.settings.TimeScale, this.timeScaleTarget, 0.2);
		this.world.step(1 / this.settings.stepFrequency, tdt, this.settings.stepFrequency)

		let forceUpdate = false
		// Update all WorldObjects
		this.allBalls.forEach((p) => { p.update(tdt, false, forceUpdate) })
		Object.keys(this.allWorldObjects).forEach((p) => { this.allWorldObjects[p].update(tdt, false, forceUpdate) })
		if (!this.isClient) {
			Object.keys(this.allCharacters).forEach((p) => {
				this.allCharacters[p].behaviour.update(tdt);
				this.allCharacters[p].update(tdt, false, forceUpdate)
				this.allCharacters[p].updateMatrixWorld();
			})
		}

	}
}
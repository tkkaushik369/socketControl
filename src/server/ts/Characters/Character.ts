import * as THREE from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import * as CANNON from 'cannon-es'
import Utility from '../Utils/Utility'
import { Message } from '../Messages/Message'
import { messageTypes } from "../Enums/messageTypes"
import * as Springs from '../Simulation/Springs'
import * as CharacterStates from './CharacterStates'
import { CharacterAI } from './CharacterAI'
import * as Controls from '../Controls'
import WorldObject from '../WorldObjects/WorldObjects'
import * as WorldObjectPhysics from '../WorldObjects/WorldObjectPhysics'


export default class Character extends THREE.Object3D {

	public originalPos: THREE.Vector3 | null
	public height: number
	public modelOffset: THREE.Vector3
	public visuals: THREE.Group
	public modelContainer: THREE.Group
	public characterModel: any

	public world: any
	public messageType: messageTypes

	public mixer: any
	public animations: any[]
	public lastState: string

	private acceleration: THREE.Vector3
	public velocity: THREE.Vector3
	private arcadeVelocityInfluence: THREE.Vector3
	public arcadeVelocityIsAdditive: boolean
	public velocityTarget: THREE.Vector3

	public defaultVelocitySimulatorDamping: number
	public defaultVelocitySimulatorMass: number
	public velocitySimulator: Springs.VectorSpringSimulator
	private moveSpeed: number

	public angularVelocity: number
	public orientation: THREE.Vector3
	public orientationTarget: THREE.Vector3

	public defaultRotationSimulatorDamping: number
	public defaultRotationSimulatorMass: number
	public rotationSimulator: Springs.RelativeSpringSimulator

	public charState: any
	public charStateRaw: any
	public viewVector: THREE.Vector3
	public behaviour: any
	public controls: { [id: string]: any }
	private ctrl: { [id: string]: any }

	public characterCapsule: WorldObject
	public rayResult: CANNON.RaycastResult
	public rayHasHit: boolean
	public rayCastLength: number
	public raySafeOffset: number
	public wantsToJump: boolean
	public initJumpSpeed: number
	public groundImpactData: {
		[id: string]: any }
	public raycastBox: THREE.Mesh

	public name: string
	public labelDiv: HTMLElement | null
	public label: CSS2DObject | null
	public dirHelper: THREE.Mesh | null
	public timeStamp: number
	public ping: number

	constructor(options: { [id: string]: any } = {}) {
		let defaults = {
			position: new THREE.Vector3(),
			height: 1
		};

		options = Utility.setDefaults(options, defaults);
		super()
		// functions bind
		this.setBehaviour = this.setBehaviour.bind(this)
		this.setState = this.setState.bind(this)
		this.setControl = this.setControl.bind(this)
		this.setModelOffset = this.setModelOffset.bind(this)
		this.setViewVector = this.setViewVector.bind(this)
		this.setArcadeVelocityTarget = this.setArcadeVelocityTarget.bind(this)
		this.setAnimations = this.setAnimations.bind(this)
		this.setAnimation = this.setAnimation.bind(this)
		this.setModel = this.setModel.bind(this)
		this.setOrientationTarget = this.setOrientationTarget.bind(this)
		this.setCameraRelativeOrientationTarget = this.setCameraRelativeOrientationTarget.bind(this)
		this.setArcadeVelocityInfluence = this.setArcadeVelocityInfluence.bind(this)
		this.getLocalMovementDirection = this.getLocalMovementDirection.bind(this)
		this.getCameraRelativeMovementVector = this.getCameraRelativeMovementVector.bind(this)
		this.takeControl = this.takeControl.bind(this)
		this.rotateModel = this.rotateModel.bind(this)
		this.jump = this.jump.bind(this)
		this.springMovement = this.springMovement.bind(this)
		this.springRotation = this.springRotation.bind(this)
		this.physicsPreStep = this.physicsPreStep.bind(this)
		this.physicsPostStep = this.physicsPostStep.bind(this)
		this.resetControls = this.resetControls.bind(this)
		this.update = this.update.bind(this)
		this.Out = this.Out.bind(this)

		this.messageType = messageTypes.worldObjectCharacter
		this.name = ""
		this.labelDiv = null
		this.label = null
		this.dirHelper = null

		this.timeStamp = Date.now()
		this.ping = -1
		if (options.position.x == 0 && options.position.y == 0 && options.position.z == 0) {
			this.originalPos = null
		} else {
			this.originalPos = options.position
		}

		// Geometry
		this.height = options.height
		this.modelOffset = new THREE.Vector3()

		// The Visuals group is centered for easy character tilting
		this.visuals = new THREE.Group()
		this.add(this.visuals)

		// Model container is used to realiable ground the character, as animation can alter position of model itself
		this.modelContainer = new THREE.Group()
		this.modelContainer.position.y = - this.height / 2
		this.visuals.add(this.modelContainer)

		// Default Model
		let capsuleGeometry = Utility.createCapsuleGeometry(this.height / 4, this.height / 2, 8)
		let capsule = new THREE.Mesh(capsuleGeometry, new THREE.MeshLambertMaterial({ color: 0xff0000 }))
		capsule.position.set(0, this.height / 2, 0)
		capsule.castShadow = true
		
		// Assign model to character
		this.characterModel = capsule
		// Attach model to model container
		this.modelContainer.add(capsule)
		

		// Animation mixer - gets set when calling setModel()
		this.mixer = undefined
		this.animations = []
		this.lastState = ""

		// Movement
		this.acceleration = new THREE.Vector3()
		this.velocity = new THREE.Vector3()
		this.arcadeVelocityInfluence = new THREE.Vector3()
		this.arcadeVelocityIsAdditive = false
		this.velocityTarget = new THREE.Vector3()
		// Velocity spring simulator
		this.defaultVelocitySimulatorDamping = 0.8
		this.defaultVelocitySimulatorMass = 50
		this.velocitySimulator = new Springs.VectorSpringSimulator(60, this.defaultVelocitySimulatorMass, this.defaultVelocitySimulatorDamping)
		this.moveSpeed = 8

		// Rotation
		this.angularVelocity = 0
		this.orientation = new THREE.Vector3(0, 0, 1)
		this.orientationTarget = new THREE.Vector3(0, 0, 1)
		// Rotation spring simulator
		this.defaultRotationSimulatorDamping = 0.5
		this.defaultRotationSimulatorMass = 10
		this.rotationSimulator = new Springs.RelativeSpringSimulator(60, this.defaultRotationSimulatorMass, this.defaultRotationSimulatorDamping)

		// States
		this.setState(CharacterStates.Idle);
		this.viewVector = new THREE.Vector3();

		this.setBehaviour(new CharacterAI.Default());
		this.controls = {
			up: new Controls.EventControl(),
			down: new Controls.EventControl(),
			left: new Controls.EventControl(),
			right: new Controls.EventControl(),
			run: new Controls.EventControl(),
			jump: new Controls.EventControl(),
			use: new Controls.EventControl(),
			shoot: new Controls.EventControl(),
			primary: new Controls.EventControl(),
			secondary: new Controls.EventControl(),
			tertiary: new Controls.EventControl(),
			lastControl: new Controls.EventControl()
		};
		this.ctrl = {}

		// Player Capsule
		let capsulePhysics = new WorldObjectPhysics.Capsule({
			mass: 1,
			position: new CANNON.Vec3().copy(options.position),
			height: 0.5,
			radius: 0.25,
			segments: 8,
			friction: 0
		});
		this.characterCapsule = new WorldObject(undefined, undefined);
		this.characterCapsule.setPhysics(capsulePhysics);

		if (this.characterCapsule.physics) {
			this.characterCapsule.physics.visual.visible = false

			// Move character to different collision group for raycasting
			this.characterCapsule.physics.physical.collisionFilterGroup = 2

			// Disable character rotation
			this.characterCapsule.physics.physical.fixedRotation = true;
			this.characterCapsule.physics.physical.updateMassProperties();
		}

		// Ray casting
		this.rayResult = new CANNON.RaycastResult();
		this.rayHasHit = false;
		this.rayCastLength = 0.60;
		this.raySafeOffset = 0.01;
		this.wantsToJump = false;
		this.initJumpSpeed = -1;
		this.groundImpactData = { velocity: new CANNON.Vec3() };

		// Ray cast debug
		const boxGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
		const boxMat = new THREE.MeshLambertMaterial({ color: 0xff0000 });
		this.raycastBox = new THREE.Mesh(boxGeo, boxMat);
		this.raycastBox.visible = true;
	}

	public setBehaviour(behaviour: any) {
		behaviour.character = this;
		this.behaviour = behaviour;
	}

	public setState(State: any) {
		this.charStateRaw = State.stateTxt
		this.charState = new State(this);
	}

	public setControl(key: any, value: any, full: boolean = true) {
		// Get action and set it's parameters
		this.ctrl['key'] = key
		this.ctrl['val'] = value

		let action = this.controls[key];

		if (action.value !== value) {

			// Set value
			action.value = value;

			// Set the 'just' attributes
			if (value) action.justPressed = true;
			else action.justReleased = true;

			// Tag control as last activated
			this.controls.lastControl = action;

			// Tell player to handle states according to new input
			if(full) this.charState.changeState();

			// Reset the 'just' attributes
			action.justPressed = false;
			action.justReleased = false;
		}
	}

	public setModelOffset(offset: THREE.Vector3) {
		this.modelOffset.copy(offset);
	}

	public setViewVector(vector: THREE.Vector3) {
		this.viewVector.copy(vector).normalize();
	}

	public setArcadeVelocityTarget(velZ: number, velX = 0, velY = 0) {
		this.velocityTarget.z = velZ;
		this.velocityTarget.x = velX;
		this.velocityTarget.y = velY;
	}

	public setAnimations(animations: any) {
		this.animations = animations;
	}

	public setAnimation(clipName: string, fadeIn: number) {
		if (this.mixer != undefined) {
			let clips = this.characterModel.animations;
			let clip = THREE.AnimationClip.findByName(clips, clipName);

			let action = this.mixer.clipAction(clip);
			this.mixer.stopAllAction();
			action.fadeIn(fadeIn);
			action.play();

			return action._clip.duration;
		}
	}

	public setModel(model: THREE.Object3D) {
		this.modelContainer.remove(this.characterModel);
		this.characterModel = model;
		this.modelContainer.add(this.characterModel);

		this.mixer = new THREE.AnimationMixer(this.characterModel);
		this.setState(CharacterStates.Idle);
		this.charState.changeState();
	}

	public setOrientationTarget(vector: THREE.Vector3) {
		this.orientationTarget.copy(vector).setY(0).normalize();
	}

	public setCameraRelativeOrientationTarget() {
		let moveVector = this.getCameraRelativeMovementVector();
		if (moveVector.x == 0 && moveVector.y == 0 && moveVector.z == 0) {
			this.setOrientationTarget(this.orientation);
		} else {
			this.setOrientationTarget(moveVector);
		}
	}

	public setArcadeVelocityInfluence(x: number, y = x, z = x) {
		this.arcadeVelocityInfluence.set(x, y, z);
	}

	private getLocalMovementDirection() {
		const positiveX = this.controls.right.value ? -1 : 0;
		const negativeX = this.controls.left.value ? 1 : 0;
		const positiveZ = this.controls.up.value ? 1 : 0;
		const negativeZ = this.controls.down.value ? -1 : 0;
		return new THREE.Vector3(positiveX + negativeX, 0, positiveZ + negativeZ);
	}

	public getCameraRelativeMovementVector() {
		const localDirection = this.getLocalMovementDirection();
		const flatViewVector = new THREE.Vector3(this.viewVector.x, 0, this.viewVector.z);
		return Utility.appplyVectorMatrixXZ(flatViewVector, localDirection);
	}

	public takeControl(CharacterControls: any) {
		if (this.world !== undefined) {
			this.world.setGameMode(/* new GameModes.CharacterControls(this) */new CharacterControls(this));
		} else {
			console.warn('Attempting to take control of a character that doesn\'t belong to a world.');
		}
	}

	public rotateModel() {
		let mult = 1024
		this.visuals.lookAt(this.orientation.x * mult, this.visuals.position.y * mult, this.orientation.z * mult);
		this.visuals.rotateZ(-this.angularVelocity * 2.3 * this.velocity.length());
		this.visuals.position.setY(this.visuals.position.y + (Math.cos(Math.abs(this.angularVelocity * 2.3 * this.velocity.length())) / 2));
	}

	public jump(initJumpSpeed = -1) {
		this.wantsToJump = true;
		this.initJumpSpeed = initJumpSpeed;
	}

	public springMovement(timeStep: number) {
		// Simulator
		this.velocitySimulator.target.copy(this.velocityTarget);
		this.velocitySimulator.simulate(timeStep);

		// Update values
		this.velocity.copy(this.velocitySimulator.position);
		this.acceleration.copy(this.velocitySimulator.velocity);
	}

	public springRotation(timeStep: number, RotationMultiplier: number) {
		//Spring rotation
		//Figure out angle between current and target orientation
		let angle = Utility.getSignedAngleBetweenVectors(this.orientation, this.orientationTarget);

		// Simulator
		this.rotationSimulator.target = angle * RotationMultiplier;
		this.rotationSimulator.simulate(timeStep);
		let rot = this.rotationSimulator.position;
		// Updating values
		this.orientation.applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
		this.angularVelocity = this.rotationSimulator.velocity;
	}

	public physicsPreStep() {
		// Player ray casting
		// Create ray
		const start = new CANNON.Vec3(this.characterCapsule.physics!.physical.position.x, this.characterCapsule.physics!.physical.position.y, this.characterCapsule.physics!.physical.position.z);
		const end = new CANNON.Vec3(this.characterCapsule.physics!.physical.position.x, this.characterCapsule.physics!.physical.position.y - this.rayCastLength - this.raySafeOffset, this.characterCapsule.physics!.physical.position.z);
		// Raycast options
		const rayCastOptions = {
			collisionFilterMask: ~2, // cast against everything except second collision group (player)
			skipBackfaces: true, // ignore back faces
		};
		// Cast the ray
		this.rayHasHit = this.world.world.raycastClosest(start, end, rayCastOptions, this.rayResult);

		if (this.rayHasHit) {
			if (this.raycastBox.visible) this.raycastBox.position.copy(this.rayResult.hitPointWorld);
			this.characterCapsule.physics!.physical.position.y = this.rayResult.hitPointWorld.y + this.rayCastLength;
		} else {
			if (this.raycastBox.visible) this.raycastBox.position.set(this.characterCapsule.physics!.physical.position.x, this.characterCapsule.physics!.physical.position.y - this.rayCastLength - this.raySafeOffset, this.characterCapsule.physics!.physical.position.z);
		}
	}

	public physicsPostStep() {
		// Player ray casting
		// Get velocities
		let simulatedVelocity = new THREE.Vector3().copy(this.characterCapsule.physics!.physical.velocity);
		// Take local velocity
		let arcadeVelocity = new THREE.Vector3().copy(this.velocity).multiplyScalar(this.moveSpeed);
		// Turn local into global
		arcadeVelocity = Utility.appplyVectorMatrixXZ(this.orientation, arcadeVelocity);

		let newVelocity = new THREE.Vector3();

		// Additive velocity mode
		if (this.arcadeVelocityIsAdditive) {

			newVelocity.copy(simulatedVelocity);

			let globalVelocityTarget = Utility.appplyVectorMatrixXZ(this.orientation, this.velocityTarget);
			let add = new THREE.Vector3().copy(arcadeVelocity).multiply(this.arcadeVelocityInfluence);

			if (Math.abs(simulatedVelocity.x) < Math.abs(globalVelocityTarget.x * this.moveSpeed) || Utility.haveDifferentSigns(simulatedVelocity.x, arcadeVelocity.x)) { newVelocity.x += add.x; }
			if (Math.abs(simulatedVelocity.y) < Math.abs(globalVelocityTarget.y * this.moveSpeed) || Utility.haveDifferentSigns(simulatedVelocity.y, arcadeVelocity.y)) { newVelocity.y += add.y; }
			if (Math.abs(simulatedVelocity.z) < Math.abs(globalVelocityTarget.z * this.moveSpeed) || Utility.haveDifferentSigns(simulatedVelocity.z, arcadeVelocity.z)) { newVelocity.z += add.z; }
		} else {
			newVelocity = new THREE.Vector3(
				THREE.MathUtils.lerp(simulatedVelocity.x, arcadeVelocity.x, this.arcadeVelocityInfluence.x),
				THREE.MathUtils.lerp(simulatedVelocity.y, arcadeVelocity.y, this.arcadeVelocityInfluence.y),
				THREE.MathUtils.lerp(simulatedVelocity.z, arcadeVelocity.z, this.arcadeVelocityInfluence.z),
			);
		}

		// If we're hitting the ground, stick to ground
		if (this.rayHasHit) {

			//Flatten velocity
			newVelocity.y = 0;

			// Measure the normal vector offset from direct "up" vector
			// and transform it into a matrix
			let up = new THREE.Vector3(0, 1, 0);
			let normal = new THREE.Vector3().copy(this.rayResult.hitNormalWorld);
			let q = new THREE.Quaternion().setFromUnitVectors(up, normal);
			let m = new THREE.Matrix4().makeRotationFromQuaternion(q);

			// Rotate the velocity vector
			newVelocity.applyMatrix4(m);

			// Apply velocity
			this.characterCapsule.physics!.physical.velocity.set(newVelocity.x, newVelocity.y, newVelocity.z);
		} else {
			// If we're in air
			this.characterCapsule.physics!.physical.velocity.set(newVelocity.x, newVelocity.y, newVelocity.z);
			this.groundImpactData.velocity.copy(this.characterCapsule.physics!.physical.velocity);
		}

		// Jumping
		if (this.wantsToJump) {

			// If initJumpSpeed is set
			if (this.initJumpSpeed > -1) {

				// Flatten velocity
				this.characterCapsule.physics!.physical.velocity.y = 0;

				// Velocity needs to be at least as much as initJumpSpeed
				if (this.characterCapsule.physics!.physical.velocity.lengthSquared() < this.initJumpSpeed ** 2) {
					this.characterCapsule.physics!.physical.velocity.normalize();
					this.characterCapsule.physics!.physical.velocity.scale(this.initJumpSpeed, this.characterCapsule.physics!.physical.velocity);
				}
			}

			// Add positive vertical velocity 
			this.characterCapsule.physics!.physical.velocity.y += 4;
			//Move above ground by 1x safe offset value
			this.characterCapsule.physics!.physical.position.y += this.raySafeOffset * 2;
			//Reset flag
			this.wantsToJump = false;
		}
	}

	public resetControls() {
		this.setControl('up', false);
		this.setControl('down', false);
		this.setControl('left', false);
		this.setControl('right', false);
		this.setControl('run', false);
		this.setControl('jump', false);
		this.setControl('use', false);
		this.setControl('shoot', false);
		this.setControl('primary', false);
		this.setControl('secondary', false);
		this.setControl('tertiary', false);
	}

	public update(timeStamp: number, mesh: boolean = false, force: boolean = false) {
		if(this.characterCapsule.physics !== undefined) {
			let options = {
				springRotation: true,
				rotationMultiplier: 1,
				springVelocity: true,
				rotateModel: true,
				updateAnimation: true
			};
			this.visuals.position.copy(this.modelOffset);
			if (options.springVelocity) this.springMovement(timeStamp);
			if (options.springRotation) this.springRotation(timeStamp, options.rotationMultiplier);
			if (options.rotateModel) this.rotateModel();
			if (options.updateAnimation && this.mixer != undefined) this.mixer.update(timeStamp);

			this.position.set(
				this.characterCapsule.physics.physical.interpolatedPosition.x,
				this.characterCapsule.physics.physical.interpolatedPosition.y - this.height / 2,
				this.characterCapsule.physics.physical.interpolatedPosition.z
			);
		}
	}

	public Out(): Message {
		return {
			id: this.id.toString(),
			userName: this.name,
			type: this.messageType,
			data: {
				characterModel_position: {
					x: this.characterCapsule.physics!.physical.position.x,
					y: this.characterCapsule.physics!.physical.position.y,
					z: this.characterCapsule.physics!.physical.position.z,
				},
				characterModel_quaternion: {
					x: this.visuals.quaternion.x,
					y: this.visuals.quaternion.y,
					z: this.visuals.quaternion.z,
					w: this.visuals.quaternion.w,
				},
				charStateRaw: this.charStateRaw,
				raycastBox: {
					x: this.raycastBox.position.x,
					y: this.raycastBox.position.y,
					z: this.raycastBox.position.z,
				},
			},
			timeStamp: this.timeStamp,
			ping: this.ping,
		}
	}
}
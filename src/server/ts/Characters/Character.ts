import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import Utility from '../Utils/Utility';
import * as Springs from '../Simulation/Springs';
import * as Controls from '../Controls'
import World from '../World';
import WorldObject from '../WorldObjects/WorldObjects';
import * as WorldObjectPhysics from '../WorldObjects/WorldObjectPhysics';
import * as CharacterStates from './CharacterStates';
import { CharacterAI } from './CharacterAI';


export class Character extends THREE.Object3D {

	private height: number
	private modelOffset: THREE.Vector3
	private visuals: THREE.Group
	private modelContainer: THREE.Group
	private characterModel: THREE.Mesh

	public mixer: any
	public animations: any[]

	private acceleration: THREE.Vector3
	public velocity: THREE.Vector3
	private arcadeVelocityInfluence: THREE.Vector3
	public arcadeVelocityIsAdditive: boolean
	private velocityTarget: THREE.Vector3

	public defaultVelocitySimulatorDamping: number
	public defaultVelocitySimulatorMass: number
	private moveSpeed: number
	public velocitySimulator: Springs.VectorSpringSimulator

	private angularVelocity: number
	public orientation: THREE.Vector3
	public orientationTarget: THREE.Vector3
	public defaultRotationSimulatorDamping: number
	public defaultRotationSimulatorMass: number
	public rotationSimulator: Springs.RelativeSpringSimulator

	private viewVector: THREE.Vector3
	private behaviour: any
	public controls: { [id: string]: Controls.EventControl }
	public characterCapsule: WorldObject

	private rayResult: CANNON.RaycastResult
	public rayHasHit: boolean
	private rayCastLength: number
	private raySafeOffset: number
	private wantsToJump: boolean
	private initJumpSpeed: number
	public groundImpactData: { [id: string]: any }
	public raycastBox: THREE.Mesh

	public charState: any

	public world: World

	constructor(world: World, options: { [id: string]: any } = {}) {
		let defaults = {
			position: new THREE.Vector3(),
			height: 1
		};
		
		options = Utility.setDefaults(options, defaults);
		super()
		// this.setAnimations = this.setAnimations.bind(this)
		// this.setModel = this.setModel.bind(this)
		this.setArcadeVelocityInfluence = this.setArcadeVelocityInfluence.bind(this)
		// this.setModelOffset = this.setModelOffset.bind(this)
		this.setViewVector = this.setViewVector.bind(this)
		// this.setState = this.setState.bind(this)
		// this.setPosition = this.setPosition.bind(this)
		// this.setArcadeVelocity = this.setArcadeVelocity.bind(this)
		this.setArcadeVelocityTarget = this.setArcadeVelocityTarget.bind(this)
		this.setOrientationTarget = this.setOrientationTarget.bind(this)
		// this.setBehaviour = this.setBehaviour.bind(this)
		this.setControl = this.setControl.bind(this)
		// this.takeControl = this.takeControl.bind(this)
		// this.resetControls = this.resetControls.bind(this)
		this.update = this.update.bind(this)
		this.setAnimation = this.setAnimation.bind(this)
		this.springMovement = this.springMovement.bind(this)
		this.springRotation = this.springRotation.bind(this)
		this.getLocalMovementDirection = this.getLocalMovementDirection.bind(this)
		this.getCameraRelativeMovementVector = this.getCameraRelativeMovementVector.bind(this)
		this.setCameraRelativeOrientationTarget = this.setCameraRelativeOrientationTarget.bind(this)
		this.rotateModel = this.rotateModel.bind(this)
		this.jump = this.jump.bind(this)
		this.physicsPreStep = this.physicsPreStep.bind(this)
		this.physicsPostStep = this.physicsPostStep.bind(this)
		
		// World
		this.world = world
		
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
		let capsuleGeometry = Utility.createCapsuleGeometry(0.5, this.height)
		let capsule = new THREE.Mesh(capsuleGeometry, new THREE.MeshLambertMaterial({ color: 0x0000ff }))
		capsule.position.set(0, this.height / 2, 0)
		capsule.castShadow = true

		this.characterModel = capsule
		this.modelContainer.add(capsule)

		this.mixer;
		this.animations = []

		this.acceleration = new THREE.Vector3()
		this.velocity = new THREE.Vector3()
		this.arcadeVelocityInfluence = new THREE.Vector3()
		this.arcadeVelocityIsAdditive = false
		this.velocityTarget = new THREE.Vector3()

		this.defaultVelocitySimulatorDamping = 0.8
		this.defaultVelocitySimulatorMass = 50
		this.moveSpeed = 50
		this.velocitySimulator = new Springs.VectorSpringSimulator(60, this.defaultVelocitySimulatorMass, this.defaultVelocitySimulatorDamping, new THREE.Vector3(), new THREE.Vector3())

		this.angularVelocity = 0
		this.orientation = new THREE.Vector3()
		this.orientationTarget = new THREE.Vector3()
		this.defaultRotationSimulatorDamping = 0.5
		this.defaultRotationSimulatorMass = 10
		this.rotationSimulator = new Springs.RelativeSpringSimulator(60, this.defaultRotationSimulatorMass, this.defaultRotationSimulatorDamping)

		// this.setState(CharacterState.Idle)
		this.viewVector = new THREE.Vector3()

		// this.setBehaviour(new CharacterAI.Default());
		this.controls = {
			up: new Controls.EventControl(),
			down: new Controls.EventControl(),
			left: new Controls.EventControl(),
			right: new Controls.EventControl(),
			run: new Controls.EventControl(),
			jump: new Controls.EventControl(),
			use: new Controls.EventControl(),
			primary: new Controls.EventControl(),
			secondary: new Controls.EventControl(),
			tertiary: new Controls.EventControl(),
			lastControl: new Controls.EventControl()
		}

		let capsukePhysics = new WorldObjectPhysics.Capsule({
			mass: 1,
			position: new CANNON.Vec3(0, 0, 0).copy(options.position),
			height: 0.5,
			radius: 0.25,
			segments: 8,
			friction: 0
		})
		this.characterCapsule = new WorldObject(undefined, undefined)
		this.characterCapsule.setPhysics(capsukePhysics)
		if (this.characterCapsule.physics != undefined) {
			// this.characterCapsule.physics.physical.character = this
			this.characterCapsule.physics.physical.collisionFilterGroup = 2
			this.characterCapsule.physics.physical.fixedRotation = true
			this.characterCapsule.physics.physical.updateMassProperties()
		}

		this.rayResult = new CANNON.RaycastResult()
		this.rayHasHit = false
		this.rayCastLength = 0.60
		this.raySafeOffset = 0.01
		this.wantsToJump = false
		this.initJumpSpeed = -1
		this.groundImpactData = {
			velocity: new CANNON.Vec3(),
		}

		this.raycastBox = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshBasicMaterial({ color: 0xff0000 }))
		this.raycastBox.visible = false
	}

	// setAnimations
	// setModel

	public setArcadeVelocityInfluence(x: number, y: number = x, z: number = y) {
		this.arcadeVelocityInfluence.set(x, y, z);
	}

	// setModelOffset

	public setViewVector(vector: THREE.Vector3) {
		this.viewVector.copy(vector).normalize();
	}

	// setState
	// setPosition
	// setArcadeVelocity

	public setArcadeVelocityTarget(velZ: number, velX = 0, velY = 0) {
		this.velocityTarget.z = velZ;
		this.velocityTarget.x = velX;
		this.velocityTarget.y = velY;
	}

	public setOrientationTarget(vector: THREE.Vector3) {
		this.orientationTarget.copy(vector).setY(0).normalize();
	}

	// setBehaviour

	public setControl(key: any, value: any) {
		let action = this.controls[key];
		if (action.value !== value) {
			action.value = value;
			if (value) action.justPressed = true;
			else action.justReleased = true;
			this.controls.lastControl = action;
			this.charState.changeState();
			action.justPressed = false;
			action.justReleased = false;
		}
	}

	// takeControl
	// resetControls

	public update(timeStep: number, options: {
		[id: string]: any
	} = {}) {
		let defaults = {
			springRotation: true,
			rotationMultiplier: 1,
			springVelocity: true,
			rotateModel: true,
			updateAnimation: true
		};
		options = Utility.setDefaults(options, defaults);

		this.visuals.position.copy(this.modelOffset);
		if (options.springVelocity) this.springMovement(timeStep);
		if (options.springRotation) this.springRotation(timeStep, options.rotationMultiplier);
		if (options.rotateModel) this.rotateModel();
		if (options.updateAnimation && this.mixer != undefined) this.mixer.update(timeStep);

		if (this.characterCapsule.physics !== undefined) {
			this.position.set(
				this.characterCapsule.physics.physical.interpolatedPosition.x,
				this.characterCapsule.physics.physical.interpolatedPosition.y - this.height / 2,
				this.characterCapsule.physics.physical.interpolatedPosition.z
			);
		}
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

	private springMovement(timeStep: number) {
		// Simulator
		this.velocitySimulator.target.copy(this.velocityTarget);
		this.velocitySimulator.simulate(timeStep);

		// Update values
		this.velocity.copy(this.velocitySimulator.position);
		this.acceleration.copy(this.velocitySimulator.velocity);
	}

	private springRotation(timeStep: number, RotationMultiplier: number) {
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

	public getLocalMovementDirection() {
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

	public setCameraRelativeOrientationTarget() {
		let moveVector = this.getCameraRelativeMovementVector();

		if (moveVector.x == 0 && moveVector.y == 0 && moveVector.z == 0) {
			this.setOrientationTarget(this.orientation);
		} else {
			this.setOrientationTarget(moveVector);
		}
	}

	private rotateModel() {
		let mult = 1024
		this.visuals.lookAt(this.orientation.x * mult, this.visuals.position.y * mult, this.orientation.z * mult);
		this.visuals.rotateZ(-this.angularVelocity * 2.3 * this.velocity.length());
		this.visuals.position.setY(this.visuals.position.y + (Math.cos(Math.abs(this.angularVelocity * 2.3 * this.velocity.length())) / 2));
	}

	public jump(initJumpSpeed = -1) {
		this.wantsToJump = true;
		this.initJumpSpeed = initJumpSpeed;
	}

	physicsPreStep(self: any) {
		// Player ray casting
		// Create ray
		const start = new CANNON.Vec3(self.position.x, self.position.y, self.position.z);
		const end = new CANNON.Vec3(self.position.x, self.position.y - self.character.rayCastLength - self.character.raySafeOffset, self.position.z);
		// Raycast options
		const rayCastOptions = {
			collisionFilterMask: ~2, // cast against everything except second collision group (player)
			skipBackfaces: true, // ignore back faces
		};
		// Cast the ray
		self.character.rayHasHit = self.character.world.physicsWorld.raycastClosest(start, end, rayCastOptions, self.character.rayResult);

		if (self.character.rayHasHit) {
			if (self.character.raycastBox.visible) self.character.raycastBox.position.copy(self.character.rayResult.hitPointWorld);
			self.position.y = self.character.rayResult.hitPointWorld.y + self.character.rayCastLength;
		} else {
			if (self.character.raycastBox.visible) self.character.raycastBox.position.set(self.position.x, self.position.y - self.character.rayCastLength - self.character.raySafeOffset, self.position.z);
		}
	}

	physicsPostStep(self: any) {
		// Player ray casting
		// Get velocities
		let simulatedVelocity = new THREE.Vector3().copy(self.velocity);
		// Take local velocity
		let arcadeVelocity = new THREE.Vector3().copy(self.character.velocity).multiplyScalar(self.character.moveSpeed);
		// Turn local into global
		arcadeVelocity = Utility.appplyVectorMatrixXZ(self.character.orientation, arcadeVelocity);

		let newVelocity = new THREE.Vector3();

		// Additive velocity mode
		if (self.character.arcadeVelocityIsAdditive) {

			newVelocity.copy(simulatedVelocity);

			let globalVelocityTarget = Utility.appplyVectorMatrixXZ(self.character.orientation, self.character.velocityTarget);
			let add = new THREE.Vector3().copy(arcadeVelocity).multiply(self.character.arcadeVelocityInfluence);

			if (Math.abs(simulatedVelocity.x) < Math.abs(globalVelocityTarget.x * self.character.moveSpeed) || Utility.haveDifferentSigns(simulatedVelocity.x, arcadeVelocity.x)) { newVelocity.x += add.x; }
			if (Math.abs(simulatedVelocity.y) < Math.abs(globalVelocityTarget.y * self.character.moveSpeed) || Utility.haveDifferentSigns(simulatedVelocity.y, arcadeVelocity.y)) { newVelocity.y += add.y; }
			if (Math.abs(simulatedVelocity.z) < Math.abs(globalVelocityTarget.z * self.character.moveSpeed) || Utility.haveDifferentSigns(simulatedVelocity.z, arcadeVelocity.z)) { newVelocity.z += add.z; }
		} else {
			newVelocity = new THREE.Vector3(
				THREE.MathUtils.lerp(simulatedVelocity.x, arcadeVelocity.x, self.character.arcadeVelocityInfluence.x),
				THREE.MathUtils.lerp(simulatedVelocity.y, arcadeVelocity.y, self.character.arcadeVelocityInfluence.y),
				THREE.MathUtils.lerp(simulatedVelocity.z, arcadeVelocity.z, self.character.arcadeVelocityInfluence.z),
			);
		}

		// If we're hitting the ground, stick to ground
		if (self.character.rayHasHit) {

			//Flatten velocity
			newVelocity.y = 0;

			// Measure the normal vector offset from direct "up" vector
			// and transform it into a matrix
			let up = new THREE.Vector3(0, 1, 0);
			let normal = new THREE.Vector3().copy(self.character.rayResult.hitNormalWorld);
			let q = new THREE.Quaternion().setFromUnitVectors(up, normal);
			let m = new THREE.Matrix4().makeRotationFromQuaternion(q);

			// Rotate the velocity vector
			newVelocity.applyMatrix4(m);

			// Apply velocity
			self.velocity.copy(newVelocity);
		} else {
			// If we're in air
			self.velocity.copy(newVelocity);
			self.character.groundImpactData.velocity.copy(self.velocity);
		}

		// Jumping
		if (self.character.wantsToJump) {

			// If initJumpSpeed is set
			if (self.character.initJumpSpeed > -1) {

				// Flatten velocity
				self.velocity.y = 0;

				// Velocity needs to be at least as much as initJumpSpeed
				if (self.velocity.lengthSquared() < self.character.initJumpSpeed ** 2) {
					self.velocity.normalize();
					self.velocity.scale(self.character.initJumpSpeed, self.velocity);
				}
			}

			// Add positive vertical velocity 
			self.velocity.y += 4;
			//Move above ground by 1x safe offset value
			self.position.y += self.character.raySafeOffset * 2;
			//Reset flag
			self.character.wantsToJump = false;
		}
	}
}
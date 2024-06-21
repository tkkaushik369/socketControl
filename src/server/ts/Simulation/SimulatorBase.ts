import * as THREE from 'three';

export var SimulatorCacheSize: number = 3

export class SimulatorBase {

	protected frameTime: number
	protected offset: number
	protected cache: any[]

	constructor(fps: number) {
		this.setFPS = this.setFPS.bind(this)
		this.lastFrame = this.lastFrame.bind(this)
		this.getFrame = this.getFrame.bind(this)
		this.generateFrames = this.generateFrames.bind(this)

		this.frameTime = 1 / fps
		this.offset = 0
		this.cache = []
	}

	protected setFPS(value: number) {
		this.frameTime = 1 / value
	}

	protected lastFrame() {
		return this.cache[this.cache.length - 1]
	}

	protected getFrame(isLastFrame: boolean) { }

	protected generateFrames(timeStep: number) {
		let totalTimeStep = this.offset + timeStep;
		let framesToGenerate = Math.floor(totalTimeStep / this.frameTime);
		this.offset = totalTimeStep % this.frameTime;

		if (framesToGenerate > 0) {
			for (let i = 0; i < framesToGenerate; i++) {
				this.cache.push(this.getFrame(i + 1 == framesToGenerate));
			}
			this.cache = this.cache.slice(-2);
		}
	}
}

export function spring(source: number, dest: number, velocity: number, mass: number, damping: number) {
	let acceleration = dest - source;
	acceleration /= mass;
	velocity += acceleration;
	velocity *= damping;

	let position = source += velocity;

	return { position: position, velocity: velocity };
}

export function springV(source: THREE.Vector3, dest: THREE.Vector3, velocity: THREE.Vector3, mass: number, damping: number) {
	let acceleration = new THREE.Vector3().subVectors(dest, source);
	acceleration.divideScalar(mass);
	velocity.add(acceleration);
	velocity.multiplyScalar(damping);
	source.add(velocity);
}
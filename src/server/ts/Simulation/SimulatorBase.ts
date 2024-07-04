import * as THREE from 'three'

export class SimulatorBase
{
	public frameTime: number
	public offset: number
	public cache: any[]

	constructor(fps: number)
	{
		this.frameTime = 1 / fps;
		this.offset = 0; // 0 - frameTime
		this.cache = []; // At least two frames
	}

	setFPS(value: number)
	{
		this.frameTime = 1 / value;
	}

	lastFrame()
	{
		return this.cache[this.cache.length - 1];
	}

	getFrame(isLastFrame: boolean) {}

	/**
	 * Generates frames between last simulation call and the current one
	 * @param {timeStep} timeStep 
	 */
	generateFrames(timeStep: number)
	{
		// Update cache
		// Find out how many frames needs to be generated
		let totalTimeStep = this.offset + timeStep;
		let framesToGenerate = Math.floor(totalTimeStep / this.frameTime);
		this.offset = totalTimeStep % this.frameTime;

		// Generate simulation frames
		if (framesToGenerate > 0)
		{
			for (let i = 0; i < framesToGenerate; i++)
			{
				this.cache.push(this.getFrame(i + 1 == framesToGenerate));
			}
			this.cache = this.cache.slice(-2);
		}
	}
}

export function spring(source: number, dest: number, velocity: number, mass: number, damping: number)
{
	let acceleration = dest - source;
	acceleration /= mass;
	velocity += acceleration;
	velocity *= damping;

	let position = source += velocity;

	return { position: position, velocity: velocity };
}

export function springV(source: THREE.Vector3, dest: THREE.Vector3, velocity: THREE.Vector3, mass: number, damping: number)
{
	let acceleration = new THREE.Vector3().subVectors(dest, source);
	acceleration.divideScalar(mass);
	velocity.add(acceleration);
	velocity.multiplyScalar(damping);
	source.add(velocity);
}
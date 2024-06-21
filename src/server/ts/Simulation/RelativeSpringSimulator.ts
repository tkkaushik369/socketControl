import * as THREE from 'three';
import { SimulatorBase, spring, SimulatorCacheSize } from './SimulatorBase';

export class RelativeSpringSimulator extends SimulatorBase {
	public position: number
	public velocity: number

	public target: number
	public mass: number
	public damping: number
	private lastLerp: number

	constructor(fps: number, mass: number, damping: number, startPosition = 0, startVelocity = 0) {
		super(fps);
		this.simulate = this.simulate.bind(this)
		this.getFrame = this.getFrame.bind(this)

		this.position = 0
		this.velocity = 0

		this.target = 0
		this.mass = mass
		this.damping = damping
		this.lastLerp = 0

		for (let i = 0; i < SimulatorCacheSize; i++) {
			this.cache.push({
				position: startPosition,
				velocity: startVelocity
			})
		}
	}

	public simulate(timeStep: number) {
		this.generateFrames(timeStep);
		let lerp = THREE.MathUtils.lerp(0, this.cache[0].position, this.offset / this.frameTime);
		this.position = (lerp - this.lastLerp)
		this.lastLerp = lerp
		this.velocity = THREE.MathUtils.lerp(this.cache[0].velocity, this.cache[1].velocity, this.offset / this.frameTime);
	}

	public getFrame(isLastFrame: boolean) {
		let newFrame = Object.assign({}, this.lastFrame());
		if (isLastFrame) {
			newFrame.position = 0;
			this.lastLerp = this.lastLerp - this.lastFrame().position;
		}
		return spring(newFrame.position, this.target, newFrame.velocity, this.mass, this.damping);
	}
}
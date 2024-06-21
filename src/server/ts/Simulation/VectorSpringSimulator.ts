import * as THREE from 'three';
import { SimulatorBase, springV, SimulatorCacheSize } from './SimulatorBase';
import { start } from 'repl';

export class VectorSpringSimulator extends SimulatorBase {

	public position: THREE.Vector3
	public velocity: THREE.Vector3

	public target: THREE.Vector3
	public mass: number
	public damping: number

	constructor(fps: number, mass: number, damping: number, startPosition = new THREE.Vector3(), startVelocity = new THREE.Vector3()) {
		super(fps);
		this.simulate = this.simulate.bind(this)
		this.getFrame = this.getFrame.bind(this)

		this.position = new THREE.Vector3();
		this.velocity = new THREE.Vector3();

		this.target = new THREE.Vector3();
		this.mass = mass;
		this.damping = damping;

		for (let i = 0; i < SimulatorCacheSize; i++) {
			this.cache.push({
				position: startPosition,
				velocity: startVelocity
			})
		}
	}

	public simulate(timeStep: number) {
		this.generateFrames(timeStep);
		this.position.lerpVectors(this.cache[0].position, this.cache[1].position, this.offset / this.frameTime);
		this.velocity.lerpVectors(this.cache[0].velocity, this.cache[1].velocity, this.offset / this.frameTime);
	}

	public getFrame(isLastFrame: boolean) {
		let newSpring = {
			position: this.lastFrame().position.clone(),
			velocity: this.lastFrame().velocity.clone()
		}
		springV(newSpring.position, this.target, newSpring.velocity, this.mass, this.damping)
		return newSpring
	}
}

import * as CANNON from 'cannon-es'
import { Player } from "./Player"

export default class World {

	protected clients: { [id: string]: Player }
	protected world: CANNON.World

	protected resetCallTime: boolean
	protected lastCallTime: number
	protected allBodies: { [id: string]: CANNON.Body }
	protected settings: { [id: string]: any }

	public constructor(clients: { [id: string]: Player }) {
		// Bind Functions
		this.updatePhysics = this.updatePhysics.bind(this)

		// Init
		this.clients = clients

		// Init cannon.js
		this.world = new CANNON.World();
		this.world.gravity.set(0, -9.8, 0)

		// Init allBodies
		this.resetCallTime = false
		this.lastCallTime = 0
		this.allBodies = {}
		this.settings = {
			stepFrequency: 60,
		}


		setInterval(this.updatePhysics, (1 / this.settings.stepFrequency) * 1000)
	}

	public addBody(body: CANNON.Body, name: string) {
		this.allBodies[name] = body
		this.world.addBody(body)
	}

	public removeBody(name: string) {
		if (this.allBodies[name] === undefined) return
		this.world.removeBody(this.allBodies[name])
		delete this.allBodies[name]
	}

	protected updatePhysics() {
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

		this.lastCallTime = now
	}
}
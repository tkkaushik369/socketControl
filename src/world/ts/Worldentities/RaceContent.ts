import * as THREE from 'three'
import { WorldBase } from '../WorldBase'
import { Scenario } from './Scenario'
import { RaceCheckpoint } from './RaceCheckpoint'
import { PathNode } from './PathNode'
import { EntityType } from '../Enums/EntityType'
import { IUpdatable } from '../Interfaces/IUpdatable'
import { IWorldEntity } from '../Interfaces/IWorldEntity'
import { Character } from '../Characters/Character'

export class RaceContent extends EventTarget implements IUpdatable, IWorldEntity {
	public updateOrder: number = 6
	entityType: EntityType = EntityType.System

	public scenario: Scenario
	public checkpointGroup: THREE.Group
	public curve: THREE.CatmullRomCurve3 | null
	public checkpoints: RaceCheckpoint[]

	constructor(scenario: Scenario) {
		super()

		// bind functions
		this.launch = this.launch.bind(this)
		this.findClosestTOnCurve = this.findClosestTOnCurve.bind(this)
		this.onCheckpointPassed = this.onCheckpointPassed.bind(this)
		this.addToWorld = this.addToWorld.bind(this)
		this.removeFromWorld = this.removeFromWorld.bind(this)
		this.update = this.update.bind(this)

		// init
		this.scenario = scenario
		this.checkpointGroup = new THREE.Group()
		this.curve = null
		this.checkpoints = []
	}

	public launch() {
		const childrens = this.scenario.rootNode.children
		let first_node: string | null = null
		let all_nodes: PathNode[] = []
		for (let i = 0; i < childrens.length; i++) {
			if (childrens[i].hasOwnProperty('userData') && Object.keys(childrens[i].userData).includes('first_node')) {
				first_node = childrens[i].userData.first_node
				break
			}
		}

		if (first_node !== null) {
			for (let i = 0; i < this.scenario.world.paths.length; i++) {
				let nodes = this.scenario.world.paths[i].nodes
				if (Object.keys(nodes).includes(first_node)) {
					const first_path_node: PathNode = nodes[first_node]
					let node: PathNode = nodes[first_node]
					while (node.nextNode !== null && node.nextNode !== first_path_node) {
						all_nodes.push(node)
						node = node.nextNode
					}
					break
				}
			}
		}

		if (all_nodes.length > 0) {
			const points: THREE.Vector3[] = []
			for (let i = 0; i < all_nodes.length; i++) {
				let source = new THREE.Vector3()
				all_nodes[i].object.getWorldPosition(source)
				points.push(source)
				// all_nodes[i].object.add(new THREE.AxesHelper(1))
			}
			const curve = new THREE.CatmullRomCurve3(points, true, 'chordal', 0.5)
			this.curve = curve
			const pts = this.curve.getPoints(200)
			const geometry = new THREE.BufferGeometry().setFromPoints(pts)
			const mat = new THREE.LineBasicMaterial({ color: 0xffaa00 })
			const line = new THREE.Line(geometry, mat)
			this.checkpointGroup.add(line)

			this.checkpoints = points.map((p, i) => new RaceCheckpoint(p, i, this, curve))
			this.checkpoints.forEach((cp) => (cp.mesh.position.y += 0.01))
		}

		this.scenario.world.add(this)
	}

	public findClosestTOnCurve(target: THREE.Vector3, samples = 500): number {
		let bestT = 0
		let bestDist = Infinity
		if (this.curve !== null) {
			for (let i = 0; i <= samples; i++) {
				const u = i / samples
				const p = this.curve.getPointAt(u)
				const d = p.distanceToSquared(target)
				if (d < bestDist) {
					bestDist = d
					bestT = u
				}
			}
		}
		return bestT
	}

	private onCheckpointPassed(char: Character, index: number) {
		if (index === char.nextCheckpointIndex) {
			char.nextCheckpointIndex = (char.nextCheckpointIndex + 1) % this.checkpoints.length
			// if we've wrapped to zero we completed a lap
			if (char.nextCheckpointIndex === 0) {
				char.lapCount++
				this.dispatchEvent(
					new CustomEvent('race_update_lap', {
						detail: `Lap completed! Total laps: ${char.uID} => ${char.lapCount}`,
					})
				)
			}
		} else {
			// If you want to allow out-of-order passes, handle differently.
			this.dispatchEvent(
				new CustomEvent('race_update_illegal', {
					detail: `Passed out-of-order checkpoint: ${char.uID} => ${index}, expected: ${char.nextCheckpointIndex}`,
				})
			)
		}
		this.dispatchEvent(new CustomEvent('race_update', { detail: `Checkpoint passed: ${char.uID} => ${index}` }))
	}

	addToWorld(world: WorldBase): void {
		world.scene.add(this.checkpointGroup)
	}
	removeFromWorld(world: WorldBase): void {
		world.scene.remove(this.checkpointGroup)
	}

	update(timestep: number, unscaledTimeStep: number): void {
		const characters = this.scenario.world.characters
		characters.forEach((char) => {
			if (char.nextCheckpointIndex > -1 && char.lapCount > -1) {
				const position = new THREE.Vector3()
				char.getWorldPosition(position)
				// Check checkpoints (use prevCarPos and car.position)
				this.checkpoints.forEach((cp) => {
					const isCrossed = cp.checkCross(char.prevPos, position)
					if (isCrossed) {
						this.onCheckpointPassed(char, cp.index)
					}
				})
				char.prevPos.copy(position)
			}
		})
	}
}

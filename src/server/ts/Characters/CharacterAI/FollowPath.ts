import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { Utility } from '../../Core/Utility'

import { Character } from '../Character'
import { FollowTarget } from './FollowTarget'
import { ICharacterAI } from '../../Interfaces/ICharacterAI'
import { PathNode } from '../../World/PathNode'

export class FollowPath extends FollowTarget implements ICharacterAI {
	state = 'FollowPath'
	public nodeRadius: number
	public reverse: boolean = false

	private staleTimer: number = 0
	private targetNode: PathNode

	constructor(character: Character, firstNode: PathNode, nodeRadius: number) {
		super(character, firstNode.object, 0)
		// bind functions
		this.update = this.update.bind(this)
		this.setVehicleTriggerAction = this.setVehicleTriggerAction.bind(this)

		// init
		this.nodeRadius = nodeRadius
		this.targetNode = firstNode
	}

	public update(timeStep: number): void {
		super.update(timeStep)

		// Todo only compute once in followTarget
		let source = new THREE.Vector3()
		let target = new THREE.Vector3()
		this.character.getWorldPosition(source)
		this.target.getWorldPosition(target)
		let viewVector = new THREE.Vector3().subVectors(target, source)
		viewVector.y = 0

		if (this.targetNode.nextNode !== null) {
			let targetToNextNode = this.targetNode.nextNode.object.position.clone().sub(this.targetNode.object.position)
			targetToNextNode.y = 0
			targetToNextNode.normalize()
			let slowDownAngle = viewVector.clone().normalize().dot(targetToNextNode)
			if (this.character.controlledObject !== null) {
				let speed = this.character.controlledObject.collision.velocity.length()

				if ((slowDownAngle < 0.7 && viewVector.length() < 50 && speed > 10)) {
					if (this.character.controlledObject !== null) {
						this.setVehicleTriggerAction('reverse', true)
						this.setVehicleTriggerAction('throttle', false)
					}
				}

				if (speed < 1 || this.character.controlledObject.rayCastVehicle.numWheelsOnGround === 0) this.staleTimer += timeStep
				else this.staleTimer = 0
			}
		}
		if (this.staleTimer > 5) {
			let worldPos = new THREE.Vector3()
			this.targetNode.object.getWorldPosition(worldPos)
			worldPos.y += 3
			if (this.character.controlledObject !== null) {
				this.character.controlledObject.collision.position = Utility.cannonVector(worldPos)
				this.character.controlledObject.collision.interpolatedPosition = Utility.cannonVector(worldPos)
				this.character.controlledObject.collision.angularVelocity = new CANNON.Vec3()
				this.character.controlledObject.collision.quaternion.copy(this.character.controlledObject.collision.initQuaternion)
			}
			this.staleTimer = 0
		}

		if (viewVector.length() < this.nodeRadius) {
			if (this.reverse && (this.targetNode.previousNode !== null)) {
				super.setTarget(this.targetNode.previousNode.object)
				this.targetNode = this.targetNode.previousNode
			} else {
				if (this.targetNode.nextNode) {
					super.setTarget(this.targetNode.nextNode.object)
					this.targetNode = this.targetNode.nextNode
				}
			}
		}
	}

	public setVehicleTriggerAction(action: string, isPressed: boolean) {
		super.setVehicleTriggerAction(action, isPressed)
		if (this.character.controlledObject !== null)
			this.character.controlledObject.triggerAction(action, isPressed)
	}
}
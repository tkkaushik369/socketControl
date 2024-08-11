import * as THREE from 'three'
import { ICharacterAI } from '../../Interfaces/ICharacterAI'
import { CharacterAIBase } from '../../Characters/CharacterAI/CharacterAIBase'
import * as Utils from '../../Core/FunctionLibrary'
import { Vehicle } from '../../Vehicles/Vehicle'
import { Character } from '../Character'

export class FollowTarget extends CharacterAIBase implements ICharacterAI {
	state = 'FollowTarget'
	public character: Character
	public isTargetReached: boolean

	public target: THREE.Object3D
	private stopDistance: number

	constructor(character: Character, target: THREE.Object3D, stopDistance: number = 1.3) {
		super()
		// bind function
		this.setTarget = this.setTarget.bind(this)
		this.update = this.update.bind(this)
		this.setCharacterTriggerAction = this.setCharacterTriggerAction.bind(this)
		this.setVehicalTriggerAction = this.setVehicalTriggerAction.bind(this)

		// init
		this.character = character
		this.target = target
		this.isTargetReached = false
		this.stopDistance = stopDistance
	}

	public setTarget(target: THREE.Object3D): void {
		this.target = target
	}

	public update(timeStep: number): void {
		if (this.character.controlledObject !== null) {
			let source = new THREE.Vector3()
			let target = new THREE.Vector3()

			this.character.getWorldPosition(source)
			this.target.getWorldPosition(target)

			let viewVector = new THREE.Vector3().subVectors(target, source)

			// Follow character
			if (viewVector.length() > this.stopDistance) {
				this.isTargetReached = false
			}
			else {
				this.isTargetReached = true
			}

			if (this.character.controlledObject !== null) {
				let forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.character.controlledObject.quaternion)
				viewVector.y = 0
				viewVector.normalize()
				let angle = Utils.getSignedAngleBetweenVectors(forward, viewVector)

				let goingForward = forward.dot(Utils.threeVector(this.character.controlledObject.collision.velocity)) > 0
				let speed = this.character.controlledObject.collision.velocity.length()

				if (this.character.controlledObject !== null) {
					if (forward.dot(viewVector) < 0.0) {
						this.setVehicalTriggerAction('reverse', true)
						this.setVehicalTriggerAction('throttle', false)
					}
					else {
						this.setVehicalTriggerAction('throttle', true)
						this.setVehicalTriggerAction('reverse', false)
					}

					if (Math.abs(angle) > 0.15) {
						if (forward.dot(viewVector) > 0 || goingForward) {
							if (angle > 0) {
								this.setVehicalTriggerAction('left', true)
								this.setVehicalTriggerAction('right', false)
							}
							else {
								this.setVehicalTriggerAction('right', true)
								this.setVehicalTriggerAction('left', false)
							}
						}
						else {
							if (angle > 0) {
								this.setVehicalTriggerAction('right', true)
								this.setVehicalTriggerAction('left', false)
							}
							else {
								this.setVehicalTriggerAction('left', true)
								this.setVehicalTriggerAction('right', false)
							}
						}
					}
					else {
						this.setVehicalTriggerAction('left', false)
						this.setVehicalTriggerAction('right', false)
					}
				}
			}
		}
		else {
			let viewVector = new THREE.Vector3().subVectors(this.target.position, this.character.position)
			this.character.setViewVector(viewVector)

			// Follow character
			if (viewVector.length() > this.stopDistance) {
				this.isTargetReached = false
				this.setCharacterTriggerAction('up', true)
			}
			// Stand still
			else {
				this.isTargetReached = true
				this.setCharacterTriggerAction('up', false)

				// Look at character
				this.character.setOrientation(viewVector)
			}
		}
	}

	public setCharacterTriggerAction(action: string, isPressed: boolean) {
		super.setCharacterTriggerAction(action, isPressed)
		this.character.triggerAction(action, isPressed)
	}

	public setVehicalTriggerAction(action: string, isPressed: boolean) {
		super.setVehicalTriggerAction(action, isPressed)
		if (this.character.controlledObject !== null)
			this.character.controlledObject.triggerAction(action, isPressed)
	}
}
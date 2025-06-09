import * as THREE from 'three'
import { ICharacterAI } from '../../Interfaces/ICharacterAI'
import { Character } from '../Character'
import { CharacterAIBase } from './CharacterAIBase'

export class RandomBehaviour extends CharacterAIBase implements ICharacterAI {
	state = 'RandomBehaviour'
	public character: Character
	private randomFrequency: number

	constructor(character: Character, randomFrequency: number = 100) {
		super()
		// bind functions
		this.update = this.update.bind(this)
		this.setCharacterTriggerAction = this.setCharacterTriggerAction.bind(this)

		// init
		this.character = character
		this.randomFrequency = randomFrequency
	}

	public update(timeStep: number): void {
		let rndInt = Math.floor(Math.random() * this.randomFrequency)
		let rndBool = Math.random() > 0.5 ? true : false

		if (rndInt === 0) {
			this.character.setViewVector(
				new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
			)

			this.setCharacterTriggerAction('up', true)
			this.character.charState.update(timeStep)
			this.setCharacterTriggerAction('up', false)
		} else if (rndInt === 1) {
			this.setCharacterTriggerAction('up', rndBool)
		} else if (rndInt === 2) {
			this.setCharacterTriggerAction('run', rndBool)
		} else if (rndInt === 3) {
			this.setCharacterTriggerAction('jump', rndBool)
		}
	}

	public setCharacterTriggerAction(action: string, isPressed: boolean) {
		super.setCharacterTriggerAction(action, isPressed)
		this.character.triggerAction(action, isPressed)
	}
}

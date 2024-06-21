import * as THREE from 'three';
import { Character } from './Character';

class BaseAI {
	public character: Character | undefined = undefined

	constructor() {
		this.update = this.update.bind(this);
		this.updateCharacter = this.updateCharacter.bind(this);
	}

	public update(timeStep: number) {
		if (this.character === undefined) {
			console.error('Character is undefined.');
		}
	}

	public updateCharacter(timeStep: number) {
		// if (this.character != undefined) this.character.charState.update(timeStep);
	}
}

class Default extends BaseAI {

	constructor() {
		super();
		this.update = this.update.bind(this);
	}

	update(timeStep: number) {
		super.update(timeStep);
		this.updateCharacter(timeStep);
	}
}

class FollowCharacter extends BaseAI {

	public targetCharacter: Character
	public stopDistance: number

	constructor(targetCharacter: Character, stopDistance = 1.3) {
		super();
		this.update = this.update.bind(this);

		this.targetCharacter = targetCharacter;
		this.stopDistance = stopDistance;
	}

	public update(timeStep: number) {
		super.update(timeStep);

		if (this.character != undefined) {
			let viewVector = new THREE.Vector3().subVectors(this.targetCharacter.position, this.character.position);
			this.character.setViewVector(viewVector);

			// Follow character
			if (viewVector.length() > this.stopDistance) {
				this.character.setControl('up', true);
			}
			//Stand still
			else {
				this.character.setControl('up', false);

				// Look at character
				this.character.setOrientationTarget(viewVector);
			}

			this.updateCharacter(timeStep);
		}
	}
}

class Random extends BaseAI {
	public randomFrequency: number
	constructor(randomFrequency = 100) {
		super();
		this.update = this.update.bind(this);
		this.randomFrequency = randomFrequency;
	}

	update(timeStep: number) {
		super.update(timeStep);
		if (this.character != undefined) {
			let rndInt = Math.floor(Math.random() * this.randomFrequency);
			let rndBool = Math.random() > 0.5 ? true : false;
			if (rndInt == 0) {
				this.character.setViewVector(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5));

				this.character.setControl('up', true);
				this.character.charState.update(timeStep);
				this.character.setControl('up', false);
			} else if (rndInt == 1) {
				this.character.setControl('up', rndBool);
			} else if (rndInt == 2) {
				this.character.setControl('run', rndBool);
			} else if (rndInt == 3) {
				this.character.setControl('jump', rndBool);
			}
			this.updateCharacter(timeStep);
		}
	}
}

export let CharacterAI = {
	Default: Default,
	FollowCharacter: FollowCharacter,
	Random: Random
};
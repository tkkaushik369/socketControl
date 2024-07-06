import * as THREE from 'three';
import Character from './Character';

/**
 * Character AI classes are high-level controllers for characters.
 * They should only interact with characters just as a real person
 * would press keys on a keyboard and move the mouse while controlling
 * the character via the CharacterControls game mode. Consequently,
 * they shouldn't call any functions that aren't accessible to a
 * real person while playing the CharacterControls game mode.
 * 
 * It's the AI's responsibility to call for an update of the character's state.
 */

class BaseAI {
	public character: Character | undefined = undefined
	update(timeStep: number) {
		if (this.character === undefined) {
			console.error('Character is undefined.');
		}
	}

	updateCharacter(timeStep: number) {
		if (this.character != undefined) this.character.charState.update(timeStep);
	}
}

class Default extends BaseAI {
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
		this.targetCharacter = targetCharacter;
		this.stopDistance = stopDistance;
	}

	update(timeStep: number) {
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
			}
			else if (rndInt == 1) {
				this.character.setControl('up', rndBool);
			}
			else if (rndInt == 2) {
				this.character.setControl('run', rndBool);
			}
			else if (rndInt == 3) {
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
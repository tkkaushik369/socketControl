import { CharacterStateBase } from './_CharacterStateLibrary'
import { ICharacterState } from '../../Interfaces/ICharacterState'
import { Character } from '../Character'

export class Falling extends CharacterStateBase implements ICharacterState {
	state = 'Falling'

	constructor(character: Character) {
		super(character)
		// bind functions
		this.update = this.update.bind(this)

		// init
		this.character.velocitySimulator.mass = 100
		this.character.rotationSimulator.damping = 0.3

		this.character.arcadeVelocityIsAdditive = true
		this.character.setArcadeVelocityInfluence(0.05, 0, 0.05)

		this.playAnimation('falling', 0.3)
	}

	public async update(timeStep: number): Promise<void> {
		await super.update(timeStep)

		this.character.setCameraRelativeOrientationTarget()
		this.character.setArcadeVelocityTarget(this.anyDirection() ? 0.8 : 0)

		if (this.character.rayHasHit) {
			this.setAppropriateDropState()
		}
	}
}

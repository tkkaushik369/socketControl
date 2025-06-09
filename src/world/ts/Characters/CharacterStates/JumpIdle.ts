import { CharacterStateBase, Falling } from './_CharacterStateLibrary'
import { ICharacterState } from '../../Interfaces/ICharacterState'
import { Character } from '../Character'

export class JumpIdle extends CharacterStateBase implements ICharacterState {
	state = 'JumpIdle'
	private alreadyJumped: boolean

	constructor(character: Character) {
		super(character)
		// bind function
		this.update = this.update.bind(this)

		// init
		this.character.velocitySimulator.mass = 50

		this.character.setArcadeVelocityTarget(0)
		this.playAnimation('jump_idle', 0.1)
		this.alreadyJumped = false
	}

	public async update(timeStep: number): Promise<void> {
		await super.update(timeStep)

		// Move in air
		if (this.alreadyJumped) {
			this.character.setCameraRelativeOrientationTarget()
			this.character.setArcadeVelocityTarget(this.anyDirection() ? 0.8 : 0)
		}

		// Physically jump
		if (this.timer > 0.2 && !this.alreadyJumped) {
			this.character.jump()
			this.alreadyJumped = true

			this.character.velocitySimulator.mass = 100
			this.character.rotationSimulator.damping = 0.3

			if (this.character.rayResult.body !== null && this.character.rayResult.body.velocity.length() > 0) {
				this.character.setArcadeVelocityInfluence(0, 0, 0)
			} else {
				this.character.setArcadeVelocityInfluence(0.3, 0, 0.3)
			}
		} else if (this.timer > 0.3 && this.character.rayHasHit) {
			this.setAppropriateDropState()
		} else if (this.animationEnded(timeStep)) {
			this.character.setState(new Falling(this.character))
		}
	}
}

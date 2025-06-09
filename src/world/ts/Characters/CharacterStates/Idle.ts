import { CharacterStateBase, JumpIdle, Walk } from './_CharacterStateLibrary'
import { ICharacterState } from '../../Interfaces/ICharacterState'
import { Character } from '../Character'

export class Idle extends CharacterStateBase implements ICharacterState {
	state = 'Idle'

	constructor(character: Character) {
		super(character)
		// bind functions
		this.update = this.update.bind(this)
		this.onInputChange = this.onInputChange.bind(this)

		// init
		this.character.velocitySimulator.damping = 0.6
		this.character.velocitySimulator.mass = 10

		this.character.setArcadeVelocityTarget(0)
		this.playAnimation('idle', 0.1)
	}

	public async update(timeStep: number): Promise<void> {
		await super.update(timeStep)

		this.fallInAir()
	}
	public onInputChange(): void {
		super.onInputChange()

		if (this.character.actions.jump.justPressed) {
			this.character.setState(new JumpIdle(this.character))
		}

		if (this.anyDirection()) {
			if (this.character.velocity.length() > 0.5) {
				this.character.setState(new Walk(this.character))
			} else {
				this.setAppropriateStartWalkState()
			}
		}
	}
}

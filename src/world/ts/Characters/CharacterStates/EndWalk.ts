import { CharacterStateBase, Idle, JumpIdle, Sprint, Walk } from './_CharacterStateLibrary'
import { ICharacterState } from '../../Interfaces/ICharacterState'
import { Character } from '../Character'

export class EndWalk extends CharacterStateBase implements ICharacterState {
	state = 'EndWalk'

	constructor(character: Character) {
		super(character)
		// bind function
		this.update = this.update.bind(this)
		this.onInputChange = this.onInputChange.bind(this)

		// init
		this.character.setArcadeVelocityTarget(0)
		this.playAnimation('stop', 0.1)
	}

	public async update(timeStep: number): Promise<void> {
		await super.update(timeStep)

		if (this.animationEnded(timeStep)) {
			this.character.setState(new Idle(this.character))
		}

		this.fallInAir()
	}

	public onInputChange(): void {
		super.onInputChange()

		if (this.character.actions.jump.justPressed) {
			this.character.setState(new JumpIdle(this.character))
		}

		if (this.anyDirection()) {
			if (this.character.actions.run.isPressed) {
				this.character.setState(new Sprint(this.character))
			} else {
				if (this.character.velocity.length() > 0.5) {
					this.character.setState(new Walk(this.character))
				} else {
					this.setAppropriateStartWalkState()
				}
			}
		}
	}
}

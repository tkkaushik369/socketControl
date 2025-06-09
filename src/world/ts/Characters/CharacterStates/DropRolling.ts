import { CharacterStateBase, EndWalk, Walk } from './_CharacterStateLibrary'
import { ICharacterState } from '../../Interfaces/ICharacterState'
import { Character } from '../Character'

export class DropRolling extends CharacterStateBase implements ICharacterState {
	state = 'DropRolling'

	constructor(character: Character) {
		super(character)
		// bind function
		this.update = this.update.bind(this)

		// init
		this.character.velocitySimulator.mass = 1
		this.character.velocitySimulator.damping = 0.6

		this.character.setArcadeVelocityTarget(0.8)
		this.playAnimation('drop_running_roll', 0.03)
	}

	public async update(timeStep: number): Promise<void> {
		await super.update(timeStep)

		this.character.setCameraRelativeOrientationTarget()

		if (this.animationEnded(timeStep)) {
			if (this.anyDirection()) {
				this.character.setState(new Walk(this.character))
			} else {
				this.character.setState(new EndWalk(this.character))
			}
		}
	}
}

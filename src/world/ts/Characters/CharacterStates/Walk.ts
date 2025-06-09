import { CharacterStateBase, EndWalk, Idle, JumpRunning, Sprint } from './_CharacterStateLibrary'
import { Character } from '../Character'

export class Walk extends CharacterStateBase {
	state = 'Walk'

	constructor(character: Character) {
		super(character)
		// bind functions
		this.update = this.update.bind(this)
		this.onInputChange = this.onInputChange.bind(this)

		// init
		this.canEnterVehicles = true
		this.character.setArcadeVelocityTarget(0.8)
		this.playAnimation('run', 0.1)
	}

	public async update(timeStep: number): Promise<void> {
		await super.update(timeStep)

		this.character.setCameraRelativeOrientationTarget()

		this.fallInAir()
	}

	public onInputChange(): void {
		super.onInputChange()

		if (this.noDirection()) {
			this.character.setState(new EndWalk(this.character))
		}

		if (this.character.actions.run.isPressed) {
			this.character.setState(new Sprint(this.character))
		}

		if (this.character.actions.run.justPressed) {
			this.character.setState(new Sprint(this.character))
		}

		if (this.character.actions.jump.justPressed) {
			this.character.setState(new JumpRunning(this.character))
		}

		if (this.noDirection()) {
			if (this.character.velocity.length() > 1) {
				this.character.setState(new EndWalk(this.character))
			} else {
				this.character.setState(new Idle(this.character))
			}
		}
	}
}

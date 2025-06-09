import { Utility } from '../../Core/Utility'
import {
	CharacterStateBase,
	Idle,
	IdleRotateLeft,
	IdleRotateRight,
	JumpRunning,
	Sprint,
	Walk,
} from './_CharacterStateLibrary'
import { Character } from '../Character'

export class StartWalkBase extends CharacterStateBase {
	state = 'StartWalkBase'

	constructor(character: Character) {
		super(character)
		// bind function
		this.update = this.update.bind(this)
		this.onInputChange = this.onInputChange.bind(this)

		// init
		this.canEnterVehicles = true
		this.character.rotationSimulator.mass = 20
		this.character.rotationSimulator.damping = 0.7

		this.character.setArcadeVelocityTarget(0.8)
	}

	public async update(timeStep: number): Promise<void> {
		await super.update(timeStep)

		if (this.animationEnded(timeStep)) {
			this.character.setState(new Walk(this.character))
		}

		this.character.setCameraRelativeOrientationTarget()
		this.fallInAir()
	}

	public onInputChange(): void {
		super.onInputChange()

		if (this.character.actions.jump.justPressed) {
			this.character.setState(new JumpRunning(this.character))
		}

		if (this.noDirection()) {
			if (this.timer < 0.1) {
				let angle = Utility.getSignedAngleBetweenVectors(
					this.character.orientation,
					this.character.orientationTarget
				)

				if (angle > Math.PI * 0.4) {
					this.character.setState(new IdleRotateLeft(this.character))
				} else if (angle < -Math.PI * 0.4) {
					this.character.setState(new IdleRotateRight(this.character))
				} else {
					this.character.setState(new Idle(this.character))
				}
			} else {
				this.character.setState(new Idle(this.character))
			}
		}

		if (this.character.actions.run.justPressed) {
			this.character.setState(new Sprint(this.character))
		}
	}
}

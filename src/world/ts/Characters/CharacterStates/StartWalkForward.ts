import { StartWalkBase } from './_CharacterStateLibrary'
import { Character } from '../Character'

export class StartWalkForward extends StartWalkBase {
	state = 'StartWalkForward'

	constructor(character: Character) {
		super(character)
		this.playAnimation('start_forward', 0.1)
	}
}

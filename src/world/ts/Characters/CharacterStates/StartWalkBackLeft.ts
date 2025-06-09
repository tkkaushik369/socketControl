import { StartWalkBase } from './_CharacterStateLibrary'
import { Character } from '../Character'

export class StartWalkBackLeft extends StartWalkBase {
	state = 'StartWalkBackLeft'

	constructor(character: Character) {
		super(character)
		this.playAnimation('start_back_left', 0.1)
	}
}

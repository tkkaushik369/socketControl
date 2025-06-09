import { StartWalkBase } from './_CharacterStateLibrary'
import { Character } from '../Character'

export class StartWalkBackRight extends StartWalkBase {
	state = 'StartWalkBackRight'

	constructor(character: Character) {
		super(character)
		this.playAnimation('start_back_right', 0.1)
	}
}

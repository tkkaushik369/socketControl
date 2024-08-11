import { StartWalkBase } from './_CharacterStateLibrary'
import { Character } from '../Character'

export class StartWalkLeft extends StartWalkBase {
	constructor(character: Character) {
		super(character)
		this.playAnimation('start_left', 0.1)
	}
}
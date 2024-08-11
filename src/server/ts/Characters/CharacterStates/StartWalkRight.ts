import { StartWalkBase } from './_CharacterStateLibrary'
import { Character } from '../Character'

export class StartWalkRight extends StartWalkBase {
	constructor(character: Character) {
		super(character)
		this.playAnimation('start_right', 0.1)
	}
}
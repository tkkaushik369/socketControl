import { Character } from '../Characters/Character'
import { CharacterAIBase } from '../Characters/CharacterAI/CharacterAIBase'

export interface ICharacterAI extends CharacterAIBase {
	character: Character
	update(timeStep: number): void
}

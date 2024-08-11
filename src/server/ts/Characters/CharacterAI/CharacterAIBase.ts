export abstract class CharacterAIBase {
	currentCharacterControl: { action: string, isPressed: boolean }
	currentVehicalControl: { action: string, isPressed: boolean }

	constructor() {
		this.currentCharacterControl = { action: "up", isPressed: true }
		this.currentVehicalControl = { action: "throttle", isPressed: true }
	}

	public setCharacterTriggerAction(action: string, isPressed: boolean) {
		this.currentCharacterControl = { action: action, isPressed: isPressed }
	}

	public setVehicalTriggerAction(action: string, isPressed: boolean) {
		this.currentVehicalControl = { action: action, isPressed: isPressed }
	}
}
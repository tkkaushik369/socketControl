export abstract class CharacterAIBase {
	state = 'CharacterAIBase'
	currentCharacterControl: { action: string; isPressed: boolean }
	currentVehicleControl: { action: string; isPressed: boolean }

	constructor() {
		this.currentCharacterControl = { action: 'up', isPressed: true }
		this.currentVehicleControl = { action: 'throttle', isPressed: true }
	}

	public setCharacterTriggerAction(action: string, isPressed: boolean) {
		this.currentCharacterControl = { action: action, isPressed: isPressed }
	}

	public setVehicleTriggerAction(action: string, isPressed: boolean) {
		this.currentVehicleControl = { action: action, isPressed: isPressed }
	}
}

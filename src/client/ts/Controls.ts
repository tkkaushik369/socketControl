export class EventControl {

	public value: boolean
	public justPressed: boolean
	public justReleased: boolean

	constructor() {
		this.value = false;
		this.justPressed = false;
		this.justReleased = false;
	}
}

export class LerpControl {

	public value: boolean
	public floatValue: number

	constructor() {
		this.value = false;
		this.floatValue = 0;
	}
}
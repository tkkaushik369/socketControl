import WorldClient from "./WorldClient"

export class InputManager {

	public worldClient: WorldClient
	public domElement: HTMLElement
	public pointerLock: boolean
	public isLocked: boolean

	public boundOnMouseDown: any
	public boundOnMouseMove: any
	public boundOnMouseUp: any
	public boundOnMouseWheelMove: any

	public boundOnPointerlockChange: any
	public boundOnPointerlockError: any

	public boundOnKeyDown: any
	public boundOnKeyUp: any

	constructor(worldClient: WorldClient, domElement: HTMLElement) {
		this.worldClient = worldClient
		this.domElement = domElement
		this.pointerLock = this.worldClient.settings.PointerLock
		this.isLocked = false;

		// Bindings for later event use
		// Mouse
		this.boundOnMouseDown = (evt: MouseEvent) => this.onMouseDown(evt);
		this.boundOnMouseMove = (evt: MouseEvent) => this.onMouseMove(evt);
		this.boundOnMouseUp = (evt: MouseEvent) => this.onMouseUp(evt);
		this.boundOnMouseWheelMove = (evt: WheelEvent) => this.onMouseWheelMove(evt);

		// Pointer lock
		this.boundOnPointerlockChange = (evt: MouseEvent) => this.onPointerlockChange(evt);
		this.boundOnPointerlockError = (evt: MouseEvent) => this.onPointerlockError(evt);

		// Keys
		this.boundOnKeyDown = (evt: KeyboardEvent) => this.onKeyDown(evt);
		this.boundOnKeyUp = (evt: KeyboardEvent) => this.onKeyUp(evt);

		// Init event listeners
		// Mouse
		this.domElement.addEventListener("mousedown", this.boundOnMouseDown, false);
		document.addEventListener("wheel", this.boundOnMouseWheelMove, false);
		document.addEventListener("pointerlockchange", this.boundOnPointerlockChange, false);
		document.addEventListener("pointerlockerror", this.boundOnPointerlockError, false);

		// Keys
		document.addEventListener("keydown", this.boundOnKeyDown, false);
		document.addEventListener("keyup", this.boundOnKeyUp, false);
	}

	public setPointerLock(enabled: boolean) {
		this.pointerLock = enabled;
	}

	public onPointerlockChange(event: MouseEvent) {
		if (document.pointerLockElement === this.domElement) {
			this.domElement.addEventListener("mousemove", this.boundOnMouseMove, false);
			this.domElement.addEventListener("mouseup", this.boundOnMouseUp, false);
			this.isLocked = true;
		}
		else {
			this.domElement.removeEventListener("mousemove", this.boundOnMouseMove, false);
			this.domElement.removeEventListener("mouseup", this.boundOnMouseUp, false);
			this.isLocked = false;
		}
	}

	private onPointerlockError(event: MouseEvent) {
		console.error("PointerLockControls: Unable to use Pointer Lock API");
	}

	private onMouseDown(event: MouseEvent) {
		if (this.pointerLock) {
			this.domElement.requestPointerLock();
		}
		else {
			this.domElement.addEventListener("mousemove", this.boundOnMouseMove, false);
			this.domElement.addEventListener("mouseup", this.boundOnMouseUp, false);
		}

		if (this.worldClient.gameMode !== undefined) {
			this.worldClient.gameMode.handleAction(event, 'mouse' + event.button, true);
		}
	}

	public onMouseMove(event: MouseEvent) {
		if (this.worldClient.gameMode !== undefined) {
			this.worldClient.gameMode.handleMouseMove(event, event.movementX, event.movementY);
		}
	}

	public onMouseUp(event: MouseEvent) {
		if (!this.pointerLock) {
			this.domElement.removeEventListener("mousemove", this.boundOnMouseMove, false);
			this.domElement.removeEventListener("mouseup", this.boundOnMouseUp, false);
		}

		if (this.worldClient.gameMode !== undefined) {
			this.worldClient.gameMode.handleAction(event, 'mouse' + event.button, false);
		}
	}

	public onKeyDown(event: KeyboardEvent) {
		if (this.worldClient.gameMode !== undefined) {
			this.worldClient.gameMode.handleAction(event, event.key, true);
		}
	}

	public onKeyUp(event: KeyboardEvent) {
		if (this.worldClient.gameMode !== undefined) {
			this.worldClient.gameMode.handleAction(event, event.key, false);
		}
	}

	public onMouseWheelMove(event: WheelEvent) {
		if (this.worldClient.gameMode !== undefined) {
			this.worldClient.gameMode.handleScroll(event, event.deltaY);
		}
	}
}
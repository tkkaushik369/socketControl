import { WorldBase } from "../World/WorldBase"
import { IUpdatable } from "../Interfaces/IUpdatable"
import { IInputReceiver } from "../Interfaces/IInputReceiver"
import { ControlsTypes } from "../Enums/ControlsTypes"
import { Player } from "./Player"

export class InputManager implements IUpdatable {
	updateOrder: number = 3

	public player: Player
	public world: WorldBase
	public domElement: HTMLElement | null
	public pointerLock: boolean
	public isLocked: boolean
	public inputReceiver: IInputReceiver | null

	public boundOnMouseDown: (evt: any) => void
	public boundOnMouseMove: (evt: any) => void
	public boundOnMouseUp: (evt: any) => void
	public boundOnMouseWheelMove: (evt: any) => void
	public boundOnPointerlockChange: (evt: any) => void
	public boundOnPointerlockError: (evt: any) => void
	public boundOnKeyDown: (evt: any) => void
	public boundOnKeyUp: (evt: any) => void

	// callback Controls
	public controlsCallBack: Function | null

	constructor(player: Player, world: WorldBase, domElement: HTMLElement | null) {
		// bind functions
		this.update = this.update.bind(this)
		this.setInputReceiver = this.setInputReceiver.bind(this)
		this.setPointerLock = this.setPointerLock.bind(this)
		this.onPointerlockChange = this.onPointerlockChange.bind(this)
		this.onPointerlockError = this.onPointerlockError.bind(this)
		this.onMouseDown = this.onMouseDown.bind(this)
		this.onMouseMove = this.onMouseMove.bind(this)
		this.onMouseUp = this.onMouseUp.bind(this)
		this.onKeyDown = this.onKeyDown.bind(this)
		this.onKeyUp = this.onKeyUp.bind(this)
		this.onMouseWheelMove = this.onMouseWheelMove.bind(this)
		this.setControls = this.setControls.bind(this)

		// bind functions controls
		this.setMouseButton = this.setMouseButton.bind(this)
		this.setMouseMove = this.setMouseMove.bind(this)
		this.setMouseWheel = this.setMouseWheel.bind(this)
		this.setKeyboard = this.setKeyboard.bind(this)

		// init
		this.player = player
		this.world = world
		this.domElement = domElement
		this.pointerLock = this.world.settings.Pointer_Lock
		this.isLocked = false
		this.inputReceiver = null
		this.controlsCallBack = null

		// Bindings for later event use
		// Mouse
		this.boundOnMouseDown = (evt) => this.onMouseDown(evt)
		this.boundOnMouseMove = (evt) => this.onMouseMove(evt)
		this.boundOnMouseUp = (evt) => this.onMouseUp(evt)
		this.boundOnMouseWheelMove = (evt) => this.onMouseWheelMove(evt)

		// Pointer lock
		this.boundOnPointerlockChange = (evt) => this.onPointerlockChange(evt)
		this.boundOnPointerlockError = (evt) => this.onPointerlockError(evt)

		// Keys
		this.boundOnKeyDown = (evt) => this.onKeyDown(evt)
		this.boundOnKeyUp = (evt) => this.onKeyUp(evt)

		if (this.domElement !== null) {
			// Init event listeners
			// Mouse
			this.domElement.addEventListener('mousedown', this.boundOnMouseDown, false)
			document.addEventListener('wheel', this.boundOnMouseWheelMove, false)
			document.addEventListener('pointerlockchange', this.boundOnPointerlockChange, false)
			document.addEventListener('pointerlockerror', this.boundOnPointerlockError, false)

			// Keys
			document.addEventListener('keydown', this.boundOnKeyDown, false)
			document.addEventListener('keyup', this.boundOnKeyUp, false)
		}

		world.registerUpdatable(this)
	}

	public update(timestep: number, unscaledTimeStep: number): void {
		if (this.inputReceiver !== null)
			this.inputReceiver.inputReceiverUpdate(unscaledTimeStep)
		else
			this.setInputReceiver(this.player.cameraOperator)
	}

	public setInputReceiver(receiver: IInputReceiver): void {
		this.inputReceiver = receiver
		this.inputReceiver.inputReceiverInit()
	}

	public setPointerLock(enabled: boolean): void {
		this.pointerLock = enabled
	}

	public onPointerlockChange(event: MouseEvent): void {
		if (this.domElement === null) return
		if (document.pointerLockElement === this.domElement) {
			this.domElement.addEventListener('mousemove', this.boundOnMouseMove, false)
			this.domElement.addEventListener('mouseup', this.boundOnMouseUp, false)
			this.isLocked = true
		}
		else {
			this.domElement.removeEventListener('mousemove', this.boundOnMouseMove, false)
			this.domElement.removeEventListener('mouseup', this.boundOnMouseUp, false)
			this.isLocked = false
		}
	}

	public onPointerlockError(event: MouseEvent): void {
		console.error('PointerLockControls: Unable to use Pointer Lock API')
	}

	public onMouseDown(event: MouseEvent): void {
		if (this.domElement === null) return
		if (this.pointerLock) {
			this.domElement.requestPointerLock()
		}
		else {
			this.domElement.addEventListener('mousemove', this.boundOnMouseMove, false)
			this.domElement.addEventListener('mouseup', this.boundOnMouseUp, false)
		}

		this.setMouseButton('mouse' + event.button, true, true)
	}

	public onMouseMove(event: MouseEvent): void {
		this.setMouseMove(event.movementX, event.movementY, true)
	}

	public onMouseUp(event: MouseEvent): void {
		if (this.domElement === null) return
		if (!this.pointerLock) {
			this.domElement.removeEventListener('mousemove', this.boundOnMouseMove, false)
			this.domElement.removeEventListener('mouseup', this.boundOnMouseUp, false)
		}

		this.setMouseButton('mouse' + event.button, false, true)
	}

	public onKeyDown(event: KeyboardEvent): void {
		this.setKeyboard(event.code, event.shiftKey, true, true)
	}

	public onKeyUp(event: KeyboardEvent): void {
		this.setKeyboard(event.code, event.shiftKey, false, true)
	}

	public onMouseWheelMove(event: WheelEvent): void {
		this.setMouseWheel(event.deltaY, true)
	}

	public setControls(controls: { type: ControlsTypes, data: { [id: string]: any } }) {
		switch (controls.type) {
			case ControlsTypes.MouseButton:
				this.setMouseButton(controls.data.code, controls.data.pressed, false)
				break
			case ControlsTypes.MouseMove:
				this.setMouseMove(controls.data.deltaX, controls.data.deltaY, false)
				break
			case ControlsTypes.MouseWheel:
				this.setMouseWheel(controls.data.value, false)
				break
			case ControlsTypes.Keyboard:
				this.setKeyboard(controls.data.code, controls.data.isShift, controls.data.pressed, false)
				break
		}
	}

	// controls
	public setMouseButton(code: string, pressed: boolean, isCallback: boolean) {
		if (isCallback) {
			if (this.controlsCallBack !== null) {
				this.controlsCallBack({
					type: ControlsTypes.MouseButton,
					data: {
						code: code,
						pressed: pressed,
					}
				})
			}
		} else if (this.inputReceiver !== null) {
			this.inputReceiver.handleMouseButton(code, pressed)
		}
	}

	public setMouseMove(deltaX: number, deltaY: number, isCallback: boolean) {
		if (isCallback) {
			if (this.controlsCallBack !== null) {
				this.controlsCallBack({
					type: ControlsTypes.MouseMove,
					data: {
						deltaX: deltaX,
						deltaY: deltaY,
					}
				})
			}
		} else if (this.inputReceiver !== null) {
			this.inputReceiver.handleMouseMove(deltaX, deltaY)
		}
	}

	public setMouseWheel(value: number, isCallback: boolean) {
		if (isCallback) {
			if (this.controlsCallBack !== null) {
				this.controlsCallBack({
					type: ControlsTypes.MouseWheel,
					data: {
						value: value,
					}
				})
			}
		} else if (this.inputReceiver !== null) {
			this.inputReceiver.handleMouseWheel(value)
		}
	}

	public setKeyboard(code: string, isShift: boolean, pressed: boolean, isCallback: boolean) {
		if (isCallback) {
			if (this.controlsCallBack !== null) {
				this.controlsCallBack({
					type: ControlsTypes.Keyboard,
					data: {
						code: code,
						isShift: isShift,
						pressed: pressed,
					}
				})
			}
		} else if (this.inputReceiver !== null) {
			this.inputReceiver.handleKeyboardEvent(code, isShift, pressed)
		}
	}

}
import { KeyBinding } from '../Core/KeyBinding'

export interface IInputReceiver {
	actions: { [action: string]: KeyBinding }

	handleKeyboardEvent(code: string, isShift: boolean, pressed: boolean): void
	handleMouseButton(code: string, pressed: boolean): void
	handleMouseMove(deltaX: number, deltaY: number): void
	handleMouseWheel(value: number): void

	inputReceiverInit(): void
	inputReceiverUpdate(timeStep: number): void
}

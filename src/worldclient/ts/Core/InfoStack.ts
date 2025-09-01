import { InfoStackMessage } from './InfoStackMessage'
import { IWorldEntity, EntityType, WorldBase } from '@World'

export class InfoStack implements IWorldEntity {
	public updateOrder: number = 3
	public entityType: EntityType = EntityType.System

	public messages: InfoStackMessage[] = []
	public entranceAnimation: string = 'animate__slideInLeft'
	public exitAnimation: string = 'animate__backOutDown'

	public messageDuration: number = 3

	public addMessage(text: string): void {
		if(document === undefined) return
		let messageElement = document.createElement('div')
		messageElement.classList.add('console-message', 'animate__animated', this.entranceAnimation)
		messageElement.style.setProperty('--animate-duration', '0.3s')
		let textElement = document.createTextNode(text)
		messageElement.appendChild(textElement)
		const console_ele = document.getElementById('console')
		if (console_ele !== null) console_ele.prepend(messageElement)
		this.messages.push(new InfoStackMessage(this, messageElement))
	}

	public update(timeStep: number): void {
		for (const message of this.messages) {
			message.update(timeStep)
		}
	}

	public addToWorld(world: WorldBase): void {}

	public removeFromWorld(world: WorldBase): void {}
}

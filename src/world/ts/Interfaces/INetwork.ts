import { MessageTypes } from '../Enums/MessageTypes'

export interface INetwork {
	uID: string | null
	msgType: MessageTypes
	timeStamp: number
	ping: number
	Out(): { [id: string]: any }
	Set(messages: any): void
}

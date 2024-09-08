import { MessageTypes } from "../Enums/MessagesTypes";

export interface INetwork {
	uID: string | null
	msgType: MessageTypes
	timeStamp: number
	ping: number
	Out(): { [id: string]: any }
}
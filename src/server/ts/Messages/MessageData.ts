import { messageTypes } from "../Enums/messageTypes"

/* export type MessageData = {
	count: number,
	currentScenarioIndex: number,
} */

export type Message = {
	id: string,
	userName: string | null,
	type: messageTypes,
	data: any
	timeStamp: number,
	ping: number,
}
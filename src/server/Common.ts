import { Communication, DataSender } from "./ts/Enums/Communication"


export var Common: {
	conn: Communication,
	sender: DataSender,
} = {
	conn: Communication.WebSocket,
	sender: DataSender.SocketLoop
}
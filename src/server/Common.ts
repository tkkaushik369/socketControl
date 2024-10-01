import { Communication, DataSender, Packager } from "./ts/Enums/Communication"


export var Common: {
	conn: Communication,
	sender: DataSender,
	packager: Packager,
} = {
	conn: Communication.WebSocket,
	sender: DataSender.SocketLoop,
	packager: Packager.MsgPacker,
}
import { Communication, DataSender, Packager, WorldCreation } from "./ts/Enums/Communication"


export var Common: {
	conn: Communication,
	sender: DataSender,
	packager: Packager,
	eachNewWorld: WorldCreation
} = {
	conn: Communication.WebSocket,
	sender: DataSender.SocketLoop,	// only websocket
	packager: Packager.MsgPacker,	// only websocket
	eachNewWorld: WorldCreation.AtleaseOne
}
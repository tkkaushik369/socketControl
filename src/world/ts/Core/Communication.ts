import { Communication, DataSender, Packager, WorldCreation } from '../Enums/Communication'

export var Common: {
	conn: Communication
	sender: DataSender
	packager: Packager
	eachNewWorld: WorldCreation
} = {
	conn: Communication.WebSocket,
	sender: DataSender.SocketLoop, // only websocket
	packager: Packager.JSON, // only websocket
	eachNewWorld: WorldCreation.OneForEach,
}

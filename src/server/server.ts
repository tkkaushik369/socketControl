// When starting this project by using `npm run dev`, this server script
// will be compiled using tsc and will be running concurrently along side webpack-dev-server
// visit http://127.0.0.1:8080

// In the production environment we don't use the webpack-dev-server, so instead type,
// `npm run build`        (this creates the production version of bundle.js and places it in ./dist/client/)
// `tsc -p ./src/server`  (this compiles ./src/server/server.ts into ./dist/server/server.js)
// `npm start            (this starts nodejs with express and serves the ./dist/client folder)
// visit http://127.0.0.1:3000

import express from 'express'
import path from 'path'
import http from 'http'
import { Server, Socket } from 'socket.io'
import parser from 'socket.io-msgpack-parser'
import { Utility } from './ts/Core/Utility'
import { Player, PlayerSetMesssage } from './ts/Core/Player'
import { WorldServer } from './ts/World/WorldServer'
import { ControlsTypes } from './ts/Enums/ControlsTypes'
import { MessageTypes } from './ts/Enums/MessagesTypes'

const port: number = Number(process.env.PORT) || 3000;
const privateHost: boolean = false

class AppServer {
	private server: http.Server
	private port: number
	private io: Server

	private allUsers: { [id: string]: Player }
	private allWorlds: { [id: string]: WorldServer }
	private uid: number = 1

	constructor(port: number) {
		// Bind Functions
		this.OnConnect = this.OnConnect.bind(this)
		this.OnDisConnect = this.OnDisConnect.bind(this)
		this.OnUpdate = this.OnUpdate.bind(this)
		this.OnControls = this.OnControls.bind(this)
		this.OnChange = this.OnChange.bind(this)
		this.OnMap = this.OnMap.bind(this)
		this.OnScenario = this.OnScenario.bind(this)
		this.ForSocketLoop = this.ForSocketLoop.bind(this)
		this.RemoveUnusedWorlds = this.RemoveUnusedWorlds.bind(this)
		this.Status = this.Status.bind(this)
		this.Start = this.Start.bind(this)

		// init
		this.port = port
		const app = express()
		app.use(express.static(path.join(__dirname, "../client")))

		this.server = new http.Server(app)
		this.io = new Server(this.server, { parser: parser })
		this.io.engine.on("connection", (rawSocket) => { rawSocket.request = null })

		this.allUsers = {}
		this.allWorlds = {}

		this.io.on("connection", (socket: Socket) => {
			this.OnConnect(socket)
			socket.on("disconnect", () => this.OnDisConnect(socket))
			socket.on("controls", (controls: { type: ControlsTypes, data: { [id: string]: any } }) => this.OnControls(socket, controls))
			socket.on("change", (worldId: string, callBack: Function) => this.OnChange(socket, worldId, callBack))
			socket.on("map", (mapName: string) => this.OnMap(socket, mapName))
			socket.on("scenario", (scenarioName: string) => this.OnScenario(socket, scenarioName))
			socket.on("update", (message: any, callBack: Function) => this.OnUpdate(socket, message, callBack))
		})
	}

	private OnConnect(socket: Socket) {
		console.log(`Client Connected: ${socket.id}`)
		
		const worldId = "World_" + socket.id
		socket.join(worldId)

		this.allWorlds[worldId] = new WorldServer(this.ForSocketLoop)
		this.allWorlds[worldId].launchMap(Object.keys(this.allWorlds[worldId].maps)[0], false, true)
		this.allWorlds[worldId].worldId = worldId

		this.allUsers[socket.id] = new Player(socket.id, this.allWorlds[worldId], Utility.defaultCamera(), null)
		this.allWorlds[worldId].users[socket.id] = this.allUsers[socket.id]

		if (this.allWorlds[worldId].runner === null)
			this.allWorlds[worldId].runner = setInterval(this.allWorlds[worldId].update, this.allWorlds[worldId].physicsFrameTime * 1000)

		const playerSetMessage: PlayerSetMesssage = {
			sID: socket.id,
			count: this.uid++,
			lastScenarioID: this.allWorlds[worldId].lastScenarioID,
			lastMapID: this.allWorlds[worldId].lastMapID,
			worldId: worldId,
		}

		socket.emit("setID", playerSetMessage, (userName: string) => {
			this.allUsers[socket.id].setUID(userName)
			this.allUsers[socket.id].addUser()
			console.log(`Player Created: ${socket.id} -> ${userName}`)

			this.Status()
		})
	}

	private OnDisConnect(socket: Socket) {
		const char = this.allUsers[socket.id].character

		const onFinish = () => {
			console.log(`Client disconnected: ${socket.id} <- ${this.allUsers[socket.id].uID}`)
			this.io.emit("removeClient", socket.id)
			this.allUsers[socket.id].removeUser()

			if (this.allUsers[socket.id].world.users[socket.id] !== undefined) {
				delete this.allUsers[socket.id].world.users[socket.id]
				// this.allUsers[socket.id].world.users[socket.id] = undefined
			}

			if (this.allUsers[socket.id] !== undefined) {
				delete this.allUsers[socket.id]
				// this.allUsers[socket.id] = undefined
			}

			this.Status()
		}
		if (this.allUsers[socket.id] !== undefined) {
			if (char !== null) {
				if (char.controlledObject !== null) {
					char.exitVehicle()
					let tiems = 300
					let myInterval = setInterval(() => {
						if (tiems-- <= 0) {
							clearInterval(myInterval)
							onFinish()
						}
					}, 15);
				} else onFinish()
			}
		}
	}

	private OnControls(socket: Socket, controls: { type: ControlsTypes, data: { [id: string]: any } }) {
		if (this.allUsers[socket.id] !== undefined) {
			this.allUsers[socket.id].inputManager.setControls(controls)
			controls['sID'] = socket.id;
			this.io.emit('controls', controls)
		}
	}

	private OnChange(socket: Socket, worldId: string, callBack: Function) {
		this.allUsers[socket.id].removeUser()
		if (this.allUsers[socket.id].world.users[socket.id] !== undefined) {
			delete this.allUsers[socket.id].world.users[socket.id]
			this.allUsers[socket.id].world.users[socket.id] = undefined
		}
		if (this.allWorlds[worldId].users[socket.id] !== undefined) {
			delete this.allWorlds[worldId].users[socket.id]
			this.allWorlds[worldId].users[socket.id] = undefined
		}
		socket.to(this.allUsers[socket.id].world.worldId).emit("removeClient", socket.id)
		socket.leave(this.allUsers[socket.id].world.worldId)
		socket.join(worldId)
		
		this.allUsers[socket.id].world = this.allWorlds[worldId]
		this.allUsers[socket.id].inputManager.world = this.allUsers[socket.id].world
		this.allUsers[socket.id].cameraOperator.world = this.allUsers[socket.id].world
		this.allWorlds[worldId].users[socket.id] = this.allUsers[socket.id]

		if (this.allWorlds[worldId].runner === null)
			this.allWorlds[worldId].runner = setInterval(this.allWorlds[worldId].update, this.allWorlds[worldId].physicsFrameTime * 1000)

		this.Status()
		
		for (let i = 0; i < this.allWorlds[worldId].scenarios.length; i++) {
			if (this.allWorlds[worldId].scenarios[i].name === this.allWorlds[worldId].lastScenarioID) {
				this.allUsers[socket.id].setSpawn(this.allWorlds[worldId].scenarios[i].playerPosition, false)
				break
			}
		}
		this.allUsers[socket.id].addUser()
		callBack(this.allUsers[socket.id].world.worldId, this.allUsers[socket.id].world.lastMapID, this.allUsers[socket.id].world.lastScenarioID)
	}

	private OnMap(socket: Socket, mapName: string) {
		console.log(`Map: ${mapName}`)
		this.allUsers[socket.id].world.launchMap(mapName, false, true)
		this.io.in(this.allUsers[socket.id].world.worldId).emit("map", mapName)
	}

	private OnScenario(socket: Socket, scenarioName: string) {
		console.log(`Scenario: ${scenarioName}`)
		this.allUsers[socket.id].world.launchScenario(scenarioName, false)
		this.io.in(this.allUsers[socket.id].world.worldId).emit("scenario", scenarioName)
	}

	private OnUpdate(socket: Socket, message: any, callBack: Function) {
		if (this.allUsers[socket.id] !== undefined) {
			this.allUsers[socket.id].timeStamp = message.timeStamp
			this.allUsers[socket.id].ping = message.ping
		}
		callBack()
	}

	private ForSocketLoop(worldId: string) {
		if (this.allWorlds[worldId] === undefined) return
		let data: { [id: string]: any } = {}

		// All World Id
		Object.keys(this.allWorlds).forEach((id) => {
			const users = []
			Object.keys(this.allWorlds[id].users).forEach((sID) => {
				if (this.allWorlds[id].users[sID] !== undefined) {
					users.push(this.allWorlds[id].users[sID].uID)
				}
			});
			data[id] = {
				uID: id,
				msgType: MessageTypes.World,
				users: users
			}
		})

		// All Player Data
		Object.keys(this.allUsers).forEach((id) => {
			if ((this.allUsers[id] !== undefined) && (this.allUsers[id].uID != null)) {
				this.allUsers[id].data.timeScaleTarget = this.allUsers[id].world.timeScaleTarget
				this.allUsers[id].data.sun.elevation = this.allUsers[id].world.sunConf.elevation
				this.allUsers[id].data.sun.azimuth = this.allUsers[id].world.sunConf.azimuth
				let dataClient = this.allUsers[id].Out()
				data[id] = dataClient
			}
		})

		// Chracter Data
		this.allWorlds[worldId].characters.forEach((char) => {
			char.ping = Date.now() - char.timeStamp
			char.timeStamp = Date.now()
			data[char.uID] = char.Out()
		})

		// Vehicle Data
		this.allWorlds[worldId].vehicles.forEach((vehi) => {
			vehi.ping = Date.now() - vehi.timeStamp
			vehi.timeStamp = Date.now()
			data[vehi.uID] = vehi.Out()
		})

		// WorldData
		this.allWorlds[worldId].waters.forEach((water) => {
			water.ping = Date.now() - water.timeStamp
			water.timeStamp = Date.now()
			data[water.uID] = water.Out()
		})

		this.io.in(worldId).emit("players", data)
	}

	private RemoveUnusedWorlds() {
		let toRemove: WorldServer[] = []
		Object.keys(this.allWorlds).forEach(worldId => {
			if (this.allWorlds[worldId] !== undefined) {
				let count = 0
				Object.keys(this.allWorlds[worldId].users).forEach((userid) => {
					if (this.allWorlds[worldId].users[userid] !== undefined) count++
				})
				if (count === 0) {
					toRemove.push(this.allWorlds[worldId])
				}
			}
		})

		while (toRemove.length) {
			delete this.allWorlds[toRemove.pop().worldId]
		}
	}

	private Status() {
		this.RemoveUnusedWorlds()
		console.log()
		console.log("-----------")
		console.log(`Users: ${Object.keys(this.allUsers).length}, Worlds: ${Object.keys(this.allWorlds).length}`)
		Object.keys(this.allWorlds).forEach(wid => {
			if (this.allWorlds[wid] !== undefined) {
				console.log(`\tWID: ${this.allWorlds[wid].worldId}, Users: ${Object.keys(this.allWorlds[wid].users).length}`)
				Object.keys(this.allWorlds[wid].users).forEach((sID) => {
					if (this.allWorlds[wid].users[sID] !== undefined) {
						console.log(`\t\t${sID}: ${this.allWorlds[wid].users[sID].uID}`)
					}
				})
			}
		})
	}

	public Start() {
		this.server.listen(this.port, privateHost ? "127.0.0.1" : "0.0.0.0", () => {
			console.log(`Server listening on port ${this.port}.`)
		})
	}

}

new AppServer(port).Start()
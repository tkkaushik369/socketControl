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
import * as _ from 'lodash'
import { MessageTypes } from './ts/Enums/MessagesTypes'

const port: number = Number(process.env.PORT) || 3000;
const privateHost: boolean = false

class AppServer {
	private server: http.Server
	private port: number
	private io: Server

	private allUsers: { [id: string]: Player }
	private allWorlds: WorldServer[]
	private uid: number = 1

	constructor(port: number) {
		// Bind Functions
		this.OnConnect = this.OnConnect.bind(this)
		this.OnDisConnect = this.OnDisConnect.bind(this)
		this.OnUpdate = this.OnUpdate.bind(this)
		this.OnControls = this.OnControls.bind(this)
		this.OnMap = this.OnMap.bind(this)
		this.OnScenario = this.OnScenario.bind(this)
		this.ForWorldSocketLoop = this.ForWorldSocketLoop.bind(this)
		this.RemoveUnUsedWorlds = this.RemoveUnUsedWorlds.bind(this)
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
		this.allWorlds = []

		this.io.on("connection", (socket: Socket) => {
			this.OnConnect(socket)
			socket.on("disconnect", () => this.OnDisConnect(socket))
			socket.on("controls", (controls: { type: ControlsTypes, data: { [id: string]: any } }) => this.OnControls(socket, controls))
			socket.on("map", (mapName: string) => this.OnMap(socket, mapName))
			socket.on("scenario", (scenarioName: string) => this.OnScenario(socket, scenarioName))
			socket.on("update", (message: any) => this.OnUpdate(socket, message))
		})
	}

	private OnConnect(socket: Socket) {
		console.log(`Client Connected: ${socket.id}`)
		const worldServer = new WorldServer(this.ForWorldSocketLoop)
		worldServer.worldId = "World_Player_" + socket.id
		worldServer.loopRunner = setInterval(worldServer.update, worldServer.physicsFrameTime * 1000)
		worldServer.launchMap(Object.keys(worldServer.maps)[0], false, true)
		this.allUsers[socket.id] = new Player(socket.id, worldServer, Utility.defaultCamera(), null)
		worldServer.users[socket.id] = this.allUsers[socket.id]
		this.allWorlds.push(worldServer)

		const playerSetMessage: PlayerSetMesssage = {
			sID: worldServer.users[socket.id].sID,
			count: this.uid++,
			lastScenarioID: worldServer.lastScenarioID,
			lastMapID: worldServer.lastMapID,
		}

		socket.emit("setID", playerSetMessage, (userName: string) => {
			worldServer.users[socket.id].setUID(userName)
			worldServer.users[socket.id].addUser()
			console.log(`Player Created: ${socket.id} -> ${userName}`)
		})

		this.Status()
	}

	private OnDisConnect(socket: Socket) {
		const user = this.allUsers[socket.id]
		const char = user.character
		const onFinish = () => {
			console.log(`Client disconnected: ${socket.id} <- ${user.uID}`)
			this.io.emit("removeClient", socket.id)
			user.removeUser()
			
			Object.keys(user.world.users).forEach((sID) => {
				user.world.users[sID].changeWorld(user.world.users[sID].origWorld)
				socket.emit('changeWorld', {
					lastMapID: user.world.users[sID].origWorld.lastMapID,
					lastScenarioID: user.world.users[sID].origWorld.lastScenarioID
				})
			})

			// _.pull(this.allWorlds, user.world)

			const userWorld = user.world.users[user.sID]
			if (userWorld !== undefined)
				delete user.world.users[user.sID]

			if (user !== undefined)
				delete this.allUsers[socket.id]
			this.RemoveUnUsedWorlds()
			this.Status()
		}
		if (user !== undefined) {
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
		const user = this.allUsers[socket.id]
		if (user !== undefined) {
			user.world.users[socket.id].inputManager.setControls(controls)
			controls['sID'] = socket.id;
			this.io.emit('controls', controls)
		}
	}

	private OnMap(socket: Socket, mapName: string) {
		const user = this.allUsers[socket.id]
		if (user !== undefined) {
			console.log(`Map: ${mapName}`)
			user.world.launchMap(mapName, false, true)
			this.io.emit("map", mapName)
		}
	}

	private OnScenario(socket: Socket, scenarioName: string) {
		const user = this.allUsers[socket.id]
		if (user !== undefined) {
			console.log(`Scenario: ${scenarioName}`)
			user.world.launchScenario(scenarioName, false)
			this.io.emit("scenario", scenarioName)
		}
	}

	private OnUpdate(socket: Socket, message: any) {
		const user = this.allUsers[socket.id]
		if (user !== undefined) {
			user.world.users[socket.id].timeStamp = message.timeStamp
			user.world.users[socket.id].ping = message.ping
		}
	}

	private ForWorldSocketLoop(worldId: string) {
		if ((worldId === undefined) || (worldId === null)) console.log("UnMarked: World")

		let currWorld: WorldServer | null = null
		for (let i = 0; i < this.allWorlds.length; i++) {
			if (this.allWorlds[i].worldId === worldId) {
				currWorld = this.allWorlds[i]
				break
			}
		}

		if (currWorld === null) return

		const isPlayer: Boolean = currWorld.worldId.toLowerCase().includes('player')
		let data: { [id: string]: any } = {}

		// Player Data
		Object.keys(this.allUsers).forEach((id) => {
			if ((this.allUsers[id] !== undefined) && (this.allUsers[id].uID != null)) {
				this.allUsers[id].timeStamp = Date.now()
				this.allUsers[id].data.timeScaleTarget = this.allUsers[id].world.timeScaleTarget
				this.allUsers[id].data.sun.elevation = this.allUsers[id].world.sunConf.elevation
				this.allUsers[id].data.sun.azimuth = this.allUsers[id].world.sunConf.azimuth
				let dataClient = this.allUsers[id].Out()
				if (!Object.keys(currWorld.users).includes(id))
					dataClient.msgType = MessageTypes.PlayerAll
				data[id] = dataClient
			}
		})

		// Chracter Data
		currWorld.characters.forEach((char) => {
			char.ping = Date.now() - char.timeStamp
			char.timeStamp = Date.now()
			data[char.uID] = char.Out()
		})

		// Vehicle Data
		currWorld.vehicles.forEach((vehi) => {
			vehi.ping = Date.now() - vehi.timeStamp
			vehi.timeStamp = Date.now()
			data[vehi.uID] = vehi.Out()
		})

		// WorldData
		currWorld.waters.forEach((water) => {
			water.ping = Date.now() - water.timeStamp
			water.timeStamp = Date.now()
			data[water.uID] = water.Out()
		})

		if (isPlayer)
			this.io.to(worldId.split('World_Player_')[1]).emit("players", data)
	}

	private RemoveUnUsedWorlds() {
		const toRemove: WorldServer[] = []
		this.allWorlds.forEach(world => {
			if (world.worldId !== null) {
				if (Object.keys(world.users).length === 0) {
					let isOk = true
					if (world.worldId.toLowerCase().includes('player')) {
						Object.keys(this.allUsers).forEach((sID) => {
							if (world.worldId.includes(sID)) {
								isOk = false
							}
						})
					}
					if (isOk && !_.includes(toRemove, world))
						toRemove.push(world)
				}
			}
		})

		for (let i = 0; i < toRemove.length; i++) {
			const index = this.allWorlds.indexOf(toRemove[i])
			if (index > -1)
				this.allWorlds.splice(index, 1)
		}
	}

	private Status() {
		console.log(`Users: ${Object.keys(this.allUsers).length}, Worlds: ${this.allWorlds.length}`)
		this.allWorlds.forEach(world => {
			console.log(`\tWID: ${world.worldId}, Users: ${Object.keys(world.users).length}`)
		})
	}

	public Start() {
		this.server.listen(this.port, privateHost ? "127.0.0.1" : "0.0.0.0", () => {
			console.log(`Server listening on port ${this.port}.`)
		})
	}

}

new AppServer(port).Start()
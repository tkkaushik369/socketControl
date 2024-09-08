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
import * as Utils from './ts/Core/FunctionLibrary'
import { Player, PlayerSetMesssage } from './ts/Core/Player'
import { WorldServer } from './ts/World/WorldServer'
import { ControlsTypes } from './ts/Enums/ControlsTypes'

const port: number = Number(process.env.PORT) || 3000;
const privateHost: boolean = false

class AppServer {
	private server: http.Server
	private port: number
	private io: Server

	private worldServer: WorldServer
	private uid: number = 1

	constructor(port: number) {
		// Bind Functions
		this.OnConnect = this.OnConnect.bind(this)
		this.OnDisConnect = this.OnDisConnect.bind(this)
		this.OnUpdate = this.OnUpdate.bind(this)
		this.OnControls = this.OnControls.bind(this)
		this.OnMap = this.OnMap.bind(this)
		this.OnScenario = this.OnScenario.bind(this)
		this.ForSocketLoop = this.ForSocketLoop.bind(this)

		// init
		this.port = port
		const app = express()
		app.use(express.static(path.join(__dirname, "../client")))

		this.server = new http.Server(app)
		this.io = new Server(this.server)
		this.worldServer = new WorldServer(this.ForSocketLoop)

		this.worldServer.launchMap(Object.keys(this.worldServer.maps)[0], false, true)

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
		this.worldServer.users[socket.id] = new Player(socket.id, this.worldServer, Utils.defaultCamera(), null)

		const playerSetMessage: PlayerSetMesssage = {
			sID: this.worldServer.users[socket.id].sID,
			count: this.uid++,
			lastScenarioID: this.worldServer.lastScenarioID,
			lastMapID: this.worldServer.lastMapID,
		}

		socket.emit("setID", playerSetMessage, (userName: string, anime: { [id: string]: number }) => {
			this.worldServer.users[socket.id].setUID(userName)
			this.worldServer.users[socket.id].addUser()
			if (this.worldServer) {
				this.worldServer.characters.forEach((char) => {
					char.allAnim = anime
				})
			}
			console.log(`Player Created: ${socket.id} -> ${userName}`)
		})
	}

	private OnDisConnect(socket: Socket) {
		if (this.worldServer.users[socket.id] !== undefined) {
			let char = this.worldServer.users[socket.id].character
			if (char !== null) {
				char.exitVehicle()
				let tiems = 300
				let myInterval = setInterval(() => {
					if (tiems-- <= 0) {
						clearInterval(myInterval)

						console.log(`Client disconnected: ${socket.id} <- ${this.worldServer.users[socket.id].uID}`)
						this.io.emit("removeClient", socket.id)
						this.worldServer.users[socket.id].removeUser()
						delete this.worldServer.users[socket.id]
					}
				}, 15);
			}
		}
	}

	private OnControls(socket: Socket, controls: { type: ControlsTypes, data: { [id: string]: any } }) {
		if (this.worldServer.users[socket.id] !== undefined) {
			this.worldServer.users[socket.id].inputManager.setControls(controls)
			controls['sID'] = socket.id;
			this.io/* .volatile */.emit('controls', controls)
		}
	}

	private OnMap(socket: Socket, mapName: string) {
		console.log(`Map: ${mapName}`)
		this.worldServer.launchMap(mapName, false, true)
		this.io.emit("map", mapName)
	}

	private OnScenario(socket: Socket, scenarioName: string) {
		console.log(`Scenario: ${scenarioName}`)
		this.worldServer.launchScenario(scenarioName, false)
		this.io.emit("scenario", scenarioName)
	}

	private OnUpdate(socket: Socket, message: any) {
		if (this.worldServer.users[socket.id] !== undefined) {
			this.worldServer.users[socket.id].timeStamp = message.timeStamp
			this.worldServer.users[socket.id].ping = message.ping
		}
	}

	private ForSocketLoop() {
		let data: { [id: string]: any } = {}

		// Player Data
		Object.keys(this.worldServer.users).forEach((id) => {
			if ((this.worldServer.users[id] !== undefined) && (this.worldServer.users[id].uID != null)) {
				this.worldServer.users[id].timeStamp = Date.now()
				this.worldServer.users[id].data.timeScaleTarget = this.worldServer.timeScaleTarget
				this.worldServer.users[id].data.sun.elevation = this.worldServer.subConf.elevation
				this.worldServer.users[id].data.sun.azimuth = this.worldServer.subConf.azimuth
				let dataClient = this.worldServer.users[id].Out()
				data[id] = dataClient
			}
		})

		// Chracter Data
		this.worldServer.characters.forEach((char) => {
			char.ping = Date.now() - char.timeStamp
			char.timeStamp = Date.now()
			data[char.uID] = char.Out()
		})

		// Vehicle Data
		this.worldServer.vehicles.forEach((vehi) => {
			vehi.ping = Date.now() - vehi.timeStamp
			vehi.timeStamp = Date.now()
			data[vehi.uID] = vehi.Out()
		})

		this.io/* .volatile */.emit("players", data)
	}

	public Start() {
		this.server.listen(this.port, privateHost ? "127.0.0.1" : "0.0.0.0", () => {
			console.log(`Server listening on port ${this.port}.`)
		})
	}

}

new AppServer(port).Start()
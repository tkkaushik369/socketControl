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
import WorldServer from './ts/WorldServer'
import WorldObject from './ts/WorldObjects/WorldObjects'
import { Player } from './ts/Player'
import { Message } from './ts/Messages/Message'
import * as THREE from 'three'

const port: number = 3000
const privateHost: boolean = false

class AppServer {
	private server: http.Server
	private port: number
	private io: Server

	private worldServer: WorldServer
	private clientInx: number
	private clients: { [id: string]: Player }

	private fixedTimeStep: number

	constructor(port: number) {
		// Bind Functions
		this.OnConnect = this.OnConnect.bind(this)
		this.OnDisConnect = this.OnDisConnect.bind(this)
		this.OnUpdate = this.OnUpdate.bind(this)
		this.OnChangeScenario = this.OnChangeScenario.bind(this)
		this.OnShoot = this.OnShoot.bind(this)
		this.OnChangeTimeScale = this.OnChangeTimeScale.bind(this)
		this.ForSocketLoop = this.ForSocketLoop.bind(this)

		// Init
		this.clientInx = 0
		this.clients = {}
		this.fixedTimeStep = 1.0 / 60.0; // fps
		this.port = port

		const app = express()
		app.use(express.static(path.join(__dirname, "../client")))

		this.server = new http.Server(app)
		this.io = new Server(this.server)
		this.worldServer = new WorldServer(this.clients)


		// Socket
		this.io.on("connection", (socket: Socket) => {
			this.OnConnect(socket)
			socket.on("disconnect", () => this.OnDisConnect(socket))
			socket.on("changeScenario", (inx: number) => this.OnChangeScenario(inx))
			socket.on("shoot", (data: any) => this.OnShoot(data))
			socket.on("changeTimeScale", (val: number) => this.OnChangeTimeScale(val))
			socket.on("update", (message: Message) => this.OnUpdate(socket, message))
		})
		setInterval(this.ForSocketLoop, this.fixedTimeStep * 1000)
	}

	private OnConnect(socket: Socket) {
		console.log("Connected: " + socket.id)
		this.clients[socket.id] = new Player(socket.id)
		this.clients[socket.id].data.count = (++this.clientInx)
		this.clients[socket.id].data.currentScenarioIndex = this.worldServer.currentScenarioIndex
		this.clients[socket.id].data.TimeScale = this.worldServer.settings.TimeScale
		this.clients[socket.id].data.timeScaleTarget = this.worldServer.timeScaleTarget

		socket.emit("setid", this.clients[socket.id].Out(), (username: string) => {
			this.clients[socket.id].userName = username
			console.log("Player Created: " + socket.id + " -> " + username);
		})
	}

	private OnDisConnect(socket: Socket) {
		console.log("socket disconnected : " + socket.id);
		if (this.clients && this.clients[socket.id]) {
			console.log("Deleted: " + socket.id);
			delete this.clients[socket.id]
			this.io.emit("removeClient", socket.id)
		}
	}

	private OnChangeScenario(inx: number) {
		this.worldServer.currentScenarioIndex = inx
		console.log("Scenario Change: " + inx)
		this.worldServer.buildScene(inx)
		this.io.emit("changeScenario", inx)
	}

	private OnShoot(data: any) {
		let position = new THREE.Vector3(data.position.x, data.position.y, data.position.z)
		let quaternion = new THREE.Quaternion(data.quaternion.x, data.quaternion.y, data.quaternion.z, data.quaternion.w)
		let dirVec = new THREE.Vector3(data.dirVec.x, data.dirVec.y, data.dirVec.z)
		this.worldServer.shootBall(position, quaternion, dirVec)
	}

	private OnChangeTimeScale(val: number) {
		this.worldServer.changeTimeScale(val)
		this.io.emit("changeTimeScale", { TimeScale: this.worldServer.settings.TimeScale, timeScaleTarget: this.worldServer.timeScaleTarget })
	}

	private OnUpdate(socket: Socket, message: Message) {
		this.clients[socket.id].ping = Date.now() - this.clients[socket.id].timeStamp
		this.clients[socket.id].data.count = message.data.count
	}

	public Start() {
		this.server.listen(this.port, privateHost ? "127.0.0.1" : "0.0.0.0", () => {
			console.log(`Server listening on port ${this.port}.`)
		})
	}

	private ForSocketLoop() {
		let data: { [id: string]: Message } = {}

		// Player Data
		Object.keys(this.clients).forEach((id) => {
			this.clients[id].timeStamp = Date.now()
			data[id] = this.clients[id].Out()
		})

		// Ball Data
		this.worldServer.allBalls.forEach((ball: WorldObject) => {
			ball.timeStamp = Date.now()
			data[ball.name] = ball.Out()
		})

		// World Data
		Object.keys(this.worldServer.allWorldObjects).forEach((id) => {
			this.worldServer.allWorldObjects[id].timeStamp = Date.now()
			data[id] = this.worldServer.allWorldObjects[id].Out()
		})

		// World Characters
		Object.keys(this.worldServer.allCharacters).forEach((id) => {
			this.worldServer.allCharacters[id].ping = Date.now() - this.worldServer.allCharacters[id].timeStamp
			this.worldServer.allCharacters[id].timeStamp = Date.now()
			data[id] = this.worldServer.allCharacters[id].Out()
		})

		this.io.emit("players", data)
	};
}

new AppServer(port).Start()
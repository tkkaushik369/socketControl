// When starting this project by using `npm run dev`, this server script
// will be compiled using tsc and will be running concurrently along side webpack-dev-server
// visit http://127.0.0.1:8080

// In the production environment we don't use the webpack-dev-server, so instead type,
// `npm run build`        (this creates the production version of bundle.js and places it in ./dist/client/)
// `tsc -p ./src/server`  (this compiles ./src/server/server.ts into ./dist/server/server.js)
// `npm start            (this starts nodejs with express and serves the ./dist/client folder)
// visit http://127.0.0.1:3000

import { Common } from './Common'
import express from 'express'
import path from 'path'
import http from 'http'
import { WebSocketServer, WebSocket } from 'ws';
import { Server, Socket } from 'socket.io'
import parser from 'socket.io-msgpack-parser'
import { Utility } from './ts/Core/Utility'
import { Player, PlayerSetMesssage } from './ts/Core/Player'
import { WorldServer } from './ts/World/WorldServer'
import { ControlsTypes } from './ts/Enums/ControlsTypes'
import { MessageTypes } from './ts/Enums/MessagesTypes'
import { Communication, DataSender } from './ts/Enums/Communication';

const port: number = Number(process.env.PORT) || 3000;
const privateHost: boolean = false

class AppServer {
	private server: http.Server
	private port: number
	private io: Server | null
	private wss: WebSocketServer | null

	private allUsers: { [id: string]: Player }
	private allWorlds: { [id: string]: WorldServer }
	private uid: number = 1

	constructor(port: number) {
		// Bind Functions
		this.CreatePlayerWorld = this.CreatePlayerWorld.bind(this)
		this.CreatePlayerWorldCallBack = this.CreatePlayerWorldCallBack.bind(this)
		this.OnConnect = this.OnConnect.bind(this)
		this.OnDisConnect = this.OnDisConnect.bind(this)
		this.OnUpdate = this.OnUpdate.bind(this)
		this.OnControls = this.OnControls.bind(this)
		this.OnChange = this.OnChange.bind(this)
		this.OnMap = this.OnMap.bind(this)
		this.OnScenario = this.OnScenario.bind(this)
		this.ForSocketLoop = this.ForSocketLoop.bind(this)
		this.GetLatestWorldData = this.GetLatestWorldData.bind(this)
		this.RemoveUnusedWorlds = this.RemoveUnusedWorlds.bind(this)
		this.Status = this.Status.bind(this)
		this.Start = this.Start.bind(this)

		// init
		this.port = port
		const app = express()
		app.use(express.static(path.join(__dirname, "../client")))

		this.server = new http.Server(app)
		if (Common.conn === Communication.SocketIO) {
			this.io = new Server(this.server, { parser: parser })
			this.io.engine.on("connection", (rawSocket) => { rawSocket.request = null })
			this.wss = null
		} else if (Common.conn === Communication.WebSocket) {
			this.io = null
			this.wss = new WebSocketServer({ server: this.server/* port: 3001 */ });
		} else {
			this.io = null
			this.wss = null
		}

		this.allUsers = {}
		this.allWorlds = {}

		if (this.io !== null) {
			this.io.on("connection", (socket: Socket) => {
				this.OnConnect(socket, null)
				socket.on("disconnect", () => this.OnDisConnect(socket.id))
				socket.on("controls", (controls: { type: ControlsTypes, data: { [id: string]: any } }) => this.OnControls(socket.id, controls))
				socket.on("change", (worldId: string, callBack: Function) => this.OnChange(socket, worldId, callBack))
				socket.on("map", (mapName: string) => this.OnMap(socket.id, mapName))
				socket.on("scenario", (scenarioName: string) => this.OnScenario(socket.id, scenarioName))
				socket.on("update", (message: any, callBack: Function) => this.OnUpdate(socket.id, message, callBack))
			})
		}
		if (this.wss !== null) {
			this.wss.on('connection', (ws) => {
				const sID = "soc_" + this.uid
				{ // OnConnect
					this.OnConnect({ id: sID }, ws)
				}

				ws.on('message', (rawdata: string) => {
					const data = JSON.parse(rawdata)

					switch (data.type) {
						case "setIDCallBack":
							{
								this.CreatePlayerWorldCallBack(data.params.uID, data.params.sID)
								if ((data.params.sID !== undefined) && (this.allUsers[data.params.sID] !== undefined)) {
									this.allUsers[data.params.sID].ws = ws
								}
								break;
							}
						case "update":
							{
								this.OnUpdate(data.params.sID, data.params, () => {
									let alldata: { [id: string]: any } = {}
									if (Common.sender === DataSender.PingPong)
										if (this.allUsers[data.params.sID] !== undefined)
											alldata = this.GetLatestWorldData(this.allUsers[data.params.sID].world.worldId)
									ws.send(JSON.stringify({ type: "ForSocketLoopCallBack", params: alldata }))
								})
								break
							}
						case "controls":
							{
								this.OnControls(data.params.sID, data.params)
								break
							}
						case "map":
							{
								this.OnMap(data.params.sID, data.params.map)
								break
							}
						case "scenario":
							{
								this.OnScenario(data.params.sID, data.params.scenario)
								break
							}
						case "change":
							{
								this.OnChange({ id: data.params.sID }, data.params.worldId, (worldId: string, lastMapID: string, lastScenarioID: string) => {
									if (this.allUsers[sID].ws !== null) {
										this.allUsers[sID].ws.send(JSON.stringify({
											type: "change", params: {
												worldId: this.allUsers[sID].world.worldId,
												lastMapID: this.allUsers[sID].world.lastMapID,
												lastScenarioID: this.allUsers[sID].world.lastScenarioID
											}
										}))
									}
								})
								break
							}
						default:
							{
								console.log('received: %s', rawdata)
								break;
							}
					}
				})

				ws.on('close', () => this.OnDisConnect(sID))
			})
		}
	}

	private CreatePlayerWorld(socketid: string, worldId: string): PlayerSetMesssage {
		this.allWorlds[worldId] = new WorldServer(this.ForSocketLoop)
		this.allWorlds[worldId].launchMap(Object.keys(this.allWorlds[worldId].maps)[0], false, true)
		this.allWorlds[worldId].worldId = worldId

		this.allUsers[socketid] = new Player(socketid, this.allWorlds[worldId], Utility.defaultCamera(), null)
		this.allWorlds[worldId].users[socketid] = this.allUsers[socketid]

		if (this.allWorlds[worldId].runner === null)
			this.allWorlds[worldId].runner = setInterval(this.allWorlds[worldId].update, this.allWorlds[worldId].physicsFrameTime * 1000)

		const playerSetMessage: PlayerSetMesssage = {
			sID: socketid,
			count: this.uid++,
			lastScenarioID: this.allWorlds[worldId].lastScenarioID,
			lastMapID: this.allWorlds[worldId].lastMapID,
			worldId: worldId,
		}

		return playerSetMessage
	}

	private CreatePlayerWorldCallBack(uID: string, sID: string) {
		this.allUsers[sID].setUID(uID)
		this.allUsers[sID].addUser()
		console.log(`Player Created: ${sID} -> ${uID}`)
		this.Status()
	}

	private OnConnect(socket: Socket | { id: string }, ws: WebSocket) {
		console.log(`Client Connected: ${socket.id}`)
		const worldId = "World_" + socket.id

		if (socket instanceof Socket) {
			socket.join(worldId)
			socket.emit("setID", this.CreatePlayerWorld(socket.id, worldId), this.CreatePlayerWorldCallBack)
		} else if (ws !== null) {
			ws.send(JSON.stringify({ type: "setID", params: this.CreatePlayerWorld(socket.id, worldId) }))
		}
	}

	private OnDisConnect(sID: string) {
		const char = this.allUsers[sID].character

		const onFinish = () => {
			console.log(`Client disconnected: ${sID} <- ${this.allUsers[sID].uID}`)
			{
				if (this.io !== null)
					this.io.emit("removeClient", sID)
				Object.keys(this.allUsers[sID].world.users).forEach((wsID) => {
					if (this.allUsers[sID].world.users[wsID] !== undefined) {
						if (this.allUsers[sID].world.users[wsID].ws !== null)
							this.allUsers[sID].world.users[wsID].ws.send(JSON.stringify({ type: "removeClient", params: { sID: sID } }))
					}
				})
			}
			this.allUsers[sID].removeUser()

			if (this.allUsers[sID].world.users[sID] !== undefined) {
				delete this.allUsers[sID].world.users[sID]
				// this.allUsers[sID].world.users[sID] = undefined
			}

			if (this.allUsers[sID] !== undefined) {
				delete this.allUsers[sID]
				// this.allUsers[sID] = undefined
			}

			this.Status()
		}
		if (this.allUsers[sID] !== undefined) {
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

	private OnControls(sID: string, controls: { type: ControlsTypes, data: { [id: string]: any } }) {
		if (this.allUsers[sID] !== undefined) {
			this.allUsers[sID].inputManager.setControls(controls)
			controls['sID'] = sID;
			{
				if (this.io !== null)
					this.io.emit('controls', controls)
				Object.keys(this.allUsers[sID].world.users).forEach((wsID) => {
					if (this.allUsers[sID].world.users[wsID] !== undefined) {
						if (this.allUsers[sID].world.users[wsID].ws !== null)
							this.allUsers[sID].world.users[wsID].ws.send(JSON.stringify({ type: "controls", params: controls }))
					}
				})
			}
		}
	}

	private OnChange(socket: Socket | { id: string }, worldId: string, callBack: Function) {
		this.allUsers[socket.id].removeUser()
		if (this.allUsers[socket.id].world.users[socket.id] !== undefined) {
			delete this.allUsers[socket.id].world.users[socket.id]
			this.allUsers[socket.id].world.users[socket.id] = undefined
		}
		if (this.allWorlds[worldId].users[socket.id] !== undefined) {
			delete this.allWorlds[worldId].users[socket.id]
			this.allWorlds[worldId].users[socket.id] = undefined
		}

		if (socket instanceof Socket) {
			socket.to(this.allUsers[socket.id].world.worldId).emit("removeClient", socket.id)
			socket.leave(this.allUsers[socket.id].world.worldId)
			socket.join(worldId)
		} else if (this.allUsers[socket.id].ws !== null)
			this.allUsers[socket.id].ws.send(JSON.stringify({ type: "removeClient", params: { sID: socket.id } }))

		this.allUsers[socket.id].world = this.allWorlds[worldId]
		this.allUsers[socket.id].inputManager.world = this.allUsers[socket.id].world
		this.allUsers[socket.id].cameraOperator.world = this.allUsers[socket.id].world
		this.allUsers[socket.id].spawnPoint = null
		this.allWorlds[worldId].users[socket.id] = this.allUsers[socket.id]

		if (this.allWorlds[worldId].runner === null)
			this.allWorlds[worldId].runner = setInterval(this.allWorlds[worldId].update, this.allWorlds[worldId].physicsFrameTime * 1000)

		this.Status()

		for (let i = 0; i < this.allWorlds[worldId].scenarios.length; i++) {
			if (this.allWorlds[worldId].scenarios[i].name === this.allWorlds[worldId].lastScenarioID) {
				if (this.allWorlds[worldId].scenarios[i].playerPosition !== null) {
					const pos = Utility.GridPosition(this.allWorlds[worldId].users, this.allWorlds[worldId].scenarios[i].playerPosition)
					this.allUsers[socket.id].setSpawn(pos[pos.length - 1], false)
					this.allUsers[socket.id].cameraOperator.theta = this.allWorlds[worldId].scenarios[i].initialCameraAngle
					this.allUsers[socket.id].cameraOperator.phi = 15
				}
				break
			}
		}
		this.allUsers[socket.id].addUser()
		callBack(this.allUsers[socket.id].world.worldId, this.allUsers[socket.id].world.lastMapID, this.allUsers[socket.id].world.lastScenarioID)
	}

	private OnMap(sID: string, mapName: string) {
		console.log(`Map: ${mapName}`)
		if (this.allUsers[sID] === undefined) return

		this.allUsers[sID].world.launchMap(mapName, false, true)
		{
			if (this.io !== null)
				this.io.in(this.allUsers[sID].world.worldId).emit("map", mapName)
			Object.keys(this.allUsers[sID].world.users).forEach((wsID) => {
				if (this.allUsers[sID].world.users[wsID] !== undefined) {
					if (this.allUsers[sID].world.users[wsID].ws !== null) {
						this.allUsers[sID].world.users[wsID].ws.send(JSON.stringify({ type: "map", params: { map: mapName } }))
					}
				}
			})
		}
	}

	private OnScenario(sID: string, scenarioName: string) {
		console.log(`Scenario: ${scenarioName}`)
		this.allUsers[sID].world.launchScenario(scenarioName, false)
		{
			if (this.io !== null)
				this.io.in(this.allUsers[sID].world.worldId).emit("scenario", scenarioName)
			Object.keys(this.allUsers[sID].world.users).forEach((wsID) => {
				if (this.allUsers[sID].world.users[wsID] !== undefined) {
					if (this.allUsers[sID].world.users[wsID].ws !== null) {
						this.allUsers[sID].world.users[wsID].ws.send(JSON.stringify({ type: "scenario", params: { scenario: scenarioName } }))
					}
				}
			})
		}
	}

	private OnUpdate(sID: string, message: any, callBack: Function) {
		if (this.allUsers[sID] !== undefined) {
			this.allUsers[sID].timeStamp = message.timeStamp
			this.allUsers[sID].ping = message.ping
		}
		callBack()
	}

	private ForSocketLoop(worldId: string) {
		if (Common.sender !== DataSender.SocketLoop) return
		if (this.allWorlds[worldId] === undefined) return

		let alldata = this.GetLatestWorldData(worldId)
		{
			if (this.io !== null)
				this.io.in(worldId).emit("update", alldata)
			Object.keys(this.allWorlds[worldId].users).forEach((sID) => {
				if ((this.allWorlds[worldId].users[sID] !== undefined) && (this.allWorlds[worldId].users[sID].uID !== undefined)) {
					if (this.allWorlds[worldId].users[sID].ws !== null)
						this.allWorlds[worldId].users[sID].ws.send(JSON.stringify({ type: "update", params: alldata }))
				}
			})
		}
	}

	private GetLatestWorldData(worldId: string) {
		let alldata: { [id: string]: any } = {}
		// All World Id
		{
			Object.keys(this.allWorlds).forEach((id) => {
				const users = []
				Object.keys(this.allWorlds[id].users).forEach((sID) => {
					if (this.allWorlds[id].users[sID] !== undefined) {
						users.push(this.allWorlds[id].users[sID].uID)
					}
				});
				alldata[id] = {
					uID: id,
					msgType: MessageTypes.World,
					users: users
				}
			})
		}

		// All Player Data
		{
			Object.keys(this.allUsers).forEach((id) => {
				if ((this.allUsers[id] !== undefined) && (this.allUsers[id].uID != null)) {
					this.allUsers[id].data.timeScaleTarget = this.allUsers[id].world.timeScaleTarget
					this.allUsers[id].data.sun.elevation = this.allUsers[id].world.sunConf.elevation
					this.allUsers[id].data.sun.azimuth = this.allUsers[id].world.sunConf.azimuth
					let dataClient = this.allUsers[id].Out()
					alldata[id] = dataClient
				}
			})
		}

		// Chracter Data
		{
			this.allWorlds[worldId].characters.forEach((char) => {
				char.ping = Date.now() - char.timeStamp
				char.timeStamp = Date.now()
				alldata[char.uID] = char.Out()
			})
		}

		// Vehicle Data
		{
			this.allWorlds[worldId].vehicles.forEach((vehi) => {
				vehi.ping = Date.now() - vehi.timeStamp
				vehi.timeStamp = Date.now()
				alldata[vehi.uID] = vehi.Out()
			})
		}

		// WorldData
		{
			this.allWorlds[worldId].waters.forEach((water) => {
				water.ping = Date.now() - water.timeStamp
				water.timeStamp = Date.now()
				alldata[water.uID] = water.Out()
			})
		}

		return alldata
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
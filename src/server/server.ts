// When starting this project by using `npm run dev`, this server script
// will be compiled using tsc and will be running concurrently along side webpack-dev-server
// visit http://127.0.0.1:8080

// In the production environment we don't use the webpack-dev-server, so instead type,
// `npm run build`        (this creates the production version of bundle.js and places it in ./dist/client/)
// `tsc -p ./src/server`  (this compiles ./src/server/server.ts into ./dist/server/server.js)
// `npm start            (this starts nodejs with express and serves the ./dist/client folder)
// visit http://127.0.0.1:3000

import express from 'express'
import path from 'node:path'
import http from 'node:http'
import { WebSocketServer, WebSocket } from 'ws'
import { Server, Socket } from 'socket.io'
import { instrument } from '@socket.io/admin-ui'
import parser from 'socket.io-msgpack-parser'
// import { pack, unpack } from "msgpackr"
import {
	Common,
	Utility,
	Player,
	PlayerSetMesssage,
	ControlsTypes,
	MessageTypes,
	Communication,
	DataSender,
	Packager,
	WorldCreation,
} from '@World'
import { WorldServer } from './ts/World/WorldServer'
// import fs from 'node:fs'
import * as geckosServer from '@geckos.io/server'

// Set the MIME type explicitly
// express.static.mime.define({ 'application/wasm': ['wasm'] })

export function initServer() {
	if (__dirname.includes('node_modules')) {
		__dirname = path.resolve(__dirname.split('node_modules')[0], '.webpack/renderer/main_window')
	}
}

// const port: number = Number(process.env.PORT) || 3000
// const privateHost: boolean = false

export type ConnectedEvent = CustomEvent<{
	id: string
	ws: WebSocket
}>
export type DisconnectedEvent = CustomEvent<{
	id: string
	ws: WebSocket
}>
export type WorldCreatedEvent = CustomEvent<{
	id: string
}>
export type WorldDestroyedEvent = CustomEvent<{
	id: string
}>
export type WorldClientAddEvent = CustomEvent<{
	wid: string
	sid: string
}>
export type WorldClientRemoveEvent = CustomEvent<{
	wid: string
	sid: string
}>

export default class AppServer extends EventTarget {
	private port: number
	private server: http.Server | null
	private io: Server | null
	private io_g: geckosServer.GeckosServer | null
	private wss: WebSocketServer | null
	private app: express.Express

	public allUsers: { [id: string]: Player }
	public allWorlds: { [id: string]: WorldServer }
	private uid: number = 1

	constructor(port: number, hostPath: string = '.') {
		super()
		// Bind Functions
		this.initCommunication = this.initCommunication.bind(this)

		this.CreateNewWorld = this.CreateNewWorld.bind(this)
		this.CreatePlayerWorld = this.CreatePlayerWorld.bind(this)
		this.CreatePlayerWorldCallBack = this.CreatePlayerWorldCallBack.bind(this)
		this.JoinWorldPlayer = this.JoinWorldPlayer.bind(this)
		this.LeaveWorldPlayer = this.LeaveWorldPlayer.bind(this)

		this.OnConnect = this.OnConnect.bind(this)
		this.OnDisConnect = this.OnDisConnect.bind(this)
		this.OnUpdate = this.OnUpdate.bind(this)
		this.OnControls = this.OnControls.bind(this)
		this.OnChange = this.OnChange.bind(this)
		this.OnChangeFinish = this.OnChangeFinish.bind(this)
		this.OnLeave = this.OnLeave.bind(this)
		this.OnMap = this.OnMap.bind(this)
		this.OnScenario = this.OnScenario.bind(this)
		this.OnMessage = this.OnMessage.bind(this)

		this.ForSocketLoop = this.ForSocketLoop.bind(this)
		this.ForOutofWorld = this.ForOutofWorld.bind(this)
		this.GetLatestWorldData = this.GetLatestWorldData.bind(this)
		this.RemoveUnusedWorlds = this.RemoveUnusedWorlds.bind(this)

		this.Status = this.Status.bind(this)
		this.Start = this.Start.bind(this)
		this.Stop = this.Stop.bind(this)

		// init
		this.port = port
		this.server = null
		this.allUsers = {}
		this.allWorlds = {}
		this.io = null
		this.io_g = null
		this.wss = null

		// const clientPath = path.resolve(__dirname, '../client_window')
		const clientPath = hostPath === '.' ? path.resolve(__dirname, '../client') : path.resolve(hostPath, '../client')
		const basePath = hostPath === '.' ? path.resolve(__dirname, '../@World') : path.resolve(hostPath, '../@World')
		console.log(clientPath)
		console.log(basePath)
		this.app = express()
		this.app.use('/', express.static(clientPath))
		this.app.use('/client', express.static(clientPath))
		this.app.use('/@World', express.static(basePath))
		this.app.use('/audios', express.static(path.join(clientPath, 'audios')))
		this.app.use('/images', express.static(path.join(clientPath, 'images')))
		this.app.use('/models', express.static(path.join(clientPath, 'models')))
		/* this.app.get('/', (req, res) => {
			res.sendFile(path.resolve(clientPath, 'index.html'))
		}) */
		setInterval(this.ForOutofWorld, 100)
	}

	private initCommunication() {
		if (this.io !== null) {
			this.io.on('connection', (socket: Socket) => {
				this.OnConnect(socket, null)
				socket.on('disconnect', () => this.OnDisConnect(socket.id))
				socket.on('controls', (controls: { type: ControlsTypes; sID: string; data: { [id: string]: any } }) =>
					this.OnControls(socket.id, controls)
				)
				socket.on('change', (worldId: string, callBack: Function) => this.OnChange(socket, worldId, callBack))
				socket.on('changeFinish', (worldId: string) => this.OnChangeFinish(socket, worldId))
				socket.on('leave', (worldId: string, callBack: Function) => this.OnLeave(socket, worldId, callBack))
				socket.on('map', (mapName: string) => this.OnMap(socket.id, mapName))
				socket.on('scenario', (scenarioName: string) => this.OnScenario(socket.id, scenarioName))
				socket.on('message', (messageData: { [id: string]: string }) => this.OnMessage(messageData))
				socket.on('update', (message: any, callBack: Function) => this.OnUpdate(socket.id, message, callBack))
			})
		} else if (this.wss !== null) {
			this.wss.on('connection', (ws) => {
				const sID = 'soc_' + this.uid
				{
					// OnConnect
					this.OnConnect({ id: sID }, ws)
				}

				ws.on('message', (rawdata: any) => {
					let data = {} as any
					if (Common.packager === Packager.JSON) data = JSON.parse(rawdata)
					/* else if (Common.packager === Packager.MsgPacker)
						data = unpack(rawdata) */

					switch (data.type) {
						case 'setIDCallBack': {
							this.CreatePlayerWorldCallBack(data.params.uID, data.params.sID)
							if (data.params.sID !== undefined && this.allUsers[data.params.sID] !== undefined) {
								this.allUsers[data.params.sID].ws = ws
							}
							break
						}
						case 'update': {
							this.OnUpdate(data.params.sID, data.params, () => {
								let alldata: { [id: string]: any } = {}
								if (Common.sender === DataSender.PingPong)
									if (this.allUsers[data.params.sID] !== undefined) {
										const world = this.allUsers[data.params.sID].world
										if (world !== null) alldata = this.GetLatestWorldData(world.worldId)
										else alldata = this.GetLatestWorldData(null)
									}
								if (Common.packager === Packager.JSON)
									ws.send(JSON.stringify({ type: 'ForSocketLoopCallBack', params: alldata }))
								/* else if (Common.packager === Packager.MsgPacker)
									ws.send(pack({ type: "ForSocketLoopCallBack", params: alldata })) */
							})
							break
						}
						case 'controls': {
							this.OnControls(data.params.sID, data.params)
							break
						}
						case 'map': {
							this.OnMap(data.params.sID, data.params.map)
							break
						}
						case 'scenario': {
							this.OnScenario(data.params.sID, data.params.scenario)
							break
						}
						case 'message': {
							this.OnMessage(data.params)
							break
						}
						case 'change': {
							this.OnChange(
								{ id: data.params.sID },
								data.params.worldId,
								(params: {
									worldId: string
									lastMapID: string
									lastScenarioID: string
									players: { sID: string; uID: string }[]
								}) => {
									if (this.allUsers[sID].ws !== null) {
										if (Common.packager === Packager.JSON)
											this.allUsers[sID].ws.send(
												JSON.stringify({ type: 'changeCallBack', params })
											)
										/* else if (Common.packager === Packager.MsgPacker)
										this.allUsers[sID].ws.send(pack({ type: "changeCallBack", params })) */
									}
								}
							)
							break
						}
						case 'changeFinish': {
							this.OnChangeFinish({ id: data.params.sID }, data.params.worldId)
							break
						}
						case 'leave': {
							this.OnLeave(
								{ id: data.params.sID },
								data.params.worldId,
								(params: { worldId: string }) => {
									if (this.allUsers[sID].ws !== null) {
										if (Common.packager === Packager.JSON)
											this.allUsers[sID].ws.send(
												JSON.stringify({ type: 'leaveCallBack', params })
											)
										/* else if (Common.packager === Packager.MsgPacker)
										this.allUsers[sID].ws.send(pack({ type: "leaveCallBack", params })) */
									}
								}
							)
							break
						}
						default: {
							console.log('received: %s', data)
							break
						}
					}
				})

				ws.on('close', () => this.OnDisConnect(sID))
			})
		}
	}

	private CreateNewWorld(worldId: string) {
		console.log('World Created: ' + worldId)
		this.allWorlds[worldId] = new WorldServer(this.ForSocketLoop)
		this.allWorlds[worldId].launchMap(Object.keys(this.allWorlds[worldId].maps)[0], false, true)
		this.allWorlds[worldId].worldId = worldId
		this.dispatchEvent(
			new CustomEvent('worldcreated', {
				detail: {
					id: worldId,
				},
			})
		)
	}

	private CreatePlayerWorld(socketid: string): PlayerSetMesssage {
		this.allUsers[socketid] = new Player(socketid, Utility.defaultCamera(), null)

		let worldId = 'World_' + socketid
		const worldIds = Object.keys(this.allWorlds)
		if (Common.eachNewWorld === WorldCreation.OneForEach) {
			this.CreateNewWorld(worldId)
		} else if (Common.eachNewWorld === WorldCreation.AtleaseOne) {
			if (worldIds.length != 0) worldId = worldIds[0]
			else this.CreateNewWorld(worldId)
		}

		const playerSetMessage: PlayerSetMesssage = {
			sID: socketid,
			count: this.uid++,
		}
		this.Status()
		return playerSetMessage
	}

	private CreatePlayerWorldCallBack(uID: string, sID: string) {
		this.allUsers[sID].setUID(uID)
		console.log(`Player Created: ${sID} -> ${uID}`)
		this.Status()
	}

	private JoinWorldPlayer(socket: Socket | { id: string }, worldId: string) {
		if (this.allUsers[socket.id] === undefined) return
		if (this.allUsers[socket.id].uID === null) return
		if (this.allWorlds[worldId] === undefined) return

		this.allUsers[socket.id].world = this.allWorlds[worldId]
		this.allUsers[socket.id].spawnPoint = null
		this.allWorlds[worldId].users[socket.id] = this.allUsers[socket.id]

		this.dispatchEvent(
			new CustomEvent('worldclientadd', {
				detail: {
					wid: worldId,
					sid: socket.id,
				},
			})
		)

		if (this.allWorlds[worldId].runner === null) {
			console.log(`Running: ${worldId}`)
			this.allWorlds[worldId].runner = setInterval(
				this.allWorlds[worldId].update,
				this.allWorlds[worldId].physicsFrameTime * 1000
			)
		}

		for (let i = 0; i < this.allWorlds[worldId].scenarios.length; i++) {
			if (this.allWorlds[worldId].scenarios[i].name === this.allWorlds[worldId].lastScenarioID) {
				if (this.allWorlds[worldId].scenarios[i].playerPosition !== null) {
					const playerPosition = this.allWorlds[worldId].scenarios[i].playerPosition
					if (playerPosition !== null) {
						const pos = Utility.GridPosition(this.allWorlds[worldId].users, playerPosition)
						this.allUsers[socket.id].setSpawn(pos[pos.length - 1], false)
						this.allUsers[socket.id].cameraOperator.theta =
							this.allWorlds[worldId].scenarios[i].initialCameraAngle
						this.allUsers[socket.id].cameraOperator.phi = 15
					}
				}
				break
			}
		}
		/* if (this.allWorlds[worldId] !== undefined)
			this.allUsers[socket.id].addUser(this.allWorlds[worldId]) */

		if (socket instanceof Socket && this.io !== null) {
			this.io.in(worldId).emit('addClient', { sID: socket.id, uID: this.allUsers[socket.id].uID })
			socket.join(worldId)
		} else {
			if (this.allWorlds[worldId] !== undefined) {
				Object.keys(this.allWorlds[worldId].users).forEach((sID) => {
					if (this.allWorlds[worldId].users[sID] !== undefined) {
						if (this.allWorlds[worldId].users[sID].ws !== null) {
							if (Common.packager === Packager.JSON) {
								this.allWorlds[worldId].users[sID].ws.send(
									JSON.stringify({
										type: 'addClient',
										params: { sID: socket.id, uID: this.allUsers[socket.id].uID },
									})
								)
							} /*  else if (Common.packager === Packager.MsgPacker) {
								this.allWorlds[worldId].users[sID].ws.send(pack({ type: "addClient", params: { sID: socket.id, uID: this.allUsers[socket.id].uID } }))
							} */
						}
					}
				})
			}
		}
	}

	private LeaveWorldPlayer(socket: Socket | { id: string }) {
		const world = this.allUsers[socket.id].world
		if (world === null) return

		if (this.allUsers[socket.id] !== undefined) this.allUsers[socket.id].removeUser(world)

		const worldId = world.worldId
		if (worldId === null) return

		this.allUsers[socket.id].world = null
		if (this.allWorlds[worldId].users[socket.id] !== undefined) {
			this.dispatchEvent(
				new CustomEvent('worldclientremove', {
					detail: {
						wid: worldId,
						sid: socket.id,
					},
				})
			)
			delete this.allWorlds[worldId].users[socket.id]
		}

		if (socket instanceof Socket && this.io !== null) {
			this.io.in(worldId).emit('removeClient', { sID: socket.id })
			socket.leave(worldId)
		} else {
			if (this.allWorlds[worldId] !== undefined) {
				Object.keys(this.allWorlds[worldId].users).forEach((sID) => {
					if (this.allWorlds[worldId].users[sID] !== undefined) {
						if (this.allWorlds[worldId].users[sID].ws !== null) {
							if (Common.packager === Packager.JSON) {
								this.allWorlds[worldId].users[sID].ws.send(
									JSON.stringify({ type: 'removeClient', params: { sID: socket.id } })
								)
							} /* else if (Common.packager === Packager.MsgPacker) {
								this.allWorlds[worldId].users[sID].ws.send(pack({ type: "removeClient", params: { sID: socket.id } }))
							} */
						}
					}
				})
			}
		}
	}

	private OnConnect(socket: Socket | { id: string }, ws: WebSocket | null) {
		console.log(`Client Connected: ${socket.id}`)
		if (socket instanceof Socket) {
			socket.emit('setID', this.CreatePlayerWorld(socket.id), this.CreatePlayerWorldCallBack)
		} else if (ws !== null) {
			if (Common.packager === Packager.JSON)
				ws.send(JSON.stringify({ type: 'setID', params: this.CreatePlayerWorld(socket.id) }))
			/* else if (Common.packager === Packager.MsgPacker)
				ws.send(pack({ type: "setID", params: this.CreatePlayerWorld(socket.id) })) */
		}

		this.dispatchEvent(
			new CustomEvent('connected', {
				detail: {
					id: socket.id,
				},
			})
		)
	}

	private OnDisConnect(sID: string) {
		if (this.allUsers[sID] === undefined) return
		const char = this.allUsers[sID].character

		const onFinish = () => {
			console.log(`Client disconnected: ${sID} <- ${this.allUsers[sID].uID}`)

			this.dispatchEvent(
				new CustomEvent('disconnected', {
					detail: {
						id: sID,
					},
				})
			)

			this.LeaveWorldPlayer({ id: sID })

			if (this.allUsers[sID] !== undefined) {
				delete this.allUsers[sID]
			}

			this.Status()
		}
		if (this.allUsers[sID] !== undefined) {
			if (char === null || char.controlledObject === null) {
				onFinish()
			} else {
				char.exitVehicle()
				let tiems = 300
				let myInterval = setInterval(() => {
					if (tiems-- <= 0) {
						clearInterval(myInterval)
						onFinish()
					}
				}, 15)
			}
		}
	}

	private OnControls(sID: string, controls: { type: ControlsTypes; sID: string; data: { [id: string]: any } }) {
		if (this.allUsers[sID] !== undefined) {
			this.allUsers[sID].inputManager.setControls(controls)
			controls['sID'] = sID

			{
				if (this.io !== null) this.io.emit('controls', controls)
				else {
					const world = this.allUsers[sID].world
					if (world !== null) {
						Object.keys(world.users).forEach((wsID) => {
							if (world.users[wsID] !== undefined) {
								if (world.users[wsID].ws !== null) {
									if (Common.packager === Packager.JSON)
										world.users[wsID].ws.send(
											JSON.stringify({ type: 'controls', params: controls })
										)
									/* else if (Common.packager === Packager.MsgPacker)
										world.users[wsID].ws.send(pack({ type: "controls", params: controls })) */
								}
							}
						})
					}
				}
			}
		}
	}

	private OnChange(socket: Socket | { id: string }, worldId: string, callBack: Function) {
		if (this.allWorlds[worldId] === undefined) return

		this.LeaveWorldPlayer(socket)

		let players: { sID: string; uID: string }[] = []
		Object.keys(this.allWorlds[worldId].users).forEach((sID) => {
			if (this.allWorlds[worldId].users[sID] !== undefined) {
				if (this.allWorlds[worldId].users[sID].uID !== null) {
					players.push({
						sID: sID,
						uID: this.allWorlds[worldId].users[sID].uID,
					})
				}
			}
		})

		this.JoinWorldPlayer(socket, worldId)

		this.Status()

		const world = this.allUsers[socket.id].world
		if (world !== null) {
			callBack({
				worldId: world.worldId ? world.worldId : null,
				lastMapID: world.lastMapID ? world.lastMapID : null,
				lastScenarioID: world.lastScenarioID ? world.lastScenarioID : null,
				players: players,
			})
		}
	}

	private OnChangeFinish(socket: Socket | { id: string }, worldId: string) {
		if (this.allWorlds[worldId] === undefined) return
		if (this.allUsers[socket.id] === undefined) return
		if (this.allUsers[socket.id].world === null) return
		if (this.allUsers[socket.id].character !== null) return
		this.allUsers[socket.id].addUser(this.allWorlds[worldId])
	}

	private OnLeave(socket: Socket | { id: string }, worldId: string, callBack: Function) {
		this.LeaveWorldPlayer(socket)
		this.Status()
		callBack({ worldId: null })
	}

	private OnMap(sID: string, mapName: string) {
		console.log(`Map: ${mapName}`)
		if (this.allUsers[sID] === undefined) return
		const world = this.allUsers[sID].world
		if (world === null) return
		world.launchMap(mapName, false, true)

		{
			if (this.io !== null && world.worldId !== null) this.io.in(world.worldId).emit('map', mapName)
			else {
				Object.keys(world.users).forEach((wsID) => {
					if (world.users[wsID] !== undefined) {
						if (world.users[wsID].ws !== null) {
							if (Common.packager === Packager.JSON)
								world.users[wsID].ws.send(JSON.stringify({ type: 'map', params: { map: mapName } }))
							/* else if (Common.packager === Packager.MsgPacker)
								world.users[wsID].ws.send(pack({ type: "map", params: { map: mapName } })) */
						}
					}
				})
			}
		}
	}

	private OnScenario(sID: string, scenarioName: string) {
		console.log(`Scenario: ${scenarioName}`)
		const world = this.allUsers[sID].world
		if (world === null) return
		world.launchScenario(scenarioName, false)

		{
			if (this.io !== null && world.worldId !== null) this.io.in(world.worldId).emit('scenario', scenarioName)
			else {
				Object.keys(world.users).forEach((wsID) => {
					if (world.users[wsID] !== undefined) {
						if (world.users[wsID].ws !== null) {
							if (Common.packager === Packager.JSON)
								world.users[wsID].ws.send(
									JSON.stringify({ type: 'scenario', params: { scenario: scenarioName } })
								)
							/* else if (Common.packager === Packager.MsgPacker)
								world.users[wsID].ws.send(pack({ type: "scenario", params: { scenario: scenarioName } })) */
						}
					}
				})
			}
		}
	}

	private OnUpdate(sID: string, message: any, callBack: Function) {
		if (this.allUsers[sID] !== undefined) {
			this.allUsers[sID].timeStamp = message.timeStamp
			this.allUsers[sID].ping = message.ping
		}
		callBack()
	}

	private OnMessage(messageData: { [id: string]: string }) {
		if (messageData.sID === undefined) return
		if (this.allUsers[messageData.sID] === undefined) return
		const uID = this.allUsers[messageData.sID].uID
		if (uID === null) return
		const world = this.allUsers[messageData.sID].world
		if (world === null) {
			if (this.io !== null) this.io.in(messageData.sID).emit('message', messageData)
			else {
				const ws = this.allUsers[messageData.sID].ws
				if (ws !== null) {
					if (Common.packager === Packager.JSON)
						ws.send(JSON.stringify({ type: 'message', params: messageData }))
					/* else if (Common.packager === Packager.MsgPacker)
						ws.send(pack({ type: "message", params: messageData })) */
				}
			}
			return
		}
		world.chatData.push({ from: uID, message: messageData.message })

		{
			if (this.io !== null && world.worldId !== null) this.io.in(world.worldId).emit('message', messageData)
			else {
				Object.keys(world.users).forEach((wsID) => {
					if (world.users[wsID] !== undefined) {
						if (world.users[wsID].ws !== null) {
							if (Common.packager === Packager.JSON)
								world.users[wsID].ws.send(JSON.stringify({ type: 'message', params: messageData }))
							/* else if (Common.packager === Packager.MsgPacker)
								world.users[wsID].ws.send(pack({ type: "message", params: messageData })) */
						}
					}
				})
			}
		}
	}

	private ForSocketLoop(worldId: string) {
		if (Common.sender !== DataSender.SocketLoop) return
		if (this.allWorlds[worldId] === undefined) return

		let alldata = this.GetLatestWorldData(worldId)

		{
			if (this.io !== null) this.io.in(worldId).emit('update', alldata)
			else {
				Object.keys(this.allWorlds[worldId].users).forEach((sID) => {
					if (
						this.allWorlds[worldId].users[sID] !== undefined &&
						this.allWorlds[worldId].users[sID].uID !== null
					) {
						if (this.allWorlds[worldId].users[sID].ws !== null)
							if (Common.packager === Packager.JSON)
								this.allWorlds[worldId].users[sID].ws.send(
									JSON.stringify({ type: 'update', params: alldata })
								)
						/* else if (Common.packager === Packager.MsgPacker)
							this.allWorlds[worldId].users[sID].ws.send(pack({ type: "update", params: alldata })) */
					}
				})
			}
		}
	}

	private ForOutofWorld() {
		if (Common.sender !== DataSender.SocketLoop) return
		let alldata = this.GetLatestWorldData(null)

		Object.keys(this.allUsers).forEach((sID) => {
			if (
				this.allUsers[sID] !== undefined &&
				this.allUsers[sID].uID !== null &&
				this.allUsers[sID].world === null
			) {
				if (this.io !== null) this.io.in(sID).emit('update', alldata)
				else if (this.allUsers[sID].ws) {
					if (Common.packager === Packager.JSON)
						this.allUsers[sID].ws.send(JSON.stringify({ type: 'update', params: alldata }))
					/* else if (Common.packager === Packager.MsgPacker)
						this.allUsers[sID].ws.send(pack({ type: "update", params: alldata })) */
				}
			}
		})
	}

	private GetLatestWorldData(worldId: string | null) {
		let alldata: { [id: string]: any } = {}
		// All World Id
		{
			Object.keys(this.allWorlds).forEach((id) => {
				const users: string[] = []
				Object.keys(this.allWorlds[id].users).forEach((sID) => {
					if (this.allWorlds[id].users[sID] !== undefined && this.allWorlds[id].users[sID].uID !== null) {
						users.push(this.allWorlds[id].users[sID].uID)
					}
				})
				alldata[id] = {
					uID: id,
					msgType: MessageTypes.World,
					users: users,
				}
			})
		}

		// All Player Data
		{
			Object.keys(this.allUsers).forEach((id) => {
				if (this.allUsers[id] !== undefined && this.allUsers[id].uID != null) {
					if (this.allUsers[id].world !== null) {
						this.allUsers[id].data.timeScaleTarget = this.allUsers[id].world.timeScaleTarget
						this.allUsers[id].data.sun.elevation = this.allUsers[id].world.sunConf.elevation
						this.allUsers[id].data.sun.azimuth = this.allUsers[id].world.sunConf.azimuth
					} else {
						this.allUsers[id].data.timeScaleTarget = 1
						this.allUsers[id].data.sun.elevation = 60
						this.allUsers[id].data.sun.azimuth = 45
					}
					let dataClient = this.allUsers[id].Out()
					alldata[id] = dataClient
				}
			})
		}

		if (worldId !== null) {
			// Chracter Data
			{
				this.allWorlds[worldId].characters.forEach((char) => {
					char.ping = Date.now() - char.timeStamp
					char.timeStamp = Date.now()
					if (char.uID !== null) alldata[char.uID] = char.Out()
				})
			}

			// Vehicle Data
			{
				this.allWorlds[worldId].vehicles.forEach((vehi) => {
					vehi.ping = Date.now() - vehi.timeStamp
					vehi.timeStamp = Date.now()
					if (vehi.uID !== null) alldata[vehi.uID] = vehi.Out()
				})
			}

			// World Water Data
			{
				this.allWorlds[worldId].waters.forEach((water) => {
					water.ping = Date.now() - water.timeStamp
					water.timeStamp = Date.now()
					if (water.uID !== null) alldata[water.uID] = water.Out()
				})
			}
		}

		return alldata
	}

	private RemoveUnusedWorlds() {
		let toRemoveServer: WorldServer[] = []
		Object.keys(this.allWorlds).forEach((worldId) => {
			if (this.allWorlds[worldId] !== undefined) {
				let toRemoveUser: string[] = []
				Object.keys(this.allWorlds[worldId].users).forEach((sID) => {
					if (this.allWorlds[worldId].users[sID] === undefined) toRemoveUser.push(sID)
				})
				while (toRemoveUser.length) {
					const user = toRemoveUser.pop()
					if (user != undefined) {
						this.dispatchEvent(
							new CustomEvent('worldclientremove', {
								detail: {
									wid: worldId,
									sid: user,
								},
							})
						)
						delete this.allWorlds[worldId].users[user]
					}
				}
				let count = 0
				Object.keys(this.allWorlds[worldId].users).forEach((sID) => {
					if (this.allWorlds[worldId].users[sID] !== undefined) count++
				})
				if (count === 0) {
					toRemoveServer.push(this.allWorlds[worldId])
				}
			}
		})

		while (toRemoveServer.length) {
			const server = toRemoveServer.pop()
			if (server !== undefined) {
				let hasNoHold = true
				const worldId = server.worldId
				if (worldId !== null) {
					Object.keys(this.allUsers).forEach((sID) => {
						if (worldId.includes(sID)) {
							hasNoHold = false
						}
					})
					if (hasNoHold) {
						console.log('World Removed: ' + worldId)
						this.dispatchEvent(
							new CustomEvent('worlddestroyed', {
								detail: {
									id: worldId,
								},
							})
						)
						delete this.allWorlds[worldId]
					}
				}
			}
		}
	}

	public Status() {
		if (Common.eachNewWorld === WorldCreation.OneForEach) this.RemoveUnusedWorlds()
		console.log()
		console.log('-----------')
		console.log(`Users: ${Object.keys(this.allUsers).length}, Worlds: ${Object.keys(this.allWorlds).length}`)
		Object.keys(this.allWorlds).forEach((wid) => {
			if (this.allWorlds[wid] !== undefined) {
				console.log(
					`\tWID: ${this.allWorlds[wid].worldId}, Users: ${
						Object.keys(this.allWorlds[wid].users).length
					}, Running: ${this.allWorlds[wid].runner !== null}`
				)
				Object.keys(this.allWorlds[wid].users).forEach((sID) => {
					if (this.allWorlds[wid].users[sID] !== undefined) {
						console.log(`\t\t${sID}: ${this.allWorlds[wid].users[sID].uID}`)
					} else console.log(`\t\t${sID}: unf`)
				})
			}
		})
	}

	public Start(privateHost: boolean = false) {
		this.server = new http.Server(this.app)
		if (Common.conn === Communication.SocketIO) {
			this.io = new Server(this.server, {
				parser: parser,
				cors: {
					origin: ['https://admin.socket.io'],
					credentials: true,
				},
			})
			instrument(this.io, { auth: false, mode: 'development' })
			this.io.engine.on('connection', (rawSocket) => {
				rawSocket.request = null
			})
			this.wss = null
		} else if (Common.conn === Communication.WebSocket) {
			this.io = null
			this.wss = new WebSocketServer({ server: this.server /* port: 3001 */ })
		} else {
			this.io = null
			this.wss = null
		}

		{
			this.io_g = geckosServer.geckos({
				iceServers: geckosServer.iceServers,
				portRange: {
					min: process.env.PORT_RANGE_MIN ? parseInt(process.env.PORT_RANGE_MIN) : 10000,
					max: process.env.PORT_RANGE_MAX ? parseInt(process.env.PORT_RANGE_MAX) : 10007,
				},
				cors: {
					origin: '*',
					allowAuthorization: true,
				},
			})

			this.io_g.addServer(this.server)

			this.io_g.onConnection((channel) => {
				console.log(channel.id)
				channel.onDisconnect(() => {
					console.log(`${channel.id} got disconnected`)
				})

				channel.emit('chat message', `Welcome to the chat ${channel.id}!`)

				channel.on('chat message', (data) => {
					channel.room.emit('chat message', data)
				})
			})
		}

		this.server.listen(this.port, privateHost ? '127.0.0.1' : '0.0.0.0', () => {
			console.log(`Server listening on port ${this.port}.`)
			this.initCommunication()
		})
	}

	public Stop() {
		if (Common.conn === Communication.SocketIO && this.io !== null) {
			this.io.close()
			this.io = null
		} else if (Common.conn === Communication.WebSocket && this.wss !== null) {
			const connKeys = Object.keys(this.allUsers)
			for (let i = 0; i < connKeys.length; ++i) {
				const ws = this.allUsers[connKeys[i]].ws
				if (ws !== null) ws.close(4000, 'server Closed')
			}
			this.wss.close()
			this.wss = null
		}

		if (this.server !== null) {
			this.server.close()
			this.server = null
		}
		console.log(`Server closed on port ${this.port}.`)
	}

	public GetWorld(wid: string): WorldServer | undefined {
		return this.allWorlds[wid]
	}
}

/* if (path.basename(process.argv[0]).includes('node')) {
	new AppServer(port).Start()
} */

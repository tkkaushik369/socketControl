import './css/main.css'
import * as THREE from 'three'
import { io, Socket } from 'socket.io-client'
import WorldClient from './ts/WorldClient'
import { Player } from '../server/ts/Player'
import { PlayerData } from '../server/ts/Messages/Message'

if (navigator.userAgent.includes('QtWebEngine')) {
	document.body.classList.add('bodyTransparent')
	console.log('transparent')
}

const pingStats = document.getElementById('pingStats') as HTMLDivElement
const workBox = document.getElementById('work') as HTMLDivElement

export default class AppClient {

	private io: Socket

	private worldClient: WorldClient
	private player: Player | null
	private clients: { [id: string]: Player }

	private fixedTimeStep: number

	constructor() {
		// Bind Functions
		this.OnConnect = this.OnConnect.bind(this)
		this.OnDisConnect = this.OnDisConnect.bind(this)
		this.OnSetID = this.OnSetID.bind(this)
		this.OnRemoveClient = this.OnRemoveClient.bind(this)
		this.OnPlayers = this.OnPlayers.bind(this)
		this.ForSocketLoop = this.ForSocketLoop.bind(this)

		// Init
		this.clients = {}
		this.fixedTimeStep = 1.0 / 60.0; // fps
		
		this.io = io()
		this.worldClient = new WorldClient(this.clients)
		this.player = null


		// Socket
		this.io.on("connect", this.OnConnect);
		this.io.on("disconnect", this.OnDisConnect);
		this.io.on("setid", this.OnSetID);
		this.io.on("removeClient", this.OnRemoveClient);
		this.io.on("players", this.OnPlayers);
		setInterval(this.ForSocketLoop, this.fixedTimeStep * 1000)
	}

	private OnConnect() {
		console.log("Connected")
	}

	private OnDisConnect(str: string) {
		console.log("Disconnect " + str)
	}

	private OnSetID(message: PlayerData, callBack: Function) {
		this.player = new Player(message.id)
		this.player.userName = "Player " + message.data.count
		console.log("Username: " + this.player.userName)
		callBack(this.player.userName)
		setInterval(this.ForSocketLoop, this.fixedTimeStep * 1000)
	}

	private OnRemoveClient(id: string) {
		console.log("Removed: " + id)
		if (this.clients[id]) delete this.clients[id]
	}

	private OnPlayers(playersData: { [id: string]: PlayerData }) {
		pingStats.innerHTML = "Ping: " + "<br>"
		Object.keys(playersData).forEach((id) => {
			if (this.clients[id] === undefined) {
				this.clients[id] = new Player(id)
				this.clients[id].userName = playersData[id].userName

			}

			this.clients[id].userName = playersData[id].userName
			this.clients[id].data.count = playersData[id].data.count
			this.clients[id].timeStamp = playersData[id].timeStamp
			this.clients[id].ping = playersData[id].ping

			if(this.clients[id].userName != null) {
				pingStats.innerHTML += this.clients[id].userName + ": "
				pingStats.innerHTML	+= this.clients[id].ping + "<br>"
			}
		})
	}

	private ForSocketLoop() {
		if(this.player !== null) this.io.emit("update", this.player.Out())
	}
}

new AppClient();
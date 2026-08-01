import * as THREE from 'three'
import { WorldBase, Speaker, MapConfigType } from '@World'
import { JSDOM } from 'jsdom'
import fs from 'node:fs'
import path from 'node:path'
import { Worker } from 'node:worker_threads'
// import progress  from 'progress-stream'

export class WorldServer extends WorldBase {
	private modelCache: { [id: string]: any } = {}

	constructor(maps: MapConfigType[], baseRootPath: string, updatePhysicsCallback: Function | null = null) {
		super(maps, baseRootPath)

		// bind function
		this.readJSON = this.readJSON.bind(this)
		this.getGLTF = this.getGLTF.bind(this)
		this.getJSON = this.getJSON.bind(this)
		this.loadScene = this.loadScene.bind(this)
		this.CreateWorker = this.CreateWorker.bind(this)

		// init
		this.updatePhysicsCallback = updatePhysicsCallback
	}

	private readJSON(/* resPath: string */) {
		if (typeof window === 'undefined') {
			const dom = new JSDOM()
			;(global as any).window = dom.window
			;(global as any).document = dom.window.document
			;(global as any).HTMLImageElement = Object
		}

		// return fs.readFileSync(resPath, 'utf8')
	}

	public getGLTF(path: string, callback: Function) {
		const resPath = super.getGLTF(path, callback)
		let trackerEntry = this.loadingManager.addLoadingEntry(path)
		if (this.modelCache[resPath] !== undefined) {
			const jsonObj = JSON.parse(this.modelCache[resPath])
			const loader = new THREE.ObjectLoader()
			const model = loader.parse(jsonObj) as any
			callback({ scene: model, animations: model.animations })
			this.loadingManager.doneLoading(trackerEntry)
			return resPath
		}

		/* const data: string =  */ this.readJSON(/* resPath */)
		// fs.readFileSync(resPath, 'utf8')
		fs.readFile(resPath, 'utf8', (err, data) => {
			const jsonObj = JSON.parse(data)
			this.modelCache[resPath] = data
			const loader = new THREE.ObjectLoader()
			const model = loader.parse(jsonObj) as any
			callback({ scene: model, animations: model.animations })
			this.loadingManager.doneLoading(trackerEntry)
		})
		return resPath
	}

	public getJSON(path: string, callback: Function) {
		const resPath = super.getJSON(path, callback)
		let trackerEntry = this.loadingManager.addLoadingEntry(path)
		/* const data = */ this.readJSON(/* resPath.path */)
		fs.readFile(resPath.path, 'utf8', (err, data) => {
			callback(JSON.parse(data))
			this.loadingManager.doneLoading(trackerEntry)
		})
		return resPath
		// return JSON.parse(data)
	}

	public loadScene(gltf: any, isLaunmch: boolean = true): void {
		super.loadScene(gltf, isLaunmch)
		// this.add(new Speaker())
	}

	public CreateWorker(msgFunc: Function) {
		// super.sendWorker(msg)
		console.log("baseRootPath", this.baseRootPath)
		const worker = new Worker(path.join(this.baseRootPath, '@WorldServer/WorkerServer.js'))
		worker.on('error', (err: any) => {
			console.log(`Worker Error: ${err}`)
		})
		worker.on('exit', (code) => {
			console.log(`exit code: ${code}`)
		})
		worker.on('message', (msg: any) => {
			// console.log(`World: ${msg}`)
			msgFunc(msg)
		})
		// console.log(`WorldServerSend: ${msg}`)
		// worker.on('message', (rmsg: any) => this.fromWorker(rmsg))
		// worker.postMessage(msg)
		return worker
	}
}

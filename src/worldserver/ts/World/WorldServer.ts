import * as THREE from 'three'
import { WorldBase, Speaker, MapConfigType } from '@World'
import { JSDOM } from 'jsdom'
import fs from 'node:fs'
// import progress  from 'progress-stream'

export class WorldServer extends WorldBase {
	modelCache: { [id: string]: any } = {}

	constructor(maps: MapConfigType[], updatePhysicsCallback: Function | null = null) {
		super(maps)
		// bind function
		this.readJSON = this.readJSON.bind(this)
		this.getGLTF = this.getGLTF.bind(this)
		this.getJSON = this.getJSON.bind(this)
		this.loadScene = this.loadScene.bind(this)

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
}

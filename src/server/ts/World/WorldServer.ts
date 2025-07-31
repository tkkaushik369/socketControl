import * as THREE from 'three'
import { WorldBase, Speaker } from '@World'
import { JSDOM } from 'jsdom'
import fs from 'node:fs'

export class WorldServer extends WorldBase {
	modelCache: { [id: string]: any } = {}

	constructor(updatePhysicsCallback: Function | null = null) {
		super()
		// bind function
		this.readJSON = this.readJSON.bind(this)
		this.getGLTF = this.getGLTF.bind(this)
		this.getJSON = this.getJSON.bind(this)
		this.loadScene = this.loadScene.bind(this)

		// init
		this.updatePhysicsCallback = updatePhysicsCallback
	}

	private readJSON(resPath: string) {
		if (typeof window === 'undefined') {
			const dom = new JSDOM()
			;(global as any).window = dom.window
			;(global as any).document = dom.window.document
			;(global as any).HTMLImageElement = Object
		}

		return fs.readFileSync(resPath, 'utf8')
	}

	public getGLTF(path: string, callback: Function) {
		const resPath = super.getGLTF(path, callback)

		if (this.modelCache[resPath] !== undefined) {
			const jsonObj = JSON.parse(this.modelCache[resPath])
			const loader = new THREE.ObjectLoader()
			const model = loader.parse(jsonObj) as any
			callback({ scene: model, animations: model.animations })
			return resPath
		}

		const data: string = this.readJSON(resPath)
		const jsonObj = JSON.parse(data)
		this.modelCache[resPath] = data

		const loader = new THREE.ObjectLoader()
		const model = loader.parse(jsonObj) as any
		callback({ scene: model, animations: model.animations })
		return resPath
	}

	public getJSON(path: string, callback: Function) {
		const resPath = super.getJSON(path, callback)
		const data = this.readJSON(resPath.path)
		callback(JSON.parse(data))
		return resPath
		// return JSON.parse(data)
	}

	public loadScene(gltf: any, isLaunmch: boolean = true): void {
		super.loadScene(gltf, isLaunmch)
		this.add(new Speaker())
	}
}

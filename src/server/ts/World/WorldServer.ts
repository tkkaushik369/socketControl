import * as THREE from 'three'
import { WorldBase } from "./WorldBase"
import { JSDOM } from 'jsdom'
import fs from 'fs'
import { Speaker } from './Spaker'

export class WorldServer extends WorldBase {

	modelCache: { [id: string]: any } = {}

	constructor(updatePhysicsCallback: Function | null = null) {
		super()
		// bind function
		this.getGLTF = this.getGLTF.bind(this)
		this.loadScene = this.loadScene.bind(this)

		// init
		this.updatePhysicsCallback = updatePhysicsCallback
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

		const dom = new JSDOM();
		(global as any).window = dom.window;
		(global as any).document = dom.window.document;
		(global as any).HTMLImageElement = typeof window === 'undefined' ? Object : window.HTMLImageElement

		const data: string = fs.readFileSync(resPath, 'utf8')
		const jsonObj = JSON.parse(data)
		this.modelCache[resPath] = data

		const loader = new THREE.ObjectLoader()
		const model = loader.parse(jsonObj) as any
		callback({ scene: model, animations: model.animations })
		return resPath
	}

	public loadScene(gltf: any, isLaunmch: boolean = true): void {
		super.loadScene(gltf, isLaunmch)
		this.add(new Speaker())
	}
}
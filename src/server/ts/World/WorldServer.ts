import * as THREE from 'three'
import { WorldBase } from "./WorldBase";
import { JSDOM } from 'jsdom'
import fs from 'fs'

export class WorldServer extends WorldBase {
	constructor(updatePhysicsCallback: Function | null = null) {
		super()
		// bind function
		this.getGLTF = this.getGLTF.bind(this)

		// init
		this.updatePhysicsCallback = updatePhysicsCallback
	}

	public getGLTF(path: string, callback: Function) {
		super.getGLTF(path, callback)
		const dom = new JSDOM();
		(global as any).window = dom.window;
		(global as any).document = dom.window.document;
		(global as any).HTMLImageElement = typeof window === 'undefined' ? Object : window.HTMLImageElement

		const data: string = fs.readFileSync(path, 'utf8');
		const jsonObj = JSON.parse(data)

		const loader = new THREE.ObjectLoader();
		const model = loader.parse(jsonObj) as any
		callback({ scene: model, animation: model.animations })
	}
}
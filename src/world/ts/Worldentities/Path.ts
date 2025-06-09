import * as THREE from 'three'
import { PathNode } from './PathNode'

export class Path {
	public nodes: { [nodeName: string]: PathNode } = {}
	public name: String | null
	public rootNode: THREE.Object3D

	constructor(root: THREE.Object3D) {
		this.rootNode = root
		this.name = null

		if (this.rootNode.hasOwnProperty('name')) {
			this.name = this.rootNode.userData.name
		}
		this.rootNode.traverse((child) => {
			this.addNode(child)
		})

		this.connectNodes()
	}

	public addNode(child: any): void {
		if (child.hasOwnProperty('userData') && child.userData.hasOwnProperty('data')) {
			if (child.userData.data === 'pathNode') {
				let node = new PathNode(child, this)
				this.nodes[child.userData.name] = node
			}
		}
	}

	public connectNodes(): void {
		for (const nodeName in this.nodes) {
			if (this.nodes.hasOwnProperty(nodeName)) {
				const node = this.nodes[nodeName]
				node.nextNode = this.nodes[node.object.userData.nextNode]
				node.previousNode = this.nodes[node.object.userData.previousNode]
			}
		}
	}
}

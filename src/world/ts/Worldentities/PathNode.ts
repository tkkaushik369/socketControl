import * as THREE from 'three'
import { Path } from './Path'

export class PathNode {
	public object: THREE.Object3D
	public path: Path
	public nextNode: PathNode | null
	public previousNode: PathNode | null

	constructor(child: THREE.Object3D, path: Path) {
		this.object = child
		this.path = path
		this.nextNode = null
		this.previousNode = null
	}
}

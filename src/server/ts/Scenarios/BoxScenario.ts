import * as THREE from 'three'
import * as Utility from '../Utils/Utility'

export const BoxScenario = (): THREE.Scene => {
	var scene = new THREE.Scene()

	const floor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.2, 10), new THREE.MeshStandardMaterial({ color: Number(Utility.default.getRandomMutedColor("0x")) }))
	floor.userData["visible"] = "true"
	floor.userData["physics"] = "box"
	floor.userData["name"] = "floor"
	floor.userData["mass"] = "0"
	scene.add(floor)

	const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: Number(Utility.default.getRandomMutedColor("0x")) }))
	box.userData["visible"] = "true"
	box.userData["physics"] = "box"
	box.userData["name"] = "box"
	box.userData["mass"] = "1"
	box.position.y = 3
	scene.add(box)

	return scene
}
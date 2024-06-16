import * as THREE from 'three'
import * as Utility from '../Utils/Utility'

export const CameraScenario = (): THREE.Scene => {
	var scene = new THREE.Scene()

	const camera = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.9), new THREE.MeshStandardMaterial({ color: Number(Utility.default.getRandomMutedColor("0x")) }))
	camera.userData["visible"] = "true"
	camera.userData["physics"] = "box"
	camera.userData["name"] = "camera"
	camera.userData["mass"] = "0"
	// camera.position.z = (0.9 / 2) + 0.25
	// camera.position.y = -0.1
	scene.add(camera)

	const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.25, 0.25, 4), new THREE.MeshStandardMaterial({ color: Number(Utility.default.getRandomMutedColor("0x")) }))
	lens.userData["visible"] = "true"
	lens.userData["name"] = "lens"
	lens.position.z = -(0.9 / 2) - (0.2 / 2)
	lens.position.y = 0.1
	lens.rotation.x = Math.PI / 2
	lens.rotation.y = -Math.PI / 4
	camera.add(lens)

	const reelIn = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 32), new THREE.MeshStandardMaterial({ color: Number(Utility.default.getRandomMutedColor("0x")) }))
	reelIn.userData["visible"] = "true"
	reelIn.userData["name"] = "reelIn"
	reelIn.position.y = 0.4
	reelIn.position.z = 0.2
	reelIn.rotation.z = Math.PI / 2
	camera.add(reelIn)

	const reelOut = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 32), new THREE.MeshStandardMaterial({ color: Number(Utility.default.getRandomMutedColor("0x")) }))
	reelOut.userData["visible"] = "true"
	reelOut.userData["name"] = "reelOut"
	reelOut.position.y = 0.4
	reelOut.position.z = -0.2
	reelOut.rotation.z = Math.PI / 2
	camera.add(reelOut)

	scene.position.z = (0.9 / 2) + 0.25
	scene.position.y = -0.1

	return scene
}
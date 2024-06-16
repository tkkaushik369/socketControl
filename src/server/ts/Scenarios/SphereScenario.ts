import * as THREE from 'three'
import * as Utility from '../Utils/Utility'

export const SphereScenario = (): THREE.Scene => {
	const scene = new THREE.Scene()

	const floor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.2, 10), new THREE.MeshStandardMaterial({ color: Number(Utility.default.getRandomMutedColor("0x")) }))
	floor.userData["visible"] = "true";
	floor.userData["physics"] = "box";
	floor.userData["name"] = "floor";
	floor.userData["mass"] = "0"
	scene.add(floor)

	const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.5), new THREE.MeshStandardMaterial({ color: Number(Utility.default.getRandomMutedColor("0x")) }))
	sphere.userData["visible"] = "true";
	sphere.userData["physics"] = "sphere";
	sphere.userData["name"] = "sphere";
	sphere.userData["mass"] = "1"
	sphere.position.y = 3
	sphere.position.x = 3
	scene.add(sphere)

	return scene
}
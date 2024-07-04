import * as THREE from 'three'
import * as Utility from '../Utils/Utility'

export const PlaygroundScenario = (): THREE.Scene => {
	const scene = new THREE.Scene()
	let sx = 25, sy = 0.4, sz = 20;
	let t = 0.2, offY = 0.8

	const floor = new THREE.Mesh(new THREE.BoxGeometry(sx, t, sz), new THREE.MeshStandardMaterial({ color: Number(Utility.default.getRandomMutedColor("0x")) }))
	floor.userData["visible"] = "true";
	floor.userData["physics"] = "box";
	floor.userData["name"] = "floor";
	floor.userData["mass"] = "0"
	floor.castShadow = true
	floor.receiveShadow = true
	scene.add(floor)

	const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: Number(Utility.default.getRandomMutedColor("0x")) }))
	box.userData["visible"] = "true"
	box.userData["physics"] = "box"
	box.userData["name"] = "box"
	box.userData["mass"] = "1"
	box.castShadow = true
	box.receiveShadow = true
	box.position.y = 3
	scene.add(box)

	const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.5), new THREE.MeshStandardMaterial({ color: Number(Utility.default.getRandomMutedColor("0x")) }))
	sphere.userData["visible"] = "true";
	sphere.userData["physics"] = "sphere";
	sphere.userData["name"] = "sphere";
	sphere.userData["mass"] = "1"
	sphere.castShadow = true
	sphere.receiveShadow = true
	sphere.position.y = 3
	sphere.position.x = 3
	scene.add(sphere)

	{
		const floorBorderNorth = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, t), new THREE.MeshStandardMaterial({ color: Number(Utility.default.getRandomMutedColor("0x")) }))
		floorBorderNorth.userData["visible"] = "true";
		floorBorderNorth.userData["physics"] = "box";
		floorBorderNorth.userData["name"] = "floorBorderNorth";
		floorBorderNorth.userData["mass"] = "0"
		floorBorderNorth.castShadow = true
		floorBorderNorth.receiveShadow = true
		floorBorderNorth.position.z = -(sz/2) + (t/2)
		floorBorderNorth.position.y = (sy/2) + (t/2) + offY
		scene.add(floorBorderNorth)

		const floorBorderSouth = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, t), new THREE.MeshStandardMaterial({ color: Number(Utility.default.getRandomMutedColor("0x")) }))
		floorBorderSouth.userData["visible"] = "true";
		floorBorderSouth.userData["physics"] = "box";
		floorBorderSouth.userData["name"] = "floorBorderSouth";
		floorBorderSouth.userData["mass"] = "0"
		floorBorderSouth.castShadow = true
		floorBorderSouth.receiveShadow = true
		floorBorderSouth.position.z = (sz/2) - (t/2)
		floorBorderSouth.position.y = (sy/2) + (t/2) + offY
		scene.add(floorBorderSouth)

		const floorBorderWest = new THREE.Mesh(new THREE.BoxGeometry(t, sy, sz-(2*t)), new THREE.MeshStandardMaterial({ color: Number(Utility.default.getRandomMutedColor("0x")) }))
		floorBorderWest.userData["visible"] = "true";
		floorBorderWest.userData["physics"] = "box";
		floorBorderWest.userData["name"] = "floorBorderWest";
		floorBorderWest.userData["mass"] = "0"
		floorBorderWest.castShadow = true
		floorBorderWest.receiveShadow = true
		floorBorderWest.position.x = -(sx/2) + (t/2)
		floorBorderWest.position.y = (sy/2) + (t/2) + offY
		scene.add(floorBorderWest)

		const floorBorderEast = new THREE.Mesh(new THREE.BoxGeometry(t, sy, sz-(2*t)), new THREE.MeshStandardMaterial({ color: Number(Utility.default.getRandomMutedColor("0x")) }))
		floorBorderEast.userData["visible"] = "true";
		floorBorderEast.userData["physics"] = "box";
		floorBorderEast.userData["name"] = "floorBorderEast";
		floorBorderEast.userData["mass"] = "0"
		floorBorderEast.castShadow = true
		floorBorderEast.receiveShadow = true
		floorBorderEast.position.x = (sx/2) - (t/2)
		floorBorderEast.position.y = (sy/2) + (t/2) + offY
		scene.add(floorBorderEast)
	}

	return scene
}
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
		floorBorderNorth.position.z = -(sz / 2) + (t / 2)
		floorBorderNorth.position.y = (sy / 2) + (t / 2) + offY
		scene.add(floorBorderNorth)

		const floorBorderSouth = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, t), new THREE.MeshStandardMaterial({ color: Number(Utility.default.getRandomMutedColor("0x")) }))
		floorBorderSouth.userData["visible"] = "true";
		floorBorderSouth.userData["physics"] = "box";
		floorBorderSouth.userData["name"] = "floorBorderSouth";
		floorBorderSouth.userData["mass"] = "0"
		floorBorderSouth.castShadow = true
		floorBorderSouth.receiveShadow = true
		floorBorderSouth.position.z = (sz / 2) - (t / 2)
		floorBorderSouth.position.y = (sy / 2) + (t / 2) + offY
		scene.add(floorBorderSouth)

		const floorBorderWest = new THREE.Mesh(new THREE.BoxGeometry(t, sy, sz - (2 * t)), new THREE.MeshStandardMaterial({ color: Number(Utility.default.getRandomMutedColor("0x")) }))
		floorBorderWest.userData["visible"] = "true";
		floorBorderWest.userData["physics"] = "box";
		floorBorderWest.userData["name"] = "floorBorderWest";
		floorBorderWest.userData["mass"] = "0"
		floorBorderWest.castShadow = true
		floorBorderWest.receiveShadow = true
		floorBorderWest.position.x = -(sx / 2) + (t / 2)
		floorBorderWest.position.y = (sy / 2) + (t / 2) + offY
		scene.add(floorBorderWest)

		const floorBorderEast = new THREE.Mesh(new THREE.BoxGeometry(t, sy, sz - (2 * t)), new THREE.MeshStandardMaterial({ color: Number(Utility.default.getRandomMutedColor("0x")) }))
		floorBorderEast.userData["visible"] = "true";
		floorBorderEast.userData["physics"] = "box";
		floorBorderEast.userData["name"] = "floorBorderEast";
		floorBorderEast.userData["mass"] = "0"
		floorBorderEast.castShadow = true
		floorBorderEast.receiveShadow = true
		floorBorderEast.position.x = (sx / 2) - (t / 2)
		floorBorderEast.position.y = (sy / 2) + (t / 2) + offY
		scene.add(floorBorderEast)
	}

	{
		const angle = 15 * Math.PI / 180;

		const stairs1 = new THREE.Mesh(new THREE.BoxGeometry(4, t, 8), new THREE.MeshStandardMaterial({ color: Number(Utility.default.getRandomMutedColor("0x")) }))
		stairs1.userData["visible"] = "true"
		stairs1.userData["physics"] = "box"
		stairs1.userData["name"] = "stairs1"
		stairs1.userData["mass"] = "0"
		stairs1.castShadow = true
		stairs1.receiveShadow = true
		stairs1.position.x = -(sx / 2) + (4 / 2) + t
		stairs1.position.y = Math.sin(angle) * 4
		stairs1.rotation.x = angle
		scene.add(stairs1)

		const stairConnect = new THREE.Mesh(new THREE.BoxGeometry(4, t, 4), new THREE.MeshStandardMaterial({ color: Number(Utility.default.getRandomMutedColor("0x")) }))
		stairConnect.userData["visible"] = "true"
		stairConnect.userData["physics"] = "box"
		stairConnect.userData["name"] = "stairConnect"
		stairConnect.userData["mass"] = "0"
		stairConnect.castShadow = true
		stairConnect.receiveShadow = true
		stairConnect.position.x = stairs1.position.x
		stairConnect.position.y = Math.sin(angle) * 8
		stairConnect.position.z = - 4 - 1.84
		scene.add(stairConnect)

		const stairs2 = new THREE.Mesh(new THREE.BoxGeometry(8, t, 4), new THREE.MeshStandardMaterial({ color: Number(Utility.default.getRandomMutedColor("0x")) }))
		stairs2.userData["visible"] = "true"
		stairs2.userData["physics"] = "box"
		stairs2.userData["name"] = "stairs2"
		stairs2.userData["mass"] = "0"
		stairs2.castShadow = true
		stairs2.receiveShadow = true
		stairs2.position.x = -(sx / 2) + 4 + t + (Math.cos(angle) * 4)
		stairs2.position.y = stairs1.position.y + (Math.sin(angle) * 8)
		stairs2.position.z = stairConnect.position.z
		stairs2.rotation.z = angle
		scene.add(stairs2)

		const floor2 = new THREE.Mesh(new THREE.BoxGeometry(8, t, 8), new THREE.MeshStandardMaterial({ color: Number(Utility.default.getRandomMutedColor("0x")) }))
		floor2.userData["visible"] = "true"
		floor2.userData["physics"] = "box"
		floor2.userData["name"] = "floor2"
		floor2.userData["mass"] = "0"
		floor2.castShadow = true
		floor2.receiveShadow = true
		floor2.position.x = -(sx / 2) + 4 + t + (Math.cos(angle) * 8) + (8 / 2)
		floor2.position.y = stairs2.position.y + (Math.sin(angle) * 4)
		floor2.position.z = stairConnect.position.z + (8 / 2) - (4 / 2);
		scene.add(floor2)
	}

	return scene
}
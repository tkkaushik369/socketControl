import * as THREE from 'three'
import * as Utility from '../Utils/Utility'
import World from '../World'

export const HauntedHouse = (world: World): THREE.Scene => {
	if (true) {
		if(world.WorldClient != undefined) {
			if(world.WorldClient.ambientLight != undefined) {
				world.WorldClient.ambientLight.intensity = 0
			}
			if(world.WorldClient.directionalLight != undefined) {
				world.WorldClient.directionalLight.intensity = 0
			}
			if(world.WorldClient.outlinePass != undefined) {
				// world.WorldClient.outlinePass.enabled = false
			}
		}
	}

	const scene = new THREE.Scene()

	const floor = new THREE.Mesh(new THREE.BoxGeometry(30, 0.5, 30), new THREE.MeshStandardMaterial({ color: Number(Utility.default.getRandomMutedColor("0x")) }))
	floor.userData["visible"] = "true";
	floor.userData["physics"] = "box";
	floor.userData["name"] = "floor";
	floor.userData["mass"] = "0"
	floor.castShadow = true
	floor.receiveShadow = true
	scene.add(floor)

	const wallNorth = new THREE.Mesh(new THREE.BoxGeometry(20, 10, 0.5), new THREE.MeshStandardMaterial({ color: Number(Utility.default.getRandomMutedColor("0x")) }))
	wallNorth.userData["visible"] = "true";
	wallNorth.userData["physics"] = "box";
	wallNorth.userData["name"] = "wallNorth";
	wallNorth.userData["mass"] = "0"
	wallNorth.castShadow = true
	wallNorth.receiveShadow = true
	wallNorth.position.z = -10
	wallNorth.position.y = 5.25
	scene.add(wallNorth)

	const wallSouth = new THREE.Mesh(new THREE.BoxGeometry(20, 10, 0.5), new THREE.MeshStandardMaterial({ color: Number(Utility.default.getRandomMutedColor("0x")) }))
	wallSouth.userData["visible"] = "true";
	wallSouth.userData["physics"] = "box";
	wallSouth.userData["name"] = "wallSouth";
	wallSouth.userData["mass"] = "0"
	wallSouth.castShadow = true
	wallSouth.receiveShadow = true
	wallSouth.position.z = 10
	wallSouth.position.y = 5.25
	scene.add(wallSouth)

	{
		const bulbGeometry = new THREE.SphereGeometry( 0.02, 16, 8 );
		const bulbLight = new THREE.PointLight( 0xffee88, 2, 100, 2 );

		const bulbMat = new THREE.MeshStandardMaterial( {
			emissive: 0xffffee,
			emissiveIntensity: 1,
			color: 0x000000
		} );
		bulbLight.add( new THREE.Mesh( bulbGeometry, bulbMat ) );
		bulbLight.position.set( 0, 2, -8 );
		bulbLight.castShadow = true;
		bulbLight.userData["name"] = "bulbLight";
		scene.add( bulbLight );
	}
	return scene
}
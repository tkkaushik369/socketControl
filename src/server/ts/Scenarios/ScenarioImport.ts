import * as THREE from 'three'
import World from '../World'

import { BoxScenario } from './BoxScenario'
import { CameraScenario } from './CameraScenario'
import { SphereScenario } from './SphereScenario'

export { BoxScenario } from './BoxScenario'
export { CameraScenario } from './CameraScenario'
export { SphereScenario } from './SphereScenario'

import { Character } from '../Characters/Character'
import { CharacterAI } from '../Characters/CharacterAI'
import * as CharacterStates from '../Characters/CharacterStates'

export function loadScenarios(world: World) {
	world.addScenario('box', () => {
		var scene = BoxScenario()
		world.addScene(scene)
	})

	world.addScenario('camera', () => {
		var scene = CameraScenario()
		world.addScene(scene)
	})

	world.addScenario('sphere', () => {
		const scene = SphereScenario()
		world.addScene(scene)
	})

	// Build Scene
	world.buildScene(0)

	// Load Balls
	world.createBalls()

	// Load Characters
	{
		// Spawn player
		let player = new Character(world, { position: new THREE.Vector3(-6, 5, 6.2) });
		// LoadBoxmanModel(player);
		// world.add(player);
		// player.takeControl();

		// Make player look at the camera
		player.setOrientationTarget(new THREE.Vector3(0, 0, -1));
		player.orientation = new THREE.Vector3(0, 0, -1);

		// Spawn John
		let john = new Character(world, { position: new THREE.Vector3(5, 2, 1) });
		// LoadBoxmanModel(john);
		// john.setBehaviour(new CharacterAI.Random());
		// world.add(john);

		// Spawn Bob
		let bob = new Character(world, { position: new THREE.Vector3(-5, 2, 3) });
		// LoadBoxmanModel(bob);
		// bob.setBehaviour(new CharacterAI.FollowCharacter(player));
		// world.add(bob);
	}
}
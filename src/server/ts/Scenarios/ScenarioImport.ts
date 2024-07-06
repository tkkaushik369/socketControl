import * as THREE from 'three';
import World from '../World'
import Character from '../Characters/Character'
import { CharacterAI } from '../Characters/CharacterAI'

import { BoxScenario } from './BoxScenario'
import { CameraScenario } from './CameraScenario'
import { SphereScenario } from './SphereScenario'
import { PlaygroundScenario } from './PlaygroundScenario'

export { BoxScenario } from './BoxScenario'
export { CameraScenario } from './CameraScenario'
export { SphereScenario } from './SphereScenario'
export { PlaygroundScenario } from './PlaygroundScenario'

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

	world.addScenario('playground', () => {
		const scene = PlaygroundScenario()
		world.addScene(scene)
	})

	// Build Scene
	world.buildScene(3)

	// Load Balls
	world.createBalls()

	// Character
	const john = new Character({ position: new THREE.Vector3(-2, 5, 2) })
	john.setBehaviour(new CharacterAI.Random());
	world.addWorldCharacter(john, "john")

	const bob = new Character({ position: new THREE.Vector3(2, 5, 2) })
	bob.setBehaviour(new CharacterAI.FollowCharacter(john));
	world.addWorldCharacter(bob, "bob")

	/*const player = new Character({ position: new THREE.Vector3(2, 5, 5) })
	world.addWorldCharacter(player, "player")*/

	/*setTimeout(() => {
		world.removeWorldCharacter('player')
	}, 5000)*/
}
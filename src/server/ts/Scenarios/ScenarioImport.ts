import World from '../World'
import { BoxScenario } from './BoxScenario'
import { CameraScenario } from './CameraScenario'
import { SphereScenario } from './SphereScenario'

export { BoxScenario } from './BoxScenario'
export { CameraScenario } from './CameraScenario'
export { SphereScenario } from './SphereScenario'

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
}
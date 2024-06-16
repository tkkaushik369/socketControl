import World from "./World";
import { Player } from "./Player";
import * as ScenarioImport from './Scenarios/ScenarioImport'

export default class WorldServer extends World {

	public constructor(clients: { [id: string]: Player }) {
		super(clients)
		// Bind Functions
		this.buildScene = this.buildScene.bind(this)

		// Loading Scenarios
		ScenarioImport.loadScenarios(this)
	}
}
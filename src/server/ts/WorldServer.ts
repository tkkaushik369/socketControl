import World from "./World";
import { Player } from "./Player";

export default class WorldServer extends World {

	public constructor(clients: { [id: string]: Player }) {
		super(clients)
	}
}
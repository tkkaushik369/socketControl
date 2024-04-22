import * as THREE from 'three'
import World from "../../server/ts/World";
import { Player } from "../../server/ts/Player";

export default class WorldClient extends World {

	public constructor(clients: { [id: string]: Player }) {
		super(clients)
	}
}
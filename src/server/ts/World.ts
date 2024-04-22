import { Player } from "./Player"

export default class World {

	protected clients: { [id: string]: Player }

	public constructor(clients: { [id: string]: Player }) {
		this.clients = clients
	}
}
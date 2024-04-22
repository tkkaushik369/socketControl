export type PlayerDataData = {
	count: number,
}

export type PlayerData = {
	id: string,
	userName: string | null,
	data: PlayerDataData
	timeStamp: number,
	ping: number,
}
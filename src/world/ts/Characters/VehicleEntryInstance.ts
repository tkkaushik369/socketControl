import * as THREE from 'three'
import { VehicleSeat } from '../Vehicles/VehicleSeat'
import { Character } from './Character'

export class VehicleEntryInstance {
	public character: Character
	public targetSeat: VehicleSeat | null
	public entryPoint: THREE.Object3D | null
	public wantsToDrive: boolean = false

	constructor(character: Character) {
		// bind functions
		this.update = this.update.bind(this)

		// init
		this.character = character
		this.targetSeat = null
		this.entryPoint = null
	}

	public update(timeStep: number): void {
		if (this.entryPoint === null) return
		let entryPointWorldPos = new THREE.Vector3()
		this.entryPoint.getWorldPosition(entryPointWorldPos)
		let viewVector = new THREE.Vector3().subVectors(entryPointWorldPos, this.character.position)
		this.character.setOrientation(viewVector)

		let heightDifference = viewVector.y
		viewVector.y = 0
		if (this.character.charState.canEnterVehicles && viewVector.length() < 0.2 && heightDifference < 2) {
			if (this.targetSeat !== null) this.character.enterVehicle(this.targetSeat, this.entryPoint)
		}
	}
}

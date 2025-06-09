import * as THREE from 'three'
import { SeatType } from '../Enums/SeatType'
import { VehicleDoor } from './VehicleDoor'
import { Vehicle } from './Vehicle'
import { Character } from '../Characters/Character'

export class VehicleSeat {
	public vehicle: Vehicle
	public seatPointObject: THREE.Object3D

	// String of names of connected seats
	public connectedSeatsString: string | null
	// Actual seatPoint objects, need to be identified
	// by parsing connectedSeatsString *after* all seats are imported
	public connectedSeats: VehicleSeat[] = []

	public type: SeatType | null
	public entryPoints: THREE.Object3D[] = []
	public door: VehicleDoor | null

	public occupiedBy: Character | null

	constructor(vehicle: Vehicle, object: THREE.Object3D, gltf: any) {
		// bind functions
		this.update = this.update.bind(this)

		// init
		this.vehicle = vehicle
		this.seatPointObject = object
		this.connectedSeatsString = null
		this.type = null
		this.occupiedBy = null
		this.door = null

		if (object.hasOwnProperty('userData') && object.userData.hasOwnProperty('data')) {
			if (object.userData.hasOwnProperty('door_object')) {
				this.door = new VehicleDoor(this, gltf.scene.getObjectByName(object.userData.door_object))
			}

			if (object.userData.hasOwnProperty('entry_points')) {
				let entry_points = (object.userData.entry_points as string).split(';')
				for (const entry_point of entry_points) {
					if (entry_point.length > 0) {
						let entryPoint = gltf.scene.getObjectByName(entry_point)
						if (entryPoint !== undefined) {
							entryPoint.visible = false
							this.entryPoints.push(entryPoint)
						}
					}
				}
			} else {
				console.error('Seat object ' + object + ' has no entry point reference property.')
			}

			if (object.userData.hasOwnProperty('seat_type')) {
				this.type = object.userData.seat_type
			} else {
				console.error('Seat object ' + object + ' has no seat type property.')
			}

			if (object.userData.hasOwnProperty('connected_seats')) {
				this.connectedSeatsString = object.userData.connected_seats
			}
		}
	}

	public update(timeStep: number): void {
		if (this.door !== null) {
			this.door.update(timeStep)
		}
	}
}

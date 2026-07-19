import { Prefabs, clear_cache } from './Prefabs'
import type * as THREE from 'three'

// self.onmessage = function (message) {
export function processData(message: any, callback: (res: any) => void) {
	// console.log(message)
	const mtype = message.type
	const msg = message.data
	// if(mtype !== 'clear_cache') console.log(msg.cityId)

	switch (mtype) {
		case 'clear_cache': {
			clear_cache()
			break
		}
		case 'init_Prefab_Front_Geo': {
			const prefab = Prefabs.Prefab_Front_Geo(
				msg.simple_geometry,
				msg.renderBuildingsRoofs,
				msg.renderBuildingsWindows,
				msg.size,
				msg.floors,
				msg.type
			)
			// self.postMessage({
			callback({
				type: 'init',
				data: {
					cityId: msg.cityId,
					prefab:
						prefab.mesh_type === 'BufferGeometry'
							? prefab.geo.toJSON()
							: {
									w: (prefab.geo as THREE.BoxGeometry).parameters.width,
									h: (prefab.geo as THREE.BoxGeometry).parameters.height,
									d: (prefab.geo as THREE.BoxGeometry).parameters.depth,
								},
					mesh_type: prefab.mesh_type,
					corner: false,
					size: msg.size,
					floors: msg.floors,
					renderBuildingsRoofs: msg.renderBuildingsRoofs,
					renderBuildingsWindows: msg.renderBuildingsRoofs,
					type: msg.type,
				},
			})
			break
		}
		case 'init_Prefab_Corner_Geo': {
			const prefab = Prefabs.Prefab_Corner_Geo(
				msg.simple_geometry,
				msg.renderBuildingsRoofs,
				msg.renderBuildingsWindows,
				msg.size,
				msg.corner,
				msg.floors
			)
			// self.postMessage({
			callback({
				type: 'init',
				data: {
					cityId: msg.cityId,
					prefab:
						prefab.mesh_type === 'BufferGeometry'
							? prefab.geo.toJSON()
							: {
									w: (prefab.geo as THREE.BoxGeometry).parameters.width,
									h: (prefab.geo as THREE.BoxGeometry).parameters.height,
									d: (prefab.geo as THREE.BoxGeometry).parameters.depth,
								},
					mesh_type: prefab.mesh_type,
					corner: true,
					corner_size: msg.corner,
					size: msg.size,
					floors: msg.floors,
					renderBuildingsRoofs: msg.renderBuildingsRoofs,
					renderBuildingsWindows: msg.renderBuildingsRoofs,
					type: 0,
				},
			})
			break
		}
		case 'Prefab_Front_Geo': {
			const prefab = Prefabs.Prefab_Front_Geo(
				msg.simple_geometry,
				msg.renderBuildingsRoofs,
				msg.renderBuildingsWindows,
				msg.size,
				msg.floors,
				msg.type
			)
			// self.postMessage({
			callback({
				type: 'prefab_geo',
				data: {
					cityId: msg.cityId,
					prefab:
						prefab.mesh_type === 'BufferGeometry'
							? prefab.geo.toJSON()
							: {
									w: (prefab.geo as THREE.BoxGeometry).parameters.width,
									h: (prefab.geo as THREE.BoxGeometry).parameters.height,
									d: (prefab.geo as THREE.BoxGeometry).parameters.depth,
								},
					mesh_type: prefab.mesh_type,
					corner: false,
					size: msg.size,
					floors: msg.floors,
					renderBuildingsRoofs: msg.renderBuildingsRoofs,
					renderBuildingsWindows: msg.renderBuildingsRoofs,
					type: msg.type,
					inx: msg.inx,
					i: msg.i,
					o: msg.o,
					pos: msg.pos,
					rot: msg.rot,
				},
			})
			break
		}
		case 'Prefab_Corner_Geo': {
			const prefab = Prefabs.Prefab_Corner_Geo(
				msg.simple_geometry,
				msg.renderBuildingsRoofs,
				msg.renderBuildingsWindows,
				msg.size,
				msg.corner,
				msg.floors
			)
			// self.postMessage({
			callback({
				type: 'prefab_geo',
				data: {
					cityId: msg.cityId,
					prefab:
						prefab.mesh_type === 'BufferGeometry'
							? prefab.geo.toJSON()
							: {
									w: (prefab.geo as THREE.BoxGeometry).parameters.width,
									h: (prefab.geo as THREE.BoxGeometry).parameters.height,
									d: (prefab.geo as THREE.BoxGeometry).parameters.depth,
								},
					mesh_type: prefab.mesh_type,
					corner: true,
					corner_size: msg.corner,
					size: msg.size,
					floors: msg.floors,
					renderBuildingsRoofs: msg.renderBuildingsRoofs,
					renderBuildingsWindows: msg.renderBuildingsRoofs,
					type: msg.type,
					inx: msg.inx,
					i: msg.i,
					o: msg.o,
					pos: msg.pos,
					rot: msg.rot,
				},
			})

			break
		}
		default: {
			callback(msg)
			break
		}
	}
}

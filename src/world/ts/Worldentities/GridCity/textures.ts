// import * as THREE from 'three/webgpu'
// import { uv, mix, color, float, abs, step, fract } from 'three/tsl'

// let roadMat: THREE.MeshBasicNodeMaterial | null = null

// export function RoadMaterial() {
// 	if (roadMat == null) {
// 		// --- Road Parameters ---
// 		const asphaltColor = color('#222222')
// 		const markingColor = color('#ffffff')
// 		const arrowScale = 4.0 // Number of arrows along the road

// 		// 1. Get UV coordinates
// 		const uvs = uv()

// 		// 2. Identify Lane (0 = Left, 1 = Right)
// 		const isRightLane = step(0.5, uvs.x)

// 		// 3. Create local UVs for each lane (0.0 to 1.0 range per lane)
// 		const laneX = fract(uvs.x.mul(2.0))
// 		// Reverse direction for the right lane
// 		const laneY = mix(uvs.y, float(1.0).sub(uvs.y), isRightLane)

// 		// 4. Arrow Shape Function (Procedural)
// 		const drawArrow = (u: any, v: any) => {
// 			const localV = fract(v.mul(arrowScale))

// 			// Center the U coordinate for the arrow logic
// 			const centeredU = abs(u.sub(0.5))

// 			// Arrow Head (Triangle)
// 			const head = step(centeredU, localV.mul(0.5).sub(0.2)).and(step(0.6, localV))

// 			// Arrow Shaft (Rectangle)
// 			const shaft = step(centeredU, 0.05).and(step(0.3, localV)).and(step(localV, 0.6))

// 			return head.or(shaft)
// 		}

// 		// 5. Combine Logic
// 		const arrowMask = drawArrow(laneX, laneY)

// 		// Optional: Center Divider Line
// 		const centerLine = step(abs(uvs.x.sub(0.5)), 0.01)

// 		// Final Color Assembly
// 		const finalRoad = mix(asphaltColor, markingColor, arrowMask.or(centerLine))

// 		// Apply to material
// 		const material = new THREE.MeshBasicNodeMaterial()
// 		material.colorNode = finalRoad

// 		roadMat = material
// 	}

// 	return roadMat
// }

import * as THREE from 'three'

type Run = {
	startI: number // segment index where run begins
	endI: number // segment index where run ends (inclusive)
	spacingAvg: number
	startPoint: THREE.Vector3 // left/right start position
	endPoint: THREE.Vector3 // left/right end position
}

export class Rails {
	public railWidth: number
	public railHeight: number
	public baseSpacing: number
	public segmentLength: number

	public line: THREE.Line
	public railsInstanced: THREE.InstancedMesh
	public sleepersInstanced: THREE.InstancedMesh
	public leftLine: THREE.Line
	public rightLine: THREE.Line

	public sleeperLength: number
	public sleeperCount: number
	public baseLen: number
	public runLens: number[]

	public railGeo: THREE.BoxGeometry
	public railMat: THREE.Material
	public sleeperGeo: THREE.BoxGeometry
	public sleeperMat: THREE.Material

	private m: THREE.Matrix4
	private instIndex: number = 0

	private frames: {
		tangents: THREE.Vector3[]
		normals: THREE.Vector3[]
		binormals: THREE.Vector3[]
	}

	constructor(
		points: THREE.Vector3[],
		railWidth: number = 0.18,
		railHeight: number = 0.22,
		baseSpacing: number = 2.0,
		segmentLength: number = 1.2
	) {
		this.railWidth = railWidth
		this.railHeight = railHeight
		this.baseSpacing = baseSpacing
		this.segmentLength = segmentLength
		const k = 0.7 // medium widening (user selected option 2)
		this.sleeperLength = 1.0
		this.baseLen = 1.0
		this.runLens = []

		this.railGeo = new THREE.BoxGeometry(1, this.railHeight, this.railWidth)
		this.railMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.85, roughness: 0.25 })
		// this.railMat = new THREE.MeshBasicMaterial({ color: 0xaaaaaa, wireframe: true })
		this.sleeperGeo = new THREE.BoxGeometry(this.baseLen, 0.14, 0.35)
		this.sleeperMat = new THREE.MeshStandardMaterial({ color: 0x6f3f22, metalness: 0.05, roughness: 0.9 })
		// this.sleeperMat = new THREE.MeshBasicMaterial({ color: 0x6f3f22, wireframe: true })

		this.frames = { tangents: [], normals: [], binormals: [] }

		// --- merge thresholds (Option B = medium) ---
		const MERGE_ANGLE_THRESHOLD = 0.001
		const SPACING_TOLERANCE = 0.08 // meters

		const pointsCurve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.4)

		// show smooth curve
		this.line = new THREE.Line(
			new THREE.BufferGeometry().setFromPoints(pointsCurve.getPoints(1000)),
			new THREE.LineBasicMaterial({ color: 0x2f8cff, opacity: 0.6, transparent: true })
		)

		{
			for (let i = 0; i < points.length; i++) {
				const dir = new THREE.Vector3(0, 1, 0)
				const origin = new THREE.Vector3(0, 0, 0)
				const length = 5
				const hex = 0xffff00
				const arrowHelper = new THREE.ArrowHelper(dir, origin, length, hex)
				arrowHelper.position.copy(points[i])
				this.line.add(arrowHelper)
			}
		}

		// --- basic sampling & frames ---
		const totalLen = pointsCurve.getLength()
		const segments = Math.max(24, Math.floor(totalLen / this.segmentLength))
		const ds = totalLen / segments
		this.frames = this.computeParallelTransportFrames(pointsCurve, segments)

		// --- curvature per-segment (central difference) ---
		const curvature = new Array(segments + 1).fill(0)
		for (let i = 0; i <= segments; i++) {
			if (i === 0) {
				const dt = new THREE.Vector3().subVectors(this.frames.tangents[1], this.frames.tangents[0])
				curvature[i] = dt.length() / ds
			} else if (i === segments) {
				const dt = new THREE.Vector3().subVectors(
					this.frames.tangents[segments],
					this.frames.tangents[segments - 1]
				)
				curvature[i] = dt.length() / ds
			} else {
				const dt = new THREE.Vector3().subVectors(this.frames.tangents[i + 1], this.frames.tangents[i - 1])
				curvature[i] = dt.length() / (2 * ds)
			}
			if (!isFinite(curvature[i])) curvature[i] = 0
		}

		// --- spacing per segment (used for spacing similarity tests) ---
		const spacingArr = new Array(segments)
		for (let i = 0; i < segments; i++) {
			const curv = curvature[i]
			let spacing = this.baseSpacing * (1 + k * curv * ds)
			spacing = THREE.MathUtils.clamp(spacing, this.baseSpacing * 0.6, this.baseSpacing * 1.8)
			spacingArr[i] = spacing
		}

		const leftRuns: Run[] = []
		const rightRuns: Run[] = []

		// Build runs for each side independently
		for (const side of ['left', 'right'] as const) {
			const offsetSign = side === 'left' ? -1 : 1
			let runStart = 0
			let spacingSum = spacingArr[0]

			for (let i = 0; i < segments; i++) {
				// const u = i / segments;
				// const u2 = (i + 1) / segments;

				// const P1 = pointsCurve.getPointAt(u);
				// const P2 = pointsCurve.getPointAt(u2);

				// const b1 = frames.binormals[i];
				// const b2 = frames.binormals[Math.min(i + 1, segments)];

				const spacing = spacingArr[i]

				// compute side points for this segment
				// const A1 = P1.clone().add(b1.clone().multiplyScalar((offsetSign * spacing) / 2));
				// const A2 = P2.clone().add(b2.clone().multiplyScalar((offsetSign * spacing) / 2));

				// angle between tangents at i and i+1
				const t1 = this.frames.tangents[i]
				const t2 = this.frames.tangents[Math.min(i + 1, segments)]
				const ang = t1.angleTo(t2)

				// spacing similarity to previous segment
				const prevSpacing = spacingArr[Math.max(0, i - 1)]
				const spacingDiffOK = Math.abs(spacing - prevSpacing) <= SPACING_TOLERANCE

				let shouldBreak = false
				if (i === runStart) {
					// first element in run
					shouldBreak = false
					spacingSum = spacing
				} else {
					// if angle or spacing jump too large, break run BEFORE i
					if (ang > MERGE_ANGLE_THRESHOLD || !spacingDiffOK) {
						shouldBreak = true
					} else {
						shouldBreak = false
						spacingSum += spacing
					}
				}

				if (shouldBreak) {
					// flush previous run runStart..i-1
					const sIdx = runStart
					const eIdx = i - 1
					// use corresponding binormals for endpoints
					const startU = sIdx / segments
					const endU = (eIdx + 1) / segments // end frame index is eIdx+1
					const startP = pointsCurve
						.getPointAt(startU)
						.clone()
						.add(this.frames.binormals[sIdx].clone().multiplyScalar((offsetSign * spacingArr[sIdx]) / 2))
					const endP = pointsCurve
						.getPointAt(endU)
						.clone()
						.add(
							this.frames.binormals[eIdx + 1].clone().multiplyScalar((offsetSign * spacingArr[eIdx]) / 2)
						)
					const count = eIdx - sIdx + 1
					const spacingAvg = (spacingSum - spacing) / count // spacingSum includes current spacing, remove it
					;(leftRuns as Run[]).push // no-op to satisfy typing (we'll push into proper array below)
					if (side === 'left')
						leftRuns.push({ startI: sIdx, endI: eIdx, spacingAvg, startPoint: startP, endPoint: endP })
					else rightRuns.push({ startI: sIdx, endI: eIdx, spacingAvg, startPoint: startP, endPoint: endP })

					// start new run at i
					runStart = i
					spacingSum = spacing
				}

				// if we are at the last segment, flush the current run
				if (i === segments - 1) {
					const sIdx = runStart
					const eIdx = i
					const startU = sIdx / segments
					const endU = (eIdx + 1) / segments
					const startP = pointsCurve
						.getPointAt(startU)
						.clone()
						.add(this.frames.binormals[sIdx].clone().multiplyScalar((offsetSign * spacingArr[sIdx]) / 2))
					const endP = pointsCurve
						.getPointAt(endU)
						.clone()
						.add(
							this.frames.binormals[eIdx + 1].clone().multiplyScalar((offsetSign * spacingArr[eIdx]) / 2)
						)
					const count = eIdx - sIdx + 1
					const spacingAvg = spacingSum / count
					if (side === 'left')
						leftRuns.push({ startI: sIdx, endI: eIdx, spacingAvg, startPoint: startP, endPoint: endP })
					else rightRuns.push({ startI: sIdx, endI: eIdx, spacingAvg, startPoint: startP, endPoint: endP })
				}
			}
		}

		// --- build instanced mesh containing all runs (left then right) ---
		const totalRuns = leftRuns.length + rightRuns.length
		this.railsInstanced = new THREE.InstancedMesh(this.railGeo, this.railMat, totalRuns)
		this.railsInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

		this.m = new THREE.Matrix4()
		const tVec = new THREE.Vector3()
		const nVec = new THREE.Vector3()
		const bVec = new THREE.Vector3()
		this.instIndex = 0

		// add left runs then right runs
		for (const r of leftRuns) this.makeInstanceFromRun(r, 'left')
		for (const r of rightRuns) this.makeInstanceFromRun(r, 'right')

		this.railsInstanced.instanceMatrix.needsUpdate = true
		// scene.add(railsInstanced);

		// --- sleepers (unchanged behavior but recreated cleanly) ---
		const sleeperSpacing = Math.max(0.85, this.segmentLength * 0.95)
		this.sleeperCount = Math.floor(totalLen / sleeperSpacing)

		this.sleepersInstanced = new THREE.InstancedMesh(this.sleeperGeo, this.sleeperMat, this.sleeperCount)
		this.sleepersInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

		const tempMat = new THREE.Matrix4()
		let dist = 0

		for (let i = 0; i < this.sleeperCount; i++) {
			if (dist > totalLen) break

			const u = dist / totalLen
			const p = pointsCurve.getPointAt(u)

			const fi = Math.floor(u * segments)
			tVec.copy(this.frames.tangents[fi])
			nVec.copy(this.frames.normals[fi])
			bVec.copy(this.frames.binormals[fi])

			// curvature-based spacing
			const curv = curvature[fi]
			let localSpacing = this.baseSpacing * (1 + k * curv * ds) * 0.5
			localSpacing = THREE.MathUtils.clamp(localSpacing, this.baseSpacing * 0.6, this.baseSpacing * 1.8)

			this.sleeperLength = localSpacing + 1.5

			const scaleMat = new THREE.Matrix4().makeScale(this.sleeperLength / this.baseLen, 1, 1)
			const offsetMat = new THREE.Matrix4().makeTranslation((this.sleeperLength - this.baseLen) * 0.5, 0, 0)

			bVec.multiplyScalar(-1)

			const basis = new THREE.Matrix4().makeBasis(bVec, nVec, tVec)

			tempMat.identity()
			tempMat.multiply(basis)
			tempMat.multiply(offsetMat)
			tempMat.multiply(scaleMat)
			tempMat.setPosition(p)

			this.sleepersInstanced.setMatrixAt(i, tempMat)

			// move to next sleeper
			dist += localSpacing
		}
		this.sleepersInstanced.instanceMatrix.needsUpdate = true
		// scene.add(sleepersInstanced);

		// --- debug left/right polylines (optional, kept for visualization) ---
		const leftPts: THREE.Vector3[] = []
		const rightPts: THREE.Vector3[] = []
		for (let i = 0; i <= segments; i++) {
			const u = i / segments
			const p = pointsCurve.getPointAt(u)
			bVec.copy(this.frames.binormals[i])
			const curv = curvature[i]
			let spacing = this.baseSpacing * (1 + k * curv * ds)
			spacing = THREE.MathUtils.clamp(spacing, this.baseSpacing * 0.6, this.baseSpacing * 1.8)
			leftPts.push(p.clone().add(bVec.clone().multiplyScalar(-spacing / 2)))
			rightPts.push(p.clone().add(bVec.clone().multiplyScalar(spacing / 2)))
		}
		this.leftLine = new THREE.Line(
			new THREE.BufferGeometry().setFromPoints(leftPts),
			new THREE.LineBasicMaterial({ color: 0xff4444 })
		)
		this.rightLine = new THREE.Line(
			new THREE.BufferGeometry().setFromPoints(rightPts),
			new THREE.LineBasicMaterial({ color: 0x44ff44 })
		)
		// scene.add(leftLine, rightLine);
	}

	private computeParallelTransportFrames(curve: THREE.CatmullRomCurve3, segments: number) {
		const tangents = new Array(segments + 1)
		const normals = new Array(segments + 1)
		const binormals = new Array(segments + 1)

		// tangents
		for (let i = 0; i <= segments; i++) {
			const u = i / segments
			tangents[i] = curve.getTangentAt(u).clone().normalize()
		}

		// initial normal (avoid parallel)
		const up = new THREE.Vector3(0, 1, 0)
		let tmp = new THREE.Vector3().crossVectors(up, tangents[0])
		if (tmp.lengthSq() < 1e-6) tmp = new THREE.Vector3(1, 0, 0)
		normals[0] = new THREE.Vector3().crossVectors(tangents[0], tmp).normalize()
		binormals[0] = new THREE.Vector3().crossVectors(tangents[0], normals[0]).normalize()

		// parallel transport
		for (let i = 1; i <= segments; i++) {
			normals[i] = normals[i - 1].clone()
			const v = new THREE.Vector3().crossVectors(tangents[i - 1], tangents[i])
			const dot = THREE.MathUtils.clamp(tangents[i - 1].dot(tangents[i]), -1, 1)
			const angle = Math.acos(dot)
			if (v.lengthSq() > 1e-6 && Math.abs(angle) > 1e-6) {
				v.normalize()
				normals[i].applyAxisAngle(v, angle)
			}
			binormals[i] = new THREE.Vector3().crossVectors(tangents[i], normals[i]).normalize()
		}

		return { tangents, normals, binormals }
	}

	private makeInstanceFromRun = (run: Run, _side: 'left' | 'right') => {
		// 1. Compute actual run direction (most accurate)
		const dir = new THREE.Vector3().copy(run.endPoint).sub(run.startPoint).normalize() // X axis

		// 2. Get frame normal/binormal near start (for rough orientation)
		const startFrameIndex = THREE.MathUtils.clamp(run.startI, 0, this.frames.tangents.length - 1)

		const upApprox = this.frames.normals[startFrameIndex] // approximate vertical-ish
		// const binApprox = frames.binormals[startFrameIndex]; // approximate sideways

		// 3. Rebuild a stable orthonormal frame
		//
		// Y axis = corrected normal (force orthogonal to dir)
		const normal = new THREE.Vector3()
			.copy(upApprox)
			.sub(dir.clone().multiplyScalar(upApprox.dot(dir)))
			.normalize()

		// Z axis = binormal (cross product)
		const binormal = new THREE.Vector3().crossVectors(dir, normal).normalize()

		// 4. Basis matrix
		const basis = new THREE.Matrix4().makeBasis(dir, normal, binormal)

		// 5. Compute run length
		const runLen = run.startPoint.distanceTo(run.endPoint)
		this.runLens.push(runLen)

		// Scale along X (rail geometry is 1 unit long along X)
		const scaleMat = new THREE.Matrix4().makeScale(runLen, 1, 1)

		// 6. Position at midpoint
		const center = run.startPoint.clone().add(run.endPoint).multiplyScalar(0.5)

		// 7. Compose final matrix
		this.m.copy(basis).multiply(scaleMat)
		this.m.setPosition(center)

		this.railsInstanced.setMatrixAt(this.instIndex++, this.m)
	}

	public physicsConfigs(scene: THREE.Scene, rails = true, sleepers = true) {
		if (rails) {
			for (let i = 0; i < this.instIndex; i++) {
				const pos = new THREE.Vector3()
				const quat = new THREE.Quaternion()
				const mat4 = new THREE.Matrix4()

				this.railsInstanced.getMatrixAt(i, mat4)
				const railMesh = new THREE.Mesh(this.railGeo, new THREE.MeshBasicMaterial())
				mat4.decompose(pos, quat, new THREE.Vector3())
				railMesh.position.copy(pos).add(this.railsInstanced.position)
				railMesh.setRotationFromQuaternion(quat)
				railMesh.rotation.x += this.railsInstanced.rotation.x
				railMesh.rotation.y += this.railsInstanced.rotation.y
				railMesh.rotation.z += this.railsInstanced.rotation.z
				railMesh.scale
					.set(this.runLens[i], this.railGeo.parameters.height, this.railGeo.parameters.depth)
					.multiplyScalar(0.5)
				railMesh.userData = {
					data: 'physics',
					type: 'box',
				}
				scene.add(railMesh)
			}
		}

		if (sleepers) {
			for (let i = 0; i < this.sleeperCount; i++) {
				const pos = new THREE.Vector3()
				const quat = new THREE.Quaternion()
				const mat4 = new THREE.Matrix4()

				this.sleepersInstanced.getMatrixAt(i, mat4)
				const sleeperMesh = new THREE.Mesh(this.sleeperGeo, new THREE.MeshBasicMaterial())
				mat4.decompose(pos, quat, new THREE.Vector3())
				sleeperMesh.position.copy(pos).add(this.sleepersInstanced.position)
				sleeperMesh.setRotationFromQuaternion(quat)
				sleeperMesh.rotation.x += this.sleepersInstanced.rotation.x
				sleeperMesh.rotation.y += this.sleepersInstanced.rotation.y
				sleeperMesh.rotation.z += this.sleepersInstanced.rotation.z
				sleeperMesh.scale
					.set(
						this.sleeperLength / this.baseLen,
						this.sleeperGeo.parameters.height,
						this.sleeperGeo.parameters.depth
					)
					.multiplyScalar(0.5)
				sleeperMesh.userData = {
					data: 'physics',
					type: 'box',
				}
				scene.add(sleeperMesh)
			}
		}
	}
}

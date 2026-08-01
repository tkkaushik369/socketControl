import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { Character } from '../Characters/Character'
import { Vehicle } from '../Vehicles/Vehicle'
import { ShapeEntityBase } from '../Physics/ShapeEntity/ShapeEntityBase'

// import * as _ from 'lodash'
// import { WorldBase } from '../WorldBase'
// import { EntityType } from '../Enums/EntityType'
// import { IWorldEntity } from '../Interfaces/IWorldEntity'

export class Portal /* implements IWorldEntity */ {
	// public entityType: EntityType = EntityType.Portal
	// public updateOrder: number = 4

	public name: string | null
	public link_name: string | null

	public renderTarget: THREE.WebGLRenderTarget
	public camera: THREE.PerspectiveCamera
	public view_camera: THREE.PerspectiveCamera | null

	public mesh: THREE.Mesh
	private is_mesh_available: boolean
	public linkedPortal: Portal | null

	private normal: THREE.Vector3

	constructor(col: number, mesh: THREE.Mesh | null = null) {
		// bind functions
		this.isFrontFacing = this.isFrontFacing.bind(this)
		this.updatePortalCamera_1 = this.updatePortalCamera_1.bind(this)
		this.updatePortalCamera = this.updatePortalCamera.bind(this)
		this.updatePortalNormal = this.updatePortalNormal.bind(this)
		this.containsSphere = this.containsSphere.bind(this)
		this.getSide = this.getSide.bind(this)
		this.checkPortal = this.checkPortal.bind(this)
		this.teleport = this.teleport.bind(this)
		// this.addToWorld = this.addToWorld.bind(this)
		// this.removeFromWorld = this.removeFromWorld.bind(this)
		// this.update = this.update.bind(this)

		this.name = null
		this.link_name = null
		this.is_mesh_available = false

		// this.renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight)
		this.renderTarget = new THREE.WebGLRenderTarget(512, 512)

		this.camera = new THREE.PerspectiveCamera(75, 1.0, 0.1, 1000)
		this.view_camera = null

		const shader_material = new THREE.ShaderMaterial({
					uniforms: {
						map: { value: this.renderTarget.texture },
						color: { value: new THREE.Color(col) },
					},
					side: THREE.DoubleSide,
					vertexShader: `
						varying vec2 vUv;

						void main() {
							vUv = uv;
							gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
						}
					`,
					fragmentShader: `
						uniform sampler2D map;
						uniform vec3 color;

						varying vec2 vUv;

						void main() {
							if (gl_FrontFacing) {
								gl_FragColor = texture2D(map, vUv);
							} else {
								gl_FragColor = vec4(color, 1.0);
							}
						}
					`,
				})

		if (mesh === null) {
			this.mesh = new THREE.Mesh(
				new THREE.PlaneGeometry(2, 2),
				/* new THREE.MeshBasicMaterial({
					color: col,
					map: this.renderTarget.texture,
					side: THREE.FrontSide,
				}) */
				shader_material
			)
			this.is_mesh_available = true
		} else {
			this.mesh = mesh
			this.mesh.material = shader_material
		}

		this.linkedPortal = null
		this.normal = new THREE.Vector3()
	}

	public isFrontFacing(camera: THREE.Camera) {
		const portalPosition = new THREE.Vector3()
		this.mesh.getWorldPosition(portalPosition)

		const portalNormal = new THREE.Vector3(0, 0, 1)
			.applyQuaternion(this.mesh.getWorldQuaternion(new THREE.Quaternion()))
			.normalize()

		const cameraPosition = new THREE.Vector3()
		camera.getWorldPosition(cameraPosition)

		const direction = cameraPosition.clone().sub(portalPosition).normalize()

		return direction.dot(portalNormal) > 0
	}

	private updatePortalCamera_1() {
		if (!this.linkedPortal) return

		this.camera.position.copy(this.linkedPortal.mesh.position)
		this.camera.position.add(this.linkedPortal.normal.clone().multiplyScalar(-1.0))
		this.camera.rotation.copy(this.linkedPortal.mesh.rotation)
		this.camera.rotation.y += Math.PI
	}

	public updatePortalCamera(viewCamera: THREE.PerspectiveCamera | null, position_update: boolean = true) {
		if (this.linkedPortal === null || viewCamera === null) return

		this.camera.fov = viewCamera.fov
		this.camera.aspect = viewCamera.aspect
		this.camera.near = viewCamera.near
		this.camera.far = viewCamera.far
		this.camera.updateProjectionMatrix()

		this.mesh.updateMatrixWorld(true)
		this.linkedPortal.mesh.updateMatrixWorld(true)

		// World -> entry portal local
		const fromInv = new THREE.Matrix4().copy(this.mesh.matrixWorld).invert()

		// 180° flip in portal local space
		const flip = new THREE.Matrix4().makeRotationY(Math.PI)

		// Entry local -> exit world
		const transform = new THREE.Matrix4().copy(this.linkedPortal.mesh.matrixWorld).multiply(flip).multiply(fromInv)

		// Camera position
		if (position_update) {
			this.camera.position.copy(viewCamera.position).applyMatrix4(transform)
		} else {
			this.camera.position.copy(this.linkedPortal.mesh.position)
			this.camera.position.add(this.linkedPortal.normal.clone().multiplyScalar(-1.0))
		}

		// Camera orientation
		const cameraMatrix = new THREE.Matrix4().copy(viewCamera.matrixWorld).premultiply(transform)

		cameraMatrix.decompose(this.camera.position, this.camera.quaternion, new THREE.Vector3())

		this.camera.updateMatrixWorld(true)
	}

	public updatePortalNormal() {
		this.normal.set(0, 0, 1).applyQuaternion(this.mesh.getWorldQuaternion(new THREE.Quaternion())).normalize()
	}

	private containsSphere(point: THREE.Vector3, radius: number) {
		const local = this.mesh.worldToLocal(point.clone())

		// Distance from sphere center to portal plane
		const distanceToPlane = Math.abs(local.z)

		// Too far away from the portal surface
		if (distanceToPlane > radius) {
			return false
		}

		// Clamp point to portal rectangle
		const closestX = THREE.MathUtils.clamp(local.x, -1, 1)
		const closestY = THREE.MathUtils.clamp(local.y, -1, 1)

		const dx = local.x - closestX
		const dy = local.y - closestY

		// Sphere intersects the portal rectangle
		return dx * dx + dy * dy <= radius * radius
	}

	private getSide(point: THREE.Vector3) {
		const portalPos = new THREE.Vector3()
		this.mesh.getWorldPosition(portalPos)

		const toPoint = new THREE.Vector3().subVectors(point, portalPos)
		return Math.sign(toPoint.dot(this.normal))
	}

	public checkPortal(
		previousSides: Map<Portal, number>,
		entity: Character | Vehicle | ShapeEntityBase,
		cooldown: number
	): number {
		if (!this.linkedPortal) return cooldown

		let spherePos = new THREE.Vector3()
		if (entity instanceof Character || entity instanceof Vehicle) {
			spherePos = new THREE.Vector3(entity.position.x, entity.position.y, entity.position.z)
		} else if (entity instanceof ShapeEntityBase) {
			if (entity.phys === null) return cooldown
			spherePos = new THREE.Vector3(
				entity.phys.body.position.x,
				entity.phys.body.position.y,
				entity.phys.body.position.z
			)
		}

		const side = this.getSide(spherePos)
		const previous = previousSides.get(this)
		previousSides.set(this, side)

		if (cooldown > 0) {
			return cooldown
		}

		const sphereRadius = 1
		if (!this.containsSphere(spherePos, sphereRadius)) {
			return cooldown
		}

		if (previous !== undefined && previous > 0 && side <= 0) {
			this.teleport(this, this.linkedPortal, entity)

			previousSides.set(this, 1)
			previousSides.set(this.linkedPortal, 1)

			return 0.25
		}

		return cooldown
	}

	private teleport(from: Portal, to: Portal, entity: Character | Vehicle | ShapeEntityBase) {
		// console.log(from.name, '->', to.name)
		from.mesh.updateMatrixWorld(true)
		to.mesh.updateMatrixWorld(true)

		// Transform from world -> entry portal local
		const fromInv = new THREE.Matrix4().copy(from.mesh.matrixWorld).invert()

		// Rotate 180° around the portal's LOCAL Y axis
		const flip = new THREE.Matrix4().makeRotationFromQuaternion(
			new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)
		)

		// Transform from entry local -> exit world
		const transform = new THREE.Matrix4().copy(to.mesh.matrixWorld).multiply(flip).multiply(fromInv)

		// -------------------------
		// Position
		// -------------------------
		let body: CANNON.Body | null = null

		if (entity instanceof Character) {
			body = entity.characterCapsule.body
		} else if (entity instanceof Vehicle) {
			body = entity.collision
		} else if (entity instanceof ShapeEntityBase && entity.phys !== null) {
			body = entity.phys.body
		}

		if (body === null) return

		const position = new THREE.Vector3(body.position.x, body.position.y, body.position.z)

		position.applyMatrix4(transform)

		// Push slightly outside the exit portal
		// position.add(to.normal.clone().multiplyScalar(0.1));
		const radius = 1 // Sphere radius
		const exitNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(
			to.mesh.getWorldQuaternion(new THREE.Quaternion())
		)

		position.addScaledVector(exitNormal, radius + 0.02)

		body.position.set(position.x, position.y, position.z)

		// -------------------------
		// Velocity
		// -------------------------

		const rot = new THREE.Quaternion().setFromRotationMatrix(transform)

		const velocity = new THREE.Vector3(body.velocity.x, body.velocity.y, body.velocity.z)

		velocity.applyQuaternion(rot)

		body.velocity.set(velocity.x, velocity.y, velocity.z)

		// -------------------------
		// Angular velocity
		// -------------------------

		const angularVelocity = new THREE.Vector3(
			body.angularVelocity.x,
			body.angularVelocity.y,
			body.angularVelocity.z
		)

		angularVelocity.applyQuaternion(rot)

		body.angularVelocity.set(angularVelocity.x, angularVelocity.y, angularVelocity.z)

		// -------------------------
		// Orientation
		// -------------------------

		const bodyQuat = new THREE.Quaternion(
			body.quaternion.x,
			body.quaternion.y,
			body.quaternion.z,
			body.quaternion.w
		)

		// Rotate the body's orientation into the exit portal's frame
		bodyQuat.premultiply(rot)

		body.quaternion.set(bodyQuat.x, bodyQuat.y, bodyQuat.z, bodyQuat.w)

		body.wakeUp()
	}

	/* public addToWorld(world: WorldBase): void {
		// Register portal
		// world.portals.push(this)
		// if (world.player !== null) this.view_camera = world.player.cameraOperator.camera
		// if (this.is_mesh_available) world.addSceneObject(this.mesh)
	} */
	/* public removeFromWorld(world: WorldBase): void {
		// Remove from shapes
		// _.pull(world.portals, this)
		// if (this.is_mesh_available) world.removeSceneObject(this.mesh)
		// this.view_camera = null
	} */
	// public update(timestep: number, unscaledTimeStep: number): void {}
}

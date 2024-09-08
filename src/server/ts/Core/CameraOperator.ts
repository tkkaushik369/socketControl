import * as THREE from 'three'
import * as _ from 'lodash'
import { Utility } from './Utility'
import { IUpdatable } from '../Interfaces/IUpdatable'
import { IInputReceiver } from '../Interfaces/IInputReceiver'
import { WorldBase } from '../World/WorldBase'
import { Player } from '../Core/Player'
import { KeyBinding } from './KeyBinding'
import { Character } from '../Characters/Character'

export class CameraOperator implements IUpdatable, IInputReceiver {
	public updateOrder: number = 4

	private player: Player
	private world: WorldBase
	public camera: THREE.PerspectiveCamera
	public target: THREE.Vector3
	private sensitivity: THREE.Vector2

	private movementSpeed: number
	private radius: number
	public theta: number
	public phi: number

	private onMouseDownPosition: THREE.Vector2
	private onMouseDownTheta: any
	private onMouseDownPhi: any
	private targetRadius: number

	public actions: { [action: string]: KeyBinding }

	public upVelocity: number = 0
	public forwardVelocity: number = 0
	public rightVelocity: number = 0

	public followMode: boolean = false

	public characterCaller: Character | null

	// client
	public updateControlsCallBack: Function | null

	constructor(player: Player, world: WorldBase, camera: THREE.PerspectiveCamera, sensitivityX: number = 1, sensitivityY: number = sensitivityX * 0.8) {
		// bind functions
		this.setSensitivity = this.setSensitivity.bind(this)
		this.setRadius = this.setRadius.bind(this)
		this.move = this.move.bind(this)
		this.update = this.update.bind(this)

		// init
		this.player = player
		this.world = world
		this.camera = camera
		this.target = new THREE.Vector3()
		this.sensitivity = new THREE.Vector2(sensitivityX, sensitivityY)

		this.movementSpeed = 0.06
		this.radius = 3
		this.theta = 0
		this.phi = 0

		this.onMouseDownPosition = new THREE.Vector2()
		this.onMouseDownTheta = this.theta
		this.onMouseDownPhi = this.phi
		this.targetRadius = 1


		this.actions = {
			'forward': new KeyBinding('KeyW'),
			'back': new KeyBinding('KeyS'),
			'left': new KeyBinding('KeyA'),
			'right': new KeyBinding('KeyD'),
			'up': new KeyBinding('KeyE'),
			'down': new KeyBinding('KeyQ'),
			'fast': new KeyBinding('ShiftLeft'),
			'slow': new KeyBinding('ControlLeft'),
		}

		this.characterCaller = null
		this.updateControlsCallBack = null

		this.world.registerUpdatable(this)
	}

	public setSensitivity(sensitivityX: number, sensitivityY: number = sensitivityX): void {
		this.sensitivity = new THREE.Vector2(sensitivityX, sensitivityY)
	}

	public setRadius(value: number, instantly: boolean = false): void {
		this.targetRadius = Math.max(0.001, value)
		if (instantly === true) {
			this.radius = value
		}
	}

	public move(deltaX: number, deltaY: number): void {
		this.theta -= deltaX * (this.sensitivity.x / 2)
		this.theta %= 360
		this.phi += deltaY * (this.sensitivity.y / 2)
		this.phi = Math.min(85, Math.max(-85, this.phi))
	}

	public update(timestep: number, unscaledTimeStep: number) {
		if (this.world.isClient) return
		if (this.followMode === true) {
			this.camera.position.y = THREE.MathUtils.clamp(this.camera.position.y, this.target.y, Number.POSITIVE_INFINITY)
			this.camera.lookAt(this.target)
			let newPos = this.target.clone().add(new THREE.Vector3().subVectors(this.camera.position, this.target).normalize().multiplyScalar(this.targetRadius))
			this.camera.position.x = newPos.x
			this.camera.position.y = newPos.y
			this.camera.position.z = newPos.z
		}
		else {
			this.radius = THREE.MathUtils.lerp(this.radius, this.targetRadius, 0.1)

			this.camera.position.x = this.target.x + this.radius * Math.sin(this.theta * Math.PI / 180) * Math.cos(this.phi * Math.PI / 180)
			this.camera.position.y = this.target.y + this.radius * Math.sin(this.phi * Math.PI / 180)
			this.camera.position.z = this.target.z + this.radius * Math.cos(this.theta * Math.PI / 180) * Math.cos(this.phi * Math.PI / 180)
			this.camera.updateMatrix()
			this.camera.lookAt(this.target)
		}

		this.player.data.cameraPosition.x = this.camera.position.x
		this.player.data.cameraPosition.y = this.camera.position.y
		this.player.data.cameraPosition.z = this.camera.position.z

		this.player.data.cameraQuaternion.x = this.camera.quaternion.x
		this.player.data.cameraQuaternion.y = this.camera.quaternion.y
		this.player.data.cameraQuaternion.z = this.camera.quaternion.z
		this.player.data.cameraQuaternion.w = this.camera.quaternion.w
	}

	public handleKeyboardEvent(code: string, isShift: boolean, pressed: boolean) {
		// Free camera
		if (code === 'KeyC' && pressed === true && isShift === true) {
			if (this.characterCaller !== null) {
				this.player.inputManager.setInputReceiver(this.characterCaller)
				this.characterCaller = null
			}
		}
		else {
			for (const action in this.actions) {
				if (this.actions.hasOwnProperty(action)) {
					const binding = this.actions[action]

					if (_.includes(binding.eventCodes, code)) {
						binding.isPressed = pressed
					}
				}
			}
		}
	}

	public handleMouseButton(code: string, pressed: boolean) {
		Object.keys(this.actions).forEach((action) => {
			if (this.actions.hasOwnProperty(action)) {
				const binding = this.actions[action]

				if (_.includes(binding.eventCodes, code)) {
					binding.isPressed = pressed
				}
			}
		})
	}

	public handleMouseMove(deltaX: number, deltaY: number) {
		this.move(deltaX, deltaY)
	}

	public handleMouseWheel(value: number) {
		this.world.scrollTheTimeScale(value)
	}

	public inputReceiverInit() {
		this.target.copy(this.camera.position)
		this.setRadius(0, true)

		if (this.world.updateControlsCallBack !== null) {
			this.world.updateControlsCallBack([
				{
					keys: ['W', 'S', 'A', 'D'],
					desc: 'Move around'
				},
				{
					keys: ['E', 'Q'],
					desc: 'Move up / down'
				},
				{
					keys: ['Shift'],
					desc: 'Speed up'
				},
				{
					keys: ['Shift', '+', 'C'],
					desc: 'Exit free camera mode'
				},
			])
		}
	}

	public inputReceiverUpdate(timeStep: number) {
		// Set fly speed
		let speedFast = this.movementSpeed * (this.actions.fast.isPressed ? timeStep * 600 : timeStep * 60)
		let speedSlow = this.movementSpeed * (this.actions.slow.isPressed ? timeStep * 59 : timeStep * 6);

		const up = Utility.getUp(this.camera)
		const right = Utility.getRight(this.camera)
		const forward = Utility.getBack(this.camera)

		this.upVelocity = THREE.MathUtils.lerp(this.upVelocity, +this.actions.up.isPressed - +this.actions.down.isPressed, 0.3)
		this.forwardVelocity = THREE.MathUtils.lerp(this.forwardVelocity, +this.actions.forward.isPressed - +this.actions.back.isPressed, 0.3)
		this.rightVelocity = THREE.MathUtils.lerp(this.rightVelocity, +this.actions.right.isPressed - +this.actions.left.isPressed, 0.3)

		this.target.add(up.multiplyScalar((speedFast - speedSlow) * this.upVelocity))
		this.target.add(forward.multiplyScalar((speedFast - speedSlow) * this.forwardVelocity))
		this.target.add(right.multiplyScalar((speedFast - speedSlow) * this.rightVelocity))
	}
}
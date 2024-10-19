import * as THREE from 'three'
import { WorldBase } from '../World/WorldBase'

const _pointer = new THREE.Vector2()
const _event = { type: '', data: _pointer }

const _raycaster = new THREE.Raycaster()

export class InteractiveGroup extends THREE.Group {

	isInteracting: boolean = false
	world: WorldBase

	constructor(world: WorldBase) {
		super()
		this.world = world
	}

	listenToPointerEvents(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera) {

		const scope = this
		const raycaster = new THREE.Raycaster()
		const element = renderer.domElement

		function onPointerEvent(event: MouseEvent) {
			event.stopPropagation()
			if(scope.world.player === null) return

			const rect = renderer.domElement.getBoundingClientRect()


			if(!scope.world.player.inputManager.isLocked) {
				_pointer.x = (event.clientX - rect.left) / rect.width * 2 - 1
				_pointer.y = - (event.clientY - rect.top) / rect.height * 2 + 1
			} else {
				_pointer.x = 0
				_pointer.y = 0
			}

			raycaster.setFromCamera(_pointer, camera)
			const intersects = raycaster.intersectObjects(scope.children, false)

			scope.isInteracting = false

			if (intersects.length > 0) {
				scope.isInteracting = true

				const intersection = intersects[0]
				const object = intersection.object
				const uv = intersection.uv

				_event.type = event.type
				if (uv !== undefined) _event.data.set(uv.x, 1 - uv.y)
				object.dispatchEvent(_event as any)
			}
		}

		element.addEventListener('pointerdown', onPointerEvent)
		element.addEventListener('pointerup', onPointerEvent)
		element.addEventListener('pointermove', onPointerEvent)
		element.addEventListener('mousedown', onPointerEvent)
		element.addEventListener('mouseup', onPointerEvent)
		element.addEventListener('mousemove', onPointerEvent)
		element.addEventListener('click', onPointerEvent)
	}

	listenToXRControllerEvents(controller: any) {
		const scope = this
		const events: { [id: string]: string } = {
			'move': 'mousemove',
			'select': 'click',
			'selectstart': 'mousedown',
			'selectend': 'mouseup'
		}

		function onXRControllerEvent(event: any) {
			const controller = event.target
			_raycaster.setFromXRController(controller)
			const intersections = _raycaster.intersectObjects(scope.children, false)

			if (intersections.length > 0) {
				const intersection = intersections[0]
				const object = intersection.object
				const uv = intersection.uv

				_event.type = events[event.type]
				if (uv !== undefined) _event.data.set(uv.x, 1 - uv.y)
				object.dispatchEvent(_event as any)
			}
		}

		controller.addEventListener('move', onXRControllerEvent)
		controller.addEventListener('select', onXRControllerEvent)
		controller.addEventListener('selectstart', onXRControllerEvent)
		controller.addEventListener('selectend', onXRControllerEvent)
	}
}

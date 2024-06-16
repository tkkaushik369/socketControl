import * as THREE from 'three'
import WorldClient from './WorldClient'
import * as Controls from './Controls'

export class GameModeBase {
	public worldClient: WorldClient | undefined
	public keymap: { [id: string]: any } = {}

	init() { }
	update() { }

	handleAction(event: any, key: any, value: any) {
		if (this.worldClient != undefined) {
			key = key.toLowerCase();

			if (key == 't' && value == true) {
				if (this.worldClient.timeScaleTarget < 0.5) {
					this.worldClient.timeScaleTarget = 1;
				}
				else {
					this.worldClient.timeScaleTarget = 0.3;
				}
			}
		}
	}

	handleScroll(event: any, value: any) { }
	handleMouseMove(event: any, deltaX: any, deltaY: any) { }

	checkIfWorldIsSet() {
		if (this.worldClient === undefined) {
			console.error('Calling gameMode init() without having specified gameMode\'s world first: ' + this);
		}
	}

	scrollTheTimeScale(scrollAmount: number) {
		if (this.worldClient != undefined) {
			// Changing time scale with scroll wheel
			const timeScaleBottomLimit = 0.003;
			const timeScaleChangeSpeed = 1.3;

			if (scrollAmount > 0) {
				this.worldClient.timeScaleTarget /= timeScaleChangeSpeed;
				if (this.worldClient.timeScaleTarget < timeScaleBottomLimit) this.worldClient.timeScaleTarget = 0;
			}
			else {
				this.worldClient.timeScaleTarget *= timeScaleChangeSpeed;
				if (this.worldClient.timeScaleTarget < timeScaleBottomLimit) this.worldClient.timeScaleTarget = timeScaleBottomLimit;
				this.worldClient.timeScaleTarget = Math.min(this.worldClient.timeScaleTarget, 1);
				if (this.worldClient.settings.TimeScale > 0.9) this.worldClient.settings.TimeScale *= timeScaleChangeSpeed;
			}
		}
	}

}

export class FreeCameraControls extends GameModeBase {
	private previousGameMode: any
	private movementSpeed: number
	public controls: { [id: string]: any }

	constructor(previousGameMode: any) {
		super();

		// Remember previous game mode to return to when pressing shift + C
		this.previousGameMode = previousGameMode;

		this.movementSpeed = 0.06;

		// Keymap
		this.keymap = {
			'w': { action: 'forward' },
			's': { action: 'back' },
			'a': { action: 'left' },
			'd': { action: 'right' },
			'e': { action: 'up' },
			'q': { action: 'down' },
			'shift': { action: 'fast' }
		};

		this.controls = {
			forward: new Controls.LerpControl(),
			left: new Controls.LerpControl(),
			right: new Controls.LerpControl(),
			up: new Controls.LerpControl(),
			back: new Controls.LerpControl(),
			down: new Controls.LerpControl(),
			fast: new Controls.LerpControl()
		};
	}

	init() {
		this.checkIfWorldIsSet();
		if (this.worldClient != undefined) {
			this.worldClient.cameraController.target.copy(this.worldClient.camera.position);
			this.worldClient.cameraController.setRadius(0);
			this.worldClient.cameraDistanceTarget = 0.001;
			this.worldClient.directionalLight.target = this.worldClient.camera;
		}
	}

	handleAction(event: any, key: any, value: any) {
		super.handleAction(event, key, value);
		if (this.worldClient != undefined) {
			// Shift modifier fix
			key = key.toLowerCase();

			if (key == 'f' && value == true) {
				const dirVec = new THREE.Vector3(0, 0, 1)
				dirVec.unproject(this.worldClient.camera)
				if (this.worldClient.shootCallBack)
					this.worldClient.shootCallBack(this.worldClient.camera.position, this.worldClient.camera.quaternion, dirVec)
				this.worldClient.shootBall(this.worldClient.camera.position, this.worldClient.camera.quaternion, dirVec)
			}

			// Turn off free cam
			if (this.previousGameMode !== undefined && key == 'c' && value == true && event.shiftKey == true) {
				this.worldClient.gameMode = this.previousGameMode;
				this.worldClient.gameMode.init();
			}
			// Is key bound to action
			else if (key in this.keymap) {

				// Get control and set it's parameters
				let control = this.controls[this.keymap[key].action];
				control.value = value;
			}
		}
	}

	handleScroll(event: MouseEvent, value: number) {
		this.scrollTheTimeScale(value);
	}

	handleMouseMove(event: MouseEvent, deltaX: number, deltaY: number) {
		if (this.worldClient != undefined) this.worldClient.cameraController.move(deltaX, deltaY);
	}

	update() {
		if (this.worldClient != undefined) {
			// Make light follow camera (for shadows)
			/* this.worldClient.directionalLight.position.set(
				this.worldClient.camera.position.x + this.worldClient.sun.x * 15,
				this.worldClient.camera.position.y + this.worldClient.sun.y * 15,
				this.worldClient.camera.position.z + this.worldClient.sun.z * 15
			); */

			// Lerp all controls
			for (let key in this.controls) {
				let ctrl = this.controls[key];
				ctrl.floatValue = THREE.MathUtils.lerp(ctrl.floatValue, +ctrl.value, 0.3);
			}

			// Set fly speed
			let speed = this.movementSpeed * (this.controls.fast.value ? 5 : 1);

			let up = new THREE.Vector3(0, 1, 0);
			let forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.worldClient.camera.quaternion);
			let right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.worldClient.camera.quaternion);

			this.worldClient.cameraController.target.add(forward.multiplyScalar(speed * (this.controls.forward.floatValue - this.controls.back.floatValue)));
			this.worldClient.cameraController.target.add(right.multiplyScalar(speed * (this.controls.right.floatValue - this.controls.left.floatValue)));
			this.worldClient.cameraController.target.add(up.multiplyScalar(speed * (this.controls.up.floatValue - this.controls.down.floatValue)));
		}
	}
}
// export class CharacterControls extends GameModeBase { }
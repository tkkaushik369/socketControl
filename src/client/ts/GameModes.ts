import * as THREE from 'three'
import * as _ from 'lodash'
import WorldClient from './WorldClient'
import * as Controls from '../../server/ts/Controls'
import Character from '../../server/ts/Characters/Character'

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
					if (this.worldClient != undefined && this.worldClient.setTimeScaleTargetCallBack !== undefined)
						this.worldClient.setTimeScaleTargetCallBack(1)
				}
				else {
					if (this.worldClient != undefined && this.worldClient.setTimeScaleTargetCallBack !== undefined)
						this.worldClient.setTimeScaleTargetCallBack(0.3)
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
				if (this.worldClient.shootCallBack)
					this.worldClient.shootCallBack(this.worldClient.camera.position, this.worldClient.camera.quaternion, false)
				this.worldClient.shootBall(this.worldClient.camera.position, this.worldClient.camera.quaternion, false)
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
		// this.scrollTheTimeScale(value);
		if (this.worldClient != undefined && this.worldClient.changeTimeScaleCallBack !== undefined)
			this.worldClient.changeTimeScaleCallBack(value)
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

export class CharacterControls extends GameModeBase {
	private character: Character

	constructor(character: Character) {
		super();
		this.character = character

		// Keymap
		this.keymap = {
			'w': { action: 'up' },
			's': { action: 'down' },
			'a': { action: 'left' },
			'd': { action: 'right' },
			'shift': { action: 'run' },
			' ': { action: 'jump' },
			'e': { action: 'use' },
			'f': { action: 'shoot' },
			'mouse0': { action: 'primary' },
			'mouse2': { action: 'secondary' },
			'mouse1': { action: 'tertiary' }
		};
	}

	init() {
		this.checkIfWorldIsSet();
		if (this.worldClient != undefined) {
			this.worldClient.cameraController.setRadius(1.8);			// 2.6
			this.worldClient.cameraDistanceTarget = 1.8; 				// 2.6
			this.worldClient.directionalLight.target = this.character;
			if (this.worldClient.playerConn != undefined) {
				this.worldClient.playerConn.data.controls.isCharacter = true;
				this.worldClient.playerConn.data.controls.name = this.character.name;
			}
		}
		console.log("init")
	}

	handleAction(event: any, key: any, value: any): void {
		super.handleAction(event, key, value);
		if (this.worldClient != undefined) {
			if (key == 'v' && value == true) {
				if (this.worldClient.cameraDistanceTarget > 1.8) {				//4.8
					this.worldClient.cameraDistanceTarget = 1.1					//1.8
				} else if (this.worldClient.cameraDistanceTarget > 1.3) {		//2.0
					this.worldClient.cameraDistanceTarget = 2.1					//5.2
				} else if (this.worldClient.cameraDistanceTarget > 0) {
					this.worldClient.cameraDistanceTarget = 1.6					//3.6
				}
			} else if (key == 'f' && value == true) {
				let obj = new THREE.Object3D()
				obj.rotation.copy(this.character.rotation)
				obj.rotateY(Math.PI)
				if (this.worldClient.shootCallBack)
					this.worldClient.shootCallBack(this.character.position, obj.quaternion, true)
				this.worldClient.shootBall(this.character.position, obj.quaternion, true)
			}

			// shift modifier fix
			key = key.toLowerCase();

			// Free Cam
			if (key == 'c' && value == true && event.shiftKey == true) {
				this.character.resetControls()
				if (this.worldClient.playerConn) {
					this.worldClient.playerConn.data.controls.isCharacter = false
					this.worldClient.playerConn.data.controls.name = null
				}
				this.worldClient.setGameMode(new FreeCameraControls(this));
			}

			// Is key bound to action
			if ((key in this.keymap) && (this.worldClient.sendCharacterControlCallBack != undefined)) {
				this.character.setControl(this.keymap[key].action, value, false)
				this.worldClient.sendCharacterControlCallBack(this.character.name, this.keymap[key].action, value)
			}
		}
	}

	handleScroll(event: any, value: any): void {
		super.handleScroll(event, value);
		if (this.worldClient != undefined && this.worldClient.changeTimeScaleCallBack !== undefined)
			this.worldClient.changeTimeScaleCallBack(value)
	}

	handleMouseMove(event: any, deltaX: any, deltaY: any): void {
		if (this.worldClient != undefined) this.worldClient.cameraController.move(deltaX, deltaY);
	}

	update() {
		if (this.worldClient != undefined) {
			if (!_.includes(this.worldClient.allCharacters, this.character)) {
				this.worldClient.setGameMode(new FreeCameraControls(undefined));
			} else {
				let viewVector = new THREE.Vector3().subVectors(this.character.position, this.worldClient.camera.position);
				this.character.viewVector = new THREE.Vector3().subVectors(this.character.position, this.worldClient.camera.position);
				if (this.worldClient.playerConn) {
					this.worldClient.playerConn.data.controls.viewVector.copy(viewVector)
				}

				/*// Make light follow player (for shadows)
				this.worldClient.dirLight.position.set(
					this.character.position.x + this.worldClient.sun.x * 15,
					this.character.position.y + this.worldClient.sun.y * 15,
					this.character.position.z + this.worldClient.sun.z * 15);*/

				// Position camera
				this.worldClient.cameraController.target.set(
					this.character.position.x,
					this.character.position.y + this.character.height / 1.7,
					this.character.position.z
				);
			}
		}
	}
}
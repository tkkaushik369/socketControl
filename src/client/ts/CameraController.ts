import * as THREE from 'three';

export class CameraController {

	private camera: THREE.Camera
	public target: THREE.Vector3
	private sensitivity: THREE.Vector2

	public radius: number
	public theta: number
	public phi: number

	public onMouseDownPosition: THREE.Vector2
	public onMouseDownTheta: number
	public onMouseDownPhi: number

	constructor(camera: THREE.Camera, sensitivityX = 1, sensitivityY = sensitivityX) {
		// bind functions
		this.setSensitivity = this.setSensitivity.bind(this)
		this.setRadius = this.setRadius.bind(this)
		this.move = this.move.bind(this)
		this.update = this.update.bind(this)

		this.camera = camera;
		this.target = new THREE.Vector3(0, 0, 0);
		this.sensitivity = new THREE.Vector2(sensitivityX, sensitivityY);

		this.radius = 3;
		this.theta = 0;
		this.phi = 0;

		this.onMouseDownPosition = new THREE.Vector2();
		this.onMouseDownTheta = this.theta;
		this.onMouseDownPhi = this.phi;
	}

	public setSensitivity(sensitivityX: number, sensitivityY = sensitivityX) {
		this.sensitivity = new THREE.Vector2(sensitivityX, sensitivityY);
	}

	public setRadius(value: number) {
		this.radius = Math.max(0.001, value);
	}

	public move(deltaX: number, deltaY: number) {
		this.theta -= deltaX * this.sensitivity.x;
		this.theta %= 720;
		this.phi += deltaY * this.sensitivity.y;
		this.phi = Math.min(170, Math.max(-170, this.phi));
	}

	public update() {
		this.camera.position.x = this.target.x + this.radius * Math.sin(this.theta * Math.PI / 360) * Math.cos(this.phi * Math.PI / 360);
		this.camera.position.y = this.target.y + this.radius * Math.sin(this.phi * Math.PI / 360);
		this.camera.position.z = this.target.z + this.radius * Math.cos(this.theta * Math.PI / 360) * Math.cos(this.phi * Math.PI / 360);
		this.camera.updateMatrix();
		this.camera.lookAt(this.target);
	}
}
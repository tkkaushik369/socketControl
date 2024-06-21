import * as THREE from 'three'
import World from "../../server/ts/World";
import { Player } from "../../server/ts/Player";
import CannonDebugRenderer from '../../server/ts/Utils/cannonDebugRenderer'
import Stats from 'three/examples/jsm/libs/stats.module';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min';
import { CameraController } from './CameraController';
import * as GameModes from '../../server/ts/GameModes';
import { InputManager } from './InputManager';
import * as ScenarioImport from '../../server/ts/Scenarios/ScenarioImport'

export default class WorldClient extends World {

	private parentDom: HTMLElement
	private renderer: THREE.WebGLRenderer
	public scene: THREE.Scene
	public camera: THREE.Camera
	public cameraDistanceTarget: number
	public cameraController: CameraController

	private ambientLight: THREE.AmbientLight
	private spotLight: THREE.SpotLight
	public directionalLight: THREE.DirectionalLight

	private helpers: { [id: string]: THREE.Object3D }
	private allMeshs: { [id: string]: THREE.Mesh }
	private cannonDebugRenderer: CannonDebugRenderer

	public gameMode: GameModes.GameModeBase
	private inputManager: InputManager

	private stats: Stats
	private gui: GUI
	private folderScenarios: any

	public changeSceneCallBack: Function | undefined
	public shootCallBack: Function | undefined
	public changeTimeScaleCallBack: Function | undefined

	public constructor(clients: { [id: string]: Player }, parentDom?: HTMLElement) {
		super(clients)

		if (parentDom !== undefined) this.parentDom = parentDom
		else this.parentDom = document.body
		// Bind Functions
		this.addMesh = this.addMesh.bind(this)
		this.removeMesh = this.removeMesh.bind(this)
		this.removeAllMeshes = this.removeAllMeshes.bind(this)
		this.addScenarioToGui = this.addScenarioToGui.bind(this)
		this.changeScenario = this.changeScenario.bind(this)
		this.allHelper = this.allHelper.bind(this)
		this.animate = this.animate.bind(this)
		this.onWindowResize = this.onWindowResize.bind(this)

		this.toggleStats = this.toggleStats.bind(this)
		this.pointLockFunc = this.pointLockFunc.bind(this)
		this.debugFunc = this.debugFunc.bind(this)
		this.mouseSensitivityFunc = this.mouseSensitivityFunc.bind(this)
		this.timeScaleFunc = this.timeScaleFunc.bind(this)

		this.allHelpersCallBack = this.allHelper
		this.addMeshCallBack = this.addMesh
		this.removeMeshCallBack = this.removeMesh
		this.removeAllMeshesCallBack = this.removeAllMeshes
		this.addScenariosCallBack = this.addScenarioToGui

		// Init
		let fog = new THREE.Fog(0x222222, 1000, 2000)
		this.allMeshs = {}

		// Renderer
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
		this.renderer.setSize(window.innerWidth, window.innerHeight)
		this.renderer.shadowMap.enabled = true
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
		this.renderer.setClearColor(fog.color, 0.1)
		this.parentDom.appendChild(this.renderer.domElement)

		// Scene
		this.scene = new THREE.Scene()
		this.scene.fog = fog

		// Camera
		this.camera = new THREE.PerspectiveCamera(24, window.innerHeight / window.innerWidth, 1, 1000)
		this.camera.position.set(0, 20, 30)

		// Lights
		this.ambientLight = new THREE.AmbientLight(0xffffff, 0.1)
		this.scene.add(this.ambientLight)

		const lightVector = new THREE.Vector3(24, 30, 24)
		this.spotLight = new THREE.SpotLight(0xffffff, 1, 0, Math.PI / 2, 1, 2)
		this.spotLight.position.set(lightVector.x, lightVector.y, lightVector.z)
		this.spotLight.target.position.set(0, 0, 0)
		this.spotLight.castShadow = true
		this.spotLight.shadow.camera.fov = 30
		this.spotLight.shadow.camera.near = 500
		this.spotLight.shadow.camera.far = 4000
		this.spotLight.shadow.bias = -0.0001
		this.spotLight.shadow.mapSize.width = 2048
		this.spotLight.shadow.mapSize.height = 2048
		this.scene.add(this.spotLight)

		this.directionalLight = new THREE.DirectionalLight(0xffffff, 2)
		this.directionalLight.position.set(lightVector.x, lightVector.y, lightVector.z)
		this.directionalLight.target.position.set(0, 0, 0)
		this.directionalLight.castShadow = true
		this.scene.add(this.directionalLight)

		// helpers
		this.helpers = {}
		this.helpers['axesHelper'] = new THREE.AxesHelper(5)
		this.scene.add(this.helpers['axesHelper'])

		this.helpers['gridHelper'] = new THREE.GridHelper(10, 10)
		this.scene.add(this.helpers['gridHelper'])

		this.helpers['spotLight'] = new THREE.SpotLightHelper(this.spotLight)
		this.scene.add(this.helpers['spotLight'])

		this.helpers['directionalLight'] = new THREE.DirectionalLightHelper(this.directionalLight, 1)
		this.scene.add(this.helpers['directionalLight'])

		// CameraControls
		this.cameraDistanceTarget = 1;
		this.cameraController = new CameraController(this.camera, this.settings.MouseSensitivity * 0.7, this.settings.MouseSensitivity * 0.7);
		this.cameraController.phi = 70

		// GameMode
		this.gameMode = new GameModes.FreeCameraControls(undefined)
		this.gameMode.worldClient = this
		this.gameMode.init()

		// inputManager
		this.inputManager = new InputManager(this, this.parentDom);

		// cannoneDebug
		this.cannonDebugRenderer = new CannonDebugRenderer(this.scene, this.world, { color: 0xff0000 })

		// stats
		this.stats = new Stats()
		this.parentDom.appendChild(this.stats.dom)

		// GUI
		this.gui = new GUI()
		let folderSettings = this.gui.addFolder('Settings')
		folderSettings.add(this.settings, 'showStats').onChange(this.toggleStats)
		folderSettings.add(this.settings, 'showDebug').onChange(this.debugFunc)
		folderSettings.close()

		let inputFolder = this.gui.addFolder('Input')
		inputFolder.add(this.settings, 'PointerLock').onChange(this.pointLockFunc);
		inputFolder.add(this.settings, 'MouseSensitivity', 0.01, 0.5, 0.01).onChange(this.mouseSensitivityFunc).name("Mouse")
		inputFolder.add(this.settings, 'TimeScale', 0, 1).listen().onChange(this.timeScaleFunc).disable(true);
		inputFolder.close()

		this.folderScenarios = this.gui.addFolder('Scenario')
		this.folderScenarios.add({ ["Reset"]: () => this.changeScenario(-1, true) }, "Reset")
		this.gui.close()

		// Loading Scenarios
		ScenarioImport.loadScenarios(this)

		// run settings
		{
			this.toggleStats(this.settings.showStats)
			this.pointLockFunc(this.settings.PointerLock)
			this.debugFunc(this.settings.showDebug)
			this.mouseSensitivityFunc(this.settings.MouseSensitivity)
		}

		// Events
		window.addEventListener('resize', this.onWindowResize, false)
		this.onWindowResize()

		this.animate()
	}

	public addMesh(mesh: THREE.Mesh, name: string) {
		this.allMeshs[name] = mesh
		this.scene.add(mesh)
	}

	public removeMesh(name: string) {
		if (this.allMeshs[name] === undefined) return
		this.scene.remove(this.allMeshs[name])
		delete this.allMeshs[name]
	}

	public removeAllMeshes() {
		Object.keys(this.allMeshs).forEach((p) => {
			this.removeMesh(p)
		});
	}

	private addScenarioToGui(title: string, inx: number) {
		this.folderScenarios.add({ [title]: () => this.changeScenario(inx, true) }, title)
	}

	public changeScenario(inx: number, call: boolean) {
		if (call && (this.changeSceneCallBack !== undefined)) this.changeSceneCallBack(inx)
		else this.buildScene(inx)
	}

	private allHelper(show: boolean) {
		Object.keys(this.helpers).forEach((p) => {
			this.helpers[p].visible = show
		})
	}

	private animate = () => {
		requestAnimationFrame(this.animate)

		// Update Gamemode
		this.gameMode.update();

		// Lerp parameters
		this.cameraController.radius = THREE.MathUtils.lerp(this.cameraController.radius, this.cameraDistanceTarget, 0.1);
		this.cameraController.update()

		// Update physics Debug
		if (this.worldPhysicsUpdate)
			this.cannonDebugRenderer.update()

		this.renderer.render(this.scene, this.camera)
		this.stats.update()
	}

	// Events
	private onWindowResize = () => {
		(this.camera as THREE.PerspectiveCamera).aspect = window.innerWidth / window.innerHeight;
		(this.camera as THREE.PerspectiveCamera).updateProjectionMatrix()
		this.renderer.setSize(window.innerWidth, window.innerHeight)
	}

	// Settings
	private toggleStats = (val: boolean) => {
		this.stats.dom.style.display = val ? 'block' : 'none'
	}

	private pointLockFunc = (enabled: boolean) => {
		this.inputManager.setPointerLock(enabled);
	}

	private debugFunc = (enabled: boolean) => {
		this.worldPhysicsUpdate = enabled;
		this.buildScene(this.currentScenarioIndex);
		this.allBalls.forEach((ball: any) => {
			if (enabled) this.world.addBody(ball.physics!.physical)
			else this.world.removeBody(ball.physics!.physical)
		});
		this.cannonDebugRenderer.update()
	}

	private mouseSensitivityFunc = (value: number) => {
		this.cameraController.setSensitivity(value * 0.7, value * 0.7);
	}

	private timeScaleFunc = (value: number) => {
		this.settings.timeScaleTarget = value;
	}
}
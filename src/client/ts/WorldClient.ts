import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import World from "../../server/ts/World"
import { Player } from "../../server/ts/Player"
import CannonDebugRenderer from '../../server/ts/utils/cannonDebugRenderer'
import Stats from 'three/examples/jsm/libs/stats.module'
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min'
import { ViewHelper } from 'three/examples/jsm/helpers/ViewHelper'
import { CameraController } from './CameraController'
import * as GameModes from './GameModes'
import { InputManager } from './InputManager'
import * as ScenarioImport from '../../server/ts/Scenarios/ScenarioImport'
import Character from '../../server/ts/Characters/Character'

export default class WorldClient extends World {

	private parentDom: HTMLElement
	private renderer: THREE.WebGLRenderer
	private labelRenderer: CSS2DRenderer
	public scene: THREE.Scene
	public camera: THREE.Camera
	public cameraDistanceTarget: number
	public cameraController: CameraController

	private ambientLight: THREE.AmbientLight
	private spotLight: THREE.SpotLight
	public directionalLight: THREE.DirectionalLight

	private helpers: { [id: string]: THREE.Object3D }
	private viewHelper: ViewHelper
	private allMeshs: { [id: string]: any }
	private allBoxHelpers: { [id: string]: THREE.BoxHelper }
	private cannonDebugRenderer: CannonDebugRenderer

	public gameMode: GameModes.GameModeBase
	private inputManager: InputManager

	private stats: Stats
	private gui: GUI
	private folderScenarios: any

	public changeSceneCallBack: Function | undefined
	public shootCallBack: Function | undefined
	public changeTimeScaleCallBack: Function | undefined
	public sendCharacterControlCallBack: Function | undefined
	public playerConn: Player | undefined

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
		this.addBoxHelper = this.addBoxHelper.bind(this)
		this.removeBoxHelper = this.removeBoxHelper.bind(this)
		this.removeAllBoxHelpers = this.removeAllBoxHelpers.bind(this)
		this.setGameMode = this.setGameMode.bind(this)
		this.animate = this.animate.bind(this)
		this.onWindowResize = this.onWindowResize.bind(this)
		this.LoadAllScenario = this.LoadAllScenario.bind(this)
		this.LoadCharacter = this.LoadCharacter.bind(this)

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
		this.addBoxHelperCallBack = this.addBoxHelper
		this.removeBoxHelperCallBack = this.removeBoxHelper
		this.RemoveAllBoxHelpersCallBack = this.removeAllBoxHelpers
		this.setGameModeCallBack = this.setGameMode
		this.isClient = true

		// Init
		let fog = new THREE.Fog(0x222222, 1000, 2000)
		this.allMeshs = {}
		this.allBoxHelpers = {}

		// Renderer
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
		this.renderer.setSize(window.innerWidth, window.innerHeight)
		this.renderer.autoClear = false
		this.renderer.shadowMap.enabled = true
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
		this.renderer.setClearColor(fog.color, 0.1)
		this.parentDom.appendChild(this.renderer.domElement)

		this.labelRenderer = new CSS2DRenderer();
		this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
		this.labelRenderer.domElement.style.position = 'absolute';
		this.labelRenderer.domElement.style.top = '0px';
		this.parentDom.appendChild(this.labelRenderer.domElement);

		// Scene
		this.scene = new THREE.Scene()
		this.scene.fog = fog

		// Camera
		this.camera = new THREE.PerspectiveCamera(75, window.innerHeight / window.innerWidth, 0.03, 100)
		this.camera.position.set(0, 10, 15)

		// Lights
		this.ambientLight = new THREE.AmbientLight(0xffffff, 0.1)
		this.scene.add(this.ambientLight)

		const lightVector = new THREE.Vector3(24, 30, 24)
		this.spotLight = new THREE.SpotLight(0xffffff, 1, 0, Math.PI / 2, 1, 2)
		// this.spotLight.position.set(lightVector.x, lightVector.y, lightVector.z)
		// this.spotLight.target.position.set(0, 0, 0)
		// this.spotLight.castShadow = true
		// this.spotLight.shadow.camera.fov = 30
		// this.spotLight.shadow.camera.near = 500
		// this.spotLight.shadow.camera.far = 4000
		// this.spotLight.shadow.bias = -0.0001
		// this.spotLight.shadow.mapSize.width = 2048
		// this.spotLight.shadow.mapSize.height = 2048
		// this.scene.add(this.spotLight)

		this.directionalLight = new THREE.DirectionalLight(0xffffff, 1)
		this.directionalLight.position.set(lightVector.x, lightVector.y, lightVector.z)
		this.directionalLight.target.position.set(0, 0, 0)
		this.directionalLight.castShadow = true
		this.directionalLight.shadow.mapSize.width = 6048;
		this.directionalLight.shadow.mapSize.height = 6048;
		this.directionalLight.shadow.camera.near = 1;
		this.directionalLight.shadow.camera.far = 100;

		this.directionalLight.shadow.camera.top = 120;
		this.directionalLight.shadow.camera.right = 120;
		this.directionalLight.shadow.camera.bottom = -120;
		this.directionalLight.shadow.camera.left = -120;
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

		// viewHelper
		this.viewHelper = new ViewHelper(this.camera, this.renderer.domElement)

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
		this.LoadAllScenario()

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

	public LoadAllScenario() {
		ScenarioImport.loadScenarios(this);

		Object.keys(this.allCharacters).forEach((p) => {
			this.LoadCharacter(this.allCharacters[p])
		})
	}

	public LoadCharacter(character: Character) {
		const fbxLoader = new FBXLoader();
		fbxLoader.load('./models/game_man.fbx', (object: any) => {
			object.traverse((child: any) => {
				if (child.isMesh) {
					child.castShadow = true;
					child.receiveShadow = true;
				}
				if (child.name == 'game_man') {
					child.material = new THREE.MeshLambertMaterial({
						map: new THREE.TextureLoader().load('./models/game_man.png'),
						// skinning: true  
					});
				}
			});

			{
				const labelDiv = document.createElement('div');
				labelDiv.className = 'label';
				labelDiv.textContent = character.name;

				const label = new CSS2DObject(labelDiv);
				label.position.set(0, 1.3, 0);
				// label.center.set( 0, 1 );
				character.labelDiv = labelDiv
				character.label = label
				object.add(label);

				character.dirHelper = new THREE.Mesh(new THREE.SphereGeometry(0.01), new THREE.MeshLambertMaterial({ wireframe: false, color: 0x00ffff }))
				character.dirHelper.position.set(0, 1.2, 0)
				character.dirHelper.lookAt(0, 0, 0)

				const arr = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.1, 32), new THREE.MeshLambertMaterial({ wireframe: false, color: 0x00ffff }));
				arr.position.set(0, 0, 0.08)
				arr.rotation.x = Math.PI / 2
				character.dirHelper.add(arr)
				object.add(character.dirHelper)
			}

			character.setModel(object)
			character.setModelOffset(new THREE.Vector3(0, -0.1, 0));
		}, (xhr: any) => {
			// console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
		});
	}

	public addMesh(mesh: any, name: string) {
		this.scene.add(mesh)
		this.allMeshs[name] = mesh
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

	public addBoxHelper(boxHelper: THREE.BoxHelper, name: string) {
		this.allBoxHelpers[name] = boxHelper
		this.scene.add(boxHelper)
	}

	public removeBoxHelper(name: string) {
		if (this.allBoxHelpers[name] === undefined) return
		this.scene.remove(this.allBoxHelpers[name])
		delete this.allBoxHelpers[name]
	}

	public removeAllBoxHelpers() {
		Object.keys(this.allBoxHelpers).forEach((p) => {
			this.removeBoxHelper(p)
		});
	}

	public setGameMode(gameMode: any) {
		gameMode.worldClient = this;
		this.gameMode = gameMode;
		gameMode.init();
	}

	private animate = () => {
		requestAnimationFrame(this.animate)
		this.renderer.clear()

		let dt = this.clock.getDelta()

		// Update Gamemode
		this.gameMode.update();

		// Lerp parameters
		this.cameraController.radius = THREE.MathUtils.lerp(this.cameraController.radius, this.cameraDistanceTarget, 0.1);
		this.cameraController.update()

		// Update physics Debug
		if (this.worldPhysicsUpdate)
			this.cannonDebugRenderer.update()

		Object.keys(this.allBoxHelpers).forEach((p) => { this.allBoxHelpers[p].update() })
		Object.keys(this.allCharacters).forEach((p) => {
			if (this.allCharacters[p].dirHelper != null) this.allCharacters[p].dirHelper.lookAt(0, 0, 0);
			this.allCharacters[p].mixer?.update(dt * this.settings.TimeScale);
		})

		this.renderer.render(this.scene, this.camera)
		this.labelRenderer.render(this.scene, this.camera)
		this.viewHelper.render(this.renderer)
		this.stats.update()
	}

	// Events
	private onWindowResize = () => {
		(this.camera as THREE.PerspectiveCamera).aspect = window.innerWidth / window.innerHeight;
		(this.camera as THREE.PerspectiveCamera).updateProjectionMatrix()
		this.renderer.setSize(window.innerWidth, window.innerHeight)
		this.labelRenderer.setSize(window.innerWidth, window.innerHeight)
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
			if (enabled) this.world.addBody(ball.physics.physical)
			else this.world.removeBody(ball.physics.physical)
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
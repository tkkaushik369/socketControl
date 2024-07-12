import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader'
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
	private composer: EffectComposer
	private effectFXAA: ShaderPass
	public outlinePass: OutlinePass
	public scene: THREE.Scene
	public camera: THREE.Camera
	public cameraDistanceTarget: number
	public cameraController: CameraController

	public ambientLight: THREE.AmbientLight
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
	public setTimeScaleTargetCallBack: Function | undefined
	public sendCharacterControlCallBack: Function | undefined
	public playerConn: Player | undefined

	// all Senarios
	/* private tubeGeometry: THREE.TubeGeometry
	private cameraEye: THREE.Object3D
	private position = new THREE.Vector3()
	private direction = new THREE.Vector3()
	private binormal = new THREE.Vector3()
	private normal = new THREE.Vector3()
	private lookAt = new THREE.Vector3()
	private params: { [id: string]: any } */
	
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
		this.WorldClient = this

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
		const camera = new THREE.PerspectiveCamera(75, window.innerHeight / window.innerWidth, 0.03, 100)
		this.camera = new THREE.PerspectiveCamera(75, window.innerHeight / window.innerWidth, 0.03, 100)
		this.camera.position.set(0, 10, 15)

		// Lights
		this.ambientLight = new THREE.AmbientLight(0xffffff, 0.1)
		this.scene.add(this.ambientLight)

		const lightVector = new THREE.Vector3(24, 30, 24)

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
		document.body.appendChild(this.stats.dom)

		// Post Processing
		const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
		const renderTarget = new THREE.WebGLRenderTarget(size.width, size.height, { samples: 4, type: THREE.HalfFloatType });

		this.composer = new EffectComposer(this.renderer, renderTarget)

		const renderPass = new RenderPass(this.scene, this.camera)

		const ssaoPass = new SSAOPass(this.scene, this.camera, window.innerWidth, window.innerHeight);

		this.outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), this.scene, this.camera)
		this.outlinePass.edgeStrength = 0.5
		this.outlinePass.edgeGlow = 0
		this.outlinePass.edgeThickness = 0.5
		this.outlinePass.pulsePeriod = 0
		this.outlinePass.usePatternTexture = false
		this.outlinePass.visibleEdgeColor.set(new THREE.Color(0x00ffff))
		this.outlinePass.hiddenEdgeColor.set(new THREE.Color(0xe5a00d))

		const outlinePass = this.outlinePass
		const textureLoader = new THREE.TextureLoader()
		textureLoader.load('images/tri_pattern.jpg', function (texture) {
			outlinePass.patternTexture = texture
			texture.wrapS = THREE.RepeatWrapping
			texture.wrapT = THREE.RepeatWrapping
		})

		const outputPass = new OutputPass()

		this.effectFXAA = new ShaderPass(FXAAShader)
		this.effectFXAA.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight)

		this.composer.addPass(renderPass)
		// this.composer.addPass(ssaoPass)
		this.composer.addPass(this.outlinePass)
		this.composer.addPass(this.effectFXAA)
		this.composer.addPass(outputPass)

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

		/* {
			this.params = {
				extrusionSegments: 120,
				radiusSegments: 6,
				closed: true,
				scale: 0.4,
				radius: 0.12,
				offset: 0,
				velocity: 0.05,
				lookAhead: true,
				wireframe: true,
				useCamera: false,
				visible: true,
			}

			this.cameraEye = new THREE.PointLight( 0x88ffee, 3);
			this.cameraEye.add( new THREE.Mesh( new THREE.SphereGeometry( 0.02, 16, 8 ), new THREE.MeshStandardMaterial( { emissive: 0x88dddd, emissiveIntensity: 1, color: 0x000000 } ) ) );
			this.cameraEye.position.set( 1, 2, -8 );
			this.cameraEye.castShadow = true;
			(this.cameraEye as THREE.PointLight).shadow.camera.near = 0.02
			this.scene.add( this.cameraEye );
			this.scene.add( this.cameraEye );

			if(this.params.useCamera) {
				this.cameraController.camera = camera
				this.camera.position.set(0, 0, 0)
				this.cameraEye.add(this.camera)
			}

			const points = [
				new THREE.Vector3( -2,	0,	-2 ),
				new THREE.Vector3( -3,	1,	0 ),
				new THREE.Vector3( -2,	0,	2 ),
				new THREE.Vector3( 0,	1,	3 ),
				new THREE.Vector3( 2,	0,	2 ),
				new THREE.Vector3( 3,	1,	0),
				new THREE.Vector3( 2,	0,	-2 ),
				new THREE.Vector3( 0,	1,	-3 ),
			]
			points.forEach((vec) => {
				vec.x +=  5.2
				vec.y +=  3
				vec.z +=  14.5
			})
			const sampleClosedSpline = new THREE.CatmullRomCurve3( points );

			sampleClosedSpline.curveType = 'catmullrom';
			sampleClosedSpline.closed = this.params.closed;

			this.tubeGeometry = new THREE.TubeGeometry( sampleClosedSpline, this.params.extrusionSegments, this.params.radius, this.params.radiusSegments, this.params.closed );
			let mesh = new THREE.Mesh( this.tubeGeometry, new THREE.MeshStandardMaterial( { transparent: true, opacity: 0.5, color: 0x000000, visible: this.params.visible, wireframe: this.params.wireframe, wireframeLinewidth: 2, emissive: this.params.wireframe? 0x003333: 0x000000, emissiveIntensity: 1, side: THREE.DoubleSide }) );
			mesh.castShadow = true
			mesh.receiveShadow = true
			mesh.scale.set(this.params.scale, this.params.scale, this.params.scale)
			this.scene.add( mesh );
		} */
		
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
				character.modelContainer.add(character.dirHelper)
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

		/* {
			const time = Date.now();
			const looptime = 1000 / this.params.velocity
			const t = ( time % looptime ) / looptime;

			this.tubeGeometry.parameters.path.getPointAt( t, this.position );
			this.position = this.position.multiplyScalar( this.params.scale );

			const segments = this.tubeGeometry.tangents.length;
			const pickt = t * segments;
			const pick = Math.floor( pickt );
			const pickNext = ( pick + 1 ) % segments;
			this.binormal.subVectors( this.tubeGeometry.binormals[ pickNext ], this.tubeGeometry.binormals[ pick ] );
			this.binormal.multiplyScalar( pickt - pick ).add( this.tubeGeometry.binormals[ pick ] );
			this.tubeGeometry.parameters.path.getTangentAt( t, this.direction );
			this.normal.copy( this.binormal ).cross( this.direction );
			this.position.add( this.normal.clone().multiplyScalar( this.params.offset ) );
			this.cameraEye.position.copy(this.position );
			this.tubeGeometry.parameters.path.getPointAt( ( t + 30 / this.tubeGeometry.parameters.path.getLength() ) % 1, this.lookAt );
			this.lookAt.copy( this.position ).add( this.direction );
			this.cameraEye.matrix.lookAt( this.cameraEye.position, this.lookAt, this.normal );
			this.cameraEye.quaternion.setFromRotationMatrix( this.cameraEye.matrix );
			this.cameraEye.rotation.z -= Math.PI
		} */

		let models: THREE.Object3D[] = []
		Object.keys(this.allCharacters).forEach((p) => {
			models.push(this.allCharacters[p].characterModel)
		})
		this.outlinePass.selectedObjects = models

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


		this.composer.render()
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
		this.composer.setSize(window.innerWidth, window.innerHeight)
		this.effectFXAA.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
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

/*
// TODO

* https://github.com/mrdoob/three.js/blob/master/examples/webgl_postprocessing_outline.html
* https://github.com/mrdoob/three.js/blob/master/examples/webgl_postprocessing_fxaa.html
* https://github.com/mrdoob/three.js/blob/master/examples/webgpu_multisampled_renderbuffers.html
https://github.com/mrdoob/three.js/blob/master/examples/webgl_postprocessing_unreal_bloom.html
https://github.com/mrdoob/three.js/blob/master/examples/webgl_gpgpu_water.html
https://github.com/mrdoob/three.js/blob/master/examples/webgl_shadowmap_csm.html
https://github.com/mrdoob/three.js/blob/master/examples/webgl_shadowmap_pcss.html
https://github.com/mrdoob/three.js/blob/master/examples/webgl_portal.html

*/
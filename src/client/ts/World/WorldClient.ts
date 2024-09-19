import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass'
import { Utility } from '../../../server/ts/Core/Utility'
import Stats from 'three/examples/jsm/libs/stats.module.js'
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js'
import { WorldBase } from '../../../server/ts/World/WorldBase'
import { CannonDebugRenderer } from '../Utils/CannonDebugRenderer'
import { AttachModels } from '../Utils/AttachModels'
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { CSM } from 'three/examples/jsm/csm/CSM'
import { Sky } from 'three/examples/jsm/objects/Sky'
import { Ocean } from './Ocean'
import _ from 'lodash'

export class WorldClient extends WorldBase {

	private parentDom: HTMLDivElement
	private controlsDom: HTMLDivElement
	public renderer: THREE.WebGLRenderer
	public camera: THREE.PerspectiveCamera
	private clientClock: THREE.Clock

	private renderPass: RenderPass
	private fxaaPass: ShaderPass
	private outputPass: OutputPass
	private outlinePass: OutlinePass
	private composer: EffectComposer

	private sky: Sky
	public sun: THREE.Vector3
	public effectController: { [id: string]: any }
	private csm: CSM

	private oceans: Ocean[] = []

	public stats: Stats
	public networkStats: Stats.Panel
	private gui: GUI
	private mapGUIFolder: GUI
	private scenarioGUIFolder: GUI
	public roomCallers: { [id: string]: any } = {}
	public worldsGUIFolder: GUI
	public cannonDebugRenderer: CannonDebugRenderer
	private updateAnimationCallback: Function | null = null

	constructor(controlsDom: HTMLDivElement, parentDom: HTMLDivElement, updatateCallback: Function, launchMapCallback: Function, launchScenarioCallback: Function) {
		super(true)

		// functions bind
		this.getGLTF = this.getGLTF.bind(this)
		this.loadScene = this.loadScene.bind(this)
		this.onWindowResize = this.onWindowResize.bind(this)
		this.updateControls = this.updateControls.bind(this)
		this.debugPhysicsFunc = this.debugPhysicsFunc.bind(this)
		this.debugPhysicsWireframeFunc = this.debugPhysicsWireframeFunc.bind(this)
		this.debugPhysicsOpacityFunc = this.debugPhysicsOpacityFunc.bind(this)
		this.debugPhysicsEdgesFunc = this.debugPhysicsEdgesFunc.bind(this)
		this.toggleStatsFunc = this.toggleStatsFunc.bind(this)
		this.toggleHelpersFunc = this.toggleHelpersFunc.bind(this)
		this.togglePostFXAA = this.togglePostFXAA.bind(this)
		this.togglePostOutline = this.togglePostOutline.bind(this)
		this.pointLockFunc = this.pointLockFunc.bind(this)
		this.mouseSensitivityFunc = this.mouseSensitivityFunc.bind(this)
		this.timeScaleFunc = this.timeScaleFunc.bind(this)
		this.sunGuiChanged = this.sunGuiChanged.bind(this)
		this.launchMap = this.launchMap.bind(this)
		this.animate = this.animate.bind(this)

		// init
		this.controlsDom = controlsDom
		this.parentDom = (parentDom !== undefined) ? parentDom : (document.body as HTMLDivElement);
		// this.updatePhysicsCallback = updatateCallback
		this.updateAnimationCallback = updatateCallback
		// this.isClient = true
		this.updateControlsCallBack = this.updateControls
		this.launchMapCallback = launchMapCallback
		this.launchScenarioCallback = launchScenarioCallback

		// Renderer
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
		this.renderer.setPixelRatio(window.devicePixelRatio)
		this.renderer.setSize(this.parentDom.offsetWidth, this.parentDom.offsetHeight)
		this.renderer.autoClear = false
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping
		this.renderer.toneMappingExposure = 0.7
		this.renderer.shadowMap.enabled = true
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
		if (this.scene.fog !== null)
			this.renderer.setClearColor(this.scene.fog.color, 0.1)
		this.parentDom.appendChild(this.renderer.domElement)
		this.renderer.setAnimationLoop(this.animate)

		// Camera
		this.camera = Utility.defaultCamera()

		// Clock
		this.clientClock = new THREE.Clock()

		// Ambient Light
		// this.scene.add(new THREE.AmbientLight(0xaacccc));
		const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.0)
		hemiLight.color.setHSL(0.59, 0.4, 0.6)
		hemiLight.groundColor.setHSL(0.095, 0.2, 0.75)
		hemiLight.position.set(0, 50, 0)
		this.scene.add(hemiLight)


		// Sky
		this.sun = new THREE.Vector3()
		this.sky = new Sky()
		this.sky.scale.setScalar(450000)
		this.effectController = {
			turbidity: 1,
			rayleigh: 0.750,
			mieCoefficient: 0.1,
			mieDirectionalG: 0.9,
			elevation: 60,
			azimuth: 45,
			exposure: this.renderer.toneMappingExposure
		};
		this.scene.add(this.sky)

		// Shadows
		this.csm = new CSM({
			maxFar: 500,
			lightIntensity: 2.5,
			cascades: 3,
			shadowBias: 0,
			mode: 'practical',
			parent: this.scene,
			lightMargin: 100,
			lightNear: 1,
			lightFar: 1000,
			shadowMapSize: 1024 * 4,
			lightDirection: new THREE.Vector3(-1, -1, -1).normalize(),
			camera: this.camera,
		});
		this.csm.fade = true


		// Debug World
		this.cannonDebugRenderer = new CannonDebugRenderer(this.scene, this.world, {})

		{ // Post Processing
			//
			const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
			const renderTarget = new THREE.WebGLRenderTarget(size.width, size.height, { samples: 4, type: THREE.HalfFloatType });
			this.composer = new EffectComposer(this.renderer, renderTarget)

			//
			this.renderPass = new RenderPass(this.scene, this.camera);
			// this.renderPass.clearAlpha = 0;
			const pixelRatio = this.renderer.getPixelRatio();

			//
			this.fxaaPass = new ShaderPass(FXAAShader)
			this.fxaaPass.material['uniforms'].resolution.value.x = 1 / (window.innerWidth * pixelRatio)
			this.fxaaPass.material['uniforms'].resolution.value.y = 1 / (window.innerHeight * pixelRatio)

			//
			this.outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), this.scene, this.camera)
			this.outlinePass.edgeStrength = 2.0
			this.outlinePass.edgeGlow = 0.0
			this.outlinePass.edgeThickness = 0.5
			this.outlinePass.pulsePeriod = 0.0
			const textureLoader = new THREE.TextureLoader();
			textureLoader.load('/images/tri_pattern.jpg', (texture) => {
				this.outlinePass.patternTexture = texture;
				texture.wrapS = THREE.RepeatWrapping;
				texture.wrapT = THREE.RepeatWrapping;
			})
			this.outlinePass.selectedObjects = []
			this.outlinePass.usePatternTexture = false

			//
			this.outputPass = new OutputPass();

			this.composer.addPass(this.renderPass);
			this.composer.addPass(this.outlinePass)
			this.composer.addPass(this.fxaaPass);
			this.composer.addPass(this.outputPass);
		}

		// Stats
		this.stats = new Stats()
		this.networkStats = new Stats.Panel('PING', '#dd0', '#220')
		this.stats.addPanel(this.networkStats)
		this.stats.showPanel(0)
		this.parentDom.appendChild(this.stats.dom)

		// GUI
		this.gui = new GUI()
		let folderSettings = this.gui.addFolder('Settings')
		let cannonSettings = folderSettings.addFolder('Cannon Renderer')
		cannonSettings.add(this.settings, 'Debug_Physics').onChange(this.debugPhysicsFunc)
		// cannonSettings.add(this.settings, 'Debug_Physics_Wireframe').onChange(this.debugPhysicsWireframeFunc)
		cannonSettings.add(this.settings, 'Debug_Physics_MeshOpacity', 0, 1).listen().onChange(this.debugPhysicsOpacityFunc)
		cannonSettings.add(this.settings, 'Debug_Physics_MeshEdges').onChange(this.debugPhysicsEdgesFunc)
		cannonSettings.close()

		let debugSettings = folderSettings.addFolder('Helpers')
		debugSettings.add(this.settings, 'Debug_FPS').onChange(this.toggleStatsFunc)
		debugSettings.add(this.settings, 'Debug_Helper').onChange(this.toggleHelpersFunc)
		debugSettings.close()

		let postProcess = folderSettings.addFolder('Post Process')
		postProcess.add(this.settings, 'PostProcess')
		postProcess.add(this.settings, 'FXAA').onChange(this.togglePostFXAA)
		postProcess.add(this.settings, 'Outline').onChange(this.togglePostOutline)
		postProcess.close()

		let inputFolder = folderSettings.addFolder('Input')
		inputFolder.add(this.settings, 'Pointer_Lock').onChange(this.pointLockFunc)
		inputFolder.add(this.settings, 'Mouse_Sensitivity', 0.01, 0.5, 0.01).onChange(this.mouseSensitivityFunc).name("Mouse")
		inputFolder.add(this.settings, 'Time_Scale', 0, 1).listen().onChange(this.timeScaleFunc).disable(true)
		inputFolder.close()
		folderSettings.close()

		let sunFolder = folderSettings.addFolder('Sun')
		sunFolder.add(this.effectController, 'turbidity', 0.0, 20.0, 0.1).onChange(this.sunGuiChanged)
		sunFolder.add(this.effectController, 'rayleigh', 0.0, 4, 0.001).onChange(this.sunGuiChanged)
		sunFolder.add(this.effectController, 'mieCoefficient', 0.0, 0.1, 0.001).onChange(this.sunGuiChanged)
		sunFolder.add(this.effectController, 'mieDirectionalG', 0.0, 1, 0.001).onChange(this.sunGuiChanged)
		sunFolder.add(this.effectController, 'elevation', -90, 90, 0.1).onChange(this.sunGuiChanged)
		sunFolder.add(this.effectController, 'azimuth', - 180, 180, 0.1).onChange(this.sunGuiChanged)
		sunFolder.add(this.effectController, 'exposure', 0, 1, 0.0001).onChange(this.sunGuiChanged)
		sunFolder.close()

		// Sync Server
		let syncFolder = folderSettings.addFolder('SYNC')
		syncFolder.add(this.settings, 'SyncSun')
		syncFolder.add(this.settings, 'SyncInputs')
		syncFolder.add(this.settings, 'SyncCamera')
		syncFolder.close()

		// Maps
		this.mapGUIFolder = this.gui.addFolder('Maps')
		Object.keys(this.maps).forEach((key) => {
			this.mapGUIFolder.add(this.maps, key)
		})
		this.mapGUIFolder.close()

		// Scenarios
		this.scenarioGUIFolder = this.gui.addFolder('Scenarios')
		this.scenarioGUIFolderCallback = this.scenarioGUIFolder
		this.scenarioGUIFolder.close()

		// Worlds
		this.worldsGUIFolder = this.gui.addFolder('Worlds')

		// Resize
		window.addEventListener('resize', this.onWindowResize, false)
		{
			this.onWindowResize()
			this.debugPhysicsFunc(this.settings.Debug_Physics)
			this.debugPhysicsWireframeFunc(this.settings.Debug_Physics_Wireframe)
			this.debugPhysicsOpacityFunc(this.settings.Debug_Physics_MeshOpacity)
			this.debugPhysicsEdgesFunc(this.settings.Debug_Physics_MeshEdges)
			this.toggleStatsFunc(this.settings.Debug_FPS)
			this.toggleHelpersFunc(this.settings.Debug_Helper)
			this.togglePostFXAA(this.settings.FXAA)
			this.togglePostOutline(this.settings.Outline)
			this.pointLockFunc(this.settings.Pointer_Lock)
			this.mouseSensitivityFunc(this.settings.Mouse_Sensitivity)
			this.timeScaleFunc(this.settings.Time_Scale)
			this.sunGuiChanged()
		}

		if (true) {
			this.scene.add(AttachModels.makePointHighlight())
		}
	}

	public getGLTF(path: string, callback: Function) {
		const resPath = super.getGLTF(path, callback)
		const loader = new GLTFLoader()
		loader.load(resPath, (gltf: GLTF) => {
			callback(gltf)
		})
		return resPath
	}

	public loadScene(gltf: any, isLaunmch: boolean = true) {
		super.loadScene(gltf, isLaunmch)
		gltf.scene.traverse((child: any) => {
			if (child.hasOwnProperty('userData')) {
				if (child.type === 'Mesh') {
					this.csm.setupMaterial(child.material);

					if (child.material.name === 'ocean') { // only sketchbook
						this.oceans.push(new Ocean(child, this))
					}
				}
			}
		})
	}

	private onWindowResize() {
		const width = window.innerWidth
		const height = window.innerHeight

		this.camera.aspect = width / height
		this.camera.updateProjectionMatrix()

		this.renderer.setSize(width, height)
		const pixelRatio = this.renderer.getPixelRatio()

		this.fxaaPass.uniforms['resolution'].value.set(1 / (width * pixelRatio), 1 / (height * pixelRatio))
		this.composer.setSize(width, height)
	}

	private updateControls(controls: { keys: string[], desc: string }[]): void {
		let html = ''
		html += '<h2 class="controls-title">Controls:</h2>'

		controls.forEach((row) => {
			html += '<div class="ctrl-row">'
			row.keys.forEach((key) => {
				if (key === '+' || key === 'and' || key === 'or' || key === '&') html += '&nbsp' + key + '&nbsp'
				else html += '<span class="ctrl-key">' + key + '</span>'
			})

			html += '<span class="ctrl-desc">' + row.desc + '</span></div>'
		})

		this.controlsDom.innerHTML = html
	}

	// Gui Functions
	private debugPhysicsFunc(enabled: boolean) {
		this.cannonDebugRenderer.showMesh(enabled)
	}

	private debugPhysicsWireframeFunc(enabled: boolean) {
		this.cannonDebugRenderer.setWireframe(enabled)
	}

	private debugPhysicsOpacityFunc(value: number) {
		this.cannonDebugRenderer.setOpacity(value)
	}

	private debugPhysicsEdgesFunc(enabled: boolean) {
		this.cannonDebugRenderer.setEdges(enabled)
	}

	private toggleStatsFunc(enabled: boolean) {
		this.stats.dom.style.display = enabled ? 'block' : 'none'
	}

	private toggleHelpersFunc(enabled: boolean) {
		this.vehicles.forEach((vehi) => {
			vehi.seats.forEach((seat) => {
				seat.entryPoints.forEach((ep) => {
					ep.traverse((obj) => {
						/* if(obj.hasOwnProperty('userData')) {
							if(obj.userData.hasOwnProperty('name')) {
								if(obj.userData.name === "pointHelper") {
									obj.visible = enabled
								}
							}
						} */
						ep.visible = enabled
					})
				})
			})
		})
		this.paths.forEach((path) => {
			path.rootNode.visible = enabled
		})
	}

	private togglePostFXAA(enable: boolean) {
		this.fxaaPass.enabled = enable
	}

	private togglePostOutline(enable: boolean) {
		this.outlinePass.enabled = enable
	}

	private pointLockFunc(enabled: boolean) {
		if (this.player !== null)
			this.player.inputManager.setPointerLock(enabled)
	}

	private mouseSensitivityFunc(value: number) {
		if (this.player !== null)
			this.player.cameraOperator.setSensitivity(value * 0.7, value * 0.7)
	}

	private timeScaleFunc(value: number) {
		this.settings.timeScaleTarget = value
		this.timeScaleTarget = value
	}

	public sunGuiChanged() {
		const uniforms = this.sky.material.uniforms;
		uniforms['turbidity'].value = this.effectController.turbidity;
		uniforms['rayleigh'].value = this.effectController.rayleigh;
		uniforms['mieCoefficient'].value = this.effectController.mieCoefficient;
		uniforms['mieDirectionalG'].value = this.effectController.mieDirectionalG;

		const phi = THREE.MathUtils.degToRad(90 - this.effectController.elevation);
		const theta = THREE.MathUtils.degToRad(this.effectController.azimuth);

		this.sun.setFromSphericalCoords(1, phi, theta);

		uniforms['sunPosition'].value.copy(this.sun);
		this.csm.lightDirection = new THREE.Vector3().copy(this.sun).normalize().multiplyScalar(-1)

		this.renderer.toneMappingExposure = this.effectController.exposure;
		this.renderer.render(this.scene, this.camera);
	}

	public launchMap(mapID: string, isCallback: boolean, isLaunched: boolean = true) {
		super.launchMap(mapID, isCallback, isLaunched)
		this.oceans = []
	}

	private animate() {
		this.update()
		this.csm.update()
		this.oceans.forEach((ocean) => {
			ocean.update(this.timeScaleTarget * 1.0 / 60.0)
		})

		{
			this.outlinePass.selectedObjects = []
			Object.keys(this.users).forEach((sID) => {
				if (this.users[sID] !== undefined) {
					const user = this.users[sID]
					if (user.character !== null) {
						if (user.character.controlledObject !== null) {
							if (!_.includes(this.outlinePass.selectedObjects, user.character.controlledObject))
								this.outlinePass.selectedObjects.push(user.character.controlledObject)
						} else {
							if (!_.includes(this.outlinePass.selectedObjects, user.character))
								this.outlinePass.selectedObjects.push(user.character)
						}
					}
				}
			})
		}

		if (this.updateAnimationCallback !== null) this.updateAnimationCallback()
		this.stats.update()
		if (this.settings.Debug_Physics) this.cannonDebugRenderer.update()

		if (this.settings.PostProcess)
			this.composer.render();
		else
			this.renderer.render(this.scene, this.camera)
	}
}
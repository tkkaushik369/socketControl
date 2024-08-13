import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader'
import * as Utils from '../../../server/ts/Core/FunctionLibrary'
import Stats from 'three/examples/jsm/libs/stats.module.js'
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js'
import { WorldBase } from '../../../server/ts/World/WorldBase'
import { CannonDebugRenderer } from '../Utils/CannonDebugRenderer'
import { AttachModels } from '../Utils/AttachModels'
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { Sky } from 'three/examples/jsm/objects/Sky'
import { Water } from 'three/examples/jsm/objects/Water'
import { Water as Water2 } from 'three/examples/jsm/objects/Water2'

export class WorldClient extends WorldBase {

	private parentDom: HTMLDivElement
	private controlsDom: HTMLDivElement
	public renderer: THREE.WebGLRenderer
	public camera: THREE.PerspectiveCamera
	private clientClock: THREE.Clock

	private renderPass: RenderPass
	private fxaaPass: ShaderPass
	private outputPass: OutputPass
	private composer: EffectComposer

	private sky: Sky
	private sun: THREE.Vector3
	public effectController: { [is: string]: any }

	public stats: Stats
	public networkStats: Stats.Panel
	private gui: GUI
	private mapGUIFolder: GUI
	private scenarioGUIFolder: GUI
	public cannonDebugRenderer: CannonDebugRenderer
	private updateAnimationCallback: Function | null = null

	constructor(controlsDom: HTMLDivElement, parentDom: HTMLDivElement, updatateCallback: Function, launchMapCallback: Function, launchScenarioCallback: Function) {
		super()

		// functions bind
		this.getGLTF = this.getGLTF.bind(this)
		this.onWindowResize = this.onWindowResize.bind(this)
		this.updateControls = this.updateControls.bind(this)
		this.debugPhysicsFunc = this.debugPhysicsFunc.bind(this)
		this.debugPhysicsWireframeFunc = this.debugPhysicsWireframeFunc.bind(this)
		this.debugPhysicsOpacityFunc = this.debugPhysicsOpacityFunc.bind(this)
		this.debugPhysicsEdgesFunc = this.debugPhysicsEdgesFunc.bind(this)
		this.toggleStatsFunc = this.toggleStatsFunc.bind(this)
		this.toggleHelpersFunc = this.toggleHelpersFunc.bind(this)
		this.pointLockFunc = this.pointLockFunc.bind(this)
		this.mouseSensitivityFunc = this.mouseSensitivityFunc.bind(this)
		this.timeScaleFunc = this.timeScaleFunc.bind(this)
		this.sunGuiChanged = this.sunGuiChanged.bind(this)
		this.animate = this.animate.bind(this)

		// init
		this.controlsDom = controlsDom
		this.parentDom = (parentDom !== undefined) ? parentDom : (document.body as HTMLDivElement);
		// this.updatePhysicsCallback = updatateCallback
		this.updateAnimationCallback = updatateCallback
		this.isClient = true
		this.updateControlsCallBack = this.updateControls
		this.launchMapCallback = launchMapCallback
		this.launchScenarioCallback = launchScenarioCallback

		// Renderer
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
		this.renderer.setPixelRatio(window.devicePixelRatio)
		this.renderer.setSize(window.innerWidth, window.innerHeight)
		this.renderer.autoClear = false
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping
		this.renderer.toneMappingExposure = 1
		this.renderer.shadowMap.enabled = true
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
		if (this.scene.fog !== null)
			this.renderer.setClearColor(this.scene.fog.color, 0.1)
		this.parentDom.appendChild(this.renderer.domElement)
		this.renderer.setAnimationLoop(this.animate)

		// Camera
		this.camera = Utils.defaultCamera()

		// Clock
		this.clientClock = new THREE.Clock()

		// Ambient Light
		this.scene.add(new THREE.AmbientLight(0x666666));

		// Sky
		this.sun = new THREE.Vector3()
		this.sky = new Sky()
		this.sky.scale.setScalar(450000)
		this.effectController = {
			turbidity: 10,
			rayleigh: 3,
			mieCoefficient: 0.005,
			mieDirectionalG: 0.7,
			elevation: 60,
			azimuth: 45,
			exposure: this.renderer.toneMappingExposure
		};
		this.scene.add(this.sky)

		// Debug World
		this.cannonDebugRenderer = new CannonDebugRenderer(this.scene, this.world, {})

		{ // Post Processing
			//
			this.renderPass = new RenderPass(this.scene, this.camera);
			this.renderPass.clearAlpha = 0;

			//
			const pixelRatio = this.renderer.getPixelRatio();
			this.outputPass = new OutputPass();

			this.fxaaPass = new ShaderPass(FXAAShader);
			this.fxaaPass.material.uniforms['resolution'].value.x = 1 / (this.parentDom.offsetWidth * pixelRatio);
			this.fxaaPass.material.uniforms['resolution'].value.y = 1 / (this.parentDom.offsetHeight * pixelRatio);

			this.composer = new EffectComposer(this.renderer);
			this.composer.addPass(this.renderPass);
			this.composer.addPass(this.outputPass);
			this.composer.addPass(this.fxaaPass);
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
		cannonSettings.open()

		let debugSettings = folderSettings.addFolder('Cannon Renderer')
		debugSettings.add(this.settings, 'Debug_FPS').onChange(this.toggleStatsFunc)
		debugSettings.add(this.settings, 'Debug_Helper').onChange(this.toggleHelpersFunc)
		debugSettings.open()

		let inputFolder = folderSettings.addFolder('Input')
		inputFolder.add(this.settings, 'Pointer_Lock').onChange(this.pointLockFunc)
		inputFolder.add(this.settings, 'Mouse_Sensitivity', 0.01, 0.5, 0.01).onChange(this.mouseSensitivityFunc).name("Mouse")
		inputFolder.add(this.settings, 'Time_Scale', 0, 1).listen().onChange(this.timeScaleFunc).disable(true)
		inputFolder.open()
		folderSettings.close()

		let sunFolder = folderSettings.addFolder('Sun')
		sunFolder.add(this.effectController, 'turbidity', 0.0, 20.0, 0.1).onChange(this.sunGuiChanged)
		sunFolder.add(this.effectController, 'rayleigh', 0.0, 4, 0.001).onChange(this.sunGuiChanged)
		sunFolder.add(this.effectController, 'mieCoefficient', 0.0, 0.1, 0.001).onChange(this.sunGuiChanged)
		sunFolder.add(this.effectController, 'mieDirectionalG', 0.0, 1, 0.001).onChange(this.sunGuiChanged)
		sunFolder.add(this.effectController, 'elevation', 0, 90, 0.1).onChange(this.sunGuiChanged)
		sunFolder.add(this.effectController, 'azimuth', - 180, 180, 0.1).onChange(this.sunGuiChanged)
		sunFolder.add(this.effectController, 'exposure', 0, 1, 0.0001).onChange(this.sunGuiChanged)

		// Maps
		this.mapGUIFolder = this.gui.addFolder('Maps')
		Object.keys(this.maps).forEach((key) => {
			this.mapGUIFolder.add(this.maps, key)
		})
		this.mapGUIFolder.open()

		// Scenarios
		this.scenarioGUIFolder = this.gui.addFolder('Scenarios')
		this.scenarioGUIFolderCallback = this.scenarioGUIFolder

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
			this.pointLockFunc(this.settings.Pointer_Lock)
			this.mouseSensitivityFunc(this.settings.Mouse_Sensitivity)
			this.timeScaleFunc(this.settings.Time_Scale)
			this.sunGuiChanged()
		}

		{
			const ground = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshPhongMaterial({ color: 0xffffff }))
			const ground2 = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshPhongMaterial({ color: 0xffffff }))
			ground.castShadow = true
			ground2.castShadow = true
			ground.receiveShadow = true
			ground2.receiveShadow = true
			ground.position.set(0, 100, 0)
			ground2.position.set(0.5, 100.5, 0.5)
			this.scene.add(ground)
			this.scene.add(ground2)
		}

		if (true) {
			this.scene.add(AttachModels.makePointHighlight())
		}
	}

	public getGLTF(path: string, callback: Function) {
		super.getGLTF(path, callback)
		const loader = new GLTFLoader()
		loader.load(path, (gltf: GLTF) => {
			callback(gltf)
		})
	}

	private onWindowResize() {
		const width = window.innerWidth;
		const height = window.innerHeight;

		this.camera.aspect = width / height
		this.camera.updateProjectionMatrix()

		this.renderer.setSize(width, height)
		this.composer.setSize(width, height)

		const pixelRatio = this.renderer.getPixelRatio()

		this.fxaaPass.material.uniforms['resolution'].value.x = 1 / width * pixelRatio
		this.fxaaPass.material.uniforms['resolution'].value.y = 1 / (height * pixelRatio)
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
		this.dirLight.position.copy(this.sun).multiplyScalar(100)
		console.log(JSON.stringify(this.dirLight.position))

		this.renderer.toneMappingExposure = this.effectController.exposure;
		this.renderer.render(this.scene, this.camera);
	}

	private animate() {
		if (this.updateAnimationCallback !== null) this.updateAnimationCallback()
		this.stats.update()
		if (this.settings.Debug_Physics) this.cannonDebugRenderer.update()

		// this.renderer.render(this.scene, this.camera)
		this.composer.render();
	}
}
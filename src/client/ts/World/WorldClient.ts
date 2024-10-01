import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass'
import { Utility } from '../../../server/ts/Core/Utility'
import Stats from 'three/examples/jsm/libs/stats.module.js'
import { Pane } from 'tweakpane'
import { TabApi, TabPageApi } from '@tweakpane/core'
import { WorldBase } from '../../../server/ts/World/WorldBase'
import { CannonDebugRenderer } from '../Utils/CannonDebugRenderer'
import { AttachModels } from '../Utils/AttachModels'
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { CSM } from 'three/examples/jsm/csm/CSM'
import { Sky } from 'three/examples/jsm/objects/Sky'
import { Ocean } from './Ocean'
import _ from 'lodash'
import { UiControlsGroup } from '../../../server/ts/Enums/UiControlsGroup'
import { UiControls, UiControlsType } from '../../../server/ts/Constants'

export class WorldClient extends WorldBase {

	private parentDom: HTMLDivElement
	private controlsDom: HTMLDivElement
	public renderer: THREE.WebGLRenderer
	public camera: THREE.PerspectiveCamera
	private clientClock: THREE.Clock
	public uiControls: UiControlsGroup

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
	private gui: Pane
	private mapGUIFolder: TabApi
	public roomCallers: { [id: string]: any } = {}
	// public playersFolderTabs: TabApi
	public playerMessages: { [id: string]: string } = {}
	public worldsGUIFolder: TabPageApi
	public cannonDebugRenderer: CannonDebugRenderer
	private updateAnimationCallback: Function | null = null

	constructor(controlsDom: HTMLDivElement, parentDom: HTMLDivElement, updatateCallback: Function, launchMapCallback: Function, launchScenarioCallback: Function) {
		super(true)

		// functions bind
		this.getGLTF = this.getGLTF.bind(this)
		this.loadScene = this.loadScene.bind(this)
		this.onWindowResize = this.onWindowResize.bind(this)
		this.updateControls = this.updateControls.bind(this)
		this.debugPhysicsEngineFunc = this.debugPhysicsEngineFunc.bind(this)
		this.debugPhysicsFunc = this.debugPhysicsFunc.bind(this)
		this.debugPhysicsWireframeFunc = this.debugPhysicsWireframeFunc.bind(this)
		this.debugPhysicsOpacityFunc = this.debugPhysicsOpacityFunc.bind(this)
		this.debugPhysicsEdgesFunc = this.debugPhysicsEdgesFunc.bind(this)
		this.toggleStatsFunc = this.toggleStatsFunc.bind(this)
		this.toggleHelpersFunc = this.toggleHelpersFunc.bind(this)
		this.togglePingsFunc = this.togglePingsFunc.bind(this)
		this.toggleControlsFunc = this.toggleControlsFunc.bind(this)
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
		this.parentDom = (parentDom !== undefined) ? parentDom : (document.body as HTMLDivElement)
		this.updateAnimationCallback = updatateCallback
		this.launchMapCallback = launchMapCallback
		this.launchScenarioCallback = launchScenarioCallback
		this.uiControls = UiControlsGroup.None

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
		// this.scene.add(new THREE.AmbientLight(0xaacccc))
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
		}
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
		})
		this.csm.fade = true


		// Debug World
		this.cannonDebugRenderer = new CannonDebugRenderer(this.scene, this.world, {})

		{ // Post Processing
			//
			const size = this.renderer.getDrawingBufferSize(new THREE.Vector2())
			const renderTarget = new THREE.WebGLRenderTarget(size.width, size.height, { samples: 4, type: THREE.HalfFloatType })
			this.composer = new EffectComposer(this.renderer, renderTarget)

			//
			this.renderPass = new RenderPass(this.scene, this.camera)
			// this.renderPass.clearAlpha = 0
			const pixelRatio = this.renderer.getPixelRatio()

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
			const textureLoader = new THREE.TextureLoader()
			textureLoader.load('/images/tri_pattern.jpg', (texture) => {
				this.outlinePass.patternTexture = texture
				texture.wrapS = THREE.RepeatWrapping
				texture.wrapT = THREE.RepeatWrapping
			})
			this.outlinePass.selectedObjects = []
			this.outlinePass.usePatternTexture = false

			//
			this.outputPass = new OutputPass()

			this.composer.addPass(this.renderPass)
			this.composer.addPass(this.outlinePass)
			this.composer.addPass(this.fxaaPass)
			this.composer.addPass(this.outputPass)
		}

		// Stats
		this.stats = new Stats()
		this.networkStats = new Stats.Panel('PING', '#dd0', '#220')
		this.stats.addPanel(this.networkStats)
		this.stats.showPanel(0)
		this.parentDom.appendChild(this.stats.dom)

		// GUI
		this.gui = new Pane()
		let folderSettings = this.gui.addFolder({ title: 'Settings', expanded: false })
		let cannonSettings = folderSettings.addFolder({ title: 'Cannon Renderer', expanded: false })
		// cannonSettings.addBinding(this.settings, 'Debug_Physics_Engine').on('change', this.debugPhysicsEngineFunc)
		cannonSettings.addBinding(this.settings, 'Debug_Physics').on('change', this.debugPhysicsFunc)
		// cannonSettings.addBinding(this.settings, 'Debug_Physics_Wireframe').on('change', this.debugPhysicsWireframeFunc)
		cannonSettings.addBinding(this.settings, 'Debug_Physics_MeshOpacity', { min: 0, max: 1 }).on('change', this.debugPhysicsOpacityFunc)
		cannonSettings.addBinding(this.settings, 'Debug_Physics_MeshEdges').on('change', this.debugPhysicsEdgesFunc)

		let debugSettings = folderSettings.addFolder({ title: 'Helpers', expanded: false })
		debugSettings.addBinding(this.settings, 'Debug_FPS').on('change', this.toggleStatsFunc)
		debugSettings.addBinding(this.settings, 'Debug_Helper').on('change', this.toggleHelpersFunc)
		debugSettings.addBinding(this.settings, 'Debug_Pings').on('change', this.togglePingsFunc)
		debugSettings.addBinding(this.settings, 'Debug_Controls').on('change', this.toggleControlsFunc)

		let postProcess = folderSettings.addFolder({ title: 'Post Process', expanded: false })
		postProcess.addBinding(this.settings, 'PostProcess')
		postProcess.addBinding(this.settings, 'FXAA').on('change', this.togglePostFXAA)
		postProcess.addBinding(this.settings, 'Outline').on('change', this.togglePostOutline)

		let inputFolder = folderSettings.addFolder({ title: 'Input', expanded: false })
		inputFolder.addBinding(this.settings, 'Pointer_Lock').on('change', this.pointLockFunc)
		inputFolder.addBinding(this.settings, 'Mouse_Sensitivity', { min: 0.01, max: 0.5, step: 0.01, label: 'Mouse' }).on('change', this.mouseSensitivityFunc)
		inputFolder.addBinding(this.settings, 'Time_Scale', { min: -0.2, max: 1.2, readonly: true, view: 'graph', /* disabled: true */ }).on('change', this.timeScaleFunc)

		let sunFolder = folderSettings.addFolder({ title: 'Sun', expanded: false })
		sunFolder.addBinding(this.effectController, 'turbidity', { min: 0.0, max: 20.0, step: 0.1 }).on('change', this.sunGuiChanged)
		sunFolder.addBinding(this.effectController, 'rayleigh', { min: 0.0, max: 4, step: 0.001 }).on('change', this.sunGuiChanged)
		sunFolder.addBinding(this.effectController, 'mieCoefficient', { min: 0.0, max: 0.1, step: 0.001 }).on('change', this.sunGuiChanged)
		sunFolder.addBinding(this.effectController, 'mieDirectionalG', { min: 0.0, max: 1, step: 0.001 }).on('change', this.sunGuiChanged)
		sunFolder.addBinding(this.effectController, 'elevation', { min: -90, max: 90, step: 0.1 }).on('change', this.sunGuiChanged)
		sunFolder.addBinding(this.effectController, 'azimuth', { min: - 180, max: 180, step: 0.1 }).on('change', this.sunGuiChanged)
		sunFolder.addBinding(this.effectController, 'exposure', { min: 0, max: 1, step: 0.0001 }).on('change', this.sunGuiChanged)

		// Sync Server
		let syncFolder = folderSettings.addFolder({ title: 'SYNC', expanded: false })
		syncFolder.addBinding(this.settings, 'SyncSun')
		syncFolder.addBinding(this.settings, 'SyncInputs')

		// World Scene Folder
		let sceneFolder = this.gui.addFolder({ title: 'Scenes', expanded: true })
		this.mapGUIFolder = sceneFolder.addTab({
			pages: [
				{ title: 'Map' },
				{ title: 'Scenarios' },
				{ title: 'World' },
			]
		})

		// Maps
		Object.keys(this.maps).forEach((key) => {
			this.mapGUIFolder.pages[0].addButton({ title: key }).on('click', (ev: any) => { this.maps[key]() })
		})

		// Scenarios
		this.scenarioGUIFolderCallback = this.mapGUIFolder.pages[1]

		// Worlds
		this.worldsGUIFolder = this.mapGUIFolder.pages[2]

		// Players Gui
		/* let playersGui = new Pane({ container: document.getElementById('gui-players') as HTMLDivElement })
		let playersFolder = playersGui.addFolder({ title: '#', expanded: false })
		this.playersFolderTabs = playersFolder.addTab({
			pages: [
				{ title: 'Chat' },
				{ title: 'World Players' },
				{ title: 'All Players' },
			]
		}) */

		// Chat
		/* this.playersFolderTabs.pages[0].addBinding(this.playerMessages, this.player!.uID as string, {
			readonly: true,
			bufferSize: 10,
			multiline: true,
			rows: 5,
		}) */


		// Resize
		window.addEventListener('resize', this.onWindowResize, false)
		{
			this.onWindowResize()
			this.debugPhysicsEngineFunc({ value: this.settings.Debug_Physics_Engine })
			this.debugPhysicsFunc({ value: this.settings.Debug_Physics })
			this.debugPhysicsWireframeFunc({ value: this.settings.Debug_Physics_Wireframe })
			this.debugPhysicsOpacityFunc({ value: this.settings.Debug_Physics_MeshOpacity })
			this.debugPhysicsEdgesFunc({ value: this.settings.Debug_Physics_MeshEdges })
			this.toggleStatsFunc({ value: this.settings.Debug_FPS })
			this.toggleHelpersFunc({ value: this.settings.Debug_Controls })
			this.togglePingsFunc({ value: this.settings.Debug_Pings })
			this.toggleControlsFunc({ value: this.settings.Debug_Helper })
			this.togglePostFXAA({ value: this.settings.FXAA })
			this.togglePostOutline({ value: this.settings.Outline })
			this.pointLockFunc({ value: this.settings.Pointer_Lock })
			this.mouseSensitivityFunc({ value: this.settings.Mouse_Sensitivity })
			this.timeScaleFunc({ value: this.settings.Time_Scale })
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
					this.csm.setupMaterial(child.material)

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

	public updateControls(type: UiControlsGroup): void {
		let controls: UiControlsType

		switch (type) {
			case UiControlsGroup.CameraOperator: {
				controls = UiControls.CameraOperator
				break
			}
			case UiControlsGroup.Character: {
				controls = UiControls.Character
				break
			}
			case UiControlsGroup.Sitting: {
				controls = UiControls.Sitting
				break
			}
			case UiControlsGroup.Car: {
				controls = UiControls.Car
				break
			}
			case UiControlsGroup.Helicopter: {
				controls = UiControls.Helicopter
				break
			}
			case UiControlsGroup.Airplane: {
				controls = UiControls.Airplane
				break
			}
			default: {
				controls = []
				break
			}
		}

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
		this.uiControls = type
	}

	// Gui Functions
	private debugPhysicsEngineFunc(en: { value: boolean }) {
		this.restartScenario()
	}

	private debugPhysicsFunc(en: { value: boolean }) {
		this.cannonDebugRenderer.showMesh(en.value)
	}

	private debugPhysicsWireframeFunc(en: { value: boolean }) {
		this.cannonDebugRenderer.setWireframe(en.value)
	}

	private debugPhysicsOpacityFunc(en: { value: number }) {
		this.cannonDebugRenderer.setOpacity(en.value)
	}

	private debugPhysicsEdgesFunc(en: { value: boolean }) {
		this.cannonDebugRenderer.setEdges(en.value)
	}

	private toggleStatsFunc(en: { value: boolean }) {
		this.stats.dom.style.display = en.value ? 'block' : 'none'
	}

	private toggleHelpersFunc(en: { value: boolean }) {
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
						ep.visible = en.value
					})
				})
			})
		})
		this.paths.forEach((path) => {
			path.rootNode.visible = en.value
		})
	}

	private togglePingsFunc(en: { value: boolean }) {
		(document.getElementById("pingStats") as HTMLDivElement).style.display = en.value ? "block" : "none"
	}

	private toggleControlsFunc(en: { value: boolean }) {
		this.controlsDom.style.display = en.value ? "block" : "none"
	}

	private togglePostFXAA(en: { value: boolean }) {
		this.fxaaPass.enabled = en.value
	}

	private togglePostOutline(en: { value: boolean }) {
		this.outlinePass.enabled = en.value
	}

	private pointLockFunc(en: { value: boolean }) {
		if (this.player !== null)
			this.player.inputManager.setPointerLock(en.value)
	}

	private mouseSensitivityFunc(en: { value: number }) {
		if (this.player !== null)
			this.player.cameraOperator.setSensitivity(en.value * 0.7, en.value * 0.7)
	}

	private timeScaleFunc(en: { value: number }) {
		this.settings.timeScaleTarget = en.value
		this.timeScaleTarget = en.value
	}

	public sunGuiChanged() {
		const uniforms = this.sky.material.uniforms
		uniforms['turbidity'].value = this.effectController.turbidity
		uniforms['rayleigh'].value = this.effectController.rayleigh
		uniforms['mieCoefficient'].value = this.effectController.mieCoefficient
		uniforms['mieDirectionalG'].value = this.effectController.mieDirectionalG

		const phi = THREE.MathUtils.degToRad(90 - this.effectController.elevation)
		const theta = THREE.MathUtils.degToRad(this.effectController.azimuth)

		this.sun.setFromSphericalCoords(1, phi, theta)

		uniforms['sunPosition'].value.copy(this.sun)
		this.csm.lightDirection = new THREE.Vector3().copy(this.sun).normalize().multiplyScalar(-1)

		this.renderer.toneMappingExposure = this.effectController.exposure
		this.renderer.render(this.scene, this.camera)
	}

	public launchMap(mapID: string, isCallback: boolean, isLaunched: boolean = true) {
		super.launchMap(mapID, isCallback, isLaunched)
		this.oceans = []
	}

	private animate() {
		this.update()
		// this.gui.refresh()
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
			this.composer.render()
		else
			this.renderer.render(this.scene, this.camera)
	}
}
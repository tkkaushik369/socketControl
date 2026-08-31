import * as THREE from 'three'
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js'
import {
	Utility,
	WorldBase,
	UiControlsGroup,
	UiControls,
	UiControlsType,
	MapConfigType,
	AttachModels,
	ControlsTypes,
} from '@World'
import Stats from 'three/examples/jsm/libs/stats.module.js'
import { Pane } from 'tweakpane'
import { TabApi, TabPageApi } from '@tweakpane/core'
import { CannonDebugRenderer } from '../Utils/CannonDebugRenderer'
// import { AttachModels } from '../../../world/ts/Utils/AttachModels'
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { CSM } from 'three/examples/jsm/csm/CSM.js'
import { Sky } from 'three/examples/jsm/objects/Sky.js'
import { Ocean } from './Ocean'
import { Grass } from './Grass'
import _ from 'lodash'
import { SpeakerClient } from './SpeakerClient'
import { InfoStack } from '../Core/InfoStack'

export class WorldClient extends WorldBase {
	private parentDom: HTMLDivElement
	private controlsDom: HTMLDivElement
	public renderer: THREE.WebGLRenderer
	private isOwnRenderer3d: boolean
	private isOwnRenderer2d: boolean
	public labelRenderer: CSS2DRenderer
	public camera: THREE.PerspectiveCamera
	private clientClock: THREE.Clock
	public uiControls: UiControlsGroup

	private renderPass: RenderPass
	private fxaaPass: ShaderPass
	private outputPass: OutputPass
	private unrealBloomPass: UnrealBloomPass
	private outlinePass: OutlinePass
	private composer: EffectComposer

	private hemiLight: THREE.HemisphereLight
	private sky: Sky
	public sun: THREE.Vector3
	public effectController: { [id: string]: any }
	private csm: CSM

	// private oceans: Ocean[] = []
	// private grasses: Grass[] = []

	public stats: Stats
	public networkStats: Stats.Panel
	public bandwidthStats: Stats.Panel
	private gui: Pane
	private mapGUIFolder: TabApi
	public roomCallers: { [id: string]: any } = {}
	// public playersFolderTabs: TabApi
	public playerMessages: { [id: string]: string } = {}
	public worldsGUIFolder: TabPageApi
	public cannonDebugRenderer: CannonDebugRenderer
	private updateAnimationCallback: Function | null = null

	private infoStack: InfoStack

	constructor(
		maps: MapConfigType[],
		controlsDom: HTMLDivElement,
		parentDom: HTMLDivElement,
		updatateCallback: Function,
		launchMapCallback: Function,
		launchScenarioCallback: Function,
		renderer: THREE.WebGLRenderer | null = null,
		labelRenderer: CSS2DRenderer | null = null
	) {
		super(maps, '/', true)

		// functions bind
		this.getGLTF = this.getGLTF.bind(this)
		this.getJSON = this.getJSON.bind(this)
		this.loadScene = this.loadScene.bind(this)
		this.CreateWorker = this.CreateWorker.bind(this)
		this.onWindowResize = this.onWindowResize.bind(this)
		this.updateRaceResults = this.updateRaceResults.bind(this)
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
		this.toggleConsoleFunc = this.toggleConsoleFunc.bind(this)
		this.togglePostFXAA = this.togglePostFXAA.bind(this)
		this.togglePostUnrealBloom = this.togglePostUnrealBloom.bind(this)
		this.postUnrealBloomThreshold = this.postUnrealBloomThreshold.bind(this)
		this.postUnrealBloomStrength = this.postUnrealBloomStrength.bind(this)
		this.postUnrealBloomRadius = this.postUnrealBloomRadius.bind(this)
		this.togglePostOutline = this.togglePostOutline.bind(this)
		this.toggleTextures = this.toggleTextures.bind(this)
		this.toggleShadows = this.toggleShadows.bind(this)
		this.pointLockFunc = this.pointLockFunc.bind(this)
		this.mouseSensitivityFunc = this.mouseSensitivityFunc.bind(this)
		this.timeScaleFunc = this.timeScaleFunc.bind(this)
		this.sunGuiChanged = this.sunGuiChanged.bind(this)
		this.launchMap = this.launchMap.bind(this)
		this.launchScenario = this.launchScenario.bind(this)
		this.animate = this.animate.bind(this)

		// init
		this.controlsDom = controlsDom
		this.parentDom = parentDom !== undefined ? parentDom : (document.body as HTMLDivElement)
		this.updateAnimationCallback = updatateCallback
		this.launchMapCallback = launchMapCallback
		this.launchScenarioCallback = launchScenarioCallback
		this.uiControls = UiControlsGroup.None
		this.infoStack = new InfoStack()

		this.add(this.infoStack)

		// Renderer
		if (renderer === null) {
			this.isOwnRenderer3d = true
			this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
			// this.renderer.setPixelRatio(window.devicePixelRatio)
			this.renderer.setSize(this.parentDom.offsetWidth, this.parentDom.offsetHeight)
			this.renderer.autoClear = false
			this.renderer.toneMapping = THREE.ACESFilmicToneMapping
			this.renderer.toneMappingExposure = 1
			this.renderer.shadowMap.enabled = true
			this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
			if (this.scene.fog !== null) this.renderer.setClearColor(this.scene.fog.color, 0.1)
			this.parentDom.appendChild(this.renderer.domElement)
			this.renderer.setAnimationLoop(this.animate)
		} else {
			this.isOwnRenderer3d = false
			this.renderer = renderer
		}

		// Label Renderer
		if (labelRenderer === null) {
			this.isOwnRenderer2d = true
			this.labelRenderer = new CSS2DRenderer()
			this.labelRenderer.setSize(this.parentDom.offsetWidth, this.parentDom.offsetHeight)
			this.labelRenderer.domElement.id = 'labelRenderer'
			this.labelRenderer.domElement.style.position = 'absolute'
			this.labelRenderer.domElement.style.top = '0px'
			this.labelRenderer.domElement.style.pointerEvents = 'none'
			this.parentDom.appendChild(this.labelRenderer.domElement)
		} else {
			this.isOwnRenderer2d = false
			this.labelRenderer = labelRenderer
		}

		// Camera
		this.camera = Utility.defaultCamera()

		// listener
		this.listener = new THREE.AudioListener()
		this.camera.add(this.listener)

		// Clock
		this.clientClock = new THREE.Clock()

		// Ambient Light
		// this.scene.add(new THREE.AmbientLight(0xaacccc))
		this.hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.5)
		this.hemiLight.color.setHSL(0.59, 0.4, 0.6)
		this.hemiLight.groundColor.setHSL(0.095, 0.2, 0.75)
		this.hemiLight.position.set(0, 50, 0)
		this.scene.add(this.hemiLight)

		// Sky
		this.sun = new THREE.Vector3()
		this.sky = new Sky()
		this.sky.scale.setScalar(450000)
		this.effectController = {
			turbidity: 1,
			rayleigh: 0.75,
			mieCoefficient: 0.1,
			mieDirectionalG: 0.9,
			elevation: 60,
			azimuth: 45,
			exposure: this.renderer.toneMappingExposure,
		}
		this.scene.add(this.sky)

		// Shadows
		this.csm = new CSM({
			maxFar: 500,
			lightIntensity: 2.5,
			cascades: 3,
			shadowBias: -0.0001,
			mode: 'uniform',
			parent: this.scene,
			lightMargin: 100,
			lightNear: 1,
			lightFar: 800,
			shadowMapSize: 1024 * 4,
			lightDirection: new THREE.Vector3(-1, -1, -1).normalize(),
			camera: this.camera,
		})
		this.csm.fade = true

		// Debug World
		this.cannonDebugRenderer = new CannonDebugRenderer(this.scene, this.world, {})

		{
			// Post Processing
			//
			const size = this.renderer.getDrawingBufferSize(new THREE.Vector2())
			const renderTarget = new THREE.WebGLRenderTarget(size.width, size.height, {
				samples: 4,
				type: THREE.HalfFloatType,
			})
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
			this.unrealBloomPass = new UnrealBloomPass(
				new THREE.Vector2(window.innerWidth, window.innerHeight),
				1.5,
				0.4,
				0.85
			)
			this.unrealBloomPass.threshold = this.settings.UnrealBloom_threshold
			this.unrealBloomPass.strength = this.settings.UnrealBloom_strength
			this.unrealBloomPass.radius = this.settings.UnrealBloom_radius

			//
			this.outlinePass = new OutlinePass(
				new THREE.Vector2(window.innerWidth, window.innerHeight),
				this.scene,
				this.camera
			)
			this.outlinePass.edgeStrength = 2.0
			this.outlinePass.edgeGlow = 0.0
			this.outlinePass.edgeThickness = 0.5
			this.outlinePass.pulsePeriod = 0.0
			/* const textureLoader = new THREE.TextureLoader()
			textureLoader.load(
				'../client/images/tri_pattern.jpg',
				(texture) => {
					this.outlinePass.patternTexture = texture
					texture.wrapS = THREE.RepeatWrapping
					texture.wrapT = THREE.RepeatWrapping
				},
				undefined,
				undefined
			) */
			this.outlinePass.selectedObjects = []
			this.outlinePass.usePatternTexture = false

			//
			this.outputPass = new OutputPass()

			this.composer.addPass(this.renderPass)
			this.composer.addPass(this.unrealBloomPass)
			this.composer.addPass(this.outlinePass)
			this.composer.addPass(this.fxaaPass)
			this.composer.addPass(this.outputPass)
		}

		// Stats
		this.stats = new Stats()
		this.stats.dom.id = 'stats'
		this.networkStats = new Stats.Panel('PING', '#dd0', '#220')
		this.stats.addPanel(this.networkStats)
		this.bandwidthStats = new Stats.Panel('Bandwidth', '#ff00d4ff', '#220020')
		this.stats.addPanel(this.bandwidthStats)
		this.stats.showPanel(0)
		this.parentDom.appendChild(this.stats.dom)

		// GUI
		this.gui = new Pane()
		this.gui.element.id = 'gui'
		// this.parentDom.appendChild(this.gui.element)

		let folderSettings = this.gui.addFolder({ title: 'Settings', expanded: false })
		let cannonSettings = folderSettings.addFolder({ title: 'Cannon Renderer', expanded: false })
		// cannonSettings.addBinding(this.settings, 'Debug_Physics_Engine').on('change', this.debugPhysicsEngineFunc)
		cannonSettings
			.addBinding(this.settings, 'Debug_Physics', { label: 'Physics' })
			.on('change', this.debugPhysicsFunc)
		// cannonSettings.addBinding(this.settings, 'Debug_Physics_Wireframe').on('change', this.debugPhysicsWireframeFunc)
		cannonSettings
			.addBinding(this.settings, 'Debug_Physics_MeshOpacity', { min: 0, max: 1, label: 'Mesh-Opacity' })
			.on('change', this.debugPhysicsOpacityFunc)
		cannonSettings
			.addBinding(this.settings, 'Debug_Physics_MeshEdges', { label: 'Mesh-Edges' })
			.on('change', this.debugPhysicsEdgesFunc)

		let debugSettings = folderSettings.addFolder({ title: 'Helpers', expanded: false })
		debugSettings.addBinding(this.settings, 'Debug_FPS', { label: 'FPS' }).on('change', this.toggleStatsFunc)
		debugSettings
			.addBinding(this.settings, 'Debug_Helper', { label: 'Helper' })
			.on('change', this.toggleHelpersFunc)
		debugSettings.addBinding(this.settings, 'Debug_Pings', { label: 'Pings' }).on('change', this.togglePingsFunc)
		debugSettings
			.addBinding(this.settings, 'Debug_Controls', { label: 'Controls' })
			.on('change', this.toggleControlsFunc)
		debugSettings
			.addBinding(this.settings, 'Debug_Console', { label: 'Console' })
			.on('change', this.toggleConsoleFunc)

		let postProcess = folderSettings.addFolder({ title: 'Post Process', expanded: false })
		postProcess.addBinding(this.settings, 'PostProcess')
		postProcess.addBinding(this.settings, 'FXAA').on('change', this.togglePostFXAA)

		let unrealBloom = postProcess.addFolder({ title: 'Unreal Bloom', expanded: true })
		unrealBloom.addBinding(this.settings, 'UnrealBloom').on('change', this.togglePostUnrealBloom)
		// unrealBloom
		// 	.addBinding(this.settings, 'UnrealBloom_threshold', { min: 0, max: 1, label: 'Threshold' })
		// 	.on('change', this.postUnrealBloomThreshold)
		// unrealBloom
		// 	.addBinding(this.settings, 'UnrealBloom_strength', { min: 0, max: 1, label: 'Strength' })
		// 	.on('change', this.postUnrealBloomStrength)
		unrealBloom
			.addBinding(this.settings, 'UnrealBloom_radius', { min: 0, max: 1, label: 'Radius' })
			.on('change', this.postUnrealBloomRadius)

		postProcess.addBinding(this.settings, 'Outline').on('change', this.togglePostOutline)
		postProcess.addBinding(this.settings, 'Textures').on('change', this.toggleTextures)

		let inputFolder = folderSettings.addFolder({ title: 'Input', expanded: false })
		inputFolder.addBinding(this.settings, 'Pointer_Lock').on('change', this.pointLockFunc)
		inputFolder
			.addBinding(this.settings, 'Mouse_Sensitivity', { min: 0.01, max: 0.5, step: 0.01, label: 'Mouse' })
			.on('change', this.mouseSensitivityFunc)
		inputFolder
			.addBinding(this.settings, 'Time_Scale', {
				min: -0.2,
				max: 1.2,
				readonly: true,
				view: 'graph' /* disabled: true */,
			})
			.on('change', this.timeScaleFunc)

		let sunFolder = folderSettings.addFolder({ title: 'Sun', expanded: false })
		sunFolder.addBinding(this.settings, 'Shadows').on('change', this.toggleShadows)
		sunFolder
			.addBinding(this.effectController, 'turbidity', { min: 0.0, max: 20.0, step: 0.1 })
			.on('change', this.sunGuiChanged)
		sunFolder
			.addBinding(this.effectController, 'rayleigh', { min: 0.0, max: 4, step: 0.001 })
			.on('change', this.sunGuiChanged)
		sunFolder
			.addBinding(this.effectController, 'mieCoefficient', { min: 0.0, max: 0.1, step: 0.001 })
			.on('change', this.sunGuiChanged)
		sunFolder
			.addBinding(this.effectController, 'mieDirectionalG', { min: 0.0, max: 1, step: 0.001 })
			.on('change', this.sunGuiChanged)
		sunFolder
			.addBinding(this.effectController, 'elevation', { min: -90, max: 90, step: 0.1 })
			.on('change', (en: { value: number }) => {
				this.sunConf.elevation = en.value
				this.sunGuiChanged()
			})
		sunFolder
			.addBinding(this.effectController, 'azimuth', { min: -180, max: 180, step: 0.1 })
			.on('change', (en: { value: number }) => {
				this.sunConf.azimuth = en.value
				this.sunGuiChanged()
			})
		sunFolder
			.addBinding(this.effectController, 'exposure', { min: 0, max: 1, step: 0.0001 })
			.on('change', this.sunGuiChanged)

		// Sync Server
		let syncFolder = folderSettings.addFolder({ title: 'SYNC', expanded: false })
		syncFolder.addBinding(this.settings, 'SyncSun')
		syncFolder.addBinding(this.settings, 'SyncInputs')

		// World Scene Folder
		let sceneFolder = this.gui.addFolder({ title: 'Scenes', expanded: true })
		this.mapGUIFolder = sceneFolder.addTab({
			pages: [{ title: 'Map' }, { title: 'Scenarios' }, { title: 'World' }],
		})

		// Maps
		Object.keys(this.maps).forEach((key) => {
			this.mapGUIFolder.pages[0].addButton({ title: key }).on('click', (ev: any) => {
				this.maps[key].map_func()
			})
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
			this.toggleHelpersFunc({ value: this.settings.Debug_Helper })
			this.togglePingsFunc({ value: this.settings.Debug_Pings })
			this.toggleControlsFunc({ value: this.settings.Debug_Controls })
			this.toggleConsoleFunc({ value: this.settings.Debug_Console })
			this.togglePostFXAA({ value: this.settings.FXAA })
			this.togglePostUnrealBloom({ value: this.settings.UnrealBloom })
			this.postUnrealBloomThreshold({ value: this.settings.UnrealBloom_threshold })
			this.postUnrealBloomStrength({ value: this.settings.UnrealBloom_strength })
			this.postUnrealBloomRadius({ value: this.settings.UnrealBloom_radius })
			this.togglePostOutline({ value: this.settings.Outline })
			this.pointLockFunc({ value: this.settings.Pointer_Lock })
			this.mouseSensitivityFunc({ value: this.settings.Mouse_Sensitivity })
			this.timeScaleFunc({ value: this.settings.Time_Scale })
			this.settings.SyncSun = false
			this.sunGuiChanged()
		}

		if (true) {
			this.scene.add(AttachModels.makePointHighlight())
		}
	}

	public getGLTF(path: string, callback: Function) {
		let trackerEntry = this.loadingManager.addLoadingEntry(path)
		const resPath = super.getGLTF(path, callback)
		const loader = new GLTFLoader()
		loader.load(
			resPath,
			(gltf: GLTF) => {
				callback(gltf)
				this.loadingManager.doneLoading(trackerEntry)
			},
			(xhr) => {
				if (xhr.lengthComputable) {
					this.loadingManager.dispatchEvent(
						new CustomEvent('loading_progress', {
							detail: { progress: xhr.loaded / xhr.total, name: path },
						})
					)
					trackerEntry.progress = xhr.loaded / xhr.total
				}
			},
			(error) => {
				console.error(error)
			}
		)
		return resPath
	}

	public getJSON(path: string, callback: Function) {
		const resPath = super.getJSON(path, callback)
		const loader = new THREE.FileLoader()
		const data = loader.loadAsync(resPath.path)
		loader.load(resPath.path, (data: string | ArrayBuffer) => {
			callback(JSON.parse(String(data)))
		})
		return resPath
	}

	public loadScene(gltf: any, sub_name: string, /* isLaunmch: boolean = true */) {
		super.loadScene(gltf, sub_name)
		gltf.scene.traverse((child: any) => {
			if (child.hasOwnProperty('userData')) {
				if (child.type === 'Mesh') {
					this.csm.setupMaterial(child.material)

					if (child.material.name === 'ocean') {
						// only sketchbook
						if (child.userData.name === 'Plane.002') {
							child.position.y += 10
						}
						let ocean = new Ocean(child, this)
						this.add(ocean)
						// this.oceans.push(ocean)
						this.clientEntity.push(ocean)
					} else if (child.material.name === 'grass') {
						// only sketchbook
						let instances = 300000
						if (child.material.hasOwnProperty('userData')) {
							if (child.material.userData.hasOwnProperty('instances')) {
								instances = child.material.userData.instances
							}
						}
						const position: THREE.Vector3 = child.position.clone()
						position.x += gltf.scene.position.x
						position.y += gltf.scene.position.y
						position.z += gltf.scene.position.z
						let grass = new Grass({
							scale: child.scale.clone(),
							position: position,
						}, this, instances)
						this.add(grass)
						// this.grasses.push(grass)
						this.clientEntity.push(grass)
					}
				}
			}
		})

		this.scenarios.forEach((scenario) => {
			if (scenario.raceContent !== null) {
				const raceContent = scenario.raceContent
				raceContent.addEventListener('race_update', (evt: any) => {
					this.updateRaceResults(raceContent.getRaceResults())
				})
			}
		})
		// this.add(new SpeakerClient(this, this.renderer, this.camera))
	}

	public CreateWorker(msgFunc: Function) {
		// super.sendWorker(msg)
		const worker = new Worker('../@WorldClient/WorkerClient.js', {
			/*  type: "module", */
		})
		worker.onerror = (err) => {
			console.log(`Worker Error: ${err}`)
		}
		worker.onmessage = (msg) => {
			// console.log(`World: ${msg.data}`)
			msgFunc(msg.data)
		}
		// console.log(`WorldClientSend: ${msg}`)
		// worker.onmessage = (rmsg) => this.fromWorker(rmsg.data)
		// worker.postMessage(msg)
		return worker
	}

	private onWindowResize() {
		const width = window.innerWidth
		const height = window.innerHeight

		this.camera.aspect = width / height
		this.camera.updateProjectionMatrix()

		if (this.isOwnRenderer3d) this.renderer.setSize(width, height)
		if (this.isOwnRenderer2d) this.labelRenderer.setSize(width, height)
		const pixelRatio = this.renderer.getPixelRatio()

		this.fxaaPass.uniforms['resolution'].value.set(1 / (width * pixelRatio), 1 / (height * pixelRatio))
		this.composer.setSize(width, height)
	}

	public updateRaceResults(raceResults: string[]) {
		const race = document.getElementById('race')
		if (race !== null) {
			race.innerHTML = ''
			for (let i = 0; i < raceResults.length; i++) {
				const li_ele = document.createElement('a')
				li_ele.innerText = raceResults[i]
				race.appendChild(li_ele)
				race.appendChild(document.createElement('br'))
			}
		}
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
			case UiControlsGroup.Train: {
				controls = UiControls.Train
				break
			}
			default: {
				controls = []
				break
			}
		}

		let html = ''
		html += '<h2 class="controls-title">Controls:</h2>'

		const ctrlAct = 'ctrl-act'
		const mapAct: { id: string; keys: string[] }[] = []
		controls.forEach((row) => {
			html += '<div class="ctrl-row">'

			const isCombo = row.keys.includes('+')
			if (isCombo) {
				const cid = ctrlAct + '-' + row.keys.join(':')
				html += '<div class="ctrl-combo" id="' + cid + '">'
				mapAct.push({ id: cid, keys: row.keys })
			}

			row.keys.forEach((key) => {
				if (key === '+' || key === 'and' || key === 'or' || key === '&') html += '&nbsp' + key + '&nbsp'
				else {
					const cid = ctrlAct + '-' + key
					html += '<span class="ctrl-key" '
					if (!isCombo) html += 'id="' + cid + '"'
					html += '>' + key + '</span>'
					mapAct.push({ id: cid, keys: [key] })
				}
			})

			if (isCombo) html += '</div>'

			html += '<span class="ctrl-desc">' + row.desc + '</span></div>'
		})

		this.controlsDom.innerHTML = html
		this.uiControls = type

		mapAct.forEach((ma) => {
			const ele = document.getElementById(ma.id)
			if (ele == null) return
			const self = this
			const ctlCall = (pressed: boolean) => {
				let newArray = ma.keys
				const isCombo = newArray.includes('+') ? true : false
				let csKey = ''
				if (isCombo) {
					newArray = newArray.filter((item) => item !== '+')
					newArray = newArray.filter((item) => item !== 'Shift')
					csKey = newArray[0]
				}
				if (this.player === null) return
				let actKey = isCombo ? csKey : newArray[0]
				if (actKey == 'Space') {
				} else if (actKey == 'Shift') {
					actKey = 'ShiftLeft'
				} else {
					actKey = 'Key' + actKey
				}
				this.player.inputManager.setControls({
					sID: 'offline_player',
					type: ControlsTypes.Keyboard,
					data: {
						code: actKey,
						isShift: isCombo,
						pressed: pressed,
					},
				} as any)
			}
			ele.addEventListener('touchstart', () => {
				ctlCall(true)
			})
			ele.addEventListener('touchend', () => {
				ctlCall(false)
			})
		})
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
		this.trains.forEach((train) => {
			// train.seats.forEach((seat) => {
			// 	seat.entryPoints.forEach((ep) => {
			// 		ep.traverse((obj) => {
			// 			/* if(obj.hasOwnProperty('userData')) {
			// 				if(obj.userData.hasOwnProperty('name')) {
			// 					if(obj.userData.name === "pointHelper") {
			// 						obj.visible = enabled
			// 					}
			// 				}
			// 			} */
			// 			ep.visible = en.value
			// 		})
			// 	})
			// })
		})
		this.paths.forEach((path) => {
			path.rootNode.visible = en.value
		})
	}

	private togglePingsFunc(en: { value: boolean }) {
		;(document.getElementById('pingStats') as HTMLDivElement).style.display = en.value ? 'block' : 'none'
	}

	private toggleControlsFunc(en: { value: boolean }) {
		this.controlsDom.style.display = en.value ? 'block' : 'none'
	}

	private toggleConsoleFunc(en: { value: boolean }) {
		;(document.getElementById('console') as HTMLDivElement).style.display = en.value ? 'block' : 'none'
	}

	private togglePostFXAA(en: { value: boolean }) {
		this.fxaaPass.enabled = en.value
	}

	private togglePostUnrealBloom(en: { value: boolean }) {
		this.unrealBloomPass.enabled = en.value
	}

	private postUnrealBloomThreshold(en: { value: number }) {
		this.unrealBloomPass.threshold = en.value
	}

	private postUnrealBloomStrength(en: { value: number }) {
		this.unrealBloomPass.strength = en.value
	}

	private postUnrealBloomRadius(en: { value: number }) {
		this.unrealBloomPass.radius = en.value
	}

	private togglePostOutline(en: { value: boolean }) {
		this.outlinePass.enabled = en.value
	}

	private toggleTextures(en: { value: boolean }) {
		this.settings.Textures = en.value
	}

	private toggleShadows(en: { value: boolean }) {
		this.settings.Shadows = en.value

		this.renderer.shadowMap.enabled = en.value

		this.scene.traverse((child: any) => {
			if (child.material) {
				child.material.needsUpdate = true
			}
		})
	}

	private pointLockFunc(en: { value: boolean }) {
		if (this.player !== null) this.player.inputManager.setPointerLock(en.value)
	}

	private mouseSensitivityFunc(en: { value: number }) {
		if (this.player !== null) this.player.cameraOperator.setSensitivity(en.value * 0.7, en.value * 0.7)
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

		/* if (!this.settings.SyncSun && this.worldId === null) {
			this.sunConf.elevation = this.effectController.elevation
			this.sunConf.azimuth = this.effectController.azimuth
		} */

		this.sun.setFromSphericalCoords(1, phi, theta)

		uniforms['sunPosition'].value.copy(this.sun)
		this.csm.lightDirection = new THREE.Vector3().copy(this.sun).normalize().multiplyScalar(-1)

		this.renderer.toneMappingExposure = this.effectController.exposure
		if (this.isOwnRenderer3d) this.renderer.render(this.scene, this.camera)
		if (this.isOwnRenderer2d) this.labelRenderer.render(this.scene, this.camera)
	}

	private renderPortals() {
		for (const portal of this.portals) {
			if (!portal.linkedPortal) continue

			// Hide portal meshes while rendering the texture
			const visibleState = this.portals.map((p) => p.mesh.visible)

			this.portals.forEach((p) => {
				p.mesh.visible = false
			})

			// Render only if camera sees the front
			if (portal.isFrontFacing(this.camera)) {
				this.renderer.setRenderTarget(portal.renderTarget)
				this.renderer.clear()

				this.renderer.render(this.scene, portal.camera)

				this.renderer.setRenderTarget(null)
			} else {
				// blank texture from back side
				this.renderer.setRenderTarget(portal.renderTarget)
				this.renderer.clearColor()
				this.renderer.clear()

				this.renderer.setRenderTarget(null)
			}

			// restore visibility
			this.portals.forEach((p, i) => {
				p.mesh.visible = visibleState[i]
			})
		}
	}

	public async launchMap(mapID: string, isCallback: boolean, isLaunched: boolean = true) {
		super.launchMap(mapID, isCallback, isLaunched)
		if (!isCallback) this.infoStack.addMessage(`Map Loaded: ${mapID}`)
		// this.oceans = []
		// this.grasses = []
	}

	public launchScenario(scenarioID: string | null, isCallback: boolean): void {
		super.launchScenario(scenarioID, isCallback)
		if (!isCallback) this.infoStack.addMessage(`Scenario Loaded: ${scenarioID}`)
		const race = document.getElementById('race')
		if (race !== null) race.innerHTML = ''
	}

	private animate() {
		this.update()
		// this.gui.refresh()
		if (this.settings.SyncSun) {
			if (this.worldId === null) {
				this.effectController.elevation = this.sunConf.elevation
				this.effectController.azimuth = this.sunConf.azimuth
			}
			this.sunGuiChanged()
		}
		if (this.settings.PostProcess) {
			this.postUnrealBloomThreshold({ value: this.settings.UnrealBloom_threshold })
			this.postUnrealBloomStrength({ value: this.settings.UnrealBloom_strength })
			// this.postUnrealBloomRadius({ value: this.settings.unrealBloomRadius })
		}
		this.csm.update()
		if (this.settings.SyncSun) {
			let intensity = 0
			if (this.sunConf.elevation > 0) intensity = Math.abs(this.sunConf.elevation) / 90.0 + 0.2
			if (this.sunConf.elevation < 0) intensity = 0.2
			this.hemiLight.intensity = intensity > 0.9 ? 0.9 : intensity
		}
		/* this.oceans.forEach((ocean) => {
			ocean.update((this.timeScaleTarget * 1.0) / 60.0)
		}) */
		/* this.grasses.forEach((grass) => {
			grass.update((this.timeScaleTarget * 1.0) / 60.0)
		}) */
		if (this.player !== null) {
			if (this.player.uiControls !== this.uiControls) {
				this.updateControls(this.player.uiControls)
			}
		}

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

		this.renderPortals()
		if (this.settings.PostProcess) this.composer.render()
		else if (this.isOwnRenderer3d) this.renderer.render(this.scene, this.camera)
		if (this.isOwnRenderer2d) this.labelRenderer.render(this.scene, this.camera)
	}
}

export { PlayerClient } from '../Core/PlayerClient'

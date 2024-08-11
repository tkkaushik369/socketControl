import * as THREE from 'three'
import * as Utils from '../../../server/ts/Core/FunctionLibrary'
import Stats from 'three/examples/jsm/libs/stats.module.js'
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js'
import { WorldBase } from '../../../server/ts/World/WorldBase'
import { CannonDebugRenderer } from '../Utils/CannonDebugRenderer'
import { AttachModels } from '../Utils/AttachModels'
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

export class WorldClient extends WorldBase {

	private parentDom: HTMLDivElement
	private controlsDom: HTMLDivElement
	public renderer: THREE.WebGLRenderer
	public camera: THREE.PerspectiveCamera
	private clientClock: THREE.Clock

	public stats: Stats
	public networkStats: Stats.Panel
	private gui: GUI
	private mapGUIFolder: GUI
	private scenarioGUIFolder: GUI
	public cannonDebugRenderer: CannonDebugRenderer

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
		this.animate = this.animate.bind(this)

		// init
		this.controlsDom = controlsDom
		this.parentDom = (parentDom !== undefined) ? parentDom : (document.body as HTMLDivElement);
		this.updatePhysicsCallback = updatateCallback
		this.isClient = true
		this.updateControlsCallBack = this.updateControls
		this.launchMapCallback = launchMapCallback
		this.launchScenarioCallback = launchScenarioCallback

		// Renderer
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
		this.renderer.setSize(window.innerWidth, window.innerHeight)
		this.renderer.autoClear = false
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

		// Debug World
		this.cannonDebugRenderer = new CannonDebugRenderer(this.scene, this.world, {})

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
		}

		if (true) {
			this.scene.add(AttachModels.makePointHighlight())
		}
	}

	public getGLTF(path: string, callback: Function) {
		super.getGLTF(path, callback)
		const loader = new GLTFLoader()
		loader.load(path, (gltf) => {
			callback(gltf)
		})
	}

	private onWindowResize() {
		(this.camera as THREE.PerspectiveCamera).aspect = window.innerWidth / window.innerHeight;
		(this.camera as THREE.PerspectiveCamera).updateProjectionMatrix()
		this.renderer.setSize(window.innerWidth, window.innerHeight)
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

	private animate() {
		this.stats.update()
		if (this.settings.Debug_Physics) this.cannonDebugRenderer.update()
		this.renderer.render(this.scene, this.camera)
	}
}
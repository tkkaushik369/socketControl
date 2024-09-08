import * as THREE from 'three'
import * as CANNON from 'cannon-es'	
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass'
import * as Utils from '../../../server/ts/Core/FunctionLibrary'
import Stats from 'three/examples/jsm/libs/stats.module.js'
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js'
import { WorldBase } from '../../../server/ts/World/WorldBase'
import { CannonDebugRenderer } from '../Utils/CannonDebugRenderer'
import { AttachModels } from '../Utils/AttachModels'
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { CSM } from 'three/examples/jsm/csm/CSM'
import { Sky } from 'three/examples/jsm/objects/Sky'
import { Water } from 'three/examples/jsm/objects/Water'
import { Ocean } from './Ocean'

export class WorldClient extends WorldBase {

	private parentDom: HTMLDivElement
	private controlsDom: HTMLDivElement
	public renderer: THREE.WebGLRenderer
	public camera: THREE.PerspectiveCamera
	private clientClock: THREE.Clock

	private renderPass: RenderPass
	private outputPass: OutputPass
	private composer: EffectComposer

	private sky: Sky
	public sun: THREE.Vector3
	public effectController: { [id: string]: any }
	private csm: CSM

	private oceans: Ocean[] = []
	/* private waters: Water[] = []
	private helipadMeshes: THREE.Mesh[] = []
	private helipadBodies: CANNON.Body[] = []
	private waves = {
		A: {
			direction: 0,
			steepness: 0.1,
			wavelength: 10,
		},
		B: {
			direction: 30,
			steepness: 0.1,
			wavelength: 70,
		},
		C: {
			direction: 60,
			steepness: 0.1,
			wavelength: 3,
		},
	} */

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
		this.loadScene = this.loadScene.bind(this)
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
		this.launchMap = this.launchMap.bind(this)
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
		this.renderer.setSize(this.parentDom.offsetWidth, this.parentDom.offsetHeight)
		this.renderer.autoClear = false
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping
		this.renderer.toneMappingExposure = 0.6
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
			turbidity: 20,
			rayleigh: 0.9,
			mieCoefficient: 0.015,
			mieDirectionalG: 0.75,
			elevation: 60,
			azimuth: 45,
			exposure: this.renderer.toneMappingExposure
		};
		this.scene.add(this.sky)

		// Shadows
		this.csm = new CSM({
			maxFar: 500,
			lightIntensity: 2,
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
			this.renderPass = new RenderPass(this.scene, this.camera);
			// this.renderPass.clearAlpha = 0;
			const pixelRatio = this.renderer.getPixelRatio();

			//
			this.outputPass = new OutputPass();

			//
			const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
			const renderTarget = new THREE.WebGLRenderTarget(size.width, size.height, { samples: 4, type: THREE.HalfFloatType });
			this.composer = new EffectComposer(this.renderer, renderTarget)

			this.composer.addPass(this.renderPass);
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
		cannonSettings.open()

		let debugSettings = folderSettings.addFolder('Cannon Renderer')
		debugSettings.add(this.settings, 'Debug_FPS').onChange(this.toggleStatsFunc)
		debugSettings.add(this.settings, 'Debug_Helper').onChange(this.toggleHelpersFunc)
		debugSettings.open()

		let postProcess = folderSettings.addFolder('Post Process')
		postProcess.add(this.settings, 'PostProcess')
		postProcess.open()
		
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

	public loadScene(gltf: any, isLaunmch: boolean = true) {
		super.loadScene(gltf, isLaunmch)
		gltf.scene.traverse((child: any) => {
			if (child.hasOwnProperty('userData')) {
				if (child.type === 'Mesh') {
					this.csm.setupMaterial(child.material);

					if (child.material.name === 'ocean') {
						// child.visible = false
						this.oceans.push(new Ocean(child, this))

						/* const boxGeometry = new THREE.BoxGeometry(5, 1, 5)
						const numHelipads = 10
						this.helipadMeshes = []
						this.helipadBodies = []
						const material = new THREE.MeshStandardMaterial({})
						for (let i = 0; i < numHelipads; i++) {
							const box = new THREE.Mesh(boxGeometry, material)
							box.position.set(Math.random() * 500 - 250, 0, Math.random() * 500 - 250)
							box.receiveShadow = true
							this.scene.add(box)
							this.helipadMeshes.push(box)
							const shape = new CANNON.Box(new CANNON.Vec3(2.5, 0.5, 2.5))
							const body = new CANNON.Body({ mass: 0 })
							body.addShape(shape)
							body.position.x = this.helipadMeshes[i].position.x
							body.position.y = this.helipadMeshes[i].position.y
							body.position.z = this.helipadMeshes[i].position.z
							this.world.addBody(body)
							this.helipadBodies.push(body)
						}

						const water = new Water((child as THREE.Mesh).geometry, {
							textureWidth: 512,
							textureHeight: 512,
							waterNormals: new THREE.TextureLoader().load(
								'./images/waternormals.jpg',
								function (texture) {
									texture.wrapS = texture.wrapT = THREE.RepeatWrapping
								}
							),
							sunDirection: new THREE.Vector3(),
							sunColor: 0xffffff,
							waterColor: 0x001e0f,
							distortionScale: 8,
							fog: this.scene.fog !== undefined,
						})
						water.rotation.x = -Math.PI / 2
						water.material.onBeforeCompile = (shader) => {
							shader.uniforms.offsetX = { value: 0 }
							shader.uniforms.offsetZ = { value: 0 }
							shader.uniforms.waveA = {
								value: [
									Math.sin((this.waves.A.direction * Math.PI) / 180),
									Math.cos((this.waves.A.direction * Math.PI) / 180),
									this.waves.A.steepness,
									this.waves.A.wavelength,
								],
							}
							shader.uniforms.waveB = {
								value: [
									Math.sin((this.waves.B.direction * Math.PI) / 180),
									Math.cos((this.waves.B.direction * Math.PI) / 180),
									this.waves.B.steepness,
									this.waves.B.wavelength,
								],
							}
							shader.uniforms.waveC = {
								value: [
									Math.sin((this.waves.C.direction * Math.PI) / 180),
									Math.cos((this.waves.C.direction * Math.PI) / 180),
									this.waves.C.steepness,
									this.waves.C.wavelength,
								],
							}
							shader.vertexShader =
								'\n                uniform mat4 textureMatrix;\n                uniform float time;\n\n                varying vec4 mirrorCoord;\n                varying vec4 worldPosition;\n\n                #include <common>\n                #include <fog_pars_vertex>\n                #include <shadowmap_pars_vertex>\n                #include <logdepthbuf_pars_vertex>\n\n                uniform vec4 waveA;\n                uniform vec4 waveB;\n                uniform vec4 waveC;\n\n                uniform float offsetX;\n                uniform float offsetZ;\n\n                vec3 GerstnerWave (vec4 wave, vec3 p) {\n                    float steepness = wave.z;\n                    float wavelength = wave.w;\n                    float k = 2.0 * PI / wavelength;\n                    float c = sqrt(9.8 / k);\n                    vec2 d = normalize(wave.xy);\n                    float f = k * (dot(d, vec2(p.x, p.y)) - c * time);\n                    float a = steepness / k;\n\n                    return vec3(\n                        d.x * (a * cos(f)),\n                        d.y * (a * cos(f)),\n                        a * sin(f)\n                    );\n                }\n\n                void main() {\n\n                    mirrorCoord = modelMatrix * vec4( position, 1.0 );\n                    worldPosition = mirrorCoord.xyzw;\n                    mirrorCoord = textureMatrix * mirrorCoord;\n                    vec4 mvPosition =  modelViewMatrix * vec4( position, 1.0 );\n                    \n                    vec3 gridPoint = position.xyz;\n                    vec3 tangent = vec3(1, 0, 0);\n                    vec3 binormal = vec3(0, 0, 1);\n                    vec3 p = gridPoint;\n                    gridPoint.x += offsetX;//*2.0;\n                    gridPoint.y -= offsetZ;//*2.0;\n                    p += GerstnerWave(waveA, gridPoint);\n                    p += GerstnerWave(waveB, gridPoint);\n                    p += GerstnerWave(waveC, gridPoint);\n                    gl_Position = projectionMatrix * modelViewMatrix * vec4( p.x, p.y, p.z, 1.0);\n\n                    #include <beginnormal_vertex>\n                    #include <defaultnormal_vertex>\n                    #include <logdepthbuf_vertex>\n                    #include <fog_vertex>\n                    #include <shadowmap_vertex>\n                }'
							shader.uniforms.size.value = 10.0
							// waterCompiled = true
						}
						// water.position.copy(child.position)
						water.quaternion.copy(child.quaternion)
						this.scene.add(water)
						this.waters.push(water) */
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
		/* this.helipadMeshes.forEach((mesh) => {
			this.scene.remove(mesh)
		})
		this.helipadBodies.forEach((body) => {
			this.world.removeBody(body)
		}) */
		this.oceans = []
		/* this.waters = []
		this.helipadMeshes = []
		this.helipadBodies = [] */
	}

	private animate() {
		this.csm.update()
		this.oceans.forEach((ocean) => {
			ocean.update(this.timeScaleTarget * 1.0 / 60.0)
		})
		/* this.waters.forEach((water) => {
			water.material.uniforms['time'].value += this.timeScaleTarget * 1.0 / 60.0
			const t = water.material.uniforms['time'].value
			this.helipadMeshes.forEach((b, i) => {
				const waves: { [id: string]: any } = this.waves
				function getWaveInfo(x: number, z: number, time: number) {
					const pos = new THREE.Vector3()
					const tangent = new THREE.Vector3(1, 0, 0)
					const binormal = new THREE.Vector3(0, 0, 1)
					Object.keys(waves).forEach((wave) => {
						const w = waves[wave]
						const k = (Math.PI * 2) / w.wavelength
						const c = Math.sqrt(9.8 / k)
						const d = new THREE.Vector2(
							Math.sin((w.direction * Math.PI) / 180),
							-Math.cos((w.direction * Math.PI) / 180)
						)
						const f = k * (d.dot(new THREE.Vector2(x, z)) - c * time)
						const a = w.steepness / k
						pos.x += d.y * (a * Math.cos(f))
						pos.y += a * Math.sin(f)
						pos.z += d.x * (a * Math.cos(f))
						tangent.x += -d.x * d.x * (w.steepness * Math.sin(f))
						tangent.y += d.x * (w.steepness * Math.cos(f))
						tangent.z += -d.x * d.y * (w.steepness * Math.sin(f))
						binormal.x += -d.x * d.y * (w.steepness * Math.sin(f))
						binormal.y += d.y * (w.steepness * Math.cos(f))
						binormal.z += -d.y * d.y * (w.steepness * Math.sin(f))
					})
					const normal = binormal.cross(tangent).normalize()
					return {
						position: pos,
						normal: normal,
					}
				}
				const waveInfo = getWaveInfo(b.position.x, b.position.z, t);
				b.position.y = waveInfo.position.y
				const quat = new THREE.Quaternion().setFromEuler(
					new THREE.Euler(waveInfo.normal.x, waveInfo.normal.y, waveInfo.normal.z)
				)
				let delta = this.timeScaleTarget * 1.0 / 60.0
				b.quaternion.rotateTowards(quat, (delta) * 0.5)
				this.helipadBodies[i].quaternion.set(
					b.quaternion.x,
					b.quaternion.y,
					b.quaternion.z,
					b.quaternion.w
				)
				this.helipadBodies[i].position.set(b.position.x, b.position.y, b.position.z)
			})
		}) */


		if (this.updateAnimationCallback !== null) this.updateAnimationCallback()
		this.stats.update()
		if (this.settings.Debug_Physics) this.cannonDebugRenderer.update()

		if (this.settings.PostProcess)
			this.composer.render();
		else
			this.renderer.render(this.scene, this.camera)
	}
}
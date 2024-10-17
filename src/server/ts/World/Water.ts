import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import * as _ from 'lodash'
import { WorldBase } from './WorldBase'
import { EntityType } from '../Enums/EntityType'
import { MessageTypes } from '../Enums/MessagesTypes'
import { IWorldEntity } from '../Interfaces/IWorldEntity'
import { INetwork } from '../Interfaces/INetwork'

/**
 * Work based on :
 * https://github.com/Slayvin: Flat mirror for three.js
 * https://home.adelphi.edu/~stemkoski/ : An implementation of water shader based on the flat mirror
 * http://29a.ch/ && http://29a.ch/slides/2012/webglwater/ : Water shader explanations in WebGL
 */

export interface WaterOptions {
	textureWidth?: number
	textureHeight?: number
	clipBias?: number
	alpha?: number
	time?: number
	waterNormals?: THREE.Texture
	sunDirection?: THREE.Vector3
	sunColor?: THREE.ColorRepresentation
	waterColor?: THREE.ColorRepresentation
	eye?: THREE.Vector3
	distortionScale?: number
	side?: THREE.Side
	fog?: boolean
}

class Floaters extends THREE.Mesh {
	pos = new THREE.Vector3()
	size = new THREE.Vector2(1, 1)
	
	constructor(geometry?: THREE.BufferGeometry, material?: THREE.Material) {
		super(geometry, material)
		if (geometry instanceof THREE.BoxGeometry)
			this.size.set(geometry.parameters.width, geometry.parameters.depth)
	}
}

class Water extends THREE.Mesh implements IWorldEntity, INetwork {
	updateOrder = 10
	entityType = EntityType.Water
	uID: string | null
	msgType = MessageTypes.Water
	timeStamp: number
	ping: number

	world: WorldBase | null

	size: THREE.Vector2
	geometry: THREE.PlaneGeometry
	material: THREE.ShaderMaterial
	isWater: boolean
	floatingMeshes: Floaters[] = []
	floatingBodies: CANNON.Body[] = []

	waves: { [id: string]: any } = {
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
	}

	constructor(geometry: THREE.PlaneGeometry, options: WaterOptions) {
		super(geometry)
		// bind functions
		this.addFloaters = this.addFloaters.bind(this)
		this.getWaveInfo = this.getWaveInfo.bind(this)
		this.addToWorld = this.addToWorld.bind(this)
		this.removeFromWorld = this.removeFromWorld.bind(this)
		this.update = this.update.bind(this)
		this.Out = this.Out.bind(this)
		this.Set = this.Set.bind(this)

		// init
		this.uID = null
		this.timeStamp = Date.now()
		this.ping = 0
		this.world = null

		this.size = new THREE.Vector2(geometry.parameters.width, geometry.parameters.height)
		this.isWater = true
		this.geometry = geometry

		const scope = this

		const textureWidth = options.textureWidth !== undefined ? options.textureWidth : 512
		const textureHeight = options.textureHeight !== undefined ? options.textureHeight : 512

		const clipBias = options.clipBias !== undefined ? options.clipBias : 0.0
		const alpha = options.alpha !== undefined ? options.alpha : 1.0
		const time = options.time !== undefined ? options.time : 0.0
		const normalSampler = options.waterNormals !== undefined ? options.waterNormals : null
		const sunDirection = options.sunDirection !== undefined ? options.sunDirection : new THREE.Vector3(0.70707, 0.70707, 0.0)
		const sunColor = new THREE.Color(options.sunColor !== undefined ? options.sunColor : 0xffffff)
		const waterColor = new THREE.Color(options.waterColor !== undefined ? options.waterColor : 0x7F7F7F)
		const eye = options.eye !== undefined ? options.eye : new THREE.Vector3(0, 0, 0)
		const distortionScale = options.distortionScale !== undefined ? options.distortionScale : 20.0
		const side = options.side !== undefined ? options.side : THREE.FrontSide
		const fog = options.fog !== undefined ? options.fog : false

		//

		const mirrorPlane = new THREE.Plane()
		const normal = new THREE.Vector3()
		const mirrorWorldPosition = new THREE.Vector3()
		const cameraWorldPosition = new THREE.Vector3()
		const rotationMatrix = new THREE.Matrix4()
		const lookAtPosition = new THREE.Vector3(0, 0, - 1)
		const clipPlane = new THREE.Vector4()

		const view = new THREE.Vector3()
		const target = new THREE.Vector3()
		const q = new THREE.Vector4()

		const textureMatrix = new THREE.Matrix4()

		const mirrorCamera = new THREE.PerspectiveCamera()

		const renderTarget = new THREE.WebGLRenderTarget(textureWidth, textureHeight)

		const mirrorShader = {

			name: 'MirrorShader',

			uniforms: THREE.UniformsUtils.merge([
				THREE.UniformsLib['fog'],
				THREE.UniformsLib['lights'],
				{
					'normalSampler': { value: null },
					'mirrorSampler': { value: null },
					'alpha': { value: 1.0 },
					'time': { value: 0.0 },
					'size': { value: 1.0 },
					'distortionScale': { value: 20.0 },
					'textureMatrix': { value: new THREE.Matrix4() },
					'sunColor': { value: new THREE.Color(0x7F7F7F) },
					'sunDirection': { value: new THREE.Vector3(0.70707, 0.70707, 0) },
					'eye': { value: new THREE.Vector3() },
					'waterColor': { value: new THREE.Color(0x555555) }
				}
			]),

			vertexShader: /* glsl */`
				uniform mat4 textureMatrix;
				uniform float time;

				varying vec4 mirrorCoord;
				varying vec4 worldPosition;

				#include <common>
				#include <fog_pars_vertex>
				#include <shadowmap_pars_vertex>
				#include <logdepthbuf_pars_vertex>

				void main() {
					mirrorCoord = modelMatrix * vec4( position, 1.0 );
					worldPosition = mirrorCoord.xyzw;
					mirrorCoord = textureMatrix * mirrorCoord;
					vec4 mvPosition =  modelViewMatrix * vec4( position, 1.0 );
					gl_Position = projectionMatrix * mvPosition;

				#include <beginnormal_vertex>
				#include <defaultnormal_vertex>
				#include <logdepthbuf_vertex>
				#include <fog_vertex>
				#include <shadowmap_vertex>
			}`,

			fragmentShader: /* glsl */`
				uniform sampler2D mirrorSampler;
				uniform float alpha;
				uniform float time;
				uniform float size;
				uniform float distortionScale;
				uniform sampler2D normalSampler;
				uniform vec3 sunColor;
				uniform vec3 sunDirection;
				uniform vec3 eye;
				uniform vec3 waterColor;

				varying vec4 mirrorCoord;
				varying vec4 worldPosition;

				vec4 getNoise( vec2 uv ) {
					vec2 uv0 = ( uv / 103.0 ) + vec2(time / 17.0, time / 29.0);
					vec2 uv1 = uv / 107.0-vec2( time / -19.0, time / 31.0 );
					vec2 uv2 = uv / vec2( 8907.0, 9803.0 ) + vec2( time / 101.0, time / 97.0 );
					vec2 uv3 = uv / vec2( 1091.0, 1027.0 ) - vec2( time / 109.0, time / -113.0 );
					vec4 noise = texture2D( normalSampler, uv0 ) +
						texture2D( normalSampler, uv1 ) +
						texture2D( normalSampler, uv2 ) +
						texture2D( normalSampler, uv3 );
					return noise * 0.5 - 1.0;
				}

				void sunLight( const vec3 surfaceNormal, const vec3 eyeDirection, float shiny, float spec, float diffuse, inout vec3 diffuseColor, inout vec3 specularColor ) {
					vec3 reflection = normalize( reflect( -sunDirection, surfaceNormal ) );
					float direction = max( 0.0, dot( eyeDirection, reflection ) );
					specularColor += pow( direction, shiny ) * sunColor * spec;
					diffuseColor += max( dot( sunDirection, surfaceNormal ), 0.0 ) * sunColor * diffuse;
				}

				#include <common>
				#include <packing>
				#include <bsdfs>
				#include <fog_pars_fragment>
				#include <logdepthbuf_pars_fragment>
				#include <lights_pars_begin>
				#include <shadowmap_pars_fragment>
				#include <shadowmask_pars_fragment>

				void main() {

					#include <logdepthbuf_fragment>
					vec4 noise = getNoise( worldPosition.xz * size );
					vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );

					vec3 diffuseLight = vec3(0.0);
					vec3 specularLight = vec3(0.0);

					vec3 worldToEye = eye-worldPosition.xyz;
					vec3 eyeDirection = normalize( worldToEye );
					sunLight( surfaceNormal, eyeDirection, 100.0, 2.0, 0.5, diffuseLight, specularLight );

					float distance = length(worldToEye);

					vec2 distortion = surfaceNormal.xz * ( 0.001 + 1.0 / distance ) * distortionScale;
					vec3 reflectionSample = vec3( texture2D( mirrorSampler, mirrorCoord.xy / mirrorCoord.w + distortion ) );

					float theta = max( dot( eyeDirection, surfaceNormal ), 0.0 );
					float rf0 = 0.3;
					float reflectance = rf0 + ( 1.0 - rf0 ) * pow( ( 1.0 - theta ), 5.0 );
					vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) ) * waterColor;
					vec3 albedo = mix( ( sunColor * diffuseLight * 0.3 + scatter ) * getShadowMask(), ( vec3( 0.1 ) + reflectionSample * 0.9 + reflectionSample * specularLight ), reflectance);
					vec3 outgoingLight = albedo;
					gl_FragColor = vec4( outgoingLight, alpha );

					#include <tonemapping_fragment>
					#include <colorspace_fragment>
					#include <fog_fragment>	
				}`

		}

		const material = new THREE.ShaderMaterial({
			name: mirrorShader.name,
			uniforms: THREE.UniformsUtils.clone(mirrorShader.uniforms),
			vertexShader: mirrorShader.vertexShader,
			fragmentShader: mirrorShader.fragmentShader,
			lights: true,
			side: side,
			fog: fog
		})

		material.uniforms['mirrorSampler'].value = renderTarget.texture
		material.uniforms['textureMatrix'].value = textureMatrix
		material.uniforms['alpha'].value = alpha
		material.uniforms['time'].value = time
		material.uniforms['normalSampler'].value = normalSampler
		material.uniforms['sunColor'].value = sunColor
		material.uniforms['waterColor'].value = waterColor
		material.uniforms['sunDirection'].value = sunDirection
		material.uniforms['distortionScale'].value = distortionScale

		material.uniforms['eye'].value = eye

		this.material = material

		scope.onBeforeRender = function (renderer, scene, camera) {

			mirrorWorldPosition.setFromMatrixPosition(scope.matrixWorld)
			cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld)

			rotationMatrix.extractRotation(scope.matrixWorld)

			normal.set(0, 0, 1)
			normal.applyMatrix4(rotationMatrix)

			view.subVectors(mirrorWorldPosition, cameraWorldPosition)

			// Avoid rendering when mirror is facing away

			if (view.dot(normal) > 0) return

			view.reflect(normal).negate()
			view.add(mirrorWorldPosition)

			rotationMatrix.extractRotation(camera.matrixWorld)

			lookAtPosition.set(0, 0, - 1)
			lookAtPosition.applyMatrix4(rotationMatrix)
			lookAtPosition.add(cameraWorldPosition)

			target.subVectors(mirrorWorldPosition, lookAtPosition)
			target.reflect(normal).negate()
			target.add(mirrorWorldPosition)

			mirrorCamera.position.copy(view)
			mirrorCamera.up.set(0, 1, 0)
			mirrorCamera.up.applyMatrix4(rotationMatrix)
			mirrorCamera.up.reflect(normal)
			mirrorCamera.lookAt(target)

			mirrorCamera.far = (camera as THREE.PerspectiveCamera | THREE.OrthographicCamera).far // Used in WebGLBackground

			mirrorCamera.updateMatrixWorld()
			mirrorCamera.projectionMatrix.copy(camera.projectionMatrix)

			// Update the texture matrix
			textureMatrix.set(
				0.5, 0.0, 0.0, 0.5,
				0.0, 0.5, 0.0, 0.5,
				0.0, 0.0, 0.5, 0.5,
				0.0, 0.0, 0.0, 1.0
			)
			textureMatrix.multiply(mirrorCamera.projectionMatrix)
			textureMatrix.multiply(mirrorCamera.matrixWorldInverse)

			// Now update projection matrix with new clip plane, implementing code from: http://www.terathon.com/code/oblique.html
			// Paper explaining this technique: http://www.terathon.com/lengyel/Lengyel-Oblique.pdf
			mirrorPlane.setFromNormalAndCoplanarPoint(normal, mirrorWorldPosition)
			mirrorPlane.applyMatrix4(mirrorCamera.matrixWorldInverse)

			clipPlane.set(mirrorPlane.normal.x, mirrorPlane.normal.y, mirrorPlane.normal.z, mirrorPlane.constant)

			const projectionMatrix = mirrorCamera.projectionMatrix

			q.x = (Math.sign(clipPlane.x) + projectionMatrix.elements[8]) / projectionMatrix.elements[0]
			q.y = (Math.sign(clipPlane.y) + projectionMatrix.elements[9]) / projectionMatrix.elements[5]
			q.z = - 1.0
			q.w = (1.0 + projectionMatrix.elements[10]) / projectionMatrix.elements[14]

			// Calculate the scaled plane vector
			clipPlane.multiplyScalar(2.0 / clipPlane.dot(q))

			// Replacing the third row of the projection matrix
			projectionMatrix.elements[2] = clipPlane.x
			projectionMatrix.elements[6] = clipPlane.y
			projectionMatrix.elements[10] = clipPlane.z + 1.0 - clipBias
			projectionMatrix.elements[14] = clipPlane.w

			eye.setFromMatrixPosition(camera.matrixWorld)

			// Render

			const currentRenderTarget = renderer.getRenderTarget()

			const currentXrEnabled = renderer.xr.enabled
			const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate

			scope.visible = false

			renderer.xr.enabled = false // Avoid camera modification and recursion
			renderer.shadowMap.autoUpdate = false // Avoid re-computing shadows

			renderer.setRenderTarget(renderTarget)

			renderer.state.buffers.depth.setMask(true) // make sure the depth buffer is writable so it can be properly cleared, see #18897

			if (renderer.autoClear === false) renderer.clear()
			renderer.render(scene, mirrorCamera)

			scope.visible = true

			renderer.xr.enabled = currentXrEnabled
			renderer.shadowMap.autoUpdate = currentShadowAutoUpdate

			renderer.setRenderTarget(currentRenderTarget)

			// Restore viewport

			const viewport = camera.viewport

			if (viewport !== undefined) {

				renderer.state.viewport(viewport)

			}

		}

		this.material.onBeforeCompile = (shader) => {
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
		}
	}

	addFloaters(n: number) {
		this.floatingMeshes = []
		this.floatingBodies = []
		const size = Math.min(this.geometry.parameters.width / n, this.geometry.parameters.height / n) - 1
		const material = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.8 })
		for (let i = 0; i < n; i++) {
			for (let j = 0; j < n; j++) {
				const boxGeometry = new THREE.BoxGeometry(size, 1, size)
				const box = new Floaters(boxGeometry, material)
				// box.pos.set((Math.random() * this.geometry.parameters.width) - (this.geometry.parameters.width / 2), 0, (Math.random() * this.geometry.parameters.height) - (this.geometry.parameters.height / 2))
				box.pos.set((i * this.geometry.parameters.width / n) - (this.geometry.parameters.width / 2 / n), 0, (j * this.geometry.parameters.height / n) - (this.geometry.parameters.height / 2 / n))
				box.position.copy(box.pos).add(this.position)
				box.receiveShadow = true
				this.floatingMeshes.push(box)
				const shape = new CANNON.Box(new CANNON.Vec3(boxGeometry.parameters.width / 2, boxGeometry.parameters.height / 2, boxGeometry.parameters.depth / 2))
				const body = new CANNON.Body({ mass: 0.0 })
				body.sleepState = CANNON.BODY_SLEEP_STATES.AWAKE
				body.addShape(shape)
				body.position.x = this.floatingMeshes[i].position.x
				body.position.y = this.floatingMeshes[i].position.y
				body.position.z = this.floatingMeshes[i].position.z
				this.floatingBodies.push(body)
			}
		}
	}

	getWaveInfo(x: number, z: number, time: number) {
		const pos = new THREE.Vector3()
		const tangent = new THREE.Vector3(1, 0, 0)
		const binormal = new THREE.Vector3(0, 0, 1)
		Object.keys(this.waves).forEach((wave) => {
			const w = this.waves[wave]
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

	addToWorld(world: WorldBase): void {
		if (_.includes(world.waters, this)) {
			console.warn('Adding Water to a world in which it already exists.')
		} else {
			this.world = world
			world.waters.push(this)
			world.addSceneObject(this)

			this.floatingMeshes.forEach((obj) => {
				world.addSceneObject(obj)
			})
			this.floatingBodies.forEach((body) => {
				world.addWorldObject(body)
			})
		}
	}

	removeFromWorld(world: WorldBase): void {
		if (!_.includes(world.waters, this)) {
			console.warn('Removing Water from a world in which it isn\'t present.')
		}
		else {
			this.world = null
			_.pull(world.waters, this)
			world.removeSceneObject(this)

			this.floatingMeshes.forEach((obj) => {
				world.removeSceneObject(obj)
			})

			this.floatingBodies.forEach((body) => {
				world.removeWorldObject(body)
			})
		}
	}

	update(timestep: number, unscaledTimeStep: number): void {
		this.material.uniforms['time'].value += timestep
		const t = this.material.uniforms['time'].value
		const self = this
		const force = 1
		this.floatingMeshes.forEach((b, i) => {
			const waves: { [id: string]: any } = this.waves
			const waveInfo = this.getWaveInfo(b.pos.x, b.pos.z, t)
			const sizeRatio = (1 / Math.max(b.size.x, b.size.y))
			b.pos.y = waveInfo.position.y
			b.position.copy(b.pos).add(this.position)

			const quat = new THREE.Quaternion().setFromEuler(
				new THREE.Euler(waveInfo.normal.x, waveInfo.normal.y, waveInfo.normal.z)
			)
			b.quaternion.rotateTowards(quat, (timestep) * sizeRatio * 0.1)
			if (this.world !== null) {
				this.world.zeroBody(this.floatingBodies[i])
			}
			this.floatingBodies[i].quaternion.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w)
			this.floatingBodies[i].interpolatedQuaternion.set(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w)
			this.floatingBodies[i].position.set(b.position.x, b.position.y, b.position.z)
			this.floatingBodies[i].interpolatedPosition.set(b.position.x, b.position.y, b.position.z)
		})
	}

	Out(): { [id: string]: any } {
		const floaters: any[] = []
		this.floatingBodies.forEach((body) => {
			floaters.push({
				position: {
					x: body.position.x,
					y: body.position.y,
					z: body.position.z,
				},
				quaternion: {
					x: body.quaternion.x,
					y: body.quaternion.y,
					z: body.quaternion.z,
					w: body.quaternion.w,
				},
			})
		})
		return {
			uID: this.uID,
			msgType: this.msgType,
			timeStamp: this.timeStamp,
			ping: this.ping,

			data: {
				time: this.material.uniforms['time'].value,
				floaters: floaters,
			}
		}
	}

	Set(messages: any) {
		this.material.uniforms['time'].value = messages.data.time
		for (let i = 0; i < messages.data.floaters.length; i++) {
			this.floatingBodies[i].position.set(
				messages.data.floaters[i].position.x,
				messages.data.floaters[i].position.y,
				messages.data.floaters[i].position.z,
			)
			this.floatingBodies[i].quaternion.set(
				messages.data.floaters[i].quaternion.x,
				messages.data.floaters[i].quaternion.y,
				messages.data.floaters[i].quaternion.z,
				messages.data.floaters[i].quaternion.w,
			)
			this.floatingMeshes[i].position.set(
				messages.data.floaters[i].position.x,
				messages.data.floaters[i].position.y,
				messages.data.floaters[i].position.z,
			)
			this.floatingMeshes[i].quaternion.set(
				messages.data.floaters[i].quaternion.x,
				messages.data.floaters[i].quaternion.y,
				messages.data.floaters[i].quaternion.z,
				messages.data.floaters[i].quaternion.w,
			)
		}
	}
}

export { Water }

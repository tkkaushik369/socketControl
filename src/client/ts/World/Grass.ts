import * as THREE from 'three'

import { WorldClient } from './WorldClient'
import { IWorldEntity, EntityType } from '@World'
import { Noise } from '../Utils/Perlin'
import { GrassShader } from './GrassShader'

export class Grass implements IWorldEntity {
	public updateOrder: number = 10
	public entityType: EntityType = EntityType.Grass

	public groundMaterial: THREE.Material
	public grassMaterial: THREE.ShaderMaterial

	private world: WorldClient
	private meshes: THREE.Object3D[] = []

	constructor(transform: any, world: WorldClient, instances: number = 300000) {
		// bind functions
		this.multiplyQuaternions = this.multiplyQuaternions.bind(this)
		this.addToWorld = this.addToWorld.bind(this)
		this.removeFromWorld = this.removeFromWorld.bind(this)
		this.update = this.update.bind(this)

		// init
		this.world = world
		// Based on:
		// "Realistic real-time grass rendering" by Eddie Lee, 2010
		// https://www.eddietree.com/grass
		// https://medium.com/@Zadvorsky/into-vertex-shaders-594e6d8cd804u
		// https://github.com/zadvorsky/three.bas
		// https://github.com/mrdoob/three.js/blob/master/examples/webgl_buffergeometry_instancing_dynamic.html
		// https://www.opengl-tutorial.org/intermediate-tutorials/tutorial-17-quaternions/

		// Variables for blade mesh
		let joints = 3
		let w_ = 0.02
		let h_ = 0.2

		// Number of blades
		// let instances = 300000

		// ************** Setup **************
		// Use noise.js library to generate a grid of 2D simplex noise values
		let noise = new Noise()
		noise.seed(Math.random())

		// The ground
		let ground_geometry = new THREE.PlaneGeometry(transform.scale.x * 2, transform.scale.z * 2)
		this.groundMaterial = new THREE.MeshBasicMaterial({ color: 0x002300 })

		// Define base geometry that will be instanced. We use a plane for an individual blade of grass
		let base_geometry = new THREE.PlaneGeometry(w_, h_, 1, joints)
		base_geometry.translate(0, h_ / 2, 0)

		// From:
		// https://github.com/mrdoob/three.js/blob/master/examples/webgl_buffergeometry_instancing_dynamic.html
		let instanced_geometry = new THREE.InstancedBufferGeometry()

		// ************** Attributes **************
		instanced_geometry.index = base_geometry.index
		instanced_geometry.attributes.position = base_geometry.attributes.position
		instanced_geometry.attributes.uv = base_geometry.attributes.uv

		// Each instance has its own data for position, rotation and scale
		let offsets = []
		let orientations = []
		let stretches = []
		let halfRootAngleSin = []
		let halfRootAngleCos = []

		// Temp variables
		let quaternion_0 = new THREE.Quaternion()
		let quaternion_1 = new THREE.Quaternion()
		let x, y, z, w

		// The min and max angle for the growth direction (in radians)
		let min = -0.25
		let max = 0.25

		// For each instance of the grass blade
		for (let i = 0; i < instances; i++) {
			// Offset of the roots
			x = Math.random() * transform.scale.x * 2 - transform.scale.x
			z = Math.random() * transform.scale.z * 2 - transform.scale.z
			y = 0
			offsets.push(x, y, z)

			// Define random growth directions
			// Rotate around Y
			let angle = Math.PI - Math.random() * (2 * Math.PI)
			halfRootAngleSin.push(Math.sin(0.5 * angle))
			halfRootAngleCos.push(Math.cos(0.5 * angle))

			let RotationAxis = new THREE.Vector3(0, 1, 0)
			x = RotationAxis.x * Math.sin(angle / 2.0)
			y = RotationAxis.y * Math.sin(angle / 2.0)
			z = RotationAxis.z * Math.sin(angle / 2.0)
			w = Math.cos(angle / 2.0)
			quaternion_0.set(x, y, z, w).normalize()

			// Rotate around X
			angle = Math.random() * (max - min) + min
			RotationAxis = new THREE.Vector3(1, 0, 0)
			x = RotationAxis.x * Math.sin(angle / 2.0)
			y = RotationAxis.y * Math.sin(angle / 2.0)
			z = RotationAxis.z * Math.sin(angle / 2.0)
			w = Math.cos(angle / 2.0)
			quaternion_1.set(x, y, z, w).normalize()

			// Combine rotations to a single quaternion
			quaternion_0 = this.multiplyQuaternions(quaternion_0, quaternion_1)

			// Rotate around Z
			angle = Math.random() * (max - min) + min
			RotationAxis = new THREE.Vector3(0, 0, 1)
			x = RotationAxis.x * Math.sin(angle / 2.0)
			y = RotationAxis.y * Math.sin(angle / 2.0)
			z = RotationAxis.z * Math.sin(angle / 2.0)
			w = Math.cos(angle / 2.0)
			quaternion_1.set(x, y, z, w).normalize()

			// Combine rotations to a single quaternion
			quaternion_0 = this.multiplyQuaternions(quaternion_0, quaternion_1)

			orientations.push(quaternion_0.x, quaternion_0.y, quaternion_0.z, quaternion_0.w)

			// Define variety in height
			if (i < instances / 3) {
				stretches.push(Math.random() * 1.8)
			} else {
				stretches.push(Math.random())
			}
		}

		let offsetAttribute = new THREE.InstancedBufferAttribute(new Float32Array(offsets), 3)
		let stretchAttribute = new THREE.InstancedBufferAttribute(new Float32Array(stretches), 1)
		let halfRootAngleSinAttribute = new THREE.InstancedBufferAttribute(new Float32Array(halfRootAngleSin), 1)
		let halfRootAngleCosAttribute = new THREE.InstancedBufferAttribute(new Float32Array(halfRootAngleCos), 1)
		let orientationAttribute = new THREE.InstancedBufferAttribute(new Float32Array(orientations), 4)

		instanced_geometry['setAttribute']('offset', offsetAttribute)
		instanced_geometry['setAttribute']('orientation', orientationAttribute)
		instanced_geometry['setAttribute']('stretch', stretchAttribute)
		instanced_geometry['setAttribute']('halfRootAngleSin', halfRootAngleSinAttribute)
		instanced_geometry['setAttribute']('halfRootAngleCos', halfRootAngleCosAttribute)

		ground_geometry.computeBoundingSphere()
		instanced_geometry.boundingSphere = null
		if (ground_geometry.boundingSphere !== null) {
			instanced_geometry.boundingSphere = ground_geometry.boundingSphere.clone()
		}

		// Get alpha map and blade texture
		// These have been taken from "Realistic real-time grass rendering" by Eddie Lee, 2010
		let loader = new THREE.TextureLoader()
		loader.crossOrigin = ''
		let texture = loader.load('../client/images/grass/blade_diffuse.jpg')
		let alphaMap = loader.load('../client/images/grass/blade_alpha.jpg')

		// Define the material, specifying attributes, uniforms, shaders etc.
		this.grassMaterial = new THREE.ShaderMaterial({
			uniforms: {
				map: { value: texture },
				alphaMap: { value: alphaMap },
				time: { /* type: 'float', */ value: 0 },
				playerPos: { /* type: 'vec3', */ value: new THREE.Vector3() },
			},
			vertexShader: GrassShader.vertexShader,
			fragmentShader: GrassShader.fragmentShader,
			side: THREE.DoubleSide,
		})

		let grassMesh = new THREE.Mesh(instanced_geometry, this.grassMaterial)
		// grassMesh.position.copy(transform.position);

		let grassLod = new THREE.LOD()
		grassLod.addLevel(grassMesh, 0)
		grassLod.addLevel(new THREE.Mesh(), 30)

		grassLod.position.copy(transform.position)

		this.meshes.push(grassLod)
	}

	private multiplyQuaternions(q1: THREE.Quaternion, q2: THREE.Quaternion) {
		let x = q1.x * q2.w + q1.y * q2.z - q1.z * q2.y + q1.w * q2.x
		let y = -q1.x * q2.z + q1.y * q2.w + q1.z * q2.x + q1.w * q2.y
		let z = q1.x * q2.y - q1.y * q2.x + q1.z * q2.w + q1.w * q2.z
		let w = -q1.x * q2.x - q1.y * q2.y - q1.z * q2.z + q1.w * q2.w
		return new THREE.Quaternion(x, y, z, w)
	}

	public addToWorld(world: WorldClient): void {
		this.meshes.forEach((mesh) => {
			world.addSceneObject(mesh)
		})
	}
	public removeFromWorld(world: WorldClient): void {
		this.meshes.forEach((mesh) => {
			world.removeSceneObject(mesh)
		})
	}

	public update(timeStep: number, unscaledTimeStep: number): void {
		this.grassMaterial.uniforms.time.value += timeStep

		if (this.world.characters.length) {
			this.grassMaterial.uniforms.playerPos.value.copy(this.world.characters[0].position)
		}
	}
}

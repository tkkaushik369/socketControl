import * as THREE from 'three'

import { WorldClient } from './WorldClient'
import { IWorldEntity, EntityType } from '@World'
import { WaterShader } from './WaterShader'

export class Ocean implements IWorldEntity {
	public updateOrder: number = 10
	public entityType: EntityType = EntityType.Ocean

	public material: THREE.ShaderMaterial

	private world: WorldClient

	constructor(object: any, world: WorldClient) {
		// bind functions
		this.addToWorld = this.addToWorld.bind(this)
		this.removeFromWorld = this.removeFromWorld.bind(this)
		this.update = this.update.bind(this)

		// init
		this.world = world

		let uniforms = THREE.UniformsUtils.clone(WaterShader.uniforms)
		uniforms.iResolution.value.x = window.innerWidth
		uniforms.iResolution.value.y = window.innerHeight

		this.material = new THREE.ShaderMaterial({
			uniforms: uniforms,
			fragmentShader: WaterShader.fragmentShader,
			vertexShader: WaterShader.vertexShader,
		})

		object.material = this.material
		object.material.transparent = true
	}

	public addToWorld(world: WorldClient): void {}
	public removeFromWorld(world: WorldClient): void {}

	public update(timeStep: number, unscaledTimeStep: number): void {
		this.material.uniforms.cameraPos.value.copy(this.world.camera.position)
		this.material.uniforms.lightDir.value.copy(new THREE.Vector3().copy(this.world.sun).normalize())
		this.material.uniforms.iGlobalTime.value += timeStep
	}
}

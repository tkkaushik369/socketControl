import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import fs from 'node:fs/promises'
import path from 'node:path'
import { BaseScene, getMapConfig, setWorker } from '@World'
import { WorldServer } from '@WorldServer'

setWorker(false)

// ------------------------------------
// Types
// ------------------------------------

interface ExportConfig {
	output: string
}

// ------------------------------------
// Node.js FileReader polyfill
// ------------------------------------

class NodeFileReader {
	result: ArrayBuffer | string | null = null
	onload: ((event: { target: NodeFileReader }) => void) | null = null
	onerror: ((error: unknown) => void) | null = null
	onloadend: ((event: { target: NodeFileReader }) => void) | null = null

	readAsArrayBuffer(blob: Blob): void {
		blob.arrayBuffer()
			.then((buffer: ArrayBuffer) => {
				this.result = buffer

				this.onload?.({
					target: this,
				})

				this.onloadend?.({
					target: this,
				})
			})
			.catch((error: unknown) => {
				this.onerror?.(error)
			})
	}

	readAsDataURL(blob: Blob): void {
		blob.arrayBuffer()
			.then((buffer: ArrayBuffer) => {
				const base64 = Buffer.from(buffer).toString('base64')
				const mimeType = blob.type || 'application/octet-stream'

				this.result = `data:${mimeType};base64,${base64}`

				this.onload?.({
					target: this,
				})

				this.onloadend?.({
					target: this,
				})
			})
			.catch((error: unknown) => {
				this.onerror?.(error)
			})
	}
}

globalThis.FileReader = NodeFileReader as unknown as typeof FileReader

// ------------------------------------
// Read JSON config
// ------------------------------------

async function readJSON(filename: string) {
	const content = await fs.readFile(filename, 'utf8')
	const config = JSON.parse(content)
	return config
}

async function readConfig(filename: string): Promise<ExportConfig> {
	const config = (await readJSON(filename)) as Partial<ExportConfig>

	if (!config.output || typeof config.output !== 'string') {
		throw new Error(`Invalid config: "output" must be a non-empty string`)
	}

	return {
		output: config.output,
	}
}

// ------------------------------------
// Export function
// ------------------------------------

async function exportThreeObject(
	object: THREE.Object3D | THREE.Scene,
	fileType: string,
	filename: string
): Promise<void> {
	// Create the output directory if it doesn't exist
	await fs.mkdir(path.dirname(filename), {
		recursive: true,
	})

	switch (fileType.toLowerCase()) {
		case 'json': {
			const json = (object as THREE.Object3D).toJSON()

			await fs.writeFile(filename, JSON.stringify(json, null, 2), 'utf8')

			console.log(`✓ Exported ${filename}`)
			break
		}

		case 'gltf': {
			const exporter = new GLTFExporter()

			await new Promise<void>((resolve, reject) => {
				exporter.parse(
					object,
					async (result) => {
						try {
							await fs.writeFile(filename, JSON.stringify(result, null, 2), 'utf8')

							console.log(`✓ Exported ${filename}`)
							resolve()
						} catch (error) {
							reject(error)
						}
					},
					(error) => {
						console.error('GLTF export failed:', error)
						reject(error)
					},
					{
						binary: false,
					}
				)
			})

			break
		}

		case 'glb': {
			const exporter = new GLTFExporter()

			await new Promise<void>((resolve, reject) => {
				exporter.parse(
					object,
					async (result) => {
						try {
							if (!(result instanceof ArrayBuffer)) {
								throw new Error('Expected GLB exporter result to be an ArrayBuffer')
							}

							await fs.writeFile(filename, Buffer.from(result))

							console.log(`✓ Exported ${filename}`)
							resolve()
						} catch (error) {
							reject(error)
						}
					},
					(error) => {
						console.error('GLB export failed:', error)
						reject(error)
					},
					{
						binary: true,
					}
				)
			})

			break
		}

		default:
			throw new Error(`Unsupported export type: ${fileType}`)
	}
}

// ------------------------------------
// Create scene
// ------------------------------------

async function main(): Promise<void> {
	// First CLI argument is the config JSON file
	const configFile = process.argv[2] ?? 'modelexport_config.json'

	console.log(`Reading config: ${configFile}`)

	// const config = await readConfig(configFile)
	const config = await readJSON(configFile)

	// Resolve output path relative to the current working directory
	const outputDir = path.resolve(config.output)

	// Create output directory
	await fs.mkdir(outputDir, {
		recursive: true,
	})

	console.log(`Output directory: ${outputDir}`)

	// --------------------------------
	// Create scene
	// --------------------------------

	const hostPath = '.'
	const baseRootPath = hostPath === '.' ? path.resolve(__dirname, '..') : path.resolve(hostPath, '..')

	// const map_config_json = (await readJSON('./dist/client/models/MapConfig.json')).maps
	const map_config_json = config.maps
	// console.log(map_config_json)
	const world_server = new WorldServer(map_config_json, baseRootPath, null)
	const map_config = getMapConfig(world_server, map_config_json)
	// world_server.runner = null
	world_server.worldId = 'modelexport'
	world_server.update()
	world_server.loadingManager.addEventListener('user_interface', (evt: any) => {
		console.log('user_interface', evt.detail.visible ? 'block' : 'none')
	})
	world_server.loadingManager.addEventListener('loading_screen', (evt: any) => {
		console.log('loading_screen', evt.detail.visible ? 'flex' : 'none')
	})
	world_server.loadingManager.addEventListener('loading_progress', (evt: any) => {
		console.log(
			'loading_progress',
			evt.detail.progress !== 1
				? ` [${evt.detail.name}]: ${Number(evt.detail.progress * 100).toFixed(2)}%`
				: '100%'
		)
	})
	for (const k of Object.keys(map_config)) {
		console.log(map_config[k].name)
		for (const mn of map_config[k].subMaps) {
			if (!mn.isMain) continue
			console.log(`  ${mn.subName}`)
			// console.log(`  ${mn.mapCaller}`)
			switch (map_config[k].name) {
				case 'test2':
				case 'test3':
				case 'example':
				case 'Grid City':
				case 'Grid World': {
					if (mn.mapCaller instanceof BaseScene) {
						await exportThreeObject(
							await mn.mapCaller.getScene().scene,
							'json',
							path.join(outputDir, map_config[k].name, `${mn.subName}.glb.json`)
						)
						await exportThreeObject(
							await mn.mapCaller.getScene().scene,
							'glb',
							path.join(outputDir, map_config[k].name, `${mn.subName}.glb`)
						)
					}
					break
				}
				default: {
					break
				}
			}
		}
		for (const mn of map_config[k].vehicles) {
			switch (map_config[k].name) {
				case 'example': {
					if (mn.objCaller instanceof BaseScene) {
						await exportThreeObject(await (mn.objCaller.getScene()).scene, 'json', path.join(outputDir, map_config[k].name, `example_${mn.type}.glb.json`))
						await exportThreeObject(
							await mn.objCaller.getVehicle(mn.type, mn.subtype).scene,
							'glb',
							path.join(outputDir, map_config[k].name, `example_${mn.type}.glb`)
						)
					}
					break
				}
				default: {
					break
				}
			}
		}
	}

	const scene = new THREE.Scene()

	const mesh = new THREE.Mesh(
		new THREE.BoxGeometry(1, 1, 1),
		new THREE.MeshStandardMaterial({
			color: 0xff0000,
		})
	)

	mesh.name = 'RedBox'

	scene.add(mesh)

	// --------------------------------
	// Export
	// --------------------------------

	// await exportThreeObject(scene, 'json', path.join(outputDir, 'scene.json'))
	// await exportThreeObject(scene, 'glb', path.join(outputDir, 'scene.glb'))
	// await exportThreeObject(scene, 'gltf', path.join(outputDir, 'scene.gltf'))

	// const fileBuffer = await fs.readFile(path.join(outputDir, 'scene.glb'))
	// // 3. Convert Node Buffer to standard ArrayBuffer safely
	// const arrayBuffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength)
	// const loader = new GLTFLoader()
	// loader.parse(
	// 	arrayBuffer,
	// 	'', // Resource path (can leave empty if textures are self-contained)
	// 	async (gltf) => {
	// 		// Success: Add the parsed scene or mesh to your Three.js scene
	// 		scene.add(gltf.scene)
	// 		console.log('GLB model successfully loaded into the scene!')

	// 		/* // You can now traverse or inspect the scene hierarchy
	// 		gltf.scene.traverse((child) => {
	// 			if (child.isMesh) {
	// 				console.log(`Found mesh: ${child.name}`)
	// 			}
	// 		}) */
	// 		await exportThreeObject(gltf.scene, 'glb', path.join(outputDir, 'scene_2.glb'))
	// 	},
	// 	(error) => {
	// 		// Error handling
	// 		console.error('An error occurred while parsing the GLB:', error)
	// 	}
	// )
}

// ------------------------------------
// Run
// ------------------------------------

main().catch((error) => {
	console.error('Export failed:', error)
	process.exit(1)
})

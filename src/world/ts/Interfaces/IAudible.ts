import * as THREE from 'three'

export interface IAudible {
	audio: {
		dom: HTMLAudioElement | null
		source: HTMLSourceElement | null
		posaudio: THREE.PositionalAudio | null
	}
}

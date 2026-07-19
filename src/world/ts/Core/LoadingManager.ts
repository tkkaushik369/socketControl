import { WorldBase } from '@World'
import { LoadingTrackerEntry } from './LoadingTrackerEntry'

export type LoadingManagerUserInterface = CustomEvent<{
	visible: boolean
}>
export type LoadingManagerLoadingScreen = CustomEvent<{
	visible: boolean
}>

export class LoadingManager extends EventTarget {
	public firstLoad: boolean = true
	private world: WorldBase
	private loadingTracker: LoadingTrackerEntry[] = []

	constructor(world: WorldBase) {
		super()

		this.world = world

		this.world.timeScaleTarget = 0
		// UIManager.setUserInterfaceVisible(false)
		// UIManager.setLoadingScreenVisible(true)

		this.dispatchEvent(new CustomEvent('user_interface', { detail: { visible: false } }))
		this.dispatchEvent(new CustomEvent('loading_screen', { detail: { visible: true } }))
	}

	public addLoadingEntry(path: string): LoadingTrackerEntry {
		let entry = new LoadingTrackerEntry(path)
		this.loadingTracker.push(entry)
		this.dispatchEvent(new CustomEvent('user_interface', { detail: { visible: false } }))
		this.dispatchEvent(new CustomEvent('loading_screen', { detail: { visible: true } }))
		return entry
	}

	public doneLoading(trackerEntry: LoadingTrackerEntry): void {
		trackerEntry.finished = true
		trackerEntry.progress = 1
		this.dispatchEvent(new CustomEvent('loading_progress', { detail: { progress: trackerEntry.progress, name: trackerEntry.path } }))
		this.world.timeScaleTarget = 1

		if (this.isLoadingDone()) {
			// UIManager.setUserInterfaceVisible(true)
			// UIManager.setLoadingScreenVisible(false)

			this.dispatchEvent(new CustomEvent('user_interface', { detail: { visible: true } }))
			this.dispatchEvent(new CustomEvent('loading_screen', { detail: { visible: false } }))
		}
	}

	private isLoadingDone(): boolean {
		// console.log("loadingTracker", this.loadingTracker)
		for (const entry of this.loadingTracker) {
			if (!entry.finished) return false
		}
		return true
	}

	public getLoadingPercentage(): number {
		let done = true
		let total = 0
		let finished = 0

		for (const item of this.loadingTracker) {
			total++
			finished += item.progress
			if (!item.finished) done = false
		}

		return (finished / total) * 100
	}
}

import type { Configuration } from 'webpack'
import path from 'node:path'

export const config_prod: Configuration = {
	mode: 'production',
	performance: {
		hints: false,
	},
	cache: {
		type: 'filesystem',
		allowCollectingMemory: true,
		cacheDirectory: path.resolve(__dirname, '../.webpack_cache'),
	},
}

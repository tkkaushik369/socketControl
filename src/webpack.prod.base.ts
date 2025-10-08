import type { Configuration } from 'webpack'

export const config_prod: Configuration = {
	mode: 'production',
	performance: {
		hints: false,
	},
}

import WebpackMerge from 'webpack-merge'

import { config_common } from './webpack.common.base'
import { config_prod } from './webpack.prod.base'
import { config_dev } from './webpack.dev.base'
import { config_worldbase_common } from './webpack.common.worldbase'
import { config_worldbase_prod } from './webpack.prod.worldbase'
import { config_worldbase_dev } from './webpack.dev.worldbase'
import { config_client_common } from './webpack.common.client'
import { config_client_prod } from './webpack.prod.client'
import { config_client_dev } from './webpack.dev.client'
import { config_server_common } from './webpack.common.server'
import { config_server_prod } from './webpack.prod.server'
import { config_server_dev } from './webpack.dev.server'

export default (env: { [id: string]: string }) => {
	console.log(`END: ${JSON.stringify(env)}`)
	if (env.BUNDLE === 'server') {
		if (env.MODE === 'prod') {
			return WebpackMerge([config_common, config_prod, config_worldbase_common, config_worldbase_prod])
		}
		if (env.MODE === 'dev') {
			return WebpackMerge([config_common, config_dev, config_worldbase_common, config_worldbase_dev])
		}
	}
	if (env.BUNDLE === 'client') {
		if (env.MODE === 'prod') {
			return WebpackMerge([config_common, config_prod, config_client_common, config_client_prod])
		}
		if (env.MODE === 'dev') {
			return WebpackMerge([config_common, config_dev, config_client_common, config_client_dev])
		}
	}
	if (env.BUNDLE === 'server') {
		if (env.MODE === 'prod') {
			return WebpackMerge([config_common, config_prod, config_server_common, config_server_prod])
		}
		if (env.MODE === 'dev') {
			return WebpackMerge([config_common, config_dev, config_server_common, config_server_dev])
		}
	}
}

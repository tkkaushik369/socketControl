import { merge } from 'webpack-merge'
import common from './webpack.common.worldclient'
import { config_prod } from './webpack.prod.base'

export const config_worldclient_prod = {}
export default merge(common, config_prod, config_worldclient_prod)

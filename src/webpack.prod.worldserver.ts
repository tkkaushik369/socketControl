import { merge } from 'webpack-merge'
import common from './webpack.common.worldserver'
import { config_prod } from './webpack.prod.base'

export const config_worldserver_prod = {}
export default merge(common, config_prod, config_worldserver_prod)

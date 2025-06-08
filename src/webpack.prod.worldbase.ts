import { merge } from 'webpack-merge'
import common from './webpack.common.worldbase'
import { config_prod } from './webpack.prod.base'

export const config_worldbase_prod = {}
export default merge(common, config_prod, config_worldbase_prod)

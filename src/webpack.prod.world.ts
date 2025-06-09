import { merge } from 'webpack-merge'
import common from './webpack.common.world'
import { config_prod } from './webpack.prod.base'

export const config_world_prod = {}
export default merge(common, config_prod, config_world_prod)

import { merge } from 'webpack-merge'
import common from './webpack.common.offline'
import { config_prod } from './webpack.prod.base'

export const config_offline_prod = {}
export default merge(common, config_prod, config_offline_prod)

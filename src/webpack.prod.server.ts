import { merge } from 'webpack-merge'
import common from './webpack.common.server'
import { config_prod } from './webpack.prod.base'

export const config_server_prod = {}
export default merge(common, config_prod, config_server_prod)

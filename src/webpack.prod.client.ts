import { merge } from 'webpack-merge'
import common from './webpack.common.client'
import { config_prod } from './webpack.prod.base'

export const config_client_prod = {}
export default merge(common, config_prod, config_client_prod)

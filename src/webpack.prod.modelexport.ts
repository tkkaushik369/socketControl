import { merge } from 'webpack-merge'
import common from './webpack.common.modelexport'
import { config_prod } from './webpack.prod.base'

export const config_modelexport_prod = {}
export default merge(common, config_prod, config_modelexport_prod)

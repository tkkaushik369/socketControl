import { Configuration } from 'webpack'
import prod_world from './webpack.prod.world'
import prod_server from './webpack.prod.server'
import prod_client from './webpack.prod.client'

const config: Configuration[] = []
config.push(prod_world)
config.push(prod_client)
config.push(prod_server)
export default config

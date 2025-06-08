import { Configuration } from 'webpack'
import prod_worldbase from './webpack.prod.worldbase'
import prod_server from './webpack.prod.server'
import prod_client from './webpack.prod.client'

const config: Configuration[] = []
config.push(prod_worldbase)
config.push(prod_client)
config.push(prod_server)
export default config

import { Configuration } from 'webpack'
import prod_world from './webpack.prod.world'
import prod_worldclient from './webpack.prod.worldclient'
import prod_worldserver from './webpack.prod.worldserver'
import prod_server from './webpack.prod.server'
import prod_client from './webpack.prod.client'
import prod_offline from './webpack.prod.offline'

const config: Configuration[] = []
config.push(prod_world)
config.push(prod_worldclient)
config.push(prod_worldserver)
config.push(prod_client)
config.push(prod_server)
config.push(prod_offline)
export default config

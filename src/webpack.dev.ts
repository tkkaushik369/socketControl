import { Configuration } from 'webpack'
import dev_worldbase from './webpack.dev.worldbase'
import dev_client from './webpack.dev.client'
import dev_server from './webpack.dev.server'

const config: Configuration[] = []
config.push(dev_worldbase)
config.push(dev_client)
config.push(dev_server)
export default config

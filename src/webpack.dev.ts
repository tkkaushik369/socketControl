import { Configuration } from 'webpack'
import dev_world from './webpack.dev.world'
import dev_client from './webpack.dev.client'
import dev_server from './webpack.dev.server'
import dev_offline from './webpack.dev.offline'

const config: Configuration[] = []
config.push(dev_world)
config.push(dev_client)
config.push(dev_server)
config.push(dev_offline)
export default config

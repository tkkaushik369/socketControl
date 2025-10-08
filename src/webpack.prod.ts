import { Configuration } from 'webpack'
import { merge } from 'webpack-merge'
import { config_prod } from './webpack.prod.base'
import prod_world from './webpack.prod.world'
import prod_worldclient from './webpack.prod.worldclient'
import prod_worldserver from './webpack.prod.worldserver'
import prod_server from './webpack.prod.server'
import prod_client from './webpack.prod.client'
import prod_offline from './webpack.prod.offline'
import electronConfig from './ForgeConfig/webpack.full.electron'

const config: Configuration[] = []
config.push(prod_world)
config.push(prod_worldclient)
config.push(prod_worldserver)
config.push(prod_client)
config.push(prod_server)
config.push(prod_offline)

for (let i = 0; i < electronConfig.length; i++) {
	config.push(merge(config_prod, electronConfig[i]))
}
export default config

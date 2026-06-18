// import * as WorldLib from './dist/@World/World.js'
// import * as WorldServerLib from './dist/@WorldServer/index.js'
// import * as ServerModuleLib from './dist/server/server.js'
// import * as data from './dist/client/models/MapConfig.json'

const WorldLib = require('./dist/@World/World.js')
console.log("World Loaded")
const WorldServerLib = require('./dist/@WorldServer/index.js')
console.log("WorldServer Loaded")
const ServerModuleLib = require('./dist/server/server.js')
console.log("server Loaded")
const data = require('./dist/client/models/MapConfig.json')


const port = process.env.PORT || 3000
global.AppServer.initServer()
new global.AppServer.default(data.maps, port).Start()

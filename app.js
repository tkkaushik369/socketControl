import('./dist/@WorldBase/WorldBase.js').then(WorldBaseLib => {
	Object.keys(WorldBaseLib.default).forEach(key => {
		global[key] = WorldBaseLib.default[key]
	})
	import('./dist/server/server.js').then((ServerModuleLib) => {
		// console.log(this['@WorldBase'], ServerModuleLib)
	}).catch(err => {
		// console.log(err)
		console.log('err server')
	})
}).catch(err => {
	// console.log(err)
	console.log('err worldbase')
})

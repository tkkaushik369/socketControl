import('./dist/@World/index.js')
	.then((WorldLib) => {
		Object.keys(WorldLib.default).forEach((key) => {
			global[key] = WorldLib.default[key]
		})
		console.log("World Loaded")
		import('./dist/server/server.js')
			.then((ServerModuleLib) => {
				Object.keys(ServerModuleLib.default).forEach((key) => {
					global[key] = ServerModuleLib.default[key]
				})
				console.log("server Loaded")
				// console.log(this['@World'], ServerModuleLib)
				const port = process.env.PORT || 3000
				global.AppServer.initServer()
				new global.AppServer.default(port).Start()
			})
			.catch((err) => {
				console.log(err)
				console.log('err server')
			})
	})
	.catch((err) => {
		// console.log(err)
		console.log('err worldbase')
	})

// function commonjsImporter(libPath/* : string */, target/* : Record<string, any> */) {
// 	const targetLoader = (cjLib/* : Record<string, any> */) => {
// 		Object.keys(cjLib).forEach((key/* : string */) => {
// 			if (key === 'default') return
// 			console.log("key: ", key)
// 			target[key] = cjLib[key]
// 		})
// 	}

// 	// import(libPath).then(targetLoader)
// 	const cjLib/* : { [id: string]: any }  */= require(libPath)
// 	targetLoader(cjLib)
// }



// commonjsImporter('./dist/@World/index.js', this)
// console.log(this)
// commonjsImporter('./dist/server/server.js', this)
// console.log(this)


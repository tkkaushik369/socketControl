import type { ForgeConfig } from '@electron-forge/shared-types'
import { MakerSquirrel } from '@electron-forge/maker-squirrel'
import { MakerZIP } from '@electron-forge/maker-zip'
import { MakerDeb } from '@electron-forge/maker-deb'
import { MakerRpm } from '@electron-forge/maker-rpm'
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives'
import { WebpackPlugin } from './src/PluginWebpack/WebpackPlugin'
import { FusesPlugin } from '@electron-forge/plugin-fuses'
import { FuseV1Options, FuseVersion } from '@electron/fuses'
import webpackConfig from './src/ForgeConfig/forge.webpack.config'

const config: ForgeConfig = {
	packagerConfig: {
		asar: true,
		/*extraResource: ['./src/client/audios', './src/client/images', './src/client/models'],	*/
		// icon: '/path/to/icon' // no file extension required // win and mac
	},
	rebuildConfig: {},
	makers: [
		new MakerSquirrel({
			/* // An URL to an ICO file to use as the application icon (displayed in Control Panel > Programs and Features).
			iconUrl: 'https://url/to/icon.ico',
			// The ICO file to use as the icon for the generated Setup.exe
			setupIcon: '/path/to/icon.ico' */
		}),
		new MakerZIP({}, ['darwin']),
		new MakerRpm({}),
		new MakerDeb({
			// options: { icon: '/path/to/icon.png' } // linux
		}),
	],
	plugins: [
		new AutoUnpackNativesPlugin({}),
		new WebpackPlugin(webpackConfig),
		// Fuses are used to enable/disable various Electron functionality
		// at package time, before code signing the application
		new FusesPlugin({
			version: FuseVersion.V1,
			[FuseV1Options.RunAsNode]: false,
			[FuseV1Options.EnableCookieEncryption]: true,
			[FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
			[FuseV1Options.EnableNodeCliInspectArguments]: false,
			[FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
			[FuseV1Options.OnlyLoadAppFromAsar]: true,
		}),
	],
}

export default config

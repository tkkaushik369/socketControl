import { app, BrowserWindow, screen } from 'electron'
import electronReload from 'electron-reload'
import path from 'path'

electronReload(__dirname, {
	// electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
	hardResetMethod: 'exit'
});

const createWindow = () => {
	let size = {
		width: 420,
		height: 220,
	}
	let offset = {
		width: 500,
		height: 30,
	}
	const mainWindow = new BrowserWindow({
		width: size.width,
		height: size.height,
		// backgroundColor: '#2e2c29',
		transparent: true,
		frame: false,
		webPreferences: {
			nodeIntegration: true,
		}
	})
	let display = screen.getPrimaryDisplay()
	let width = display.bounds.width
	let height = display.bounds.height
	mainWindow.setPosition(width - size.width - offset.width, height - size.height - offset.height, true)
	mainWindow.setAlwaysOnTop(true, 'floating');

	// mainWindow.setIgnoreMouseEvents(true)

	mainWindow.loadURL('http://localhost:8080').catch(() => {
		mainWindow.loadFile(path.join(__dirname, '../../dist/client/index.html'))
	})
	mainWindow.once('ready-to-show', () => {
		mainWindow.webContents.setZoomFactor(0.6)
		mainWindow.show()
	});
	// mainWindow.blur()
	// mainWindow.focus()
	// window.location.host
	// mainWindow.webContents.openDevTools()
}

app.whenReady().then(() => {
	createWindow()

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow()
		}
	})
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()
	}
})
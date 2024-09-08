import { app, BrowserWindow } from 'electron'
import path from 'path'

const createWindow = () => {
	const mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		// backgroundColor: '#2e2c29',
		frame: false,
		transparent: true,
		webPreferences: {
			nodeIntegration: true,
		}
	})

	mainWindow.loadURL('http://localhost:8080').catch(() => {
		mainWindow.loadFile(path.join(__dirname, '../../dist/client/index.html'))
	})
	// mainWindow.blur()
	// mainWindow.focus()
	// window.location.host
	mainWindow.webContents.openDevTools()
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
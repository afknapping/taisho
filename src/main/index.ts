import { app, BrowserWindow } from 'electron';
import { ChildProcess } from 'child_process'
import findOpenSocket from '../renderer/client/find-open-socket'
import isDev from 'electron-is-dev'
import { start as osHelperStart } from './os-service-helper'
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const BACKGROUND_WINDOW_WEBPACK_ENTRY: string;
let serverProcess: ChildProcess;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

async function createWindow(socketName: string, bgWindow?: BrowserWindow): Promise<void> {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    height: 800,
    width: 1200,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    }
  });

  await mainWindow.webContents.session.clearStorageData();
  await mainWindow.webContents.session.clearCache();
  mainWindow.webContents.on('dom-ready', () => {
    mainWindow.webContents.send('set-socket', {
      name: socketName
    });
  })
  
  osHelperStart(mainWindow, bgWindow)
  // and load the index.html of the app.
  await mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
}

function createBackgroundWindow(socketName: string) {
  const win = new BrowserWindow({
    title: 'background',
    x: 500,
    y: 300,
    width: 700,
    height: 500,
    show: isDev,
    webPreferences: {
      enableRemoteModule: true,
      nodeIntegration: true,
      webSecurity: false
    }
  })

  //make sure isVisible is false for devtools toggle
  win.hide()

  win.loadURL(BACKGROUND_WINDOW_WEBPACK_ENTRY)
  win.webContents.on('did-finish-load', () => {
    win.webContents.send('set-socket', { name: socketName })
  })

  return win;
}

async function start(bootBg: boolean) {
  const serverSocket = await findOpenSocket()
  let bgWindow;

  if (bootBg) {
    bgWindow = createBackgroundWindow(serverSocket)
  }

  await createWindow(serverSocket, bgWindow)
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => start(true));

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill()
    serverProcess = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open. except background
  const windows = BrowserWindow.getAllWindows();
  const hasBackground = !!windows.find(win => win.title === 'background')
  if (windows.length === 1 && hasBackground) {
    start(false);
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

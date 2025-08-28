// main.js

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { autoUpdater } = require("electron-updater"); // <-- 1. IMPORTAR

// --- CORREÇÃO DEFINITIVA APLICADA AQUI ---
// Define o caminho do .env de forma inteligente.
// Se o app estiver empacotado, ele procura na pasta de recursos.
// Se não, ele procura na raiz do projeto (para desenvolvimento).
const envPath = app.isPackaged
  ? path.join(process.resourcesPath, '.env')
  : path.join(__dirname, '..', '.env');

require("dotenv").config({ path: envPath });
// ------------------------------------------

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 940,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, "pages/login.html"));

  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  // <-- 2. ADICIONAR ESTA LINHA
  autoUpdater.checkForUpdatesAndNotify();
});

ipcMain.on("navigate", (event, page) => {
  mainWindow.loadFile(path.join(__dirname, `pages/${page}`));
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
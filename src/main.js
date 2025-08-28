const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log"); // <-- 1. IMPORTAR ELECTRON-LOG

// --- Configuração do Logger ---
log.transports.file.resolvePath = () => path.join(app.getPath("userData"), "logs/main.log");
log.info("App starting...");

// --- Variáveis de Ambiente ---
const envPath = app.isPackaged
  ? path.join(process.resourcesPath, '.env')
  : path.join(__dirname, '..', '.env');
require("dotenv").config({ path: envPath });

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
}

// --- Lógica do Auto-Updater ---
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = "info";

autoUpdater.on('checking-for-update', () => {
  log.info('Checking for update...');
});
autoUpdater.on('update-available', (info) => {
  log.info('Update available.', info);
});
autoUpdater.on('update-not-available', (info) => {
  log.info('Update not available.', info);
});
autoUpdater.on('error', (err) => {
  log.error('Error in auto-updater. ' + err);
});
autoUpdater.on('download-progress', (progressObj) => {
  let log_message = "Download speed: " + progressObj.bytesPerSecond;
  log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
  log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
  log.info(log_message);
});
autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded.', info);
});

// --- Ciclo de Vida da Aplicação ---
app.whenReady().then(() => {
  createWindow();

  // A verificação de atualização só deve ser feita na aplicação empacotada
  if (app.isPackaged) {
      autoUpdater.checkForUpdatesAndNotify();
  }
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
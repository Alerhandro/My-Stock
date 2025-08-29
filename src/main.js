const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");

// Configuração do Logger
log.transports.file.resolvePath = () => path.join(app.getPath("userData"), "logs/main.log");
log.info("App starting...");

// Variáveis de Ambiente
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

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = "info";

// Removemos a notificação automática e ouvimos o evento 'update-downloaded'
autoUpdater.on('update-downloaded', () => {
  log.info('Update downloaded; notifying renderer process.');
  // Envia uma mensagem para a janela principal quando o download estiver completo
  mainWindow.webContents.send('update_downloaded');
});

// Ouve o evento do renderer para reiniciar e instalar
ipcMain.on('restart_app', () => {
  log.info('Restarting app to install update.');
  autoUpdater.quitAndInstall();
});

app.whenReady().then(() => {
  createWindow();
  if (app.isPackaged) {
    // Apenas verifica, não notifica mais automaticamente
    autoUpdater.checkForUpdates();
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
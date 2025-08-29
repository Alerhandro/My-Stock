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
  //mainWindow.webContents.openDevTools(); 
}

// --- Lógica do Auto-Updater ---

// Configurar o logger do autoUpdater
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = "info";

// 1. Ouvir o evento que indica que a atualização foi descarregada
autoUpdater.on('update-downloaded', () => {
  log.info('Update downloaded; notifying renderer process.');
  // Envia uma mensagem para a janela da aplicação (o nosso home.js)
  // para que ela possa mostrar o modal personalizado.
  if (mainWindow) {
    mainWindow.webContents.send('update_downloaded');
  }
});

// 2. Ouvir o pedido da janela da aplicação para reiniciar e instalar
ipcMain.on('restart_app', () => {
  log.info('Restarting app to install update.');
  autoUpdater.quitAndInstall();
});


// --- Ciclo de Vida da Aplicação ---

app.whenReady().then(() => {
  createWindow();

  // 3. Após a janela ser criada, verificamos se há atualizações
  // Isto só é executado na aplicação instalada (não em desenvolvimento)
  if (app.isPackaged) {
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
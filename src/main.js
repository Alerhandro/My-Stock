const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
require("dotenv").config();

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
  // TIRE DO COMENTARIO CASO QUEIRA VERIFICAR O DEBUG
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

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
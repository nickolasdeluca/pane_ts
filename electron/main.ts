import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const devServerUrl = process.env.VITE_DEV_SERVER_URL;

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1180,
    minHeight: 760,
    title: "Pane",
    icon: path.join(rootDir, "public", "icon.png"),
    backgroundColor: "#101115",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (devServerUrl) {
    void mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    void mainWindow.loadFile(path.join(rootDir, "dist", "index.html"));
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle("pane:save-png", async (_event, suggestedName: string, dataUrl: string) => {
  if (!mainWindow) {
    return { ok: false, cancelled: true };
  }

  const result = await dialog.showSaveDialog(mainWindow, {
    title: "Export PNG",
    defaultPath: suggestedName,
    filters: [{ name: "PNG image", extensions: ["png"] }]
  });

  if (result.canceled || !result.filePath) {
    return { ok: false, cancelled: true };
  }

  const pngBase64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  await fs.writeFile(result.filePath, Buffer.from(pngBase64, "base64"));
  return { ok: true, path: result.filePath };
});

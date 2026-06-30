import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("pane", {
  savePng: (suggestedName: string, dataUrl: string) =>
    ipcRenderer.invoke("pane:save-png", suggestedName, dataUrl)
});

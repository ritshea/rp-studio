import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  selectFile: (options: any) => ipcRenderer.invoke('select-file', options),
  saveFile: (filePath: string, buffer: ArrayBuffer | string) => ipcRenderer.invoke('save-file', filePath, buffer),
  openPath: (path: string) => ipcRenderer.invoke('open-path', path),
  
  // Database API
  getSetting: (key: string) => ipcRenderer.invoke('db-get-setting', key),
  setSetting: (key: string, value: any) => ipcRenderer.invoke('db-set-setting', key, value),
  getPresets: () => ipcRenderer.invoke('db-get-presets'),
  savePreset: (preset: any) => ipcRenderer.invoke('db-save-preset', preset),
  deletePreset: (id: string) => ipcRenderer.invoke('db-delete-preset', id),
  getHistory: () => ipcRenderer.invoke('db-get-history'),
  addHistory: (record: any) => ipcRenderer.invoke('db-add-history', record),
  clearHistory: () => ipcRenderer.invoke('db-clear-history'),

  // Document & PDF printing tools
  printToPDF: (htmlContent: string, options?: any) => ipcRenderer.invoke('print-to-pdf', htmlContent, options),
  printDirect: (htmlContent: string, options?: any) => ipcRenderer.invoke('print-direct', htmlContent, options)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}


import { ElectronAPI } from '@electron-toolkit/preload'

export interface RPStudioAPI {
  getPrinters: () => Promise<any[]>
  selectDirectory: () => Promise<string | null>
  selectFile: (options?: {
    title?: string
    filters?: { name: string; extensions: string[] }[]
    properties?: string[]
  }) => Promise<{ filePath: string; name: string; size: number; base64Data?: string }[] | null>
  selectSavePath: (options?: {
    title?: string
    defaultPath?: string
    filters?: { name: string; extensions: string[] }[]
  }) => Promise<string | null>
  saveFile: (
    filePath: string,
    buffer: ArrayBuffer | string
  ) => Promise<{ success: boolean; error?: string; filePath?: string }>
  openPath: (path: string) => Promise<void>

  getSetting: (key: string) => Promise<any>
  setSetting: (key: string, value: any) => Promise<void>
  getPresets: () => Promise<any[]>
  savePreset: (preset: any) => Promise<void>
  deletePreset: (id: string) => Promise<void>
  getHistory: () => Promise<any[]>
  addHistory: (record: any) => Promise<void>
  clearHistory: () => Promise<void>

  printToPDF: (
    htmlContent: string,
    options?: any
  ) => Promise<{ success: boolean; data?: string; error?: string }>
  printDirect: (htmlContent: string, options?: any) => Promise<{ success: boolean; error?: string }>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: RPStudioAPI
  }
}

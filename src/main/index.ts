import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import * as path from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {
  initDatabase,
  getSetting,
  setSetting,
  getPresets,
  savePreset,
  deletePreset,
  getHistory,
  addHistory,
  clearHistory
} from './database'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    title: 'RP Studio',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Initialize SQLite / JSON database
  initDatabase()

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // ---- IPC Handlers ----
  
  // Get system printers
  ipcMain.handle('get-printers', async () => {
    if (!mainWindow) return []
    try {
      return await mainWindow.webContents.getPrintersAsync()
    } catch (err) {
      console.error('Failed to get printers', err)
      return []
    }
  })

  // Open directory selection dialog
  ipcMain.handle('select-directory', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    })
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0]
    }
    return null
  })

  // Open file selection dialog
  ipcMain.handle('select-file', async (_, options = {}) => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      title: options.title || 'Select Files',
      filters: options.filters || [],
      properties: options.properties || ['openFile', 'multiSelections']
    })
    
    if (!result.canceled && result.filePaths.length > 0) {
      return Promise.all(
        result.filePaths.map(async (filePath) => {
          const stats = fs.statSync(filePath)
          const name = path.basename(filePath)
          
          let base64Data: string | undefined
          if (options.readAsBase64) {
            const buffer = fs.readFileSync(filePath)
            base64Data = buffer.toString('base64')
          }
          
          return {
            filePath,
            name,
            size: stats.size,
            base64Data
          }
        })
      )
    }
    return null
  })

  // Open file save dialog
  ipcMain.handle('select-save-path', async (_, options = {}) => {
    if (!mainWindow) return null
    const result = await dialog.showSaveDialog(mainWindow, {
      title: options.title || 'Save File',
      defaultPath: options.defaultPath || '',
      filters: options.filters || []
    })
    if (!result.canceled && result.filePath) {
      return result.filePath
    }
    return null
  })

  // Save base64 or buffer data to local file system
  ipcMain.handle('save-file', async (_, filePath, data) => {
    try {
      const dir = path.dirname(filePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      
      if (typeof data === 'string') {
        if (data.startsWith('data:')) {
          const base64Content = data.split(';base64,').pop()
          if (base64Content) {
            fs.writeFileSync(filePath, Buffer.from(base64Content, 'base64'))
          } else {
            fs.writeFileSync(filePath, data, 'utf-8')
          }
        } else {
          const isBase64 = /^[a-zA-Z0-9+/=\r\n]+$/.test(data.trim())
          if (isBase64 && filePath.toLowerCase().endsWith('.pdf')) {
            fs.writeFileSync(filePath, Buffer.from(data, 'base64'))
          } else {
            fs.writeFileSync(filePath, data, 'utf-8')
          }
        }
      } else {
        fs.writeFileSync(filePath, Buffer.from(data))
      }
      
      return { success: true, filePath }
    } catch (err: any) {
      console.error('Failed to save file:', err)
      return { success: false, error: err.message }
    }
  })

  // Open directory or file using OS shell
  ipcMain.handle('open-path', async (_, targetPath) => {
    try {
      if (fs.existsSync(targetPath)) {
        await shell.openPath(targetPath)
      } else {
        // If file doesn't exist, try parent folder
        const parentDir = path.dirname(targetPath)
        if (fs.existsSync(parentDir)) {
          await shell.openPath(parentDir)
        }
      }
    } catch (err) {
      console.error('Failed to open path', err)
    }
  })

  // Database handlers
  ipcMain.handle('db-get-setting', (_, key) => getSetting(key))
  ipcMain.handle('db-set-setting', (_, key, value) => {
    setSetting(key, value)
  })
  ipcMain.handle('db-get-presets', () => getPresets())
  ipcMain.handle('db-save-preset', (_, preset) => {
    savePreset(preset)
  })
  ipcMain.handle('db-delete-preset', (_, id) => {
    deletePreset(id)
  })
  ipcMain.handle('db-get-history', () => getHistory())
  ipcMain.handle('db-add-history', (_, record) => {
    addHistory(record)
  })
  ipcMain.handle('db-clear-history', () => {
    clearHistory()
  })

  // Print layout to PDF
  ipcMain.handle('print-to-pdf', async (_, htmlContent, options = {}) => {
    let printWindow: BrowserWindow | null = null
    try {
      printWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          sandbox: true
        }
      })
      
      await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`)
      
      const pdfOptions: Electron.PrintToPDFOptions = {
        pageSize: options.pageSize || 'A4',
        margins: options.margins || { top: 0, bottom: 0, left: 0, right: 0 },
        printBackground: true,
        landscape: options.landscape || false
      }
      
      const pdfBuffer = await printWindow.webContents.printToPDF(pdfOptions)
      printWindow.close()
      printWindow = null
      
      return { success: true, data: pdfBuffer.toString('base64') }
    } catch (err: any) {
      console.error('print-to-pdf error', err)
      if (printWindow) {
        try {
          printWindow.close()
        } catch (e) {
          // ignore
        }
      }
      return { success: false, error: err.message }
    }
  })

  // Direct printing
  ipcMain.handle('print-direct', async (_, htmlContent, options = {}) => {
    let printWindow: BrowserWindow | null = null
    try {
      printWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          sandbox: true
        }
      })
      
      await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`)
      
      const printOptions: Electron.WebContentsPrintOptions = {
        silent: options.silent !== undefined ? options.silent : false,
        printBackground: true,
        deviceName: options.printerName || '',
        color: options.color !== undefined ? options.color : true,
        margins: options.margins || { marginType: 'default' },
        landscape: options.landscape || false,
        scaleFactor: options.scaleFactor || 100,
        pagesPerSheet: options.pagesPerSheet || 1,
        copies: options.copies || 1
      }
      
      const finalPrintWindow = printWindow
      return new Promise((resolve) => {
        finalPrintWindow.webContents.print(printOptions, (success, failureReason) => {
          try {
            finalPrintWindow.close()
          } catch (e) {
            // ignore
          }
          if (success) {
            resolve({ success: true })
          } else {
            resolve({ success: false, error: failureReason })
          }
        })
      })
    } catch (err: any) {
      console.error('print-direct error', err)
      if (printWindow) {
        try {
          printWindow.close()
        } catch (e) {
          // ignore
        }
      }
      return { success: false, error: err.message }
    }
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})


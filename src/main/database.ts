import { app } from 'electron'
import { join } from 'path'
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'

let dbInstance: any = null
let isSqlite = false
let jsonDbPath = ''
let jsonDbData: {
  settings: Record<string, any>
  presets: any[]
  history: any[]
} = {
  settings: {},
  presets: [],
  history: []
}

function saveJsonDb(): void {
  try {
    writeFileSync(jsonDbPath, JSON.stringify(jsonDbData, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to save JSON database', err)
  }
}

export function initDatabase(): void {
  const userDataPath = app.getPath('userData')
  const dbPath = join(userDataPath, 'rp_studio.db')
  jsonDbPath = join(userDataPath, 'rp_studio_db.json')

  try {
    // Attempt to load better-sqlite3
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Database = require('better-sqlite3')
    dbInstance = new Database(dbPath)
    isSqlite = true

    // Create tables
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
      CREATE TABLE IF NOT EXISTS presets (
        id TEXT PRIMARY KEY,
        name TEXT,
        paperSize TEXT,
        width REAL,
        height REAL,
        topMargin REAL,
        leftMargin REAL,
        rows INTEGER,
        columns INTEGER,
        rowGap REAL,
        columnGap REAL,
        showGrid BOOLEAN,
        showCutMarks BOOLEAN
      );
      CREATE TABLE IF NOT EXISTS history (
        id TEXT PRIMARY KEY,
        timestamp TEXT,
        fileName TEXT,
        filePath TEXT,
        fileSize INTEGER,
        operation TEXT,
        status TEXT
      );
    `)
    console.log('SQLite database initialized successfully at:', dbPath)
  } catch (error) {
    console.warn('better-sqlite3 failed to load. Falling back to JSON-based database.', error)
    isSqlite = false

    // Load JSON database
    if (existsSync(jsonDbPath)) {
      try {
        const fileContent = readFileSync(jsonDbPath, 'utf-8')
        jsonDbData = JSON.parse(fileContent)
      } catch (jsonErr) {
        console.error('Failed to parse JSON database. Resetting.', jsonErr)
      }
    } else {
      saveJsonDb()
    }
  }

  // Pre-populate default settings if empty
  const defaultSavePath = join(app.getPath('documents'), 'RP Studio Output')
  try {
    if (!existsSync(defaultSavePath)) {
      mkdirSync(defaultSavePath, { recursive: true })
    }
  } catch (e) {
    console.error('Failed to create default output folder', e)
  }

  const defaultSettings = {
    defaultSaveFolder: defaultSavePath,
    theme: 'light',
    compressionPreset: 'medium',
    autoUpdate: true,
    inkSavingMode: false,
    highQualityPrint: true,
    borderlessPrint: false
  }

  for (const [key, value] of Object.entries(defaultSettings)) {
    if (getSetting(key) === null) {
      setSetting(key, value)
    }
  }
}

// Get setting
export function getSetting(key: string): any {
  if (isSqlite && dbInstance) {
    try {
      const row = dbInstance.prepare('SELECT value FROM settings WHERE key = ?').get(key)
      return row ? JSON.parse(row.value) : null
    } catch (err) {
      console.error('SQLite getSetting error', err)
      return null
    }
  } else {
    return jsonDbData.settings[key] !== undefined ? jsonDbData.settings[key] : null
  }
}

// Set setting
export function setSetting(key: string, value: any): void {
  const valueStr = JSON.stringify(value)
  if (isSqlite && dbInstance) {
    try {
      dbInstance
        .prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
        .run(key, valueStr)
    } catch (err) {
      console.error('SQLite setSetting error', err)
    }
  } else {
    jsonDbData.settings[key] = value
    saveJsonDb()
  }
}

// Presets CRUD
export function getPresets(): any[] {
  if (isSqlite && dbInstance) {
    try {
      return dbInstance.prepare('SELECT * FROM presets').all()
    } catch (err) {
      console.error('SQLite getPresets error', err)
      return []
    }
  } else {
    return jsonDbData.presets || []
  }
}

export function savePreset(preset: any): void {
  if (isSqlite && dbInstance) {
    try {
      dbInstance
        .prepare(
          `
        INSERT OR REPLACE INTO presets (
          id, name, paperSize, width, height, topMargin, leftMargin,
          rows, columns, rowGap, columnGap, showGrid, showCutMarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
        )
        .run(
          preset.id,
          preset.name,
          preset.paperSize,
          preset.width,
          preset.height,
          preset.topMargin,
          preset.leftMargin,
          preset.rows,
          preset.columns,
          preset.rowGap,
          preset.columnGap,
          preset.showGrid ? 1 : 0,
          preset.showCutMarks ? 1 : 0
        )
    } catch (err) {
      console.error('SQLite savePreset error', err)
    }
  } else {
    const index = jsonDbData.presets.findIndex((p: any) => p.id === preset.id)
    if (index >= 0) {
      jsonDbData.presets[index] = preset
    } else {
      jsonDbData.presets.push(preset)
    }
    saveJsonDb()
  }
}

export function deletePreset(id: string): void {
  if (isSqlite && dbInstance) {
    try {
      dbInstance.prepare('DELETE FROM presets WHERE id = ?').run(id)
    } catch (err) {
      console.error('SQLite deletePreset error', err)
    }
  } else {
    jsonDbData.presets = jsonDbData.presets.filter((p: any) => p.id !== id)
    saveJsonDb()
  }
}

// History CRUD
export function getHistory(): any[] {
  if (isSqlite && dbInstance) {
    try {
      return dbInstance.prepare('SELECT * FROM history ORDER BY timestamp DESC').all()
    } catch (err) {
      console.error('SQLite getHistory error', err)
      return []
    }
  } else {
    return jsonDbData.history || []
  }
}

export function addHistory(record: any): void {
  if (isSqlite && dbInstance) {
    try {
      dbInstance
        .prepare(
          `
        INSERT INTO history (id, timestamp, fileName, filePath, fileSize, operation, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
        )
        .run(
          record.id,
          record.timestamp,
          record.fileName,
          record.filePath,
          record.fileSize,
          record.operation,
          record.status
        )
    } catch (err) {
      console.error('SQLite addHistory error', err)
    }
  } else {
    jsonDbData.history.unshift(record)
    // Limit to 500 records
    if (jsonDbData.history.length > 500) {
      jsonDbData.history.pop()
    }
    saveJsonDb()
  }
}

export function clearHistory(): void {
  if (isSqlite && dbInstance) {
    try {
      dbInstance.prepare('DELETE FROM history').run()
    } catch (err) {
      console.error('SQLite clearHistory error', err)
    }
  } else {
    jsonDbData.history = []
    saveJsonDb()
  }
}

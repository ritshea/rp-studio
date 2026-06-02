import React, { useState, useEffect } from 'react'
import { Card } from '../components/Card'
import {
  FolderOpen,
  Save,
  Trash2,
  Download,
  Settings as SettingsIcon,
  RefreshCw
} from 'lucide-react'

interface SettingsProps {
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void
  onThemeChange: (theme: string) => void
}

export const Settings: React.FC<SettingsProps> = ({ showToast, onThemeChange }) => {
  const [saveFolder, setSaveFolder] = useState<string>('')
  const [theme, setTheme] = useState<string>('light')
  const [autoUpdate, setAutoUpdate] = useState<boolean>(true)
  const [inkSaving, setInkSaving] = useState<boolean>(false)
  const [highQuality, setHighQuality] = useState<boolean>(true)
  const [borderless, setBorderless] = useState<boolean>(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async (): Promise<void> => {
    try {
      const folder = await window.api.getSetting('defaultSaveFolder')
      const themePref = await window.api.getSetting('theme')
      const autoUp = await window.api.getSetting('autoUpdate')
      const inkSave = await window.api.getSetting('inkSavingMode')
      const hiQual = await window.api.getSetting('highQualityPrint')
      const border = await window.api.getSetting('borderlessPrint')

      setSaveFolder(folder || '')
      setTheme(themePref || 'light')
      setAutoUpdate(autoUp !== false)
      setInkSaving(inkSave === true)
      setHighQuality(hiQual !== false)
      setBorderless(border === true)
    } catch (e) {
      console.error(e)
    }
  }

  const handleSelectFolder = async (): Promise<void> => {
    try {
      const folder = await window.api.selectDirectory()
      if (folder) {
        setSaveFolder(folder)
        await window.api.setSetting('defaultSaveFolder', folder)
        showToast('Default output directory updated', 'success')
      }
    } catch (e) {
      showToast('Directory selection cancelled', 'warning')
    }
  }

  const saveAllSettings = async (): Promise<void> => {
    try {
      await window.api.setSetting('theme', theme)
      await window.api.setSetting('autoUpdate', autoUpdate)
      await window.api.setSetting('inkSavingMode', inkSaving)
      await window.api.setSetting('highQualityPrint', highQuality)
      await window.api.setSetting('borderlessPrint', borderless)

      onThemeChange(theme)
      showToast('Settings saved successfully', 'success')
    } catch (e: any) {
      showToast(`Save settings failed: ${e.message}`, 'error')
    }
  }

  const clearHistory = async (): Promise<void> => {
    if (confirm('Are you sure you want to clear your entire activity logs history?')) {
      try {
        await window.api.clearHistory()
        showToast('Operation history logs cleared', 'success')
      } catch (e) {
        showToast('Clear failed', 'error')
      }
    }
  }

  const exportBackup = async (): Promise<void> => {
    try {
      // Gather configs
      const configs = {
        saveFolder,
        theme,
        autoUpdate,
        inkSaving,
        highQuality,
        borderless,
        presets: await window.api.getPresets(),
        history: await window.api.getHistory()
      }

      const fileData = JSON.stringify(configs, null, 2)
      const defaultFolder = await window.api.getSetting('defaultSaveFolder')
      const outPath = `${defaultFolder}/rp_studio_backup_${Date.now()}.json`

      const saveRes = await window.api.saveFile(outPath, fileData)
      if (saveRes.success) {
        showToast(`Configuration backup saved to ${outPath}`, 'success')
      } else {
        showToast(`Backup failed: ${saveRes.error}`, 'error')
      }
    } catch (e) {
      showToast('Failed to export config backup', 'error')
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
      {/* Column 1: Save Paths and Preferences */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: 'Outfit, sans-serif'
            }}
          >
            <FolderOpen size={18} />
            Output Configuration
          </h3>

          <div className="form-group">
            <label>Default Save Directory</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-control"
                style={{ flex: 1 }}
                value={saveFolder}
                readOnly
              />
              <button className="btn btn-secondary" onClick={handleSelectFolder}>
                Browse...
              </button>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-light)', marginTop: '4px' }}>
              All edited image files, merged PDFs, and documents will output here by default.
            </span>
          </div>
        </Card>

        <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: 'Outfit, sans-serif'
            }}
          >
            <SettingsIcon size={18} />
            Printing Defaults
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifySelf: 'start',
                gap: '10px',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              <input
                type="checkbox"
                checked={inkSaving}
                onChange={(e): void => setInkSaving(e.target.checked)}
              />
              Enable Ink Saving Mode (reduces print density)
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifySelf: 'start',
                gap: '10px',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              <input
                type="checkbox"
                checked={highQuality}
                onChange={(e): void => setHighQuality(e.target.checked)}
              />
              Default High Quality Print Mode
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifySelf: 'start',
                gap: '10px',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              <input
                type="checkbox"
                checked={borderless}
                onChange={(e): void => setBorderless(e.target.checked)}
              />
              Default Borderless Margins Layout
            </label>
          </div>
        </Card>
      </div>

      {/* Column 2: System Settings, Backup, Utilities */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: 'Outfit, sans-serif'
            }}
          >
            <RefreshCw size={18} />
            System Preferences
          </h3>

          <div className="form-group">
            <label>Interface Theme</label>
            <select
              className="form-control form-select"
              value={theme}
              onChange={(e): void => setTheme(e.target.value)}
            >
              <option value="light">SaaS Light Theme (Default)</option>
              <option value="dark">Charcoal Dark Theme</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              <input
                type="checkbox"
                checked={autoUpdate}
                onChange={(e): void => setAutoUpdate(e.target.checked)}
              />
              Automatically check for updates on startup
            </label>
          </div>
        </Card>

        <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: 'Outfit, sans-serif'
            }}
          >
            <Trash2 size={18} />
            Utilities & Backup
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              className="btn btn-secondary"
              style={{ display: 'flex', gap: '8px' }}
              onClick={exportBackup}
            >
              <Download size={14} />
              Export System Settings Backup
            </button>
            <button
              className="btn btn-secondary btn-danger"
              style={{ display: 'flex', gap: '8px' }}
              onClick={clearHistory}
            >
              <Trash2 size={14} />
              Clear Operations History Logs
            </button>
          </div>
        </Card>
      </div>

      {/* Global save button */}
      <div
        style={{
          gridColumn: 'span 2',
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: '10px'
        }}
      >
        <button className="btn btn-primary" onClick={saveAllSettings}>
          <Save size={16} />
          Save Settings & Preferences
        </button>
      </div>
    </div>
  )
}

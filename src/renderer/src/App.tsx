import React, { useState, useEffect } from 'react'
import {
  Compass,
  Image as ImageIcon,
  FileText,
  Printer,
  Compass as CompassIcon,
  ArrowRightLeft,
  Minimize2,
  Sparkles,
  Settings as SettingsIcon,
  FolderOpen,
  PrinterCheck
} from 'lucide-react'
import { Dashboard } from './pages/Dashboard'
import { ImageTools } from './pages/ImageTools'
import { PdfTools } from './pages/PdfTools'
import { DocumentTools } from './pages/DocumentTools'
import { PassportPhoto } from './pages/PassportPhoto'
import { PrintLayout } from './pages/PrintLayout'
import { FileConverter } from './pages/FileConverter'
import { CompressionTools } from './pages/CompressionTools'
import { BatchProcessing } from './pages/BatchProcessing'
import { Settings } from './pages/Settings'
import { Toast, ToastType } from './components/Toast'

function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<string>('dashboard')
  const [toasts, setToasts] = useState<ToastType[]>([])
  const [saveFolder, setSaveFolder] = useState<string>('')
  const [theme, setTheme] = useState<string>('light')

  useEffect(() => {
    // Load config on mount
    loadAppSettings()
  }, [])

  const loadAppSettings = async (): Promise<void> => {
    try {
      const folder = await window.api.getSetting('defaultSaveFolder')
      const themePref = await window.api.getSetting('theme')
      setSaveFolder(folder || '')
      onThemeChange(themePref || 'light')
    } catch (e) {
      console.error('Failed to load settings', e)
    }
  }

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success'): void => {
    const id = Math.random().toString(36).substring(7)
    setToasts((prev) => [...prev, { id, message, type }])
  }

  const removeToast = (id: string): void => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const onThemeChange = (newTheme: string): void => {
    setTheme(newTheme)
    const root = document.documentElement
    if (newTheme === 'dark') {
      root.style.setProperty('--color-bg-app', '#121212')
      root.style.setProperty('--color-bg-sidebar', '#1b1b1f')
      root.style.setProperty('--color-bg-panel', '#202127')
      root.style.setProperty('--color-bg-input', '#2b2b35')
      root.style.setProperty('--color-bg-hover', '#2b2b30')
      root.style.setProperty('--color-border', '#32363f')
      root.style.setProperty('--color-text', '#f8f8f8')
      root.style.setProperty('--color-text-secondary', '#acacb0')
    } else {
      root.style.setProperty('--color-bg-app', '#ffffff')
      root.style.setProperty('--color-bg-sidebar', '#f9f8f7')
      root.style.setProperty('--color-bg-panel', '#ffffff')
      root.style.setProperty('--color-bg-input', '#ffffff')
      root.style.setProperty('--color-bg-hover', '#f0eeea')
      root.style.setProperty('--color-border', '#e6e5e0')
      root.style.setProperty('--color-text', '#0c0c0b')
      root.style.setProperty('--color-text-secondary', '#5f5e5a')
    }
  }

  const openOutputFolder = async (): Promise<void> => {
    if (saveFolder) {
      await window.api.openPath(saveFolder)
      showToast('Opening default output folder', 'info')
    } else {
      showToast('Output folder not configured', 'warning')
    }
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Compass className="menu-item-icon" /> },
    { id: 'image', label: 'Image Tools', icon: <ImageIcon className="menu-item-icon" /> },
    { id: 'pdf', label: 'PDF Tools', icon: <FileText className="menu-item-icon" /> },
    { id: 'document', label: 'Document Tools', icon: <FileText className="menu-item-icon" /> },
    { id: 'passport', label: 'Passport Photo Maker', icon: <CompassIcon className="menu-item-icon" /> },
    { id: 'layout', label: 'Print Layout Grid', icon: <Printer className="menu-item-icon" /> },
    { id: 'converter', label: 'File Converter', icon: <ArrowRightLeft className="menu-item-icon" /> },
    { id: 'compression', label: 'Compression Tools', icon: <Minimize2 className="menu-item-icon" /> },
    { id: 'batch', label: 'Batch Processing', icon: <Sparkles className="menu-item-icon" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="menu-item-icon" /> }
  ]

  const getPageTitle = (): string => {
    const active = menuItems.find((item) => item.id === activeTab)
    return active ? active.label : 'RP Studio'
  }

  return (
    <div className={`app-container ${theme}-theme`}>
      {/* 1. Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand-section">
            <div className="brand-logo-icon">R</div>
            <h1 className="brand-name">RP Studio</h1>
          </div>
          <div className="brand-tagline">Smart Printing, Documents & Image Studio</div>
          <div className="brand-version">v1.4.2 Stable</div>
        </div>

        <nav className="sidebar-menu">
          {menuItems.map((item) => (
            <div
              key={item.id}
              className={`menu-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={(): void => {
                setActiveTab(item.id)
                loadAppSettings() // reload save folder state
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        <footer className="sidebar-footer">
          <p>© 2026 RP Creation</p>
          <p>
            Owner:{' '}
            <a href="https://ritesh.virajai.com" target="_blank" rel="noreferrer">
              Ritesh Pandey
            </a>
          </p>
          <p>
            <a href="https://virajai.com" target="_blank" rel="noreferrer">
              virajai.com
            </a>
          </p>
        </footer>
      </aside>

      {/* 2. Main content panels */}
      <main className="main-content">
        <header className="main-header">
          <div className="header-title-section">
            <h2>{getPageTitle()}</h2>
          </div>

          <div className="header-actions">
            {saveFolder && (
              <button className="header-folder-btn" onClick={openOutputFolder}>
                <FolderOpen size={14} />
                <span style={{ fontSize: '11px' }}>
                  Output: {saveFolder.split(window.navigator.platform.includes('Win') ? '\\' : '/').pop()}
                </span>
              </button>
            )}
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '11px', color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-secondary)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
              <PrinterCheck size={14} style={{ color: '#10b981' }} />
              <span>Studio Printer Connected</span>
            </div>
          </div>
        </header>

        <div className="workspace-panel">
          {activeTab === 'dashboard' && (
            <Dashboard setActiveTab={setActiveTab} showToast={showToast} />
          )}
          {activeTab === 'image' && <ImageTools showToast={showToast} />}
          {activeTab === 'pdf' && <PdfTools showToast={showToast} />}
          {activeTab === 'document' && <DocumentTools showToast={showToast} />}
          {activeTab === 'passport' && <PassportPhoto showToast={showToast} />}
          {activeTab === 'layout' && <PrintLayout showToast={showToast} />}
          {activeTab === 'converter' && <FileConverter showToast={showToast} />}
          {activeTab === 'compression' && <CompressionTools showToast={showToast} />}
          {activeTab === 'batch' && <BatchProcessing showToast={showToast} />}
          {activeTab === 'settings' && (
            <Settings showToast={showToast} onThemeChange={onThemeChange} />
          )}
        </div>
      </main>

      {/* 3. Toast Notifications popup */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </div>
  )
}

export default App


import React, { useEffect, useState } from 'react'
import { Card } from '../components/Card'
import {
  Image as ImageIcon,
  FileText,
  Printer,
  Compass,
  FolderOpen,
  ArrowRightLeft,
  Minimize2,
  Layers,
  CheckCircle,
  FileDown
} from 'lucide-react'

interface DashboardProps {
  setActiveTab: (tab: string) => void
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void
}

export const Dashboard: React.FC<DashboardProps> = ({ setActiveTab, showToast }) => {
  const [stats, setStats] = useState({
    totalProcessed: 0,
    presetsCount: 0,
    saveFolder: '',
    theme: 'light'
  })
  const [history, setHistory] = useState<any[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async (): Promise<void> => {
    try {
      const historyList = await window.api.getHistory()
      const presetList = await window.api.getPresets()
      const savePath = await window.api.getSetting('defaultSaveFolder')
      const activeTheme = await window.api.getSetting('theme')

      setHistory(historyList.slice(0, 5))
      setStats({
        totalProcessed: historyList.length,
        presetsCount: presetList.length,
        saveFolder: savePath || 'Not Configured',
        theme: activeTheme || 'light'
      })
    } catch (e) {
      console.error('Failed to load dashboard data', e)
    }
  }

  const openOutputFolder = async (): Promise<void> => {
    if (stats.saveFolder && stats.saveFolder !== 'Not Configured') {
      await window.api.openPath(stats.saveFolder)
      showToast('Opening output directory', 'info')
    } else {
      showToast('Save folder not configured', 'warning')
    }
  }

  const quickTools = [
    {
      id: 'image',
      title: 'Image Studio',
      desc: 'Resize, Crop, watermark, remove metadata and remove background key colors.',
      icon: <ImageIcon className="menu-item-icon" size={24} style={{ color: '#f36c45' }} />,
      bg: '#fbeee9'
    },
    {
      id: 'pdf',
      title: 'PDF Manager',
      desc: 'Merge, split, protect, extract pages or convert PDFs to images and vice versa.',
      icon: <FileText className="menu-item-icon" size={24} style={{ color: '#3b82f6' }} />,
      bg: '#eff6ff'
    },
    {
      id: 'passport',
      title: 'Passport Photo Maker',
      desc: 'Generate passport/visa layouts (India, Custom) with custom background colors.',
      icon: <Compass className="menu-item-icon" size={24} style={{ color: '#10b981' }} />,
      bg: '#ecfdf5'
    },
    {
      id: 'layout',
      title: 'Print Grid Designer',
      desc: 'Arrange mixed photos on A4 grid paper with automatic cells calculations.',
      icon: <Printer className="menu-item-icon" size={24} style={{ color: '#8b5cf6' }} />,
      bg: '#f5f3ff'
    },
    {
      id: 'converter',
      title: 'File Converter',
      desc: 'Batch convert image formats (PNG/JPG/WEBP) and document types (DOCX/PDF).',
      icon: <ArrowRightLeft className="menu-item-icon" size={24} style={{ color: '#ec4899' }} />,
      bg: '#fdf2f8'
    },
    {
      id: 'compression',
      title: 'Compressor Suite',
      desc: 'Compress image dimensions or PDF sizes to target weights (e.g. 50KB, 100KB).',
      icon: <Minimize2 className="menu-item-icon" size={24} style={{ color: '#f59e0b' }} />,
      bg: '#fffbeb'
    }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Banner */}
      <div
        className="studio-card"
        style={{
          background: 'linear-gradient(135deg, #f36c45 0%, #f4b4a4 100%)',
          color: 'white',
          padding: '32px',
          border: 'none',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h1 style={{ color: 'white', fontSize: '28px', marginBottom: '8px', fontFamily: 'Outfit, sans-serif' }}>
            Welcome to RP Studio v1.4.1
          </h1>
          <p style={{ opacity: 0.9, fontSize: '14px', maxWidth: '600px', lineHeight: 1.6 }}>
            Your premium commercial desktop assistant for intelligent printing layout design, batch compression, document conversion, and image toolkits.
          </p>
        </div>
        <div
          style={{
            position: 'absolute',
            right: '-40px',
            bottom: '-40px',
            opacity: 0.1,
            color: 'white',
            transform: 'rotate(-15deg)'
          }}
        >
          <Compass size={240} />
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <Card hoverable className="stat-card" onClick={() => setActiveTab('history')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: '#fbeee9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <CheckCircle style={{ color: '#f36c45' }} size={24} />
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#0c0c0b' }}>{stats.totalProcessed}</div>
              <div style={{ fontSize: '12px', color: '#5f5e5a' }}>Total Files Processed</div>
            </div>
          </div>
        </Card>

        <Card hoverable className="stat-card" onClick={() => setActiveTab('layout')}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: '#f5f3ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Layers style={{ color: '#8b5cf6' }} size={24} />
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#0c0c0b' }}>{stats.presetsCount}</div>
              <div style={{ fontSize: '12px', color: '#5f5e5a' }}>Custom Grid Presets</div>
            </div>
          </div>
        </Card>

        <Card hoverable className="stat-card" onClick={openOutputFolder}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: '#ecfdf5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <FolderOpen style={{ color: '#10b981' }} size={24} />
            </div>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0c0c0b',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '180px'
                }}
              >
                {stats.saveFolder.split(window.navigator.platform.includes('Win') ? '\\' : '/').pop() || 'Folder'}
              </div>
              <div style={{ fontSize: '12px', color: '#5f5e5a' }}>Default Output Directory</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Grid: Quick links + Recent items */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Quick links grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontFamily: 'Outfit, sans-serif' }}>Workspace Toolkits</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {quickTools.map((tool) => (
              <Card
                key={tool.id}
                hoverable
                onClick={() => setActiveTab(tool.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  alignItems: 'flex-start',
                  cursor: 'pointer'
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    backgroundColor: tool.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {tool.icon}
                </div>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>{tool.title}</h4>
                  <p style={{ fontSize: '12px', color: '#5f5e5a', lineHeight: 1.4 }}>{tool.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontFamily: 'Outfit, sans-serif' }}>Recent Activity</h3>
          <Card style={{ padding: '16px 0px', overflow: 'hidden' }}>
            {history.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#9c9a93' }}>
                <FileDown size={36} style={{ marginBottom: '8px', opacity: 0.5 }} />
                <p style={{ fontSize: '13px' }}>No operations recorded yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {history.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 20px',
                      borderBottom: idx < history.length - 1 ? '1px solid var(--color-border)' : 'none',
                      fontSize: '12px'
                    }}
                  >
                    <div style={{ maxWidth: '70%', overflow: 'hidden' }}>
                      <div
                        style={{
                          fontWeight: 600,
                          color: 'var(--color-dark)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {item.fileName}
                      </div>
                      <div style={{ color: 'var(--color-text-light)', fontSize: '11px', marginTop: '2px' }}>
                        {item.operation} • {new Date(item.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontWeight: 600,
                        fontSize: '10px',
                        backgroundColor: item.status === 'Success' ? '#ecfdf5' : '#fef2f2',
                        color: item.status === 'Success' ? '#10b981' : '#ef4444'
                      }}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

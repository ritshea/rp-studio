import React, { useState, useEffect } from 'react'
import { Card } from '../components/Card'
import { Modal } from '../components/Modal'
import { Upload, Printer, Save, Plus } from 'lucide-react'

interface PrintLayoutProps {
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void
}

interface GridConfig {
  id?: string
  name: string
  paperWidth: number
  paperHeight: number
  topMargin: number
  leftMargin: number
  rows: number
  columns: number
  rowGap: number
  colGap: number
  showGrid: boolean
  showCutMarks: boolean
}

const PAPER_PRESETS: Record<string, { name: string; w: number; h: number }> = {
  a4: { name: 'A4 (210 x 297 mm)', w: 210, h: 297 },
  '4x6': { name: '4" x 6" Photo (101.6 x 152.4 mm)', w: 101.6, h: 152.4 },
  '5x7': { name: '5" x 7" Photo (127 x 177.8 mm)', w: 127, h: 177.8 },
  '8x10': { name: '8" x 10" Photo (203.2 x 254 mm)', w: 203.2, h: 254 },
  a5: { name: 'A5 (148 x 210 mm)', w: 148, h: 210 },
  legal: { name: 'Legal (215.9 x 355.6 mm)', w: 215.9, h: 355.6 },
  letter: { name: 'Letter (215.9 x 279.4 mm)', w: 215.9, h: 279.4 }
}

export const PrintLayout: React.FC<PrintLayoutProps> = ({ showToast }) => {
  const [activePreset, setActivePreset] = useState<string>('a4')

  // Grid config
  const [config, setConfig] = useState<GridConfig>({
    name: 'Default A4 Grid',
    paperWidth: 210,
    paperHeight: 297,
    topMargin: 3,
    leftMargin: 3,
    rows: 7,
    columns: 6,
    rowGap: 2,
    colGap: 2,
    showGrid: true,
    showCutMarks: true
  })

  // Presets list from DB
  const [dbPresets, setDbPresets] = useState<any[]>([])
  const [newPresetName, setNewPresetName] = useState<string>('')

  // Uploaded images inventory
  const [uploadedImages, setUploadedImages] = useState<string[]>([]) // array of base64/dataURLs

  // Grid cells contents
  const [cells, setCells] = useState<Record<string, string>>({}) // key: row_col, value: img dataURL
  const [selectedCell, setSelectedCell] = useState<string | null>(null) // row_col being clicked
  const [showCellModal, setShowCellModal] = useState<boolean>(false)

  useEffect(() => {
    loadDatabasePresets()
  }, [])

  const loadDatabasePresets = async (): Promise<void> => {
    try {
      const presets = await window.api.getPresets()
      setDbPresets(presets)
    } catch (e) {
      console.error(e)
    }
  }

  // Auto Calculations
  // Cell Width = (Paper Width - Left Margin - Right Margin - (Cols - 1) * colGap) / Cols
  const calcCellWidth = (): number => {
    const { paperWidth, leftMargin, columns, colGap } = config
    const available = paperWidth - leftMargin * 2 - (columns - 1) * colGap
    return parseFloat(Math.max(1, available / columns).toFixed(1))
  }

  // Cell Height = (Paper Height - Top Margin - Bottom Margin - (Rows - 1) * rowGap) / Rows
  const calcCellHeight = (): number => {
    const { paperHeight, topMargin, rows, rowGap } = config
    const available = paperHeight - topMargin * 2 - (rows - 1) * rowGap
    return parseFloat(Math.max(1, available / rows).toFixed(1))
  }

  // Handle Preset Change
  const handlePresetSelect = (presetKey: string): void => {
    setActivePreset(presetKey)
    if (presetKey === 'custom') return

    const selected = PAPER_PRESETS[presetKey]
    if (selected) {
      setConfig((prev) => ({
        ...prev,
        paperWidth: selected.w,
        paperHeight: selected.h
      }))
    }
  }

  // Upload Photos to tray
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files) {
      Array.from(e.target.files).forEach((file: File) => {
        const reader = new FileReader()
        reader.onload = (): void => {
          setUploadedImages((prev) => [...prev, reader.result as string])
        }
        reader.readAsDataURL(file)
      })
      showToast('Loaded pictures into Tray', 'success')
    }
  }

  // Auto Fill Grid Cells
  const autoFillGrid = (imgSrc: string): void => {
    const newCells: Record<string, string> = {}
    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.columns; c++) {
        newCells[`${r}_${c}`] = imgSrc
      }
    }
    setCells(newCells)
    showToast('Grid populated with selected photo', 'info')
  }

  const setCellImage = (imgSrc: string): void => {
    if (selectedCell) {
      setCells((prev) => ({
        ...prev,
        [selectedCell]: imgSrc
      }))
      setShowCellModal(false)
      setSelectedCell(null)
    }
  }

  const clearCell = (cellKey: string): void => {
    setCells((prev) => {
      const copy = { ...prev }
      delete copy[cellKey]
      return copy
    })
  }

  const clearGrid = (): void => {
    setCells({})
    showToast('Grid cleared', 'info')
  }

  // Save Config Preset
  const saveCustomPreset = async (): Promise<void> => {
    if (!newPresetName.trim()) {
      showToast('Enter a name for the preset', 'warning')
      return
    }
    try {
      const newPreset = {
        id: Math.random().toString(36).substring(7),
        name: newPresetName,
        paperSize: activePreset,
        width: config.paperWidth,
        height: config.paperHeight,
        topMargin: config.topMargin,
        leftMargin: config.leftMargin,
        rows: config.rows,
        columns: config.columns,
        rowGap: config.rowGap,
        columnGap: config.colGap,
        showGrid: config.showGrid,
        showCutMarks: config.showCutMarks
      }

      await window.api.savePreset(newPreset)
      showToast('Preset saved to database', 'success')
      setNewPresetName('')
      loadDatabasePresets()
    } catch (e) {
      showToast('Failed to save preset', 'error')
    }
  }

  const deleteDatabasePreset = async (id: string): Promise<void> => {
    try {
      await window.api.deletePreset(id)
      showToast('Preset deleted', 'info')
      loadDatabasePresets()
    } catch (e) {
      showToast('Delete failed', 'error')
    }
  }

  const applyDatabasePreset = (preset: any): void => {
    setConfig({
      name: preset.name,
      paperWidth: preset.width,
      paperHeight: preset.height,
      topMargin: preset.topMargin,
      leftMargin: preset.leftMargin,
      rows: preset.rows,
      columns: preset.columns,
      rowGap: preset.rowGap,
      colGap: preset.columnGap,
      showGrid: preset.showGrid === 1 || preset.showGrid === true,
      showCutMarks: preset.showCutMarks === 1 || preset.showCutMarks === true
    })
    setActivePreset(preset.paperSize)
    showToast(`Applied preset: ${preset.name}`, 'info')
  }

  // Renders print layout HTML for compiler
  const generatePrintHtml = (): string => {
    const cellWidthMM = calcCellWidth()
    const cellHeightMM = calcCellHeight()
    const gridRows: React.ReactNode[] = []

    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.columns; c++) {
        const key = `${r}_${c}`
        const img = cells[key]
        gridRows.push(
          `<div class="print-cell ${config.showGrid ? 'grid-visible' : 'grid-hidden'}">
            ${img ? `<img src="${img}" />` : ''}
            ${config.showCutMarks ? '<div class="cut-mark-corner"></div>' : ''}
          </div>`
        )
      }
    }

    return `
      <html>
        <head>
          <style>
            @page {
              size: A4;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              background: #ffffff;
            }
            .print-area-wrapper {
              width: ${config.paperWidth}mm;
              height: ${config.paperHeight}mm;
              padding-top: ${config.topMargin}mm;
              padding-bottom: ${config.topMargin}mm;
              padding-left: ${config.leftMargin}mm;
              padding-right: ${config.leftMargin}mm;
              box-sizing: border-box;
              display: grid;
              grid-template-columns: repeat(${config.columns}, ${cellWidthMM}mm);
              grid-template-rows: repeat(${config.rows}, ${cellHeightMM}mm);
              row-gap: ${config.rowGap}mm;
              column-gap: ${config.colGap}mm;
            }
            .print-cell {
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
              position: relative;
              box-sizing: border-box;
              background-color: transparent;
            }
            .grid-visible {
              border: 0.25px solid #000000;
            }
            .grid-hidden {
              border: none;
            }
            .print-cell img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .cut-mark-corner {
              position: absolute;
              width: 4mm;
              height: 4mm;
              border: 0.2px solid #555555;
              pointer-events: none;
              opacity: 0.7;
            }
          </style>
        </head>
        <body>
          <div class="print-area-wrapper">
            ${gridRows.join('')}
          </div>
        </body>
      </html>
    `
  }

  // Save to PDF
  const savePdf = async (): Promise<void> => {
    try {
      const html = generatePrintHtml()
      showToast('Generating PDF output...', 'info')
      const response = await window.api.printToPDF(html, {
        pageSize: 'A4',
        landscape: config.paperWidth > config.paperHeight
      })

      if (response.success && response.data) {
        const defaultFolder = (await window.api.getSetting('defaultSaveFolder')) || ''
        const suggestedPath = defaultFolder
          ? `${defaultFolder}/print_layout_${Date.now()}.pdf`
          : `print_layout_${Date.now()}.pdf`

        const outPath = await window.api.selectSavePath({
          title: 'Save Print Grid Layout As',
          defaultPath: suggestedPath,
          filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
        })

        if (!outPath) {
          showToast('Save cancelled', 'info')
          return
        }

        const result = await window.api.saveFile(outPath, response.data)

        if (result.success) {
          const finalName = outPath.split(/[\\/]/).pop() || `print_layout_${Date.now()}.pdf`
          showToast(`PDF saved to: ${finalName}`, 'success')
          await window.api.addHistory({
            id: Math.random().toString(36).substring(7),
            timestamp: new Date().toISOString(),
            fileName: finalName,
            filePath: outPath,
            fileSize: Math.round((response.data.length * 3) / 4),
            operation: 'Custom Print Layout Grid',
            status: 'Success'
          })
        } else {
          showToast(`Failed to save: ${result.error}`, 'error')
        }
      } else {
        showToast(`PDF generation failed: ${response.error}`, 'error')
      }
    } catch (e: any) {
      showToast(`PDF error: ${e.message}`, 'error')
    }
  }

  // Print Layout
  const triggerPrint = async (): Promise<void> => {
    try {
      const html = generatePrintHtml()
      showToast('Sending layout to system printer...', 'info')
      const response = await window.api.printDirect(html)
      if (response.success) {
        showToast('Grid layout printed successfully', 'success')
      } else {
        showToast(`Print failed: ${response.error}`, 'error')
      }
    } catch (e: any) {
      showToast(`Printing failed: ${e.message}`, 'error')
    }
  }

  // Calculate widths for visual preview scaling
  const cellWidth = calcCellWidth()
  const cellHeight = calcCellHeight()

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '240px 1fr 340px',
        gap: '20px',
        height: 'calc(100% - 20px)'
      }}
    >
      {/* 1. Left Tray Panel */}
      <Card
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          height: '100%',
          overflowY: 'auto'
        }}
      >
        <h4 style={{ fontFamily: 'Outfit, sans-serif' }}>Photo Tray</h4>

        <button
          className="btn btn-secondary"
          onClick={(): void => document.getElementById('tray-picker')?.click()}
          style={{ width: '100%' }}
        >
          <Plus size={14} />
          Add Pictures
        </button>
        <input
          id="tray-picker"
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        {uploadedImages.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9c9a93',
              textAlign: 'center',
              padding: '12px'
            }}
          >
            <Upload size={32} style={{ opacity: 0.5, marginBottom: '8px' }} />
            <p style={{ fontSize: '11px', lineHeight: 1.4 }}>Load photos to fill cells.</p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '8px',
              overflowY: 'auto',
              flex: 1
            }}
          >
            {uploadedImages.map((src, idx) => (
              <div
                key={idx}
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px',
                  position: 'relative',
                  backgroundColor: 'var(--color-secondary)',
                  cursor: 'pointer'
                }}
                onClick={(): void => autoFillGrid(src)}
                title="Click to auto-fill entire grid"
              >
                <img
                  src={src}
                  alt="Tray item"
                  style={{ width: '100%', height: '70px', objectFit: 'cover', borderRadius: '2px' }}
                />
                <button
                  onClick={(e): void => {
                    e.stopPropagation()
                    setUploadedImages((prev) => prev.filter((_, i) => i !== idx))
                  }}
                  style={{
                    position: 'absolute',
                    top: '0px',
                    right: '0px',
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '14px',
                    height: '14px',
                    fontSize: '8px',
                    cursor: 'pointer'
                  }}
                >
                  X
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 2. Middle Visual Paper Grid Editor */}
      <div
        className="studio-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#eae9e5',
          overflow: 'auto',
          position: 'relative',
          padding: '24px'
        }}
      >
        <div
          style={{
            width: '380px',
            height: '537px', // Scaled aspect ratio of A4 (210 x 297 mm)
            backgroundColor: '#ffffff',
            boxShadow: 'var(--shadow-lg)',
            paddingTop: `${config.topMargin * 1.8}px`,
            paddingBottom: `${config.topMargin * 1.8}px`,
            paddingLeft: `${config.leftMargin * 1.8}px`,
            paddingRight: `${config.leftMargin * 1.8}px`,
            boxSizing: 'border-box',
            display: 'grid',
            gridTemplateColumns: `repeat(${config.columns}, 1fr)`,
            gridTemplateRows: `repeat(${config.rows}, 1fr)`,
            rowGap: `${config.rowGap * 1.8}px`,
            columnGap: `${config.colGap * 1.8}px`
          }}
        >
          {Array.from({ length: config.rows }).map((_, r) =>
            Array.from({ length: config.columns }).map((_, c) => {
              const cellKey = `${r}_${c}`
              const imgSrc = cells[cellKey]
              return (
                <div
                  key={cellKey}
                  style={{
                    border: config.showGrid ? '1.5px solid #000000' : '1px dashed #cccccc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative',
                    cursor: 'pointer',
                    backgroundColor: imgSrc ? 'transparent' : '#fcfcfa'
                  }}
                  onClick={(): void => {
                    setSelectedCell(cellKey)
                    setShowCellModal(true)
                  }}
                >
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt="Cell"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ fontSize: '9px', color: '#a09f98', fontWeight: 600 }}>
                      Empty
                    </span>
                  )}
                  {config.showCutMarks && (
                    <div
                      style={{
                        position: 'absolute',
                        width: '4px',
                        height: '4px',
                        border: '0.25px solid #555555',
                        pointerEvents: 'none',
                        top: 0,
                        left: 0
                      }}
                    />
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* 3. Right Configuration Settings Pane */}
      <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
        <h3 style={{ fontFamily: 'Outfit, sans-serif' }}>Grid Configuration</h3>

        {/* Paper Size Presets */}
        <div className="form-group">
          <label>Paper Size Preset</label>
          <select
            className="form-control form-select"
            value={activePreset}
            onChange={(e): void => handlePresetSelect(e.target.value)}
          >
            {Object.entries(PAPER_PRESETS).map(([key, val]) => (
              <option key={key} value={key}>
                {val.name}
              </option>
            ))}
            <option value="custom">Custom size...</option>
          </select>
        </div>

        {/* Paper width/height */}
        <div className="form-row">
          <div className="form-group">
            <label>Width (mm)</label>
            <input
              type="number"
              className="form-control"
              value={config.paperWidth}
              disabled={activePreset !== 'custom'}
              onChange={(e): void =>
                setConfig({ ...config, paperWidth: parseInt(e.target.value) || 0 })
              }
            />
          </div>
          <div className="form-group">
            <label>Height (mm)</label>
            <input
              type="number"
              className="form-control"
              value={config.paperHeight}
              disabled={activePreset !== 'custom'}
              onChange={(e): void =>
                setConfig({ ...config, paperHeight: parseInt(e.target.value) || 0 })
              }
            />
          </div>
        </div>

        {/* Margins */}
        <div className="form-row">
          <div className="form-group">
            <label>Top Margin (mm)</label>
            <input
              type="number"
              className="form-control"
              value={config.topMargin}
              onChange={(e): void =>
                setConfig({ ...config, topMargin: parseInt(e.target.value) || 0 })
              }
            />
          </div>
          <div className="form-group">
            <label>Left Margin (mm)</label>
            <input
              type="number"
              className="form-control"
              value={config.leftMargin}
              onChange={(e): void =>
                setConfig({ ...config, leftMargin: parseInt(e.target.value) || 0 })
              }
            />
          </div>
        </div>

        {/* Rows & Columns */}
        <div className="form-row">
          <div className="form-group">
            <label>Rows</label>
            <input
              type="number"
              className="form-control"
              min="1"
              max="20"
              value={config.rows}
              onChange={(e): void => setConfig({ ...config, rows: parseInt(e.target.value) || 1 })}
            />
          </div>
          <div className="form-group">
            <label>Columns</label>
            <input
              type="number"
              className="form-control"
              min="1"
              max="20"
              value={config.columns}
              onChange={(e): void =>
                setConfig({ ...config, columns: parseInt(e.target.value) || 1 })
              }
            />
          </div>
        </div>

        {/* Gaps */}
        <div className="form-row">
          <div className="form-group">
            <label>Row Gap (mm)</label>
            <input
              type="number"
              className="form-control"
              value={config.rowGap}
              onChange={(e): void =>
                setConfig({ ...config, rowGap: parseInt(e.target.value) || 0 })
              }
            />
          </div>
          <div className="form-group">
            <label>Col Gap (mm)</label>
            <input
              type="number"
              className="form-control"
              value={config.colGap}
              onChange={(e): void =>
                setConfig({ ...config, colGap: parseInt(e.target.value) || 0 })
              }
            />
          </div>
        </div>

        {/* Auto calculated dimensions panel */}
        <div
          style={{
            backgroundColor: 'var(--color-primary-light)',
            padding: '12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            color: 'var(--color-primary)',
            fontWeight: 600,
            display: 'flex',
            justifyContent: 'space-between'
          }}
        >
          <span>Calculated Width: {cellWidth} mm</span>
          <span>Calculated Height: {cellHeight} mm</span>
        </div>

        {/* Guides Checkboxes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            <input
              type="checkbox"
              checked={config.showGrid}
              onChange={(e): void => setConfig({ ...config, showGrid: e.target.checked })}
            />
            Show Grid Lines
          </label>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            <input
              type="checkbox"
              checked={config.showCutMarks}
              onChange={(e): void => setConfig({ ...config, showCutMarks: e.target.checked })}
            />
            Show Cut Marks
          </label>
        </div>

        <button className="btn btn-secondary" onClick={clearGrid} style={{ width: '100%' }}>
          Clear Layout Grid
        </button>

        {/* Save Preset Section */}
        <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />
        <h4 style={{ fontSize: '12px' }}>Save Layout Preset</h4>
        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Preset name..."
            style={{ flex: 1 }}
            value={newPresetName}
            onChange={(e): void => setNewPresetName(e.target.value)}
          />
          <button className="btn btn-primary btn-icon-only" onClick={saveCustomPreset}>
            <Save size={16} />
          </button>
        </div>

        {/* DB presets list */}
        {dbPresets.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
            <label
              style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}
            >
              Saved Presets:
            </label>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                maxHeight: '120px',
                overflowY: 'auto'
              }}
            >
              {dbPresets.map((preset) => (
                <div
                  key={preset.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    backgroundColor: 'var(--color-secondary)',
                    borderRadius: '4px',
                    fontSize: '11px'
                  }}
                >
                  <span
                    style={{ fontWeight: 500, cursor: 'pointer', flex: 1 }}
                    onClick={(): void => applyDatabasePreset(preset)}
                  >
                    {preset.name}
                  </span>
                  <button
                    onClick={(): Promise<void> => deleteDatabasePreset(preset.id)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--color-error)',
                      cursor: 'pointer'
                    }}
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

        {/* Output PDF/Print Actions */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={savePdf}>
            Save to PDF
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={triggerPrint}>
            <Printer size={14} />
            Print Grid
          </button>
        </div>
      </Card>

      {/* 4. Cell Selector Pop-up Modal */}
      <Modal
        isOpen={showCellModal}
        onClose={(): void => {
          setShowCellModal(false)
          setSelectedCell(null)
        }}
        title="Assign Photo to Grid Cell"
      >
        {uploadedImages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#9c9a93' }}>
            <p>Your Photo Tray is empty.</p>
            <p style={{ fontSize: '11px', marginTop: '4px' }}>
              Add pictures to the Tray first using the side button.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              Click any photo to assign it to cell:{' '}
              <span style={{ fontWeight: 600, color: 'var(--color-dark)' }}>{selectedCell}</span>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {uploadedImages.map((src, idx) => (
                <img
                  key={idx}
                  src={src}
                  alt="Selector item"
                  style={{
                    width: '100%',
                    height: '80px',
                    objectFit: 'cover',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer'
                  }}
                  onClick={(): void => setCellImage(src)}
                />
              ))}
            </div>
            {selectedCell && cells[selectedCell] && (
              <button
                className="btn btn-danger"
                style={{ width: '100%', marginTop: '10px' }}
                onClick={(): void => {
                  clearCell(selectedCell!)
                  setShowCellModal(false)
                  setSelectedCell(null)
                }}
              >
                Clear Cell Photo
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

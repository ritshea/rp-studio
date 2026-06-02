import React, { useState, useRef } from 'react'
import { Card } from '../components/Card'
import {
  Upload,
  Printer,
  Download,
  Trash2,
  RefreshCw
} from 'lucide-react'

interface PassportPhotoProps {
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void
}

interface TemplatePreset {
  name: string
  widthMM: number
  heightMM: number
}

const TEMPLATES: Record<string, TemplatePreset> = {
  india: { name: 'India Passport (3.5 x 4.5 cm)', widthMM: 35, heightMM: 45 },
  visa: { name: 'Visa Photo (2 x 2 inch / 5.1 x 5.1 cm)', widthMM: 51, heightMM: 51 },
  pan: { name: 'PAN Card (2.5 x 3.5 cm)', widthMM: 25, heightMM: 35 },
  aadhaar: { name: 'Aadhaar (5.0 x 8.0 cm)', widthMM: 50, heightMM: 80 },
  dl: { name: 'Driving License (2.5 x 3.5 cm)', widthMM: 25, heightMM: 35 },
  custom: { name: 'Custom size...', widthMM: 35, heightMM: 45 }
}

export const PassportPhoto: React.FC<PassportPhotoProps> = ({ showToast }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('india')
  const [customW, setCustomW] = useState<number>(35)
  const [customH, setCustomH] = useState<number>(45)
  
  // Image states
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [zoom, setZoom] = useState<number>(100)
  const [posX, setPosX] = useState<number>(0)
  const [posY, setPosY] = useState<number>(0)
  const [brightness, setBrightness] = useState<number>(100)
  const [contrast, setContrast] = useState<number>(100)
  const [selectedBg, setSelectedBg] = useState<string>('none') // 'none', '#ffffff', '#3b82f6', '#dcdbd5'
  const [borderWidth, setBorderWidth] = useState<number>(1) // in px
  const [borderColor, setBorderColor] = useState<string>('#000000')

  // Dragging state
  const isDragging = useRef<boolean>(false)
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  
  // Compiler State
  const [compiledSheet, setCompiledSheet] = useState<string | null>(null) // base64 of generated sheet
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const workspaceImage = useRef<HTMLImageElement | null>(null)

  // Get active dimensions
  const getActiveDims = (): { w: number; h: number } => {
    if (selectedTemplate === 'custom') {
      return { w: customW, h: customH }
    }
    const preset = TEMPLATES[selectedTemplate]
    return { w: preset.widthMM, h: preset.heightMM }
  }

  // Handle image upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.onload = (): void => {
        const img = new Image()
        img.onload = (): void => {
          setImageSrc(reader.result as string)
          setZoom(100)
          setPosX(0)
          setPosY(0)
          setBrightness(100)
          setContrast(100)
          setSelectedBg('none')
          setBorderWidth(1)
          setCompiledSheet(null)
          showToast(`Portrait loaded successfully`, 'success')
        }
        img.src = reader.result as string
      }
      reader.readAsDataURL(file)
    }
  }

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent): void => {
    if (!imageSrc) return
    isDragging.current = true
    dragStart.current = { x: e.clientX - posX, y: e.clientY - posY }
  }

  const handleMouseMove = (e: React.MouseEvent): void => {
    if (!isDragging.current) return
    setPosX(e.clientX - dragStart.current.x)
    setPosY(e.clientY - dragStart.current.y)
  }

  const handleMouseUp = (): void => {
    isDragging.current = false
  }

  // Compile A4 printable page with passport photos
  const compilePrintSheet = async (): Promise<void> => {
    const canvas = canvasRef.current
    const img = workspaceImage.current
    if (!canvas || !img) return

    try {
      showToast('Generating printable A4 grid layout...', 'info')
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Set canvas to A4 dimensions in high-resolution (300 DPI)
      // A4 = 210mm x 297mm
      // 300 DPI = 11.81 pixels/mm
      const dpiScale = 11.81
      canvas.width = Math.round(210 * dpiScale)  // 2480 px
      canvas.height = Math.round(297 * dpiScale) // 3508 px

      // Clear Canvas
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // 1. Generate the single passport photo layout in high resolution
      const dims = getActiveDims()
      const pWidth = Math.round(dims.w * dpiScale)
      const pHeight = Math.round(dims.h * dpiScale)

      const passCanvas = document.createElement('canvas')
      passCanvas.width = pWidth
      passCanvas.height = pHeight
      const passCtx = passCanvas.getContext('2d')

      if (passCtx) {
        passCtx.fillStyle = selectedBg === 'none' ? '#ffffff' : selectedBg
        passCtx.fillRect(0, 0, pWidth, pHeight)

        // Apply filters
        passCtx.filter = `brightness(${brightness}%) contrast(${contrast}%)`

        // Draw cropped portrait based on zoom, posX, posY
        const zoomScale = zoom / 100
        const dw = img.naturalWidth * zoomScale
        const dh = img.naturalHeight * zoomScale
        
        // Translate center of cropping box to align correctly
        const dx = (pWidth / 2) + (posX * dpiScale / 5) - (dw / 2)
        const dy = (pHeight / 2) + (posY * dpiScale / 5) - (dh / 2)

        passCtx.drawImage(img, dx, dy, dw, dh)

        // Draw solid border
        if (borderWidth > 0) {
          passCtx.filter = 'none' // Reset filter for border
          passCtx.strokeStyle = borderColor
          passCtx.lineWidth = borderWidth * dpiScale / 2
          passCtx.strokeRect(0, 0, pWidth, pHeight)
        }
      }

      // 2. Render Single passport layout in rows and columns
      const topMargin = Math.round(10 * dpiScale) // 10mm
      const leftMargin = Math.round(10 * dpiScale) // 10mm
      const colGap = Math.round(4 * dpiScale) // 4mm
      const rowGap = Math.round(4 * dpiScale) // 4mm

      const columns = Math.floor((canvas.width - leftMargin * 2 + colGap) / (pWidth + colGap))
      const rows = Math.floor((canvas.height - topMargin * 2 + rowGap) / (pHeight + rowGap))

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
          const x = leftMargin + c * (pWidth + colGap)
          const y = topMargin + r * (pHeight + rowGap)
          
          // Draw passport cell
          ctx.drawImage(passCanvas, x, y, pWidth, pHeight)

          // Draw cut marks around grid cells
          ctx.strokeStyle = '#cccccc'
          ctx.lineWidth = 1
          ctx.beginPath()
          // Top Left marks
          ctx.moveTo(x - 4, y)
          ctx.lineTo(x + 4, y)
          ctx.moveTo(x, y - 4)
          ctx.lineTo(x, y + 4)
          ctx.stroke()
        }
      }

      const base64Sheet = canvas.toDataURL('image/jpeg', 0.95)
      setCompiledSheet(base64Sheet)
      showToast('A4 sheet compiled successfully!', 'success')
    } catch (e: any) {
      showToast(`Compilation failed: ${e.message}`, 'error')
    }
  }

  const savePrintSheet = async (): Promise<void> => {
    if (!compiledSheet) return
    try {
      const defaultFolder = await window.api.getSetting('defaultSaveFolder')
      const outPath = `${defaultFolder}/passport_sheet_${Date.now()}.jpg`
      const result = await window.api.saveFile(outPath, compiledSheet)
      if (result.success) {
        showToast(`Compiled A4 sheet saved to ${outPath}`, 'success')
        
        // Add to history
        await window.api.addHistory({
          id: Math.random().toString(36).substring(7),
          timestamp: new Date().toISOString(),
          fileName: `passport_sheet_${Date.now()}.jpg`,
          filePath: outPath,
          fileSize: Math.round((compiledSheet.length * 3) / 4),
          operation: 'Passport Photo Grid Layout',
          status: 'Success'
        })
      } else {
        showToast(`Save failed: ${result.error}`, 'error')
      }
    } catch (e: any) {
      showToast(`Save error: ${e.message}`, 'error')
    }
  }

  const printPrintSheet = async (): Promise<void> => {
    if (!compiledSheet) return
    try {
      showToast('Sending compiled sheet to printing queue...', 'info')
      const html = `
        <html>
          <body style="margin: 0; padding: 0;">
            <img src="${compiledSheet}" style="width: 210mm; height: 297mm; display: block;" />
          </body>
        </html>
      `
      const result = await window.api.printDirect(html)
      if (result.success) {
        showToast('Document sent to print queue', 'success')
      } else {
        showToast(`Print failed: ${result.error}`, 'error')
      }
    } catch (e: any) {
      showToast(`Print error: ${e.message}`, 'error')
    }
  }

  // Active Dimensions
  const dims = getActiveDims()
  const aspect = dims.w / dims.h

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
      {!imageSrc ? (
        <Card
          className="dropzone"
          style={{ height: '70vh' }}
          onClick={(): void => document.getElementById('portrait-picker')?.click()}
        >
          <Upload className="dropzone-icon" />
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Import Portrait Photo</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
            Choose a centered portrait with clean background for best results
          </p>
          <input
            id="portrait-picker"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', height: '100%', alignItems: 'stretch' }}>
          {/* Main workspace Canvas */}
          <div
            className="studio-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#eae9e5',
              position: 'relative',
              overflow: 'hidden',
              minHeight: '450px'
            }}
          >
            {/* Template overlay guide */}
            <div
              style={{
                width: `${aspect * 350}px`,
                height: '350px',
                border: '3px solid var(--color-primary)',
                boxShadow: '0 0 0 999px rgba(0, 0, 0, 0.5)',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'move',
                borderRadius: '2px',
                zIndex: 2,
                backgroundColor: selectedBg === 'none' ? 'transparent' : selectedBg
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Loaded Image */}
              <img
                ref={workspaceImage}
                src={imageSrc}
                alt="Portrait workspace"
                style={{
                  transform: `translate(${posX}px, ${posY}px) scale(${zoom / 100})`,
                  transformOrigin: 'center',
                  filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  maxWidth: '100%',
                  pointerEvents: 'none'
                }}
              />
            </div>

            <div
              style={{
                position: 'absolute',
                bottom: '12px',
                left: '12px',
                fontSize: '11px',
                color: 'white',
                backgroundColor: 'rgba(12, 12, 11, 0.7)',
                padding: '4px 10px',
                borderRadius: '4px',
                zIndex: 5
              }}
            >
              Zoom: {zoom}% | Offset: {posX}px, {posY}px
            </div>

            <button
              className="btn btn-danger btn-icon-only"
              onClick={(): void => setImageSrc(null)}
              style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 5 }}
            >
              <Trash2 size={16} />
            </button>
          </div>

          {/* Settings / Compilation Pane */}
          <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif' }}>Controls</h3>

            {/* Template preset selection */}
            <div className="form-group">
              <label>Select Template Preset</label>
              <select
                className="form-control form-select"
                value={selectedTemplate}
                onChange={(e): void => setSelectedTemplate(e.target.value)}
              >
                {Object.entries(TEMPLATES).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedTemplate === 'custom' && (
              <div className="form-row">
                <div className="form-group">
                  <label>Width (mm)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={customW}
                    onChange={(e): void => setCustomW(parseInt(e.target.value) || 35)}
                  />
                </div>
                <div className="form-group">
                  <label>Height (mm)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={customH}
                    onChange={(e): void => setCustomH(parseInt(e.target.value) || 45)}
                  />
                </div>
              </div>
            )}

            {/* Sliders */}
            <div className="form-group">
              <label>Face Alignment Zoom</label>
              <input
                type="range"
                min="20"
                max="300"
                value={zoom}
                onChange={(e): void => setZoom(parseInt(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label>Brightness ({brightness}%)</label>
              <input
                type="range"
                min="50"
                max="150"
                value={brightness}
                onChange={(e): void => setBrightness(parseInt(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label>Contrast ({contrast}%)</label>
              <input
                type="range"
                min="50"
                max="150"
                value={contrast}
                onChange={(e): void => setContrast(parseInt(e.target.value))}
              />
            </div>

            {/* Background swap */}
            <div className="form-group">
              <label>Background Color Fill</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { value: 'none', label: 'None' },
                  { value: '#ffffff', label: 'White' },
                  { value: '#3b82f6', label: 'Blue' },
                  { value: '#dcdbd5', label: 'Gray' }
                ].map((bgItem) => (
                  <button
                    key={bgItem.value}
                    className={`btn ${selectedBg === bgItem.value ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '4px', fontSize: '11px' }}
                    onClick={(): void => setSelectedBg(bgItem.value)}
                  >
                    {bgItem.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Border control */}
            <div className="form-row">
              <div className="form-group">
                <label>Border (px)</label>
                <input
                  type="number"
                  className="form-control"
                  value={borderWidth}
                  onChange={(e): void => setBorderWidth(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="form-group">
                <label>Border Color</label>
                <input
                  type="color"
                  className="form-control"
                  style={{ padding: '2px', height: '36px', cursor: 'pointer' }}
                  value={borderColor}
                  onChange={(e): void => setBorderColor(e.target.value)}
                />
              </div>
            </div>

            <button className="btn btn-primary" onClick={compilePrintSheet} style={{ width: '100%', marginTop: '8px' }}>
              <RefreshCw size={14} />
              Generate A4 Sheet Grid
            </button>

            {compiledSheet && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                <h4 style={{ fontSize: '12px' }}>A4 Layout Ready</h4>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={savePrintSheet}>
                    <Download size={14} />
                    Save File
                  </button>
                  <button className="btn btn-secondary btn-primary" style={{ flex: 1 }} onClick={printPrintSheet}>
                    <Printer size={14} />
                    Print
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Hidden compilation canvas */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

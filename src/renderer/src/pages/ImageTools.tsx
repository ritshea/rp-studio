import React, { useState, useRef, useEffect } from 'react'
import { Card } from '../components/Card'
import {
  Upload,
  Crop,
  RotateCw,
  Trash2,
  Download,
  Scissors
} from 'lucide-react'

interface ImageToolsProps {
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void
}

export const ImageTools: React.FC<ImageToolsProps> = ({ showToast }) => {
  const [fileInfo, setFileInfo] = useState<{ name: string; size: number; path: string } | null>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'transform' | 'background' | 'watermark' | 'export'>('transform')
  
  // Transform State
  const [resizeWidth, setResizeWidth] = useState<number>(0)
  const [resizeHeight, setResizeHeight] = useState<number>(0)
  const [maintainAspect, setMaintainAspect] = useState<boolean>(true)
  const [rotation, setRotation] = useState<number>(0)
  const [flipH, setFlipH] = useState<boolean>(false)
  const [flipV, setFlipV] = useState<boolean>(false)

  // Crop State
  const [isCropping, setIsCropping] = useState<boolean>(false)
  const [cropBox, setCropBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const isDraggingCrop = useRef<boolean>(false)
  const dragStartPos = useRef<{ x: number; y: number } | null>(null)
  const dragHandle = useRef<string | null>(null) // 'box' or 'tl', 'tr', 'bl', 'br'
  
  // Background Removal State
  const [bgColorKey, setBgColorKey] = useState<{ r: number; g: number; b: number } | null>(null)
  const [tolerance, setTolerance] = useState<number>(30)
  const [isSamplingBg, setIsSamplingBg] = useState<boolean>(false)
  
  // Watermark State
  const [watermarkText, setWatermarkText] = useState<string>('')
  const [watermarkColor, setWatermarkColor] = useState<string>('#ffffff')
  const [watermarkSize, setWatermarkSize] = useState<number>(32)
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(50)
  const [watermarkPos, setWatermarkPos] = useState<'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('bottom-right')
  
  // Export State
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg' | 'webp'>('png')
  const [targetSizePreset, setTargetSizePreset] = useState<'none' | '50' | '100' | '200' | '500' | '1000' | 'custom'>('none')
  const [customTargetSize, setCustomTargetSize] = useState<string>('') // in KB
  const [stripMetadata, setStripMetadata] = useState<boolean>(true)
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const originalImage = useRef<HTMLImageElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent): Promise<void> => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      await loadImageFile(file)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      await loadImageFile(file)
    }
  }

  const loadImageFile = (file: File): Promise<void> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (): void => {
        const img = new Image()
        img.onload = (): void => {
          originalImage.current = img
          setImageSrc(reader.result as string)
          setResizeWidth(img.naturalWidth)
          setResizeHeight(img.naturalHeight)
          setFileInfo({
            name: file.name,
            size: file.size,
            path: (file as any).path || ''
          })
          resetSettings()
          showToast(`Loaded ${file.name} successfully`, 'success')
          resolve()
        }
        img.src = reader.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  const resetSettings = (): void => {
    setRotation(0)
    setFlipH(false)
    setFlipV(false)
    setBgColorKey(null)
    setWatermarkText('')
    setIsCropping(false)
    setCropBox(null)
  }

  // Draw image on canvas with all active filters
  const drawImageOnCanvas = (): void => {
    const canvas = canvasRef.current
    const img = originalImage.current
    if (!canvas || !img) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Calculate dimensions based on rotations
    const isRotated90 = rotation === 90 || rotation === 270
    const w = resizeWidth || img.naturalWidth
    const h = resizeHeight || img.naturalHeight

    canvas.width = isRotated90 ? h : w
    canvas.height = isRotated90 ? w : h

    ctx.save()

    // 1. Translate & Rotate
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((rotation * Math.PI) / 180)

    // 2. Flip Scale
    const scaleH = flipH ? -1 : 1
    const scaleV = flipV ? -1 : 1
    ctx.scale(scaleH, scaleV)

    // Draw original image centered
    ctx.drawImage(img, -w / 2, -h / 2, w, h)

    ctx.restore()

    // 3. Background removal filter
    if (bgColorKey) {
      removeBackgroundKeyColor(canvas, ctx)
    }

    // 4. Draw Watermark
    if (watermarkText) {
      applyWatermarkText(canvas, ctx)
    }

    // 5. Draw Crop Guide Overlay (non-destructive visual only)
    if (isCropping && cropBox) {
      drawCropOverlay(ctx, canvas.width, canvas.height)
    }
  }

  const removeBackgroundKeyColor = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void => {
    if (!bgColorKey) return
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imgData.data
    const { r: tr, g: tg, b: tb } = bgColorKey

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      
      const dist = Math.sqrt((r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2)
      if (dist < tolerance) {
        data[i + 3] = 0 // Transparent
      }
    }
    ctx.putImageData(imgData, 0, 0)
  }

  const applyWatermarkText = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void => {
    ctx.save()
    ctx.font = `bold ${watermarkSize}px var(--font-family)`
    ctx.fillStyle = watermarkColor
    ctx.globalAlpha = watermarkOpacity / 100
    ctx.textBaseline = 'middle'

    const metrics = ctx.measureText(watermarkText)
    const textWidth = metrics.width
    const textHeight = watermarkSize

    let x = 20
    let y = 20

    switch (watermarkPos) {
      case 'center':
        x = canvas.width / 2 - textWidth / 2
        y = canvas.height / 2
        break
      case 'top-left':
        x = 20
        y = 20 + textHeight / 2
        break
      case 'top-right':
        x = canvas.width - textWidth - 20
        y = 20 + textHeight / 2
        break
      case 'bottom-left':
        x = 20
        y = canvas.height - textHeight / 2 - 20
        break
      case 'bottom-right':
      default:
        x = canvas.width - textWidth - 20
        y = canvas.height - textHeight / 2 - 20
        break
    }

    ctx.fillText(watermarkText, x, y)
    ctx.restore()
  }

  const drawCropOverlay = (ctx: CanvasRenderingContext2D, cw: number, ch: number): void => {
    if (!cropBox) return
    const { x, y, w, h } = cropBox

    // Dim background outside crop box
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
    // Top
    ctx.fillRect(0, 0, cw, y)
    // Bottom
    ctx.fillRect(0, y + h, cw, ch - (y + h))
    // Left
    ctx.fillRect(0, y, x, h)
    // Right
    ctx.fillRect(x + w, y, cw - (x + w), h)

    // Draw borders of crop box
    ctx.strokeStyle = 'var(--color-primary)'
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, w, h)

    // Draw handles
    ctx.fillStyle = '#ffffff'
    const hs = 8 // Handle size
    ctx.fillRect(x - hs/2, y - hs/2, hs, hs) // TL
    ctx.fillRect(x + w - hs/2, y - hs/2, hs, hs) // TR
    ctx.fillRect(x - hs/2, y + h - hs/2, hs, hs) // BL
    ctx.fillRect(x + w - hs/2, y + h - hs/2, hs, hs) // BR
  }

  useEffect(() => {
    if (imageSrc) {
      drawImageOnCanvas()
    }
  }, [
    imageSrc,
    resizeWidth,
    resizeHeight,
    rotation,
    flipH,
    flipV,
    bgColorKey,
    tolerance,
    watermarkText,
    watermarkColor,
    watermarkSize,
    watermarkOpacity,
    watermarkPos,
    isCropping,
    cropBox
  ])

  // Canvas interaction (color picking / crop resize)
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const clientX = (e.clientX - rect.left) * scaleX
    const clientY = (e.clientY - rect.top) * scaleY

    // 1. Sampling Background color
    if (isSamplingBg) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const pixel = ctx.getImageData(clientX, clientY, 1, 1).data
        setBgColorKey({ r: pixel[0], g: pixel[1], b: pixel[2] })
        setIsSamplingBg(false)
        showToast('Color sampled for background removal', 'info')
      }
      return
    }

    // 2. Crop logic dragging
    if (isCropping && cropBox) {
      const hs = 12 // handle match size
      const { x, y, w, h } = cropBox

      // Check handle clicks
      if (Math.abs(clientX - x) < hs && Math.abs(clientY - y) < hs) {
        dragHandle.current = 'tl'
      } else if (Math.abs(clientX - (x + w)) < hs && Math.abs(clientY - y) < hs) {
        dragHandle.current = 'tr'
      } else if (Math.abs(clientX - x) < hs && Math.abs(clientY - (y + h)) < hs) {
        dragHandle.current = 'bl'
      } else if (Math.abs(clientX - (x + w)) < hs && Math.abs(clientY - (y + h)) < hs) {
        dragHandle.current = 'br'
      } else if (clientX >= x && clientX <= x + w && clientY >= y && clientY <= y + h) {
        dragHandle.current = 'box'
      } else {
        dragHandle.current = null
      }

      if (dragHandle.current) {
        isDraggingCrop.current = true
        dragStartPos.current = { x: clientX, y: clientY }
      }
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    const canvas = canvasRef.current
    if (!canvas || !isCropping || !cropBox || !isDraggingCrop.current || !dragStartPos.current) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const clientX = (e.clientX - rect.left) * scaleX
    const clientY = (e.clientY - rect.top) * scaleY

    const dx = clientX - dragStartPos.current.x
    const dy = clientY - dragStartPos.current.y

    let { x, y, w, h } = cropBox

    if (dragHandle.current === 'box') {
      x = Math.max(0, Math.min(canvas.width - w, x + dx))
      y = Math.max(0, Math.min(canvas.height - h, y + dy))
    } else if (dragHandle.current === 'tl') {
      const newX = Math.max(0, Math.min(x + w - 10, x + dx))
      const newY = Math.max(0, Math.min(y + h - 10, y + dy))
      w = w + (x - newX)
      h = h + (y - newY)
      x = newX
      y = newY
    } else if (dragHandle.current === 'tr') {
      w = Math.max(10, Math.min(canvas.width - x, w + dx))
      const newY = Math.max(0, Math.min(y + h - 10, y + dy))
      h = h + (y - newY)
      y = newY
    } else if (dragHandle.current === 'bl') {
      const newX = Math.max(0, Math.min(x + w - 10, x + dx))
      w = w + (x - newX)
      x = newX
      h = Math.max(10, Math.min(canvas.height - y, h + dy))
    } else if (dragHandle.current === 'br') {
      w = Math.max(10, Math.min(canvas.width - x, w + dx))
      h = Math.max(10, Math.min(canvas.height - y, h + dy))
    }

    setCropBox({ x, y, w, h })
    dragStartPos.current = { x: clientX, y: clientY }
  }

  const handleCanvasMouseUp = (): void => {
    isDraggingCrop.current = false
    dragStartPos.current = null
    dragHandle.current = null
  }

  const startCropMode = (): void => {
    const canvas = canvasRef.current
    if (!canvas) return
    setIsCropping(true)
    setCropBox({
      x: canvas.width * 0.1,
      y: canvas.height * 0.1,
      w: canvas.width * 0.8,
      h: canvas.height * 0.8
    })
  }

  const applyCrop = (): void => {
    const canvas = canvasRef.current
    if (!canvas || !cropBox) return

    const { x, y, w, h } = cropBox

    // Create a temporary canvas to hold cropped content
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = w
    tempCanvas.height = h
    const tempCtx = tempCanvas.getContext('2d')

    if (tempCtx) {
      // Draw cropped section from main canvas
      tempCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h)

      // Replace main canvas content by setting originalImage to this cropped output
      const croppedImg = new Image()
      croppedImg.onload = (): void => {
        originalImage.current = croppedImg
        setResizeWidth(w)
        setResizeHeight(h)
        setIsCropping(false)
        setCropBox(null)
        showToast('Image cropped successfully', 'success')
      }
      croppedImg.src = tempCanvas.toDataURL()
    }
  }

  const rotateImage = (): void => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const executeTargetCompression = async (canvas: HTMLCanvasElement, targetKB: number): Promise<string> => {
    let quality = 0.95
    let dataUrl = canvas.toDataURL(`image/${exportFormat}`, quality)
    let size = Math.round((dataUrl.length * 3) / 4) / 1024 // base64 estimate

    // Recursively reduce quality
    while (size > targetKB && quality > 0.1) {
      quality -= 0.05
      dataUrl = canvas.toDataURL(`image/${exportFormat}`, quality)
      size = Math.round((dataUrl.length * 3) / 4) / 1024
    }

    // If still too large, downscale canvas
    if (size > targetKB) {
      let scale = 0.9
      const tempCanvas = document.createElement('canvas')
      while (size > targetKB && scale > 0.1) {
        tempCanvas.width = canvas.width * scale
        tempCanvas.height = canvas.height * scale
        const tempCtx = tempCanvas.getContext('2d')
        if (tempCtx) {
          tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height)
          dataUrl = tempCanvas.toDataURL(`image/${exportFormat}`, 0.7)
          size = Math.round((dataUrl.length * 3) / 4) / 1024
        }
        scale -= 0.1
      }
    }
    return dataUrl
  }

  const exportImage = async (): Promise<void> => {
    const canvas = canvasRef.current
    if (!canvas || !fileInfo) return

    try {
      const defaultFolder = await window.api.getSetting('defaultSaveFolder')
      if (!defaultFolder) {
        showToast('Default folder not set. Please set in Settings tab.', 'error')
        return
      }

      let exportDataUrl = canvas.toDataURL(`image/${exportFormat}`, 0.9)

      // Calculate Target Size if selected
      let targetKB = 0
      if (targetSizePreset !== 'none') {
        if (targetSizePreset === 'custom') {
          targetKB = parseInt(customTargetSize) || 0
        } else {
          targetKB = parseInt(targetSizePreset)
        }
      }

      if (targetKB > 0) {
        showToast(`Optimizing output to meet target size of ${targetKB} KB...`, 'info')
        exportDataUrl = await executeTargetCompression(canvas, targetKB)
      }

      // Generate filename
      const baseName = fileInfo.name.substring(0, fileInfo.name.lastIndexOf('.'))
      const suggestedPath = `${defaultFolder}/${baseName}_edit.${exportFormat}`

      const outPath = await window.api.selectSavePath({
        title: 'Export & Save Image As',
        defaultPath: suggestedPath,
        filters: [{ name: 'Images', extensions: [exportFormat] }]
      })

      if (!outPath) {
        showToast('Export cancelled', 'info')
        return
      }

      const result = await window.api.saveFile(outPath, exportDataUrl)
      if (result.success) {
        const finalName = outPath.split(/[\\/]/).pop() || `${baseName}_edit.${exportFormat}`
        showToast(`Saved successfully to ${finalName}`, 'success')
        
        // Add to history
        const bytes = Math.round((exportDataUrl.length * 3) / 4)
        await window.api.addHistory({
          id: Math.random().toString(36).substring(7),
          timestamp: new Date().toISOString(),
          fileName: finalName,
          filePath: outPath,
          fileSize: bytes,
          operation: 'Image Tool Edit',
          status: 'Success'
        })
      } else {
        showToast(`Export failed: ${result.error}`, 'error')
      }
    } catch (e: any) {
      showToast(`Export error: ${e.message}`, 'error')
    }
  }

  const clearWorkspace = (): void => {
    setFileInfo(null)
    setImageSrc(null)
    originalImage.current = null
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: 'calc(100% - 20px)' }}>
      {!imageSrc ? (
        <Card
          className="dropzone"
          style={{ height: '70vh' }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={(): void => document.getElementById('image-picker')?.click()}
        >
          <Upload className="dropzone-icon" />
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Drag & Drop Image</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
            Supports JPG, PNG, WEBP, BMP formats
          </p>
          <input
            id="image-picker"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          <button className="btn btn-primary" style={{ marginTop: '12px' }}>
            Choose File
          </button>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', height: '100%', alignItems: 'stretch' }}>
          {/* Main workspace canvas */}
          <div
            ref={containerRef}
            className="studio-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#eae9e5',
              position: 'relative',
              overflow: 'auto',
              minHeight: '400px'
            }}
          >
            {/* Top Toolbar */}
            <div
              style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                display: 'flex',
                gap: '8px',
                zIndex: 5
              }}
            >
              <button
                className={`btn btn-secondary ${isCropping ? 'btn-primary' : ''}`}
                onClick={isCropping ? applyCrop : startCropMode}
              >
                <Crop size={16} />
                {isCropping ? 'Apply Crop' : 'Crop'}
              </button>
              {isCropping && (
                <button
                  className="btn btn-secondary"
                  onClick={(): void => {
                    setIsCropping(false)
                    setCropBox(null)
                  }}
                >
                  Cancel
                </button>
              )}
              <button className="btn btn-secondary" onClick={rotateImage}>
                <RotateCw size={16} />
                Rotate 90°
              </button>
            </div>

            <div
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                zIndex: 5
              }}
            >
              <button className="btn btn-danger btn-icon-only" onClick={clearWorkspace}>
                <Trash2 size={16} />
              </button>
            </div>

            {/* Canvas */}
            <canvas
              ref={canvasRef}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              style={{
                maxWidth: '90%',
                maxHeight: '90%',
                boxShadow: 'var(--shadow-lg)',
                backgroundColor: 'white',
                backgroundImage: 'linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                cursor: isSamplingBg ? 'crosshair' : isCropping ? 'default' : 'grab'
              }}
            />
          </div>

          {/* Right settings pane */}
          <Card style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
            <div className="tab-navigation" style={{ marginBottom: '10px' }}>
              <button
                className={`tab-btn ${activeTab === 'transform' ? 'active' : ''}`}
                onClick={(): void => setActiveTab('transform')}
              >
                Transform
              </button>
              <button
                className={`tab-btn ${activeTab === 'background' ? 'active' : ''}`}
                onClick={(): void => setActiveTab('background')}
              >
                BG Clean
              </button>
              <button
                className={`tab-btn ${activeTab === 'watermark' ? 'active' : ''}`}
                onClick={(): void => setActiveTab('watermark')}
              >
                Mark
              </button>
              <button
                className={`tab-btn ${activeTab === 'export' ? 'active' : ''}`}
                onClick={(): void => setActiveTab('export')}
              >
                Save
              </button>
            </div>

            {/* Content Tabs */}
            {activeTab === 'transform' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h4 style={{ fontSize: '13px' }}>Dimensions (Resize)</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Width (px)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={resizeWidth}
                      onChange={(e): void => {
                        const val = parseInt(e.target.value) || 0
                        setResizeWidth(val)
                        if (maintainAspect && originalImage.current) {
                          const aspect = originalImage.current.naturalHeight / originalImage.current.naturalWidth
                          setResizeHeight(Math.round(val * aspect))
                        }
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Height (px)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={resizeHeight}
                      onChange={(e): void => {
                        const val = parseInt(e.target.value) || 0
                        setResizeHeight(val)
                        if (maintainAspect && originalImage.current) {
                          const aspect = originalImage.current.naturalWidth / originalImage.current.naturalHeight
                          setResizeWidth(Math.round(val * aspect))
                        }
                      }}
                    />
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={maintainAspect}
                    onChange={(e): void => setMaintainAspect(e.target.checked)}
                  />
                  Lock Aspect Ratio
                </label>

                <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '8px 0' }} />

                <h4 style={{ fontSize: '13px' }}>Flipping</h4>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className={`btn btn-secondary ${flipH ? 'btn-primary' : ''}`}
                    style={{ flex: 1 }}
                    onClick={(): void => setFlipH(!flipH)}
                  >
                    Flip Horizontal
                  </button>
                  <button
                    className={`btn btn-secondary ${flipV ? 'btn-primary' : ''}`}
                    style={{ flex: 1 }}
                    onClick={(): void => setFlipV(!flipV)}
                  >
                    Flip Vertical
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'background' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h4 style={{ fontSize: '13px' }}>Chroma Key Background Eraser</h4>
                <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                  Select background sampling tool, then click on the color inside preview canvas to make it transparent.
                </p>

                <button
                  className={`btn ${isSamplingBg ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={(): void => setIsSamplingBg(!isSamplingBg)}
                >
                  <Scissors size={14} />
                  {isSamplingBg ? 'Click on Canvas Color...' : 'Sample Background Color'}
                </button>

                {bgColorKey && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '12px' }}>Sampled Color:</div>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        border: '1px solid var(--color-border)',
                        backgroundColor: `rgb(${bgColorKey.r}, ${bgColorKey.g}, ${bgColorKey.b})`
                      }}
                    />
                    <button
                      className="btn btn-secondary btn-icon-only"
                      onClick={(): void => setBgColorKey(null)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}

                <div className="form-group">
                  <label>Erase Tolerance: {tolerance}</label>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={tolerance}
                    onChange={(e): void => setTolerance(parseInt(e.target.value))}
                  />
                </div>
              </div>
            )}

            {activeTab === 'watermark' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h4 style={{ fontSize: '13px' }}>Text Watermark Overlay</h4>
                <div className="form-group">
                  <label>Watermark Text</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter text..."
                    value={watermarkText}
                    onChange={(e): void => setWatermarkText(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Color</label>
                    <input
                      type="color"
                      className="form-control"
                      style={{ padding: '2px', height: '36px', cursor: 'pointer' }}
                      value={watermarkColor}
                      onChange={(e): void => setWatermarkColor(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Font Size (px)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={watermarkSize}
                      onChange={(e): void => setWatermarkSize(parseInt(e.target.value) || 12)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Opacity ({watermarkOpacity}%)</label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={watermarkOpacity}
                    onChange={(e): void => setWatermarkOpacity(parseInt(e.target.value))}
                  />
                </div>

                <div className="form-group">
                  <label>Position</label>
                  <select
                    className="form-control form-select"
                    value={watermarkPos}
                    onChange={(e): void => setWatermarkPos(e.target.value as any)}
                  >
                    <option value="center">Center</option>
                    <option value="top-left">Top Left</option>
                    <option value="top-right">Top Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="bottom-right">Bottom Right</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'export' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <h4 style={{ fontSize: '13px' }}>Format settings</h4>
                <div className="form-group">
                  <label>Export Format</label>
                  <select
                    className="form-control form-select"
                    value={exportFormat}
                    onChange={(e): void => setExportFormat(e.target.value as any)}
                  >
                    <option value="png">PNG (Lossless)</option>
                    <option value="jpeg">JPG (Standard)</option>
                    <option value="webp">WEBP (Modern Web)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Target File Weight</label>
                  <select
                    className="form-control form-select"
                    value={targetSizePreset}
                    onChange={(e): void => setTargetSizePreset(e.target.value as any)}
                  >
                    <option value="none">Original Quality (No limit)</option>
                    <option value="50">Under 50 KB</option>
                    <option value="100">Under 100 KB</option>
                    <option value="200">Under 200 KB</option>
                    <option value="500">Under 500 KB</option>
                    <option value="1000">Under 1 MB</option>
                    <option value="custom">Custom Size...</option>
                  </select>
                </div>

                {targetSizePreset === 'custom' && (
                  <div className="form-group">
                    <label>Target Size (KB)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 150"
                      value={customTargetSize}
                      onChange={(e): void => setCustomTargetSize(e.target.value)}
                    />
                  </div>
                )}

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={stripMetadata}
                    onChange={(e): void => setStripMetadata(e.target.checked)}
                  />
                  Strip EXIF Metadata
                </label>

                <button
                  className="btn btn-primary"
                  style={{ marginTop: '12px', width: '100%' }}
                  onClick={exportImage}
                >
                  <Download size={16} />
                  Export & Save File
                </button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}

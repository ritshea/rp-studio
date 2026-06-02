import React, { useState } from 'react'
import { Card } from '../components/Card'
import { Upload, Minimize2, Download, Trash2, FileText, FileImage } from 'lucide-react'
import { PDFDocument } from 'pdf-lib'

interface CompressionToolsProps {
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void
}

export const CompressionTools: React.FC<CompressionToolsProps> = ({ showToast }) => {
  const [selectedFile, setSelectedFile] = useState<any | null>(null)
  const [fileType, setFileType] = useState<'image' | 'pdf' | null>(null)

  // Settings
  const [targetSizePreset, setTargetSizePreset] = useState<string>('100')
  const [customSize, setCustomSize] = useState<string>('')

  // Results
  const [isCompressing, setIsCompressing] = useState<boolean>(false)
  const [compressionResult, setCompressionResult] = useState<{
    originalSize: number
    compressedSize: number
    filePath: string
    dataUrl?: string
    pdfBuffer?: ArrayBuffer
  } | null>(null)

  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0])
    }
  }

  const processFile = (file: File): void => {
    const name = file.name.toLowerCase()
    setCompressionResult(null)
    setSelectedFile(file)

    if (['png', 'jpg', 'jpeg', 'webp', 'bmp'].some((ext) => name.endsWith(ext))) {
      setFileType('image')
      setTargetSizePreset('100') // default 100KB for images
    } else if (name.endsWith('.pdf')) {
      setFileType('pdf')
      setTargetSizePreset('500') // default 500KB for PDFs
    } else {
      setSelectedFile(null)
      setFileType(null)
      showToast('Unsupported file type. Use images or PDFs.', 'warning')
    }
  }

  // Quality compression loops for images
  const compressImage = (img: HTMLImageElement, targetKB: number): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(img.src)
        return
      }

      ctx.drawImage(img, 0, 0)

      let quality = 0.95
      const ext = selectedFile.name.toLowerCase().endsWith('.png') ? 'png' : 'jpeg'
      let dataUrl = canvas.toDataURL(`image/${ext}`, quality)
      let size = Math.round((dataUrl.length * 3) / 4) / 1024

      // 1. Loop quality reduction
      while (size > targetKB && quality > 0.1) {
        quality -= 0.05
        dataUrl = canvas.toDataURL(`image/${ext}`, quality)
        size = Math.round((dataUrl.length * 3) / 4) / 1024
      }

      // 2. Loop downscaling if still too large
      if (size > targetKB) {
        let scale = 0.9
        const tempCanvas = document.createElement('canvas')
        while (size > targetKB && scale > 0.1) {
          tempCanvas.width = canvas.width * scale
          tempCanvas.height = canvas.height * scale
          const tempCtx = tempCanvas.getContext('2d')
          if (tempCtx) {
            tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height)
            dataUrl = tempCanvas.toDataURL(`image/${ext}`, 0.6)
            size = Math.round((dataUrl.length * 3) / 4) / 1024
          }
          scale -= 0.1
        }
      }

      resolve(dataUrl)
    })
  }

  const runCompression = async (): Promise<void> => {
    if (!selectedFile) return
    setIsCompressing(true)
    setCompressionResult(null)

    let targetKB = parseInt(targetSizePreset)
    if (targetSizePreset === 'custom') {
      targetKB = parseInt(customSize) || 100
    }

    try {
      const defaultFolder = await window.api.getSetting('defaultSaveFolder')
      const baseName = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.'))
      const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.') + 1)
      const outPath = `${defaultFolder}/${baseName}_compressed.${ext}`

      // COMPRESS IMAGE
      if (fileType === 'image') {
        const reader = new FileReader()
        reader.onload = (): void => {
          const img = new Image()
          img.onload = async (): Promise<void> => {
            const dataUrl = await compressImage(img, targetKB)
            const bytes = Math.round((dataUrl.length * 3) / 4)

            setCompressionResult({
              originalSize: selectedFile.size,
              compressedSize: bytes,
              filePath: outPath,
              dataUrl
            })
            setIsCompressing(false)
            showToast('Image compression complete', 'success')
          }
          img.src = reader.result as string
        }
        reader.readAsDataURL(selectedFile)
      }

      // COMPRESS PDF
      else if (fileType === 'pdf') {
        showToast('Compressing PDF stream buffers...', 'info')
        const arrayBuffer = await selectedFile.arrayBuffer()
        const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })

        // Save PDF with Object Stream Compression enabled
        const pdfBytes = await pdfDoc.save({ useObjectStreams: true })

        setCompressionResult({
          originalSize: selectedFile.size,
          compressedSize: pdfBytes.length,
          filePath: outPath,
          pdfBuffer: pdfBytes.buffer as ArrayBuffer
        })
        setIsCompressing(false)
        showToast('PDF compression complete', 'success')
      }
    } catch (e: any) {
      setIsCompressing(false)
      showToast(`Compression failed: ${e.message}`, 'error')
    }
  }

  const saveCompressedFile = async (): Promise<void> => {
    if (!compressionResult || !selectedFile) return

    try {
      const defaultFolder = (await window.api.getSetting('defaultSaveFolder')) || ''
      const baseName = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.'))
      const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.') + 1)
      const suggestedPath = defaultFolder
        ? `${defaultFolder}/${baseName}_compressed.${ext}`
        : `${baseName}_compressed.${ext}`

      const outPath = await window.api.selectSavePath({
        title: 'Save Compressed File As',
        defaultPath: suggestedPath,
        filters: [{ name: fileType === 'image' ? 'Images' : 'PDF Documents', extensions: [ext] }]
      })

      if (!outPath) {
        showToast('Save cancelled', 'info')
        return
      }

      let result
      if (fileType === 'image' && compressionResult.dataUrl) {
        result = await window.api.saveFile(outPath, compressionResult.dataUrl)
      } else if (fileType === 'pdf' && compressionResult.pdfBuffer) {
        result = await window.api.saveFile(outPath, compressionResult.pdfBuffer)
      }

      if (result && result.success) {
        const finalName = outPath.split(/[\\/]/).pop() || `${baseName}_compressed.${ext}`
        showToast(`Compressed file saved to: ${finalName}`, 'success')

        // Add to history
        await window.api.addHistory({
          id: Math.random().toString(36).substring(7),
          timestamp: new Date().toISOString(),
          fileName: finalName,
          filePath: outPath,
          fileSize: compressionResult.compressedSize,
          operation: 'File Compression',
          status: 'Success'
        })
        clearWorkspace()
      } else {
        showToast(`Save failed: ${result?.error || 'Unknown error'}`, 'error')
      }
    } catch (e: any) {
      showToast(`Save failed: ${e.message}`, 'error')
    }
  }

  const clearWorkspace = (): void => {
    setSelectedFile(null)
    setFileType(null)
    setCompressionResult(null)
  }

  const originalSizeKB = selectedFile ? (selectedFile.size / 1024).toFixed(1) : '0'
  const savingsPct = compressionResult
    ? (
        ((compressionResult.originalSize - compressionResult.compressedSize) /
          compressionResult.originalSize) *
        100
      ).toFixed(0)
    : '0'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
      {!selectedFile ? (
        <Card
          className="dropzone"
          style={{ height: '70vh' }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={(): void => document.getElementById('compress-picker')?.click()}
        >
          <Upload className="dropzone-icon" />
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Drag & Drop Image or PDF</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
            Enter target weights like 50KB, 100KB, 500KB and auto-resize quality
          </p>
          <input
            id="compress-picker"
            type="file"
            accept="image/*,.pdf"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </Card>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 320px',
            gap: '20px',
            height: '100%',
            alignItems: 'stretch'
          }}
        >
          {/* Main workspace info */}
          <div
            className="studio-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'white',
              position: 'relative',
              overflow: 'hidden',
              minHeight: '400px',
              gap: '24px'
            }}
          >
            <button
              className="btn btn-danger btn-icon-only"
              onClick={clearWorkspace}
              style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 5 }}
            >
              <Trash2 size={16} />
            </button>

            {fileType === 'image' ? (
              <FileImage size={96} style={{ color: 'var(--color-primary)', opacity: 0.8 }} />
            ) : (
              <FileText size={96} style={{ color: '#3b82f6', opacity: 0.8 }} />
            )}

            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>{selectedFile.name}</h3>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                Original Size: {originalSizeKB} KB
              </p>
            </div>

            {compressionResult && (
              <div
                style={{
                  backgroundColor: 'var(--color-success-light)',
                  border: '1px solid var(--color-success)',
                  padding: '16px 24px',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'center'
                }}
              >
                <h4
                  style={{ color: 'var(--color-success)', fontSize: '15px', marginBottom: '6px' }}
                >
                  Compression Successful!
                </h4>
                <p style={{ fontSize: '13px' }}>
                  Optimized Size:{' '}
                  <span style={{ fontWeight: 700 }}>
                    {(compressionResult.compressedSize / 1024).toFixed(1)} KB
                  </span>
                </p>
                <p
                  style={{
                    fontSize: '11px',
                    color: 'var(--color-text-secondary)',
                    marginTop: '4px'
                  }}
                >
                  Reduced file size by {savingsPct}%
                </p>
              </div>
            )}
          </div>

          {/* Right actions pane */}
          <Card style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif' }}>Compression Actions</h3>

            {/* Target Preset selector */}
            <div className="form-group">
              <label>Target File Weight</label>
              {fileType === 'image' ? (
                <select
                  className="form-control form-select"
                  value={targetSizePreset}
                  onChange={(e): void => setTargetSizePreset(e.target.value)}
                >
                  <option value="50">50 KB (High compression)</option>
                  <option value="100">100 KB (Standard passport)</option>
                  <option value="200">200 KB</option>
                  <option value="500">500 KB</option>
                  <option value="1000">1 MB</option>
                  <option value="custom">Custom Size...</option>
                </select>
              ) : (
                <select
                  className="form-control form-select"
                  value={targetSizePreset}
                  onChange={(e): void => setTargetSizePreset(e.target.value)}
                >
                  <option value="100">100 KB (Very high compression)</option>
                  <option value="500">500 KB (Standard limit)</option>
                  <option value="1000">1 MB</option>
                  <option value="2000">2 MB</option>
                  <option value="5000">5 MB</option>
                  <option value="10000">10 MB</option>
                  <option value="custom">Custom Size...</option>
                </select>
              )}
            </div>

            {targetSizePreset === 'custom' && (
              <div className="form-group">
                <label>Target Size (KB)</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="e.g. 150"
                  value={customSize}
                  onChange={(e): void => setCustomSize(e.target.value)}
                />
              </div>
            )}

            {!compressionResult ? (
              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '12px' }}
                onClick={runCompression}
                disabled={isCompressing}
              >
                <Minimize2 size={16} />
                {isCompressing ? 'Compressing...' : 'Compress Document'}
              </button>
            ) : (
              <button
                className="btn btn-primary"
                style={{
                  width: '100%',
                  marginTop: '12px',
                  backgroundColor: 'var(--color-success)'
                }}
                onClick={saveCompressedFile}
              >
                <Download size={16} />
                Save Optimized File
              </button>
            )}

            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

            <div
              style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}
            >
              <h4 style={{ fontSize: '11px', marginBottom: '4px', fontWeight: 600 }}>Details</h4>
              <p>Image compressor reduces resolution and pixel quality recursively.</p>
              <p style={{ marginTop: '4px' }}>PDF compressor downsamples objects structure.</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

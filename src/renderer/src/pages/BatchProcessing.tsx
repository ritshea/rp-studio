import React, { useState } from 'react'
import { Card } from '../components/Card'
import {
  Upload,
  Play
} from 'lucide-react'

interface BatchFile {
  id: string
  name: string
  size: number
  type: string
  file: File
  status: 'pending' | 'processing' | 'success' | 'failed'
  message?: string
}

interface BatchProcessingProps {
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void
}

export const BatchProcessing: React.FC<BatchProcessingProps> = ({ showToast }) => {
  const [files, setFiles] = useState<BatchFile[]>([])
  const [operation, setOperation] = useState<'compress' | 'convert' | 'resize' | 'rename'>('compress')
  
  // Params
  const [targetSize, setTargetSize] = useState<string>('100') // Compress
  const [targetFormat, setTargetFormat] = useState<string>('png') // Convert
  const [resizePercent, setResizePercent] = useState<number>(50) // Resize
  const [renamePattern, setRenamePattern] = useState<string>('item_###') // Rename

  // Progress
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [logs, setLogs] = useState<string[]>([])
  const [progress, setProgress] = useState<number>(0)

  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault()
    if (e.dataTransfer.files) {
      addFiles(Array.from(e.dataTransfer.files))
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files))
    }
  }

  const addFiles = (fileList: File[]): void => {
    const items: BatchFile[] = fileList.map((file) => {
      const ext = file.name.substring(file.name.lastIndexOf('.') + 1).toLowerCase()
      return {
        id: Math.random().toString(36).substring(7),
        name: file.name,
        size: file.size,
        type: ext,
        file,
        status: 'pending'
      }
    })
    setFiles((prev) => [...prev, ...items])
    addLog(`Added ${fileList.length} files to queue.`)
  }

  const addLog = (msg: string): void => {
    const time = new Date().toLocaleTimeString()
    setLogs((prev) => [...prev, `[${time}] ${msg}`])
  }

  // Operation helper execution
  const processImageResize = (file: File, scale: number): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (): void => {
        const img = new Image()
        img.onload = (): void => {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth * (scale / 100)
          canvas.height = img.naturalHeight * (scale / 100)
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            resolve(canvas.toDataURL(`image/png`, 0.85))
          } else {
            resolve(reader.result as string)
          }
        }
        img.src = reader.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  const processSingleFile = async (item: BatchFile, idx: number): Promise<{ success: boolean; msg?: string }> => {
    try {
      const defaultFolder = await window.api.getSetting('defaultSaveFolder')
      const baseName = item.name.substring(0, item.name.lastIndexOf('.'))
      const ext = item.type
      
      let outPath = ''

      if (operation === 'compress') {
        const targetKB = parseInt(targetSize)
        if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
          // Compress image via reader
          return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = (): void => {
              const img = new Image()
              img.onload = async (): Promise<void> => {
                const canvas = document.createElement('canvas')
                canvas.width = img.naturalWidth
                canvas.height = img.naturalHeight
                const ctx = canvas.getContext('2d')
                if (ctx) {
                  ctx.drawImage(img, 0, 0)
                  let quality = 0.9
                  let dataUrl = canvas.toDataURL(`image/jpeg`, quality)
                  let size = Math.round((dataUrl.length * 3) / 4) / 1024
                  while (size > targetKB && quality > 0.1) {
                    quality -= 0.05
                    dataUrl = canvas.toDataURL(`image/jpeg`, quality)
                    size = Math.round((dataUrl.length * 3) / 4) / 1024
                  }
                  outPath = `${defaultFolder}/${baseName}_compressed.jpg`
                  const saveRes = await window.api.saveFile(outPath, dataUrl)
                  resolve({ success: saveRes.success, msg: saveRes.error })
                } else {
                  resolve({ success: false, msg: 'Canvas failure' })
                }
              }
              img.src = reader.result as string
            }
            reader.readAsDataURL(item.file)
          })
        } else {
          return { success: false, msg: 'Compress only supports image formats bulk.' }
        }
      }

      else if (operation === 'convert') {
        outPath = `${defaultFolder}/${baseName}.${targetFormat}`
        if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
          return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = (): void => {
              const img = new Image()
              img.onload = async (): Promise<void> => {
                const canvas = document.createElement('canvas')
                canvas.width = img.naturalWidth
                canvas.height = img.naturalHeight
                const ctx = canvas.getContext('2d')
                if (ctx) {
                  ctx.drawImage(img, 0, 0)
                  const dataUrl = canvas.toDataURL(`image/${targetFormat}`)
                  const saveRes = await window.api.saveFile(outPath, dataUrl)
                  resolve({ success: saveRes.success, msg: saveRes.error })
                } else {
                  resolve({ success: false, msg: 'Canvas context error' })
                }
              }
              img.src = reader.result as string
            }
            reader.readAsDataURL(item.file)
          })
        } else {
          return { success: false, msg: 'Bulk converter only handles images.' }
        }
      }

      else if (operation === 'resize') {
        if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
          outPath = `${defaultFolder}/${baseName}_resized.${ext}`
          const dataUrl = await processImageResize(item.file, resizePercent)
          const saveRes = await window.api.saveFile(outPath, dataUrl)
          return { success: saveRes.success, msg: saveRes.error }
        } else {
          return { success: false, msg: 'Resizing only supports images.' }
        }
      }

      else if (operation === 'rename') {
        // pattern formatting e.g. item_003
        const numStr = String(idx + 1).padStart(3, '0')
        const formattedName = renamePattern.replace('###', numStr)
        outPath = `${defaultFolder}/${formattedName}.${ext}`
        
        // Save file bytes directly
        const bytes = await item.file.arrayBuffer()
        const saveRes = await window.api.saveFile(outPath, bytes)
        return { success: saveRes.success, msg: saveRes.error }
      }

      return { success: false, msg: 'Unknown operation' }
    } catch (err: any) {
      return { success: false, msg: err.message }
    }
  }

  // Trigger Sequential Processing
  const runBatch = async (): Promise<void> => {
    if (files.length === 0) return
    setIsRunning(true)
    setProgress(0)
    setLogs([])
    addLog(`Initializing batch: ${operation.toUpperCase()} on ${files.length} files.`)

    for (let i = 0; i < files.length; i++) {
      const item = files[i]
      addLog(`Processing file [${i + 1}/${files.length}]: ${item.name}`)
      
      setFiles((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: 'processing' } : f))
      )

      const result = await processSingleFile(item, i)
      
      setFiles((prev) =>
        prev.map((f) =>
          f.id === item.id
            ? {
                ...f,
                status: result.success ? 'success' : 'failed',
                message: result.msg
              }
            : f
        )
      )

      if (result.success) {
        addLog(`Successfully processed ${item.name}`)
        
        // Add record to database
        await window.api.addHistory({
          id: Math.random().toString(36).substring(7),
          timestamp: new Date().toISOString(),
          fileName: item.name,
          filePath: operation.toUpperCase(),
          fileSize: item.size,
          operation: `Batch ${operation.toUpperCase()}`,
          status: 'Success'
        })
      } else {
        addLog(`FAILED ${item.name}: ${result.msg || 'Unknown reason'}`)
      }

      setProgress(Math.round(((i + 1) / files.length) * 100))
    }

    addLog('Batch operation finished.')
    setIsRunning(false)
    showToast('Batch processing complete!', 'success')
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', height: 'calc(100% - 20px)' }}>
      {/* Left panel: File list tray + Progress console */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
        {files.length === 0 ? (
          <Card
            className="dropzone"
            style={{ height: '70vh' }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={(): void => document.getElementById('batch-picker')?.click()}
          >
            <Upload className="dropzone-icon" />
            <h2>Upload Files for Batch Processing</h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              Supports dragging dozens of images or documents at once
            </p>
            <input
              id="batch-picker"
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
          </Card>
        ) : (
          <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4>Batch Queue ({files.length} files)</h4>
              <button className="btn btn-secondary btn-danger" disabled={isRunning} onClick={(): void => setFiles([])}>
                Clear Queue
              </button>
            </div>

            {/* Progress indicator */}
            {isRunning && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span>Batch Status: Running...</span>
                  <span>{progress}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--color-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--color-primary)', transition: 'width 0.2s ease' }} />
                </div>
              </div>
            )}

            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
              <table className="file-list" style={{ marginTop: 0 }}>
                <tbody>
                  {files.map((item, idx) => (
                    <tr key={item.id}>
                      <td style={{ width: '30px', color: 'var(--color-text-light)' }}>{idx + 1}</td>
                      <td style={{ fontWeight: 500 }}>{item.name}</td>
                      <td>{(item.size / 1024).toFixed(1)} KB</td>
                      <td>
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: '11px',
                            color:
                              item.status === 'success'
                                ? '#10b981'
                                : item.status === 'failed'
                                ? '#ef4444'
                                : item.status === 'processing'
                                ? '#3b82f6'
                                : '#5f5e5a'
                          }}
                        >
                          {item.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Console logs */}
            {logs.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  Console Logs:
                </label>
                <div
                  style={{
                    backgroundColor: '#1b1b1f',
                    color: '#00ff00',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    height: '150px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-line'
                  }}
                >
                  {logs.join('\n')}
                </div>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Right configuration sidebar */}
      <Card style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflowY: 'auto' }}>
        <h3 style={{ fontFamily: 'Outfit, sans-serif' }}>Batch Configuration</h3>

        {/* Operation Selection */}
        <div className="form-group">
          <label>Batch Operation</label>
          <select
            className="form-control form-select"
            value={operation}
            onChange={(e): void => setOperation(e.target.value as any)}
            disabled={isRunning}
          >
            <option value="compress">Compress Images</option>
            <option value="convert">Convert Image Format</option>
            <option value="resize">Resize Images</option>
            <option value="rename">Rename Queue Files</option>
          </select>
        </div>

        {/* Operation specific parameters */}
        {operation === 'compress' && (
          <div className="form-group">
            <label>Target File Weight</label>
            <select
              className="form-control form-select"
              value={targetSize}
              onChange={(e): void => setTargetSize(e.target.value)}
              disabled={isRunning}
            >
              <option value="50">Under 50 KB</option>
              <option value="100">Under 100 KB</option>
              <option value="200">Under 200 KB</option>
              <option value="500">Under 500 KB</option>
            </select>
          </div>
        )}

        {operation === 'convert' && (
          <div className="form-group">
            <label>Target Image Format</label>
            <select
              className="form-control form-select"
              value={targetFormat}
              onChange={(e): void => setTargetFormat(e.target.value)}
              disabled={isRunning}
            >
              <option value="png">PNG (Lossless)</option>
              <option value="jpeg">JPG (Standard)</option>
              <option value="webp">WEBP (Modern Web)</option>
            </select>
          </div>
        )}

        {operation === 'resize' && (
          <div className="form-group">
            <label>Rescale Ratio ({resizePercent}%)</label>
            <input
              type="range"
              min="10"
              max="90"
              step="10"
              value={resizePercent}
              onChange={(e): void => setResizePercent(parseInt(e.target.value))}
              disabled={isRunning}
            />
          </div>
        )}

        {operation === 'rename' && (
          <div className="form-group">
            <label>Name Pattern (use ### for counter)</label>
            <input
              type="text"
              className="form-control"
              value={renamePattern}
              onChange={(e): void => setRenamePattern(e.target.value)}
              disabled={isRunning}
            />
            <span style={{ fontSize: '10px', color: 'var(--color-text-light)', marginTop: '4px' }}>
              {"e.g. photo_### -> photo_001, photo_002"}
            </span>
          </div>
        )}

        <button
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '12px' }}
          onClick={runBatch}
          disabled={files.length === 0 || isRunning}
        >
          <Play size={16} />
          {isRunning ? 'Processing Batch...' : 'Run Batch Operation'}
        </button>
      </Card>
    </div>
  )
}

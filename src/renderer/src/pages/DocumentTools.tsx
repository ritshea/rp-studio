import React, { useState } from 'react'
import { Card } from '../components/Card'
import {
  Upload,
  FileText,
  Printer,
  ArrowRightLeft,
  Trash2
} from 'lucide-react'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'

interface DocumentToolsProps {
  showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void
}

export const DocumentTools: React.FC<DocumentToolsProps> = ({ showToast }) => {
  const [selectedFile, setSelectedFile] = useState<any | null>(null)
  const [fileContent, setFileContent] = useState<{
    type: 'text' | 'docx' | 'xlsx' | 'pdf' | 'other'
    data: any
  } | null>(null)
  const [printers, setPrinters] = useState<any[]>([])
  const [selectedPrinter, setSelectedPrinter] = useState<string>('')
  const [activeSheetIdx, setActiveSheetIdx] = useState<number>(0)

  // Load system printers on demand
  const loadPrinters = async (): Promise<void> => {
    try {
      const list = await window.api.getPrinters()
      setPrinters(list)
      if (list.length > 0) {
        const defaultPrinter = list.find((p) => p.isDefault)
        setSelectedPrinter(defaultPrinter ? defaultPrinter.name : list[0].name)
      }
    } catch (e) {
      console.error('Failed to get printers', e)
    }
  }

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent): Promise<void> => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processSelectedFile(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    if (e.target.files && e.target.files.length > 0) {
      await processSelectedFile(e.target.files[0])
    }
  }

  const processSelectedFile = async (file: File): Promise<void> => {
    setSelectedFile(file)
    setFileContent(null)
    await loadPrinters()

    const name = file.name.toLowerCase()
    try {
      if (name.endsWith('.txt') || name.endsWith('.rtf')) {
        const text = await file.text()
        setFileContent({ type: 'text', data: text })
      } else if (name.endsWith('.docx')) {
        showToast('Parsing word document...', 'info')
        const arrayBuffer = await file.arrayBuffer()
        const result = await mammoth.convertToHtml({ arrayBuffer })
        setFileContent({ type: 'docx', data: result.value })
      } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        showToast('Parsing spreadsheet...', 'info')
        const arrayBuffer = await file.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        const sheets: { name: string; html: string }[] = []
        
        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName]
          const html = XLSX.utils.sheet_to_html(worksheet)
          sheets.push({ name: sheetName, html })
        })
        setFileContent({ type: 'xlsx', data: sheets })
        setActiveSheetIdx(0)
      } else if (name.endsWith('.pdf')) {
        showToast('Reading PDF document...', 'info')
        // Expose to base64 so we can embed in iframe
        const reader = new FileReader()
        reader.onload = (): void => {
          setFileContent({ type: 'pdf', data: reader.result as string })
        }
        reader.readAsDataURL(file)
      } else {
        setFileContent({ type: 'other', data: null })
      }
      showToast('Document loaded successfully', 'success')
    } catch (err: any) {
      showToast(`Failed to parse document: ${err.message}`, 'error')
      setFileContent({ type: 'other', data: null })
    }
  }

  // Convert document (e.g. DOCX -> PDF)
  const convertToPdf = async (): Promise<void> => {
    if (!selectedFile || !fileContent) return

    try {
      showToast('Converting to PDF...', 'info')
      let htmlContent = ''

      if (fileContent.type === 'docx') {
        htmlContent = `
          <html>
            <head>
              <style>
                body { font-family: 'Arial', sans-serif; padding: 40px; line-height: 1.6; color: #333; }
                p { margin-bottom: 12px; }
                table { border-collapse: collapse; width: 100%; margin-top: 16px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
              </style>
            </head>
            <body>${fileContent.data}</body>
          </html>
        `
      } else if (fileContent.type === 'text') {
        htmlContent = `
          <html>
            <head>
              <style>
                body { font-family: monospace; white-space: pre-wrap; padding: 40px; font-size: 14px; }
              </style>
            </head>
            <body>${fileContent.data}</body>
          </html>
        `
      } else if (fileContent.type === 'xlsx') {
        const sheets = fileContent.data as { name: string; html: string }[]
        htmlContent = `
          <html>
            <head>
              <style>
                body { font-family: 'Arial', sans-serif; padding: 20px; }
                table { border-collapse: collapse; width: 100%; margin-bottom: 30px; font-size: 12px; }
                th, td { border: 1px solid #ccc; padding: 6px; }
                h2 { color: #f36c45; border-bottom: 2px solid #f36c45; padding-bottom: 6px; }
              </style>
            </head>
            <body>
              ${sheets.map((s) => `<h2>${s.name}</h2>${s.html}`).join('')}
            </body>
          </html>
        `
      } else {
        showToast('Conversion from this format is not supported', 'warning')
        return
      }

      const response = await window.api.printToPDF(htmlContent)
      if (response.success && response.data) {
        const defaultFolder = await window.api.getSetting('defaultSaveFolder')
        const baseName = selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.'))
        const outPath = `${defaultFolder}/${baseName}.pdf`

        const saveResult = await window.api.saveFile(outPath, response.data)
        if (saveResult.success) {
          showToast(`Converted successfully! Saved to: ${outPath}`, 'success')
          await window.api.addHistory({
            id: Math.random().toString(36).substring(7),
            timestamp: new Date().toISOString(),
            fileName: `${baseName}.pdf`,
            filePath: outPath,
            fileSize: Math.round((response.data.length * 3) / 4),
            operation: 'Doc to PDF Conversion',
            status: 'Success'
          })
        } else {
          showToast(`Failed to save: ${saveResult.error}`, 'error')
        }
      } else {
        showToast(`Conversion failed: ${response.error}`, 'error')
      }
    } catch (e: any) {
      showToast(`Conversion error: ${e.message}`, 'error')
    }
  }

  // Print Document
  const printDocument = async (): Promise<void> => {
    if (!selectedFile || !fileContent) return

    try {
      showToast('Sending document to printer...', 'info')
      let printHtml = ''

      if (fileContent.type === 'docx') {
        printHtml = fileContent.data
      } else if (fileContent.type === 'text') {
        printHtml = `<pre style="font-family: monospace; white-space: pre-wrap;">${fileContent.data}</pre>`
      } else if (fileContent.type === 'xlsx') {
        const sheets = fileContent.data as { name: string; html: string }[]
        printHtml = sheets.map((s) => `<h2>${s.name}</h2>${s.html}`).join('')
      } else if (fileContent.type === 'pdf') {
        // Chromium embeds can trigger direct print. For simple workflow, we alert or print direct
        showToast('For PDFs, please use the print button in the preview window.', 'info')
        return
      } else {
        showToast('Printing this format is not supported directly', 'warning')
        return
      }

      const result = await window.api.printDirect(printHtml, {
        printerName: selectedPrinter,
        silent: false
      })

      if (result.success) {
        showToast('Document sent to print queue', 'success')
      } else {
        showToast(`Print failed: ${result.error}`, 'error')
      }
    } catch (e: any) {
      showToast(`Print error: ${e.message}`, 'error')
    }
  }

  const clearWorkspace = (): void => {
    setSelectedFile(null)
    setFileContent(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
      {!selectedFile ? (
        <Card
          className="dropzone"
          style={{ height: '70vh' }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={(): void => document.getElementById('doc-picker')?.click()}
        >
          <Upload className="dropzone-icon" />
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Drag & Drop Document</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
            Supports DOCX, XLSX, PDF, TXT, RTF formats
          </p>
          <input
            id="doc-picker"
            type="file"
            accept=".docx,.doc,.xlsx,.xls,.pdf,.txt,.rtf"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', height: '100%', alignItems: 'stretch' }}>
          {/* Document Preview Panel */}
          <div
            className="studio-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'white',
              position: 'relative',
              overflow: 'hidden',
              minHeight: '450px'
            }}
          >
            {/* Header bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 18px',
                borderBottom: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-secondary)'
              }}
            >
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <FileText size={20} style={{ color: 'var(--color-primary)' }} />
                <span style={{ fontWeight: 600, fontSize: '13px' }}>{selectedFile.name}</span>
              </div>
              <button className="btn btn-secondary btn-icon-only" onClick={clearWorkspace} style={{ color: 'var(--color-error)' }}>
                <Trash2 size={14} />
              </button>
            </div>

            {/* Preview Box */}
            <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
              {fileContent ? (
                <>
                  {fileContent.type === 'text' && (
                    <pre
                      style={{
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        fontSize: '13px',
                        userSelect: 'text'
                      }}
                    >
                      {fileContent.data}
                    </pre>
                  )}

                  {fileContent.type === 'docx' && (
                    <div
                      style={{ userSelect: 'text' }}
                      dangerouslySetInnerHTML={{ __html: fileContent.data }}
                    />
                  )}

                  {fileContent.type === 'xlsx' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px' }}>
                        {(fileContent.data as any[]).map((sheet, idx) => (
                          <button
                            key={idx}
                            className={`btn ${activeSheetIdx === idx ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={(): void => setActiveSheetIdx(idx)}
                          >
                            {sheet.name}
                          </button>
                        ))}
                      </div>
                      <div
                        style={{
                          overflowX: 'auto',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '12px'
                        }}
                        dangerouslySetInnerHTML={{ __html: (fileContent.data as any[])[activeSheetIdx].html }}
                      />
                    </div>
                  )}

                  {fileContent.type === 'pdf' && (
                    <iframe
                      src={fileContent.data}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                      title="PDF Preview"
                    />
                  )}

                  {fileContent.type === 'other' && (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-light)' }}>
                      <FileText size={48} style={{ opacity: 0.5, marginBottom: '12px' }} />
                      <p>Format preview is not supported for this extension.</p>
                      <p style={{ fontSize: '11px', marginTop: '4px' }}>
                        You can still convert it to PDF or print it.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>Loading preview...</div>
              )}
            </div>
          </div>

          {/* Right actions pane */}
          <Card style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif' }}>Document Actions</h3>

            {/* Printer Selection */}
            <div className="form-group">
              <label>Select Printer</label>
              <select
                className="form-control form-select"
                value={selectedPrinter}
                onChange={(e): void => setSelectedPrinter(e.target.value)}
              >
                {printers.length === 0 ? (
                  <option value="">No printers detected</option>
                ) : (
                  printers.map((p, idx) => (
                    <option key={idx} value={p.name}>
                      {p.name} {p.isDefault ? '(Default)' : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
              <button
                className="btn btn-secondary"
                onClick={printDocument}
                disabled={!fileContent || fileContent.type === 'pdf'}
              >
                <Printer size={16} />
                Print Document
              </button>

              <button
                className="btn btn-primary"
                onClick={convertToPdf}
                disabled={!fileContent || fileContent.type === 'pdf' || fileContent.type === 'other'}
              >
                <ArrowRightLeft size={16} />
                Convert to PDF
              </button>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              <h4 style={{ fontSize: '12px', marginBottom: '4px', fontWeight: 600 }}>Info</h4>
              <p>DOCX conversion operates local rendering engine into PDF.</p>
              <p style={{ marginTop: '4px' }}>XLSX exports all sheet sheets styled as tables.</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

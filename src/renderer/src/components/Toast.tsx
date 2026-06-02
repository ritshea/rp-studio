import React, { useEffect } from 'react'
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react'

export interface ToastType {
  id: string
  message: string
  type: 'success' | 'warning' | 'error' | 'info'
}

interface ToastProps {
  toast: ToastType
  onClose: (id: string) => void
  duration?: number
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose, duration = 4000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id)
    }, duration)
    return () => clearTimeout(timer)
  }, [toast, onClose, duration])

  const getIcon = (): React.ReactNode => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle size={18} style={{ color: '#10b981' }} />
      case 'warning':
        return <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
      case 'error':
        return <XCircle size={18} style={{ color: '#ef4444' }} />
      default:
        return <Info size={18} style={{ color: '#3b82f6' }} />
    }
  }

  const getToastClass = (): string => {
    switch (toast.type) {
      case 'success':
        return 'toast-success'
      case 'error':
        return 'toast-error'
      case 'warning':
        return 'toast-warning'
      default:
        return 'toast-info'
    }
  }

  return (
    <div className={`toast ${getToastClass()}`}>
      {getIcon()}
      <div style={{ flex: 1 }}>{toast.message}</div>
    </div>
  )
}

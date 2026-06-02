import React from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md'
}) => {
  if (!isOpen) return null

  const getMaxSize = (): string => {
    switch (size) {
      case 'sm':
        return '400px'
      case 'lg':
        return '900px'
      default:
        return '720px'
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: getMaxSize() }}
        onClick={(e): void => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{title}</h3>
          <button
            className="btn btn-secondary btn-icon-only"
            onClick={onClose}
            style={{ border: 'none', background: 'transparent' }}
          >
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

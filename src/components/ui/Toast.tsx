'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'

export type ToastVariant = 'info' | 'success' | 'alert'

export interface ToastItem {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
}

interface ToastContextType {
  toast: (item: Omit<ToastItem, 'id'>) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    ({ title, description, variant = 'info' }: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9)
      setToasts((prev) => [...prev.slice(-1), { id, title, description, variant }])

      setTimeout(() => {
        removeToast(id)
      }, 3500)
    },
    [removeToast]
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast Container Floating Top-Right (Desktop) / Top-Center (Mobile) */}
      <div className="fixed top-4 right-4 left-4 sm:left-auto z-50 flex flex-col gap-2 pointer-events-none sm:max-w-sm">
        {toasts.map((t) => {
          const borderStyle =
            t.variant === 'success'
              ? 'border-emerald-500/40 shadow-emerald-950/40 text-emerald-200'
              : t.variant === 'alert'
              ? 'border-rose-500/40 shadow-rose-950/40 text-rose-200'
              : 'border-amber-500/40 shadow-amber-950/40 text-amber-200'

          return (
            <div
              key={t.id}
              className={`pointer-events-auto bg-[#1a110a]/90 backdrop-blur-xl border ${borderStyle} rounded-2xl p-3.5 shadow-2xl animate-slide-up flex items-start gap-3`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-semibold tracking-wide text-[#f5ebe0] truncate">
                  {t.title}
                </p>
                {t.description && (
                  <p className="text-[11px] sm:text-xs text-[#a89582] mt-0.5 line-clamp-2">
                    {t.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-[#a89582] hover:text-[#f5ebe0] text-xs p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

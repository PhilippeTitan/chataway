'use client'

import React from 'react'
import { SanctuaryProvider } from '@/context/SanctuaryContext'
import { ToastProvider } from '@/components/ui/Toast'

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SanctuaryProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </SanctuaryProvider>
  )
}

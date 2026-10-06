'use client'

import React from 'react'
import { haptics } from '@/utils/haptics'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      className = '',
      onClick,
      disabled,
      ...props
    },
    ref
  ) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || isLoading) return
      haptics.lightTap()
      onClick?.(e)
    }

    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-xl select-none cursor-pointer transition-all duration-150 btn-press disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none'

    const sizeStyles = {
      sm: 'text-xs px-3 py-1.5 gap-1.5',
      md: 'text-xs sm:text-sm px-4 py-2 sm:py-2.5 gap-2',
      lg: 'text-sm sm:text-base px-6 py-3 sm:py-3.5 gap-2.5',
    }

    const variantStyles = {
      primary:
        'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-950/40 hover:shadow-amber-900/50 border border-amber-500/30',
      secondary:
        'bg-[#1c130d]/80 hover:bg-[#261b14] text-[#f5ebe0] border border-amber-900/35 hover:border-amber-700/50 hover:text-white backdrop-blur-md',
      ghost:
        'bg-transparent hover:bg-[#1c130d]/60 text-[#a89582] hover:text-[#f5ebe0] border border-transparent hover:border-amber-900/30',
      danger:
        'bg-rose-950/50 hover:bg-rose-900/70 text-rose-200 border border-rose-800/40 hover:border-rose-600/60 shadow-lg shadow-rose-950/40',
    }

    return (
      <button
        ref={ref}
        onClick={handleClick}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-1.5" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    )
  }
)

Button.displayName = 'Button'

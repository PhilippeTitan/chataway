import React from 'react'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'card' | 'text' | 'circle' | 'pill'
  aspectRatio?: 'video' | 'portrait' | 'square'
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'card',
  aspectRatio = 'video',
  className = '',
  ...props
}) => {
  const baseClasses =
    'relative overflow-hidden bg-[#1c130d] border border-amber-900/25 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-amber-500/10 before:to-transparent'

  if (variant === 'circle') {
    return (
      <div
        className={`${baseClasses} rounded-full aspect-square ${className}`}
        {...props}
      />
    )
  }

  if (variant === 'pill') {
    return (
      <div
        className={`${baseClasses} rounded-full h-8 px-4 ${className}`}
        {...props}
      />
    )
  }

  if (variant === 'text') {
    return (
      <div
        className={`${baseClasses} rounded-md h-3.5 w-full ${className}`}
        {...props}
      />
    )
  }

  // Card Variant
  const aspectClass =
    aspectRatio === 'portrait'
      ? 'aspect-[9/16]'
      : aspectRatio === 'square'
      ? 'aspect-square'
      : 'aspect-video'

  return (
    <div
      className={`${baseClasses} rounded-2xl ${aspectClass} ${className}`}
      {...props}
    />
  )
}

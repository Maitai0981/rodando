import type * as React from 'react'
import type { ButtonProps as MuiButtonProps } from '@mui/material/Button'

export type UiTone = 'default' | 'accent' | 'gold' | 'success' | 'warning' | 'danger' | 'neutral'
export type UiSize = 'sm' | 'md' | 'lg'

export type ProductLike = {
  id: number
  name: string
  sku: string
  manufacturer: string
  category: string
  bikeModel: string
  price: number
  stock: number
  imageUrl: string
  hoverImageUrl?: string
  description: string
  compareAtPrice?: number | null
  discountPercent?: number
  offerBadge?: string | null
  seoSlug?: string | null
}

export interface ButtonProps extends Omit<MuiButtonProps, 'variant' | 'size'> {
  variant?: 'primary' | 'accent' | 'outline' | 'ghost' | 'gold' | 'icon'
  size?: UiSize
  loading?: boolean
  fullWidth?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  to?: string
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  requiredMark?: boolean
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  error?: string
  options: Array<{ label: string; value: string; disabled?: boolean }>
}

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  variant?: 'feature' | 'testimonial' | 'surface'
  interactive?: boolean
}

export interface ProductCardProps {
  product: ProductLike
  onAddToCart?: () => void
  onOpenDetails?: () => void
  loading?: boolean
  testIdPrefix?: string
}

export interface NavbarProps {
  links: Array<{ label: string; to: string; testId?: string }>
  accountHref: string
  accountLabel: string
  cartCount: number
  onSearch?: (query: string) => void
}

export interface FooterProps {
  quickLinks: Array<{ label: string; href: string }>
}

export interface ModalProps {
  open: boolean
  title?: string
  onClose: () => void
  size?: 'sm' | 'md' | 'lg'
  actions?: React.ReactNode
  children: React.ReactNode
}

export interface ToastProps {
  open: boolean
  tone?: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  onClose: () => void
  durationMs?: number
}

export interface TabsProps {
  items: Array<{ id: string; label: string; disabled?: boolean }>
  value: string
  onChange: (id: string) => void
}

export interface PaginationProps {
  page: number
  totalPages: number
  onChange: (nextPage: number) => void
  disabled?: boolean
}

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: number | string
  height?: number | string
  variant?: 'text' | 'rect' | 'circle'
  animated?: boolean
}

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: 'success' | 'error' | 'warning' | 'info'
  title?: string
}

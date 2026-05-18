// Left-pane wrapper for slide content. Provides a scroll-gated container so
// long tables can scroll without affecting the right-pane chart. Visual
// chrome (eyebrow / accent rule / label) was removed in the 2026-05-18
// polish pass — the data role is self-evident from layout.
import { type ReactNode } from 'react'

export interface DataPaneProps {
  children: ReactNode
}

export function DataPane({ children }: DataPaneProps) {
  return (
    <div className='flex h-full flex-col'>
      <div className='flex-1 overflow-auto'>{children}</div>
    </div>
  )
}

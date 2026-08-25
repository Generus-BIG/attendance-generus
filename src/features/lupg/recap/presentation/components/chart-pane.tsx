// Right-pane wrapper for slide content. Provides an overflow-hidden container
// so charts can size to the available area. Visual chrome (eyebrow / accent
// rule / label) was removed in the 2026-05-18 polish pass.
import { type ReactNode } from 'react'

export interface ChartPaneProps {
  children: ReactNode
}

export function ChartPane({ children }: ChartPaneProps) {
  return (
    <div className='flex h-full min-h-0 flex-col'>
      <div className='min-h-0 flex-1 overflow-hidden'>{children}</div>
    </div>
  )
}

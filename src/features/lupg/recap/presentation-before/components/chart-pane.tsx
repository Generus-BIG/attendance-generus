import { type ReactNode } from 'react'
import { usePresPalette } from '../use-pres-palette'

export interface ChartPaneProps {
  children: ReactNode
}

export function ChartPane({ children }: ChartPaneProps) {
  const p = usePresPalette()
  return (
    <div
      className='flex h-full min-h-0 flex-col overflow-hidden rounded-[1.5rem] border p-6 shadow-[0_1px_2px_rgba(48,39,27,0.05),0_12px_28px_rgba(48,39,27,0.06)]'
      style={{
        background: `color-mix(in oklch, ${p.bg} 88%, ${p.accent})`,
        borderColor: p.rule,
        boxShadow: `0 1px 2px color-mix(in oklch, ${p.ink} 5%, transparent), 0 12px 28px color-mix(in oklch, ${p.ink} 6%, transparent)`,
      }}
    >
      <div className='min-h-0 flex-1 overflow-hidden'>{children}</div>
    </div>
  )
}

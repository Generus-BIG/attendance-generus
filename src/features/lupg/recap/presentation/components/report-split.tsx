import { type ReactNode } from 'react'

export function ReportSplit({ children }: { children: ReactNode }) {
  return (
    <div className='grid h-full min-h-0 grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-6'>
      {children}
    </div>
  )
}

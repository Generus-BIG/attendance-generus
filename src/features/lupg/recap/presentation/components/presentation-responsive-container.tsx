import { type ComponentProps } from 'react'
import { ResponsiveContainer } from 'recharts'
import { useCaptureMode } from '../context/capture-context'

export function PresentationResponsiveContainer(
  props: ComponentProps<typeof ResponsiveContainer>
) {
  const capture = useCaptureMode()
  return (
    <ResponsiveContainer
      width='100%'
      height='100%'
      initialDimension={capture ? { width: 1, height: 1 } : undefined}
      {...props}
    />
  )
}

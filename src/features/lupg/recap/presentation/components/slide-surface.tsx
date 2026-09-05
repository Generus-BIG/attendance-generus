import { type ReactNode } from 'react'
import {
  getDecorationSignature,
  type DecorationKind,
  type DecorationPrimitive,
} from '../decoration-system'
import { usePresPalette } from '../use-pres-palette'

function Bubble({ bubble }: { bubble: DecorationPrimitive }) {
  return (
    <ellipse
      cx={bubble.cx}
      cy={bubble.cy}
      rx={bubble.rx}
      ry={bubble.ry}
      fill='currentColor'
      opacity={bubble.opacity}
    />
  )
}

export function SlideSurface({
  slideKey,
  slideNumber,
  decorationKind,
  children,
}: {
  slideKey: string
  slideNumber: number
  decorationKind: DecorationKind
  children: ReactNode
}) {
  const p = usePresPalette()
  const decoration = getDecorationSignature(
    slideKey,
    slideNumber,
    decorationKind
  )
  const bubble = `color-mix(in oklch, ${decoration.accent === 1 ? p.accent : p.primary} 40%, ${p.bg})`

  return (
    <div
      className='relative isolate z-0 h-full w-full overflow-hidden'
      data-decoration-signature={`${decoration.base}:${decoration.mirror}:${decoration.accent}:${JSON.stringify(decoration.primitives)}`}
      data-slide-decoration={decoration.kind}
      style={{ background: p.bg, color: p.ink, fontFamily: p.fontSans }}
    >
      <svg
        aria-hidden='true'
        focusable='false'
        className='pointer-events-none absolute inset-0 z-1 h-full w-full'
        viewBox='0 0 1280 720'
      >
        <g style={{ color: bubble }}>
          {decoration.primitives.map((primitive, index) => (
            <Bubble key={index} bubble={primitive} />
          ))}
        </g>
      </svg>
      <div className='relative z-10 h-full w-full'>{children}</div>
    </div>
  )
}

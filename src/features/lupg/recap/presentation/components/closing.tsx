// Full-bleed closing slide.
import { usePresPalette } from '../use-pres-palette'

interface ClosingProps {
  tagline: string
  metaLines: string[]
}

export function Closing({ tagline, metaLines }: ClosingProps) {
  const p = usePresPalette()
  return (
    <div
      className='flex h-full w-full flex-col px-16 py-12'
      style={{ background: p.bg, color: p.ink, fontFamily: p.fontSans }}
    >
      <div className='flex flex-1 flex-col items-center justify-center gap-6 text-center'>
        <span
          aria-hidden
          style={{ width: 60, height: 3, background: p.brandAccent }}
        />
        <div
          style={{
            fontFamily: p.fontSerif,
            fontStyle: 'italic',
            fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
            fontWeight: 400,
            color: p.primary,
            maxWidth: '42ch',
            lineHeight: 1.25,
          }}
        >
          {`“${tagline}”`}
        </div>
      </div>

      <div className='flex items-center justify-center gap-3'>
        <span
          aria-hidden
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: 9999,
            background: p.primary,
          }}
        />
        <span
          className='uppercase'
          style={{
            fontFamily: p.fontMono,
            fontSize: 'clamp(0.875rem, 1.1vw, 1.125rem)',
            fontWeight: 600,
            letterSpacing: '0.25em',
            color: p.muted,
          }}
        >
          {metaLines.join(' · ')}
        </span>
      </div>
    </div>
  )
}

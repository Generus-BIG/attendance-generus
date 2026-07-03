import { AnimateContainer, AnimateItem } from './animate-element'
import { usePresPalette } from '../use-pres-palette'

interface CoverProps {
  modeLabel: string
  titleLines: string[]
  monthLabel: string
  tagline: string
  metaLines: string[]
}

export function Cover({
  modeLabel,
  titleLines,
  monthLabel,
  tagline,
  metaLines,
}: CoverProps) {
  const p = usePresPalette()
  return (
    <div
      className='flex h-full w-full flex-col justify-between px-16 py-12'
      style={{ background: p.bg, color: p.ink, fontFamily: p.fontSans }}
    >
      <AnimateContainer className='flex h-full w-full flex-col justify-between'>
        <AnimateItem
          className='uppercase'
          style={{
            fontFamily: p.fontMono,
            fontSize: 'clamp(0.875rem, 1vw, 1.125rem)',
            fontWeight: 600,
            letterSpacing: '0.25em',
            color: p.primary,
          }}
        >
          {modeLabel}
        </AnimateItem>

        <div
          className='flex flex-col'
          style={{
            fontFamily: '"Archivo Black", Impact, sans-serif',
            fontSize: 'clamp(4rem, 9vw, 8rem)',
            lineHeight: 0.95,
            letterSpacing: '-0.02em',
          }}
        >
          {titleLines.map((line, i) => (
            <AnimateItem key={i} style={{ color: p.ink }}>
              {line}
            </AnimateItem>
          ))}
          <AnimateItem style={{ color: p.brandAccent }}>{monthLabel}</AnimateItem>
          <AnimateItem className='mt-10 flex flex-col gap-4'>
            <span
              aria-hidden
              style={{ width: 60, height: 3, background: p.brandAccent }}
            />
            <span
              style={{
                fontFamily: p.fontSerif,
                fontStyle: 'italic',
                fontSize: 'clamp(1.25rem, 2vw, 2rem)',
                fontWeight: 400,
                letterSpacing: 0,
                lineHeight: 1.3,
                color: p.primary,
              }}
            >
              {tagline}
            </span>
          </AnimateItem>
        </div>

        <AnimateItem
          className='uppercase'
          style={{
            fontFamily: p.fontMono,
            fontSize: 'clamp(0.875rem, 1.1vw, 1.125rem)',
            fontWeight: 600,
            letterSpacing: '0.2em',
            color: p.muted,
          }}
        >
          {metaLines.join(' · ')}
        </AnimateItem>
      </AnimateContainer>
    </div>
  )
}


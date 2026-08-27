import { usePresPalette } from '../use-pres-palette'
import { AnimateContainer, AnimateItem } from './animate-element'

interface CoverProps {
  modeLabel: string
  titleLines: string[]
  scopePeriodLabel: string
  tagline: string
  metaLines: string[]
}

export function Cover({
  modeLabel,
  titleLines,
  scopePeriodLabel,
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
            fontSize: 'clamp(0.875rem, 1cqw, 1.125rem)',
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
            fontFamily: p.fontSans,
            fontSize: 'clamp(3.5rem, 8cqw, 6.5rem)',
            fontWeight: 700,
            lineHeight: 1.0,
            letterSpacing: '-0.03em',
          }}
        >
          {titleLines.map((line) => (
            <AnimateItem key={line} style={{ color: p.ink }}>
              {line}
            </AnimateItem>
          ))}
          <AnimateItem
            className='mt-3'
            style={{
              color: p.coverAccent,
              fontSize: 'clamp(2rem, 4.5cqw, 3.75rem)',
              letterSpacing: '-0.02em',
            }}
          >
            {scopePeriodLabel}
          </AnimateItem>
          <AnimateItem className='mt-8 flex flex-col gap-4'>
            <span
              style={{
                fontFamily: p.fontSans,
                fontSize: 'clamp(1.25rem, 2cqw, 2rem)',
                fontWeight: 400,
                letterSpacing: 0,
                lineHeight: 1.3,
                color: p.ink,
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
            fontSize: 'clamp(0.875rem, 1.1cqw, 1.125rem)',
            fontWeight: 500,
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

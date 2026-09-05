import dataIllustration from '@/assets/undraw_data_25jw.svg'
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
      className='h-full w-full overflow-hidden'
      style={{ background: p.bg, color: p.ink, fontFamily: p.fontSans }}
    >
      <AnimateContainer
        className='relative h-full w-full'
        style={{
          padding: 'clamp(2.5rem, 7cqh, 4rem) clamp(2.5rem, 5.5cqw, 4.5rem)',
        }}
      >
        <div className='relative z-10 flex h-full w-[58%] min-w-0 flex-col'>
          <AnimateItem
            className='uppercase'
            style={{
              fontFamily: p.fontMono,
              fontSize: 'clamp(0.75rem, 0.95cqw, 0.9375rem)',
              fontWeight: 600,
              letterSpacing: '0.24em',
              color: p.primary,
            }}
          >
            {modeLabel}
          </AnimateItem>

          <div
            className='flex flex-1 flex-col justify-center pb-[2cqh]'
            style={{
              fontFamily: p.fontSans,
              fontSize: 'clamp(2.5rem, 4.15cqw, 3.625rem)',
              fontWeight: 750,
              lineHeight: 0.96,
              letterSpacing: '-0.03em',
            }}
          >
            {titleLines.map((line) => (
              <AnimateItem
                key={line}
                style={{ color: p.ink, whiteSpace: 'nowrap' }}
              >
                {line}
              </AnimateItem>
            ))}
            <AnimateItem
              className='mt-[3.5cqh]'
              style={{
                color: p.coverAccent,
                fontSize: 'clamp(1.75rem, 2.9cqw, 2.5rem)',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              {scopePeriodLabel}
            </AnimateItem>
            <AnimateItem className='mt-[4.5cqh]'>
              <span
                style={{
                  display: 'block',
                  maxWidth: '48ch',
                  fontSize: 'clamp(0.95rem, 1.35cqw, 1.125rem)',
                  fontWeight: 400,
                  letterSpacing: 0,
                  lineHeight: 1.35,
                  color: p.ink,
                }}
              >
                {tagline}
              </span>
            </AnimateItem>
            {metaLines.length ? (
              <AnimateItem
                className='mt-[3cqh] uppercase'
                style={{
                  fontFamily: p.fontMono,
                  fontSize: 'clamp(0.75rem, 1cqw, 1rem)',
                  fontWeight: 500,
                  letterSpacing: '0.2em',
                  color: p.muted,
                }}
              >
                {metaLines.join(' · ')}
              </AnimateItem>
            ) : null}
          </div>
        </div>

        <AnimateItem className='absolute inset-[13%_2.5%_15%_47%]'>
          <img
            src={dataIllustration}
            alt='Ilustrasi orang menganalisis data dan grafik'
            className='h-full w-full object-contain object-right-bottom'
          />
        </AnimateItem>
      </AnimateContainer>
    </div>
  )
}

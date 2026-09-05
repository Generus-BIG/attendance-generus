import { type ReactNode } from 'react'
import { usePresPalette } from '../use-pres-palette'
import { AnimateContainer, AnimateItem } from './animate-element'

export interface SlideFrameProps {
  eyebrow?: string
  title: string
  meta?: ReactNode
  scope: string
  slideNumber: number
  totalSlides: number
  children: ReactNode
}

export function SlideFrame({
  title,
  meta,
  scope,
  slideNumber,
  totalSlides,
  children,
}: SlideFrameProps) {
  const p = usePresPalette()

  const titleStyle = {
    fontFamily: p.fontSans,
    fontSize: 'clamp(2.25rem, 4cqw, 4rem)',
    fontWeight: 700,
    lineHeight: 1.05,
    letterSpacing: '-0.018em',
    color: p.ink,
  } as const

  const metaStyle = {
    fontFamily: p.fontMono,
    fontSize: 'clamp(0.875rem, 1.1cqw, 1.25rem)',
    letterSpacing: '0.18em',
    color: p.muted,
  } as const

  const pageIndicatorStyle = {
    fontFamily: p.fontMono,
    fontSize: 'clamp(0.875rem, 1.1cqw, 1.125rem)',
    letterSpacing: '0.2em',
    color: p.muted,
    fontWeight: 600,
  } as const

  const scopeStyle = {
    fontFamily: p.fontMono,
    fontSize: 'clamp(0.75rem, 1cqw, 1.125rem)',
    letterSpacing: '0.2em',
    color: p.muted,
  } as const

  return (
    <div
      className='flex h-full flex-col'
      style={{
        background: p.bg,
        color: p.ink,
        fontFamily: p.fontSans,
      }}
    >
      <AnimateContainer className='flex h-full flex-col'>
        <header
          className='flex items-end justify-between'
          style={{
            borderBottom: `1px solid ${p.rule}`,
            padding:
              'clamp(1.25rem, 3cqh, 2.5rem) clamp(2rem, 4cqw, 4rem) clamp(0.75rem, 1.7cqh, 1.25rem)',
          }}
        >
          <div className='flex flex-col'>
            <AnimateItem>
              <h1 style={titleStyle}>{title}</h1>
            </AnimateItem>
          </div>
          {meta ? (
            <AnimateItem className='uppercase' style={metaStyle}>
              {meta}
            </AnimateItem>
          ) : null}
        </header>

        <div
          className='flex-1 overflow-hidden'
          style={{
            padding: 'clamp(1.25rem, 2.8cqh, 2.5rem) clamp(2rem, 4cqw, 4rem)',
          }}
        >
          {children}
        </div>

        <footer
          className='flex items-center justify-between'
          style={{
            padding: '0 clamp(2rem, 4cqw, 4rem) clamp(0.9rem, 2cqh, 1.5rem)',
          }}
        >
          <AnimateItem className='uppercase' style={scopeStyle}>
            {scope}
          </AnimateItem>
          <AnimateItem style={pageIndicatorStyle}>
            {String(slideNumber).padStart(2, '0')} —{' '}
            {String(totalSlides).padStart(2, '0')}
          </AnimateItem>
        </footer>
      </AnimateContainer>
    </div>
  )
}

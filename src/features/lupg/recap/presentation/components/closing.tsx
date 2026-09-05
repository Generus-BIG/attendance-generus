import sharingIdeasIllustration from '@/assets/undraw_sharing-ideas_toje copy.svg'
import { usePresPalette } from '../use-pres-palette'
import { AnimateContainer, AnimateItem } from './animate-element'

interface ClosingProps {
  tagline: string
  metaLines: string[]
}

export function Closing({ tagline, metaLines }: ClosingProps) {
  const p = usePresPalette()
  return (
    <div
      className='relative h-full w-full overflow-hidden'
      style={{ background: p.bg, color: p.ink, fontFamily: p.fontSans }}
    >
      <svg
        aria-hidden
        className='pointer-events-none absolute inset-0 h-full w-full'
        viewBox='0 0 1600 900'
        preserveAspectRatio='none'
      >
        <defs>
          <pattern id='closing-dots' width='30' height='30' patternUnits='userSpaceOnUse'>
            <circle cx='4' cy='4' r='2.5' fill={p.primary} />
          </pattern>
        </defs>

        <path
          d='M1080 -40C1065 135 1235 142 1364 256C1490 368 1488 458 1680 468V-40Z'
          fill={p.cream}
          opacity='.42'
        />
        <path
          d='M-180 350C82 326 230 420 336 594C412 709 497 735 635 733C763 731 809 651 939 632C1098 608 1160 537 1272 520C1435 495 1530 528 1780 520V930H-180Z'
          fill={p.accent}
          opacity='.26'
        />
        <path
          d='M-180 815C176 750 355 778 548 805C742 832 921 771 1116 779C1307 787 1490 822 1780 758V930H-180Z'
          fill={p.bg}
          opacity='.9'
        />
        <circle cx='190' cy='118' r='55' fill={p.primary} opacity='.065' />
        <rect x='1432' y='108' width='128' height='128' fill='url(#closing-dots)' opacity='.14' />
        <rect x='58' y='548' width='118' height='118' fill='url(#closing-dots)' opacity='.11' />

        <path
          d='M-120 218C105 220 183 336 246 477C310 619 354 695 472 706C625 720 704 628 850 625C1018 621 1085 725 1210 714C1392 697 1472 481 1740 472'
          fill='none'
          stroke={p.primary}
          strokeWidth='1.35'
          opacity='.4'
        />

        <g transform='translate(350 598)' opacity='.52'>
          <path d='M65 155V63M65 111C42 86 28 56 31 25M65 124C88 98 102 68 101 38' fill='none' stroke={p.primary} strokeWidth='2' />
          <path d='M61 91C31 83 13 59 12 27C42 31 61 55 61 91ZM69 107C99 96 116 71 113 39C84 46 68 72 69 107ZM56 121C26 118 6 100 0 72C30 71 51 91 56 121Z' fill={p.primary} opacity='.74' />
          <path d='M41 154H89L84 207H47Z' fill={p.rule} opacity='.7' />
        </g>
        <g transform='translate(1436 628)' opacity='.24'>
          <path d='M69 180V75M69 126C45 102 30 68 33 32M69 142C94 116 110 78 108 43' fill='none' stroke={p.muted} strokeWidth='2.5' />
          <path d='M65 102C34 93 16 67 16 33C47 39 65 66 65 102ZM74 121C106 109 123 81 119 47C88 55 72 84 74 121ZM60 141C27 137 5 116 0 85C33 84 56 107 60 141Z' fill={p.muted} />
        </g>
      </svg>

      <AnimateContainer className='relative z-10 grid h-full grid-rows-[auto_minmax(0,1fr)_auto] px-[6cqw] pt-[17cqh] pb-[5cqh]'>
        <div className='flex flex-col items-center gap-[3cqh] text-center'>
          <AnimateItem
            style={{
              fontSize: 'clamp(1.25rem, 1.8cqw, 1.75rem)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: p.ink,
            }}
          >
            Alhamdulillah Jaza Kumullahu Khoiro
          </AnimateItem>
          <AnimateItem
            style={{
              fontSize: 'clamp(1.75rem, 3.4cqw, 3rem)',
              fontWeight: 400,
              color: p.primary,
              maxWidth: '42ch',
              lineHeight: 1.15,
              textWrap: 'balance',
            }}
          >
            {`“${tagline}”`}
          </AnimateItem>
        </div>

        <AnimateItem className='flex min-h-0 items-center justify-center py-[2cqh]'>
          <img
            src={sharingIdeasIllustration}
            alt='Ilustrasi orang berbagi ide di depan papan kerja'
            className='h-full max-h-[52cqh] w-full max-w-[64cqw] object-contain'
          />
        </AnimateItem>

        <AnimateItem className='flex items-center justify-center gap-3'>
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
              fontSize: 'clamp(0.75rem, 1cqw, 1rem)',
              fontWeight: 600,
              letterSpacing: '0.25em',
              color: p.muted,
            }}
          >
            {metaLines.join(' · ')}
          </span>
        </AnimateItem>
      </AnimateContainer>
    </div>
  )
}

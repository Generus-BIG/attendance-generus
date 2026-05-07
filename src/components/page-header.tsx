import { cn } from '@/lib/utils'

interface Props {
  /** Editorial kicker in small-caps, e.g. 'Absensi MuMiBig'. */
  kicker?: string
  /** Page title. */
  title: string
  /** Optional supporting description. */
  description?: React.ReactNode
  /** Optional meta row rendered below the description, e.g. count chips. */
  meta?: React.ReactNode
  /** Right-aligned actions slot (e.g. primary buttons). */
  actions?: React.ReactNode
  className?: string
}

/**
 * Page-level header primitive: kicker + title + description + actions.
 * Matches the navy-anchored pattern established by the Monthly Report and
 * Dashboard Absensi redesigns.
 */
export function PageHeader({
  kicker,
  title,
  description,
  meta,
  actions,
  className,
}: Props) {
  return (
    <header
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between',
        className
      )}
    >
      <div className='flex flex-col gap-1'>
        {kicker && (
          <div className='text-muted-foreground text-[0.6875rem] font-medium tracking-[0.12em] uppercase'>
            {kicker}
          </div>
        )}
        <h1 className='text-foreground text-2xl font-semibold tracking-tight sm:text-[1.75rem]'>
          {title}
        </h1>
        {description && (
          <p className='text-muted-foreground max-w-[65ch] text-sm'>
            {description}
          </p>
        )}
        {meta && <div className='mt-1 flex flex-wrap items-center gap-2'>{meta}</div>}
      </div>
      {actions && (
        <div className='flex flex-wrap items-center gap-2 sm:shrink-0'>
          {actions}
        </div>
      )}
    </header>
  )
}

// Editorial-styled wrappers over shadcn Table primitives + cream TotalRow helper.
// Palette resolves at runtime via usePresPalette.
//
// `headerVariant`:
//   'navy'     — solid filled navy bar header (data-dense slides only)
//   'hairline' — uppercase navy text on top hairline rule, no fill
import {
  createContext,
  useContext,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { usePresPalette, type PresPalette } from '../use-pres-palette'

type HeaderVariant = 'navy' | 'hairline'

const HeaderVariantCtx = createContext<HeaderVariant>('navy')

interface EditorialTableProps extends ComponentProps<'table'> {
  headerVariant?: HeaderVariant
}

export function EditorialTable({
  className,
  headerVariant = 'navy',
  ...props
}: EditorialTableProps) {
  const p = usePresPalette()
  return (
    <HeaderVariantCtx.Provider value={headerVariant}>
      <Table
        className={cn('tabular-nums', className)}
        style={{
          fontFamily: p.fontSans,
          fontSize: 'clamp(0.875rem, 1.1vw, 1.25rem)',
          borderColor: p.rule,
        }}
        {...props}
      />
    </HeaderVariantCtx.Provider>
  )
}

export function EditorialTableHeader({ className, ...props }: ComponentProps<'thead'>) {
  const p = usePresPalette()
  const variant = useContext(HeaderVariantCtx)
  const style: CSSProperties =
    variant === 'navy'
      ? { background: p.primary }
      : { background: 'transparent', borderBottom: `2px solid ${p.ink}` }
  return <TableHeader className={className} style={style} {...props} />
}

export function EditorialTableBody(props: ComponentProps<'tbody'>) {
  return <TableBody {...props} />
}

export function EditorialTableRow({ className, ...props }: ComponentProps<'tr'>) {
  const p = usePresPalette()
  return (
    <TableRow
      className={cn('hover:bg-transparent', className)}
      style={{ borderColor: p.rule }}
      {...props}
    />
  )
}

export function EditorialTableHead({ className, style, ...props }: ComponentProps<'th'>) {
  const p = usePresPalette()
  const variant = useContext(HeaderVariantCtx)
  const variantStyle: CSSProperties =
    variant === 'navy' ? { color: p.primaryFg } : { color: p.ink }
  return (
    <TableHead
      className={cn('h-9 px-3 uppercase', className)}
      style={{
        fontFamily: p.fontMono,
        fontSize: 'clamp(0.75rem, 1vw, 1rem)',
        fontWeight: 700,
        letterSpacing: '0.15em',
        ...variantStyle,
        ...style,
      }}
      {...props}
    />
  )
}

export function EditorialTableCell({ className, ...props }: ComponentProps<'td'>) {
  const p = usePresPalette()
  return (
    <TableCell
      className={cn('px-3 py-2', className)}
      style={{
        color: p.ink,
        fontSize: 'clamp(0.875rem, 1.1vw, 1.25rem)',
      }}
      {...props}
    />
  )
}

export interface TotalRowProps {
  children: ReactNode
}

export function TotalRow({ children }: TotalRowProps) {
  const p = usePresPalette()
  return (
    <TableRow
      className='font-semibold hover:bg-transparent'
      style={{ background: p.cream, borderColor: p.rule }}
    >
      {children}
    </TableRow>
  )
}

export type { PresPalette }

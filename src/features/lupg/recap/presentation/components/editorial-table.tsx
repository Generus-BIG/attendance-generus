// Shared presentation table treatment. Palette resolves at runtime so every
// report table inherits the active theme without per-renderer color overrides.
import {
  createContext,
  useContext,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
} from '@/components/ui/table'
import { usePresPalette, type PresPalette } from '../use-pres-palette'
import { AnimateTableRow } from './animate-element'

type HeaderVariant = 'navy' | 'hairline'
type TableDensity = 'regular' | 'compact' | 'micro'

const HeaderVariantCtx = createContext<HeaderVariant>('hairline')
const TableDensityCtx = createContext<TableDensity>('regular')

interface EditorialTableProps extends ComponentProps<'table'> {
  headerVariant?: HeaderVariant
  density?: TableDensity
}

export function EditorialTable({
  className,
  headerVariant = 'hairline',
  density = 'regular',
  ...props
}: EditorialTableProps) {
  const p = usePresPalette()
  const fontSizeByDensity: Record<TableDensity, string> = {
    regular: 'clamp(0.875rem, 1.1vw, 1.25rem)',
    compact: 'clamp(0.8rem, 0.95vw, 1.05rem)',
    micro: 'clamp(0.72rem, 0.82vw, 0.95rem)',
  }
  return (
    <HeaderVariantCtx.Provider value={headerVariant}>
      <TableDensityCtx.Provider value={density}>
        <Table
          className={cn(
            'border-separate border-spacing-0 overflow-hidden rounded-lg border tabular-nums',
            className
          )}
          style={{
            fontFamily: p.fontSans,
            fontSize: fontSizeByDensity[density],
            lineHeight: density === 'regular' ? 1.45 : 1.25,
            borderColor: p.rule,
          }}
          {...props}
        />
      </TableDensityCtx.Provider>
    </HeaderVariantCtx.Provider>
  )
}

export function EditorialTableHeader({
  className,
  style,
  ...props
}: ComponentProps<'thead'>) {
  const p = usePresPalette()
  useContext(HeaderVariantCtx)
  return (
    <TableHeader
      className={className}
      style={{
        background: p.tableHeader,
        borderBottom: `1px solid ${p.rule}`,
        ...style,
      }}
      {...props}
    />
  )
}

export function EditorialTableBody(props: ComponentProps<'tbody'>) {
  return <TableBody {...props} />
}

export function EditorialTableRow({
  className,
  style,
  ...props
}: HTMLMotionProps<'tr'>) {
  return (
    <AnimateTableRow
      className={cn('hover:bg-transparent', className)}
      style={style}
      {...props}
    />
  )
}

export function EditorialTableHead({
  className,
  style,
  ...props
}: ComponentProps<'th'>) {
  const p = usePresPalette()
  useContext(HeaderVariantCtx)
  const density = useContext(TableDensityCtx)
  const classByDensity: Record<TableDensity, string> = {
    regular: 'h-10 px-3',
    compact: 'h-8 px-2',
    micro: 'h-6 px-2',
  }
  const fontSizeByDensity: Record<TableDensity, string> = {
    regular: 'clamp(0.75rem, 1vw, 1rem)',
    compact: 'clamp(0.68rem, 0.82vw, 0.875rem)',
    micro: 'clamp(0.62rem, 0.72vw, 0.78rem)',
  }
  return (
    <TableHead
      className={cn(classByDensity[density], 'uppercase', className)}
      style={{
        fontFamily: p.fontMono,
        fontSize: fontSizeByDensity[density],
        fontWeight: 700,
        letterSpacing: density === 'regular' ? '0.15em' : '0.12em',
        color: p.tableHeaderFg,
        borderBottom: `1px solid ${p.rule}`,
        ...style,
      }}
      {...props}
    />
  )
}

export function EditorialTableCell({
  className,
  style,
  ...props
}: ComponentProps<'td'>) {
  const p = usePresPalette()
  const density = useContext(TableDensityCtx)
  const classByDensity: Record<TableDensity, string> = {
    regular: 'px-3 py-2.5',
    compact: 'px-2 py-2',
    micro: 'px-2 py-1',
  }
  const fontSizeByDensity: Record<TableDensity, string> = {
    regular: 'clamp(0.875rem, 1.1vw, 1.25rem)',
    compact: 'clamp(0.8rem, 0.95vw, 1.05rem)',
    micro: 'clamp(0.72rem, 0.82vw, 0.95rem)',
  }
  return (
    <TableCell
      className={cn(classByDensity[density], className)}
      style={{
        color: p.ink,
        fontSize: fontSizeByDensity[density],
        borderBottom: `1px solid ${p.rule}`,
        ...style,
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
    <AnimateTableRow
      className='font-semibold hover:bg-transparent'
      style={{
        background: `color-mix(in oklch, ${p.primary} 10%, ${p.bg})`,
        borderTop: `2px solid color-mix(in oklch, ${p.primary} 35%, ${p.rule})`,
        borderBottom: `1px solid ${p.rule}`,
        color: p.ink,
      }}
    >
      {children}
    </AnimateTableRow>
  )
}

export type { PresPalette }

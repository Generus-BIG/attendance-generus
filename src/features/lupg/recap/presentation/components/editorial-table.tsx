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
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
} from '@/components/ui/table'
import { usePresPalette, type PresPalette } from '../use-pres-palette'

type HeaderVariant = 'navy' | 'hairline'
type TableDensity = 'regular' | 'compact' | 'micro'

const HeaderVariantCtx = createContext<HeaderVariant>('navy')
const TableDensityCtx = createContext<TableDensity>('regular')

interface EditorialTableProps extends ComponentProps<'table'> {
  headerVariant?: HeaderVariant
  density?: TableDensity
}

export function EditorialTable({
  className,
  headerVariant = 'navy',
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
          className={cn('tabular-nums', className)}
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
  ...props
}: ComponentProps<'thead'>) {
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

import { AnimateTableRow } from './animate-element'
import { type HTMLMotionProps } from 'framer-motion'

export function EditorialTableRow({
  className,
  ...props
}: HTMLMotionProps<'tr'>) {
  const p = usePresPalette()
  return (
    <AnimateTableRow
      className={cn('hover:bg-transparent', className)}
      style={{ borderColor: p.rule }}
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
  const variant = useContext(HeaderVariantCtx)
  const density = useContext(TableDensityCtx)
  const variantStyle: CSSProperties =
    variant === 'navy' ? { color: p.primaryFg } : { color: p.ink }
  const classByDensity: Record<TableDensity, string> = {
    regular: 'h-9 px-3',
    compact: 'h-7 px-2',
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
        ...variantStyle,
        ...style,
      }}
      {...props}
    />
  )
}

export function EditorialTableCell({
  className,
  ...props
}: ComponentProps<'td'>) {
  const p = usePresPalette()
  const density = useContext(TableDensityCtx)
  const classByDensity: Record<TableDensity, string> = {
    regular: 'px-3 py-2',
    compact: 'px-2 py-1.5',
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
      style={{ background: p.cream, borderColor: p.rule }}
    >
      {children}
    </AnimateTableRow>
  )
}

export type { PresPalette }

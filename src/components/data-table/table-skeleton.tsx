import { Skeleton } from '@/components/ui/skeleton'
import { TableBody, TableCell, TableRow } from '@/components/ui/table'

interface Props {
  rows?: number
  columns: number
}

/**
 * Skeleton rows for TanStack tables while data is loading.
 * Matches row density of a populated table so layout doesn't shift on load.
 */
export function TableSkeleton({ rows = 6, columns }: Props) {
  return (
    <TableBody>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <TableRow key={rowIdx} className='hover:bg-transparent'>
          {Array.from({ length: columns }).map((_, colIdx) => (
            <TableCell key={colIdx}>
              <Skeleton className='h-4 w-full max-w-[12rem]' />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  )
}

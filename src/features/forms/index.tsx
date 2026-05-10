import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Link } from '@tanstack/react-router'
import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { id as idLocale } from 'date-fns/locale'
import { CalendarDays, ExternalLink, Plus } from 'lucide-react'
import { type AttendanceFormConfig } from '@/lib/schema'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/hooks/use-permissions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { PermissionGate } from '@/components/permission-gate'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  formatPublicFormUrlLabel,
  getPublicFormUrl,
} from './utils/public-form-url'
import { FormActions } from './components/form-actions'
import { FormTypeBadge } from './components/form-type-badge'
import { FormsProvider, useFormsContext } from './context/forms-context'

export function Forms() {
  return (
    <FormsProvider>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <FormsList />
      </Main>
    </FormsProvider>
  )
}

function FormsList() {
  const { forms, isLoading } = useFormsContext()
  const { can } = usePermissions()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [globalFilter, setGlobalFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<'semua' | 'desa' | 'kelompok'>('semua')

  const filteredForms = useMemo(
    () =>
      typeFilter === 'semua'
        ? forms
        : forms.filter((f) => f.formType === typeFilter),
    [forms, typeFilter]
  )

  const columns = useMemo<ColumnDef<AttendanceFormConfig>[]>(() => [
    {
      accessorKey: 'title',
      header: 'Judul',
      cell: ({ row }) => {
        const title = row.getValue('title') as string
        const slug = row.original.slug
        const formUrl = getPublicFormUrl(slug)
        return (
          <div className='flex flex-col gap-0.5'>
            <span className='font-medium'>{title}</span>
            <span className='flex items-center gap-1 text-xs text-muted-foreground'>
              <ExternalLink className='h-3 w-3' />
              {formatPublicFormUrlLabel(formUrl)}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: 'formType',
      header: 'Tipe',
      cell: ({ row }) => (
        <FormTypeBadge
          formType={row.original.formType}
          kelompokName={row.original.kelompokName}
        />
      ),
    },
    {
      accessorKey: 'date',
      header: 'Tanggal',
      cell: ({ row }) => {
        const date = new Date(row.getValue('date'))
        return (
          <div className='flex items-center gap-2 text-sm'>
            <CalendarDays className='h-3.5 w-3.5 text-muted-foreground' />
            {format(date, 'dd MMM yyyy, HH:mm', { locale: idLocale })}
          </div>
        )
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => {
        const active = row.getValue('isActive') as boolean
        return (
          <Badge
            variant='outline'
            className={cn(
              active
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                : 'border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400'
            )}
          >
            {active ? 'Aktif' : 'Nonaktif'}
          </Badge>
        )
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => <FormActions form={row.original} />,
    },
  ], [])

  const table = useReactTable({
    data: filteredForms,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    state: {
      sorting,
      columnVisibility,
      globalFilter,
    },
  })

  return (
    <div className='flex flex-1 flex-col gap-4'>
      {/* Page header */}
      <div className='flex flex-wrap items-end justify-between gap-2'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>
            Formulir Absensi
          </h2>
          <p className='text-muted-foreground'>
            Buat dan kelola sesi absensi.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className='flex flex-wrap items-center gap-2'>
        <Input
          placeholder='Cari formulir...'
          value={globalFilter ?? ''}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className='max-w-sm'
        />
        <div className='flex items-center gap-1'>
          {(['semua', 'desa', 'kelompok'] as const).map((t) => (
            <button
              key={t}
              type='button'
              onClick={() => setTypeFilter(t)}
              className={cn(
                'rounded border px-2.5 py-1 text-xs font-medium transition-colors',
                typeFilter === t
                  ? 'border-foreground/20 bg-foreground/5 text-foreground'
                  : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {t === 'semua' ? 'Semua' : t === 'desa' ? 'Desa' : 'Kelompok'}
            </button>
          ))}
        </div>
        <PermissionGate allowed={can.createForm}>
          <Button asChild className='ms-auto'>
            <Link to='/admin/forms/create'>
              <Plus className='mr-2 h-4 w-4' />
              Buat Form
            </Link>
          </Button>
        </PermissionGate>
      </div>

      {/* Form List */}
      <div className='rounded-lg border'>
        {isLoading ? (
          <div className='divide-y'>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className='flex items-center gap-4 px-4 py-3'>
                <Skeleton className='h-5 w-16 rounded-full' />
                <div className='flex-1 space-y-1'>
                  <Skeleton className='h-4 w-48' />
                  <Skeleton className='h-3 w-32' />
                </div>
                <Skeleton className='h-4 w-28' />
                <Skeleton className='h-5 w-14 rounded-full' />
                <Skeleton className='h-8 w-8' />
              </div>
            ))}
          </div>
        ) : table.getRowModel().rows?.length ? (
          <div className='divide-y'>
            {table.getRowModel().rows.map((row) => {
              const form = row.original
              const formUrl = getPublicFormUrl(form.slug)
              return (
                <div
                  key={row.id}
                  className='flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50'
                >
                  <a
                    href={formUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='min-w-0 flex-1'
                  >
                    <p className='truncate font-medium hover:underline'>
                      {form.title}
                    </p>
                    <p className='flex items-center gap-1.5 truncate text-xs text-muted-foreground'>
                      <FormTypeBadge
                        formType={form.formType}
                        kelompokName={form.kelompokName}
                      />
                      <span className='text-border'>|</span>
                      {formatPublicFormUrlLabel(formUrl)}
                    </p>
                  </a>
                  <div className='hidden items-center gap-2 text-sm text-muted-foreground sm:flex'>
                    <CalendarDays className='h-3.5 w-3.5' />
                    {format(new Date(form.date), 'dd MMM yyyy, HH:mm', {
                      locale: idLocale,
                    })}
                  </div>
                  <Badge
                    variant='outline'
                    className={cn(
                      form.isActive
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                        : 'border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400'
                    )}
                  >
                    {form.isActive ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                  <FormActions form={form} />
                </div>
              )
            })}
          </div>
        ) : (
          <div className='flex flex-col items-center gap-1.5 py-12 text-muted-foreground'>
            <CalendarDays className='h-8 w-8 opacity-40' />
            <p className='text-sm'>Belum ada formulir.</p>
            <PermissionGate allowed={can.createForm}>
              <Button variant='link' size='sm' asChild>
                <Link to='/admin/forms/create'>Buat formulir pertama</Link>
              </Button>
            </PermissionGate>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className='flex items-center justify-between'>
        <p className='text-sm text-muted-foreground'>
          {table.getFilteredRowModel().rows.length} formulir
        </p>
        <div className='flex gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Sebelumnya
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Selanjutnya
          </Button>
        </div>
      </div>
    </div>
  )
}

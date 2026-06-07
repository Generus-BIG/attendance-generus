import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useAllMetrics,
  useCreateMetric,
  useDeleteMetric,
  useUpdateMetric,
} from '../hooks/use-lupg-queries'
import { type MetricDefinitionRow } from '../types'

const metricSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50),
  name: z.string().min(1, 'Name is required'),
  category_label: z.string().nullable().optional(),
  value_format: z.enum(['percent', 'number', 'currency']),
  denominator_label: z.string().nullable().optional(),
  scope: z.enum(['kelompok', 'desa']),
  sort_order: z.number().int().min(0),
  active: z.boolean(),
})

type MetricFormValues = z.infer<typeof metricSchema>

export function MetricsConfigTab() {
  const { data: items = [], isLoading } = useAllMetrics()
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<MetricDefinitionRow | null>(null)
  const [deleting, setDeleting] = useState<MetricDefinitionRow | null>(null)

  const handleNew = () => {
    setEditing(null)
    setEditOpen(true)
  }

  const handleEdit = (row: MetricDefinitionRow) => {
    setEditing(row)
    setEditOpen(true)
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <h3 className='text-lg font-bold tracking-tight'>Metrics</h3>
          <p className='mt-0.5 text-xs text-muted-foreground'>
            Definisi KPI dan parameter monitoring yang dievaluasi dalam laporan
            bulanan.
          </p>
        </div>
        <Button onClick={handleNew} size='sm'>
          <Plus className='mr-1.5 h-4 w-4' />
          Tambah Metric
        </Button>
      </div>

      {isLoading ? (
        <div className='flex items-center justify-center rounded-md border py-12 text-muted-foreground'>
          <Loader2 className='mr-2 h-5 w-5 animate-spin' />
          Memuat...
        </div>
      ) : items.length === 0 ? (
        <div className='rounded-md border border-dashed bg-muted/10 p-12 text-center text-sm text-muted-foreground'>
          Belum ada metric. Klik "Tambah Metric" untuk memulai.
        </div>
      ) : (
        <div className='overflow-hidden rounded-md border border-border/70 bg-card shadow-sm'>
          <Table>
            <TableHeader className='bg-muted/30'>
              <TableRow>
                <TableHead className='w-[150px]'>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className='w-[120px]'>Format</TableHead>
                <TableHead className='w-[120px]'>Scope</TableHead>
                <TableHead className='w-[100px] text-center'>Sort</TableHead>
                <TableHead className='w-[100px] text-center'>Active</TableHead>
                <TableHead className='w-[80px]'></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className='font-mono text-xs text-muted-foreground'>
                    {r.code}
                  </TableCell>
                  <TableCell className='font-medium'>{r.name}</TableCell>
                  <TableCell className='text-muted-foreground'>
                    {r.category_label ?? '-'}
                  </TableCell>
                  <TableCell className='capitalize'>{r.value_format}</TableCell>
                  <TableCell className='capitalize'>{r.scope}</TableCell>
                  <TableCell className='text-center tabular-nums'>
                    {r.sort_order}
                  </TableCell>
                  <TableCell className='text-center'>
                    {r.active ? (
                      <Badge
                        variant='outline'
                        className='rounded-md border-success/20 bg-success/10 px-2 py-0.5 text-xs font-semibold tracking-wider text-success uppercase hover:bg-success/10 hover:text-success'
                      >
                        Aktif
                      </Badge>
                    ) : (
                      <Badge
                        variant='outline'
                        className='rounded-md border-muted-foreground/10 bg-muted/30 px-2 py-0.5 text-xs font-medium tracking-wider text-muted-foreground uppercase'
                      >
                        Nonaktif
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className='text-right'>
                    <div className='flex justify-end gap-1'>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-8 w-8'
                        onClick={() => handleEdit(r)}
                      >
                        <Pencil className='h-4 w-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive'
                        onClick={() => setDeleting(r)}
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <MetricFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        editing={editing}
      />

      <AlertDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus metric?</AlertDialogTitle>
            <AlertDialogDescription>
              Metric <strong>{deleting?.name}</strong> akan dihapus. Data
              laporan yang sudah tersimpan tidak akan terhapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <DeleteMetricButton
              row={deleting}
              onDone={() => setDeleting(null)}
            />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function DeleteMetricButton({
  row,
  onDone,
}: {
  row: MetricDefinitionRow | null
  onDone: () => void
}) {
  const del = useDeleteMetric()
  if (!row) return null
  return (
    <AlertDialogAction
      onClick={() =>
        del.mutate(row.id, {
          onSuccess: () => {
            toast.success('Metric dihapus')
            onDone()
          },
          onError: (e: unknown) => {
            toast.error(e instanceof Error ? e.message : 'Gagal menghapus')
          },
        })
      }
    >
      {del.isPending ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
      Hapus
    </AlertDialogAction>
  )
}

interface FormDialogProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  editing: MetricDefinitionRow | null
}

function MetricFormDialog({ open, onOpenChange, editing }: FormDialogProps) {
  const create = useCreateMetric()
  const update = useUpdateMetric()

  const form = useForm<MetricFormValues>({
    resolver: zodResolver(metricSchema),
    values: editing
      ? {
          code: editing.code,
          name: editing.name,
          category_label: editing.category_label ?? '',
          value_format:
            editing.value_format as MetricFormValues['value_format'],
          denominator_label: editing.denominator_label ?? '',
          scope: editing.scope as MetricFormValues['scope'],
          sort_order: editing.sort_order,
          active: editing.active,
        }
      : {
          code: '',
          name: '',
          category_label: '',
          value_format: 'number',
          denominator_label: '',
          scope: 'kelompok',
          sort_order: 100,
          active: true,
        },
  })

  const onSubmit = (values: MetricFormValues) => {
    const payload = {
      ...values,
      category_label: values.category_label ? values.category_label : null,
      denominator_label: values.denominator_label
        ? values.denominator_label
        : null,
    }
    if (editing) {
      update.mutate(
        { id: editing.id, patch: payload },
        {
          onSuccess: () => {
            toast.success('Metric diupdate')
            onOpenChange(false)
          },
          onError: (e: unknown) => {
            toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
          },
        }
      )
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          toast.success('Metric dibuat')
          onOpenChange(false)
        },
        onError: (e: unknown) => {
          toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
        },
      })
    }
  }

  const isPending = create.isPending || update.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Metric' : 'Tambah Metric'}</DialogTitle>
          <DialogDescription>
            Definisikan metric laporan bulanan.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='flex flex-col gap-3'
          >
            <FormField
              control={form.control}
              name='code'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder='KEHADIRAN_CABERAWIT'
                      disabled={!!editing}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='category_label'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category (opsional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      placeholder='Kehadiran'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='grid gap-3 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='value_format'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value Format</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='percent'>Percent</SelectItem>
                        <SelectItem value='number'>Number</SelectItem>
                        <SelectItem value='currency'>Currency</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='scope'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scope</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='kelompok'>Kelompok</SelectItem>
                        <SelectItem value='desa'>Desa</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name='denominator_label'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Denominator Label (opsional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      placeholder='Sensus Caberawit'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='sort_order'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sort Order</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value, 10) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='flex items-center gap-4'>
              <FormField
                control={form.control}
                name='active'
                render={({ field }) => (
                  <FormItem className='flex items-center gap-2'>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <Label>Active</Label>
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className='mt-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
              >
                Batal
              </Button>
              <Button type='submit' disabled={isPending}>
                {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

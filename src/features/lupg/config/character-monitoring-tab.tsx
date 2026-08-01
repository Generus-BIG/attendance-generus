import { useMemo, useState } from 'react'
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
  useAllCharacterMonitoringActivities,
  useCreateCharacterMonitoringActivity,
  useDeleteCharacterMonitoringActivity,
  useUpdateCharacterMonitoringActivity,
} from '../hooks/use-lupg-queries'
import { type CharacterMonitoringActivityRow } from '../types'
import {
  CHARACTER_LEVEL_LABELS,
  CHARACTER_LEVELS,
  sortCharacterActivities,
} from '../utils/character-monitoring'

const characterActivitySchema = z.object({
  level_code: z.enum(CHARACTER_LEVELS),
  activity_code: z.string().min(1, 'Kode wajib diisi').max(80),
  activity_label: z.string().min(1, 'Kegiatan wajib diisi'),
  sort_order: z.number().int().min(0),
  active: z.boolean(),
})

type CharacterActivityFormValues = z.infer<typeof characterActivitySchema>

export function CharacterMonitoringConfigTab() {
  const { data: items = [], isLoading } = useAllCharacterMonitoringActivities()
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<CharacterMonitoringActivityRow | null>(
    null
  )
  const [deleting, setDeleting] =
    useState<CharacterMonitoringActivityRow | null>(null)

  const groupedItems = useMemo(() => {
    const map = new Map<string, CharacterMonitoringActivityRow[]>()
    for (const item of sortCharacterActivities(items)) {
      const rows = map.get(item.level_code) ?? []
      rows.push(item)
      map.set(item.level_code, rows)
    }
    return CHARACTER_LEVELS.flatMap((level) => {
      const rows = map.get(level)
      return rows?.length ? [{ level, rows }] : []
    })
  }, [items])

  const handleNew = () => {
    setEditing(null)
    setEditOpen(true)
  }

  const handleEdit = (row: CharacterMonitoringActivityRow) => {
    setEditing(row)
    setEditOpen(true)
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>
            Target 29 Karakter
          </h2>
          <p className='text-sm text-muted-foreground'>
            Definisi kegiatan monitoring karakter per jenjang
          </p>
        </div>
        <Button onClick={handleNew} className='self-start sm:self-auto'>
          <Plus className='mr-2 h-4 w-4' />
          Tambah Kegiatan
        </Button>
      </div>

      {isLoading ? (
        <div className='flex items-center justify-center py-8 text-muted-foreground'>
          <Loader2 className='mr-2 h-5 w-5 animate-spin' />
          Memuat...
        </div>
      ) : items.length === 0 ? (
        <div className='rounded-md border border-dashed bg-card p-6 text-center text-sm text-muted-foreground'>
          Belum ada kegiatan monitoring karakter.
        </div>
      ) : (
        <div className='overflow-hidden rounded-md border border-border/70 bg-card shadow-sm'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Kegiatan</TableHead>
                <TableHead className='text-center'>Sort</TableHead>
                <TableHead className='text-center'>Status</TableHead>
                <TableHead className='w-[100px]'></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedItems.map((group) => (
                <TableLevelGroup
                  key={group.level}
                  level={group.level}
                  rows={group.rows}
                  onEdit={handleEdit}
                  onDelete={setDeleting}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CharacterActivityFormDialog
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
            <AlertDialogTitle>Nonaktifkan kegiatan karakter?</AlertDialogTitle>
            <AlertDialogDescription>
              Kegiatan <strong>{deleting?.activity_label}</strong> akan
              dinonaktifkan. Data laporan yang sudah tersimpan tetap menjadi
              arsip historis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <DeleteCharacterActivityButton
              row={deleting}
              onDone={() => setDeleting(null)}
            />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function TableLevelGroup({
  level,
  rows,
  onEdit,
  onDelete,
}: {
  level: (typeof CHARACTER_LEVELS)[number]
  rows: CharacterMonitoringActivityRow[]
  onEdit: (row: CharacterMonitoringActivityRow) => void
  onDelete: (row: CharacterMonitoringActivityRow) => void
}) {
  return (
    <>
      <TableRow className='bg-muted/40 hover:bg-muted/40'>
        <TableCell
          colSpan={5}
          className='py-2 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase'
        >
          {CHARACTER_LEVEL_LABELS[level]}
        </TableCell>
      </TableRow>
      {rows.map((row) => (
        <TableRow key={row.id}>
          <TableCell className='font-mono text-xs'>
            {row.activity_code}
          </TableCell>
          <TableCell className='min-w-80 wrap-break-word whitespace-normal'>
            {row.activity_label}
          </TableCell>
          <TableCell className='text-center tabular-nums'>
            {row.sort_order}
          </TableCell>
          <TableCell className='text-center'>
            {row.active ? (
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
                onClick={() => onEdit(row)}
                aria-label={`Edit ${row.activity_label}`}
              >
                <Pencil className='h-4 w-4' />
              </Button>
              <Button
                variant='ghost'
                size='icon'
                className='h-8 w-8'
                onClick={() => onDelete(row)}
                aria-label={`Hapus ${row.activity_label}`}
              >
                <Trash2 className='h-4 w-4' />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

function DeleteCharacterActivityButton({
  row,
  onDone,
}: {
  row: CharacterMonitoringActivityRow | null
  onDone: () => void
}) {
  const del = useDeleteCharacterMonitoringActivity()
  if (!row) return null
  return (
    <AlertDialogAction
      onClick={() =>
        del.mutate(row.id, {
          onSuccess: () => {
            toast.success('Kegiatan dinonaktifkan')
            onDone()
          },
          onError: (e: unknown) => {
            toast.error(e instanceof Error ? e.message : 'Gagal menghapus')
          },
        })
      }
    >
      {del.isPending ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
      Nonaktifkan
    </AlertDialogAction>
  )
}

interface FormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: CharacterMonitoringActivityRow | null
}

function CharacterActivityFormDialog({
  open,
  onOpenChange,
  editing,
}: FormDialogProps) {
  const create = useCreateCharacterMonitoringActivity()
  const update = useUpdateCharacterMonitoringActivity()

  const form = useForm<CharacterActivityFormValues>({
    resolver: zodResolver(characterActivitySchema),
    values: editing
      ? {
          level_code:
            editing.level_code as CharacterActivityFormValues['level_code'],
          activity_code: editing.activity_code,
          activity_label: editing.activity_label,
          sort_order: editing.sort_order,
          active: editing.active,
        }
      : {
          level_code: 'ACR',
          activity_code: '',
          activity_label: '',
          sort_order: 100,
          active: true,
        },
  })

  const onSubmit = (values: CharacterActivityFormValues) => {
    if (editing) {
      update.mutate(
        { id: editing.id, patch: values },
        {
          onSuccess: () => {
            toast.success('Kegiatan diupdate')
            onOpenChange(false)
          },
          onError: (e: unknown) => {
            toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
          },
        }
      )
    } else {
      create.mutate(values, {
        onSuccess: () => {
          toast.success('Kegiatan dibuat')
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
          <DialogTitle>
            {editing ? 'Edit Kegiatan Karakter' : 'Tambah Kegiatan Karakter'}
          </DialogTitle>
          <DialogDescription>
            Definisikan kegiatan monitoring per jenjang.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='flex flex-col gap-3'
          >
            <FormField
              control={form.control}
              name='level_code'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jenjang</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CHARACTER_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {CHARACTER_LEVEL_LABELS[level]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='activity_code'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kode</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder='lingkungan_keluarga'
                      disabled={!!editing}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='activity_label'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kegiatan</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder='Kegiatan di lingkungan keluarga'
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
                        id='character-activity-active'
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <Label htmlFor='character-activity-active'>Active</Label>
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

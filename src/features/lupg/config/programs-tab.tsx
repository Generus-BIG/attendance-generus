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
  useAllPrograms,
  useCreateProgram,
  useDeleteProgram,
  useUpdateProgram,
} from '../hooks/use-lupg-queries'
import { type ProgramDefinitionRow } from '../types'

const programSchema = z.object({
  code: z.string().min(1, 'Code is required').max(40),
  name: z.string().min(1, 'Name is required'),
  denominator_label: z.string().min(1, 'Required'),
  count_label: z.string().min(1, 'Required'),
  is_cumulative: z.boolean(),
  sort_order: z.number().int().min(0),
  active: z.boolean(),
})

type ProgramFormValues = z.infer<typeof programSchema>

export function ProgramsConfigTab() {
  const { data: items = [], isLoading } = useAllPrograms()
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<ProgramDefinitionRow | null>(null)
  const [deleting, setDeleting] = useState<ProgramDefinitionRow | null>(null)

  const handleNew = () => {
    setEditing(null)
    setEditOpen(true)
  }

  const handleEdit = (row: ProgramDefinitionRow) => {
    setEditing(row)
    setEditOpen(true)
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <h3 className='text-lg font-bold tracking-tight'>Programs</h3>
          <p className='mt-0.5 text-xs text-muted-foreground'>
            Definisi program bulanan kelompok untuk pelaporan.
          </p>
        </div>
        <Button onClick={handleNew} size='sm'>
          <Plus className='mr-1.5 h-4 w-4' />
          Tambah Program
        </Button>
      </div>

      {isLoading ? (
        <div className='flex items-center justify-center rounded-md border py-12 text-muted-foreground'>
          <Loader2 className='mr-2 h-5 w-5 animate-spin' />
          Memuat...
        </div>
      ) : items.length === 0 ? (
        <div className='rounded-md border border-dashed bg-muted/10 p-12 text-center text-sm text-muted-foreground'>
          Belum ada program. Klik "Tambah Program" untuk memulai.
        </div>
      ) : (
        <div className='overflow-hidden rounded-md border border-border/70 bg-card shadow-sm'>
          <Table>
            <TableHeader className='bg-muted/30'>
              <TableRow>
                <TableHead className='w-[150px]'>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Denominator</TableHead>
                <TableHead>Count Label</TableHead>
                <TableHead className='w-[120px] text-center'>
                  Cumulative
                </TableHead>
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
                  <TableCell>{r.denominator_label}</TableCell>
                  <TableCell>{r.count_label}</TableCell>
                  <TableCell className='text-center'>
                    {r.is_cumulative ? (
                      <span className='inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary'>
                        Cumulative
                      </span>
                    ) : (
                      <span className='text-xs text-muted-foreground/60'>
                        -
                      </span>
                    )}
                  </TableCell>
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

      <ProgramFormDialog
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
            <AlertDialogTitle>Hapus program?</AlertDialogTitle>
            <AlertDialogDescription>
              Program <strong>{deleting?.name}</strong> akan dihapus. Laporan
              bulanan yang sudah ada untuk program ini akan tetap tersimpan tapi
              tidak bisa diisi ulang.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <DeleteProgramButton
              row={deleting}
              onDone={() => setDeleting(null)}
            />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function DeleteProgramButton({
  row,
  onDone,
}: {
  row: ProgramDefinitionRow | null
  onDone: () => void
}) {
  const del = useDeleteProgram()
  if (!row) return null
  return (
    <AlertDialogAction
      onClick={() =>
        del.mutate(row.id, {
          onSuccess: () => {
            toast.success('Program dihapus')
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
  editing: ProgramDefinitionRow | null
}

function ProgramFormDialog({ open, onOpenChange, editing }: FormDialogProps) {
  const create = useCreateProgram()
  const update = useUpdateProgram()

  const form = useForm<ProgramFormValues>({
    resolver: zodResolver(programSchema),
    values: editing
      ? {
          code: editing.code,
          name: editing.name,
          denominator_label: editing.denominator_label,
          count_label: editing.count_label,
          is_cumulative: editing.is_cumulative,
          sort_order: editing.sort_order,
          active: editing.active,
        }
      : {
          code: '',
          name: '',
          denominator_label: '',
          count_label: '',
          is_cumulative: false,
          sort_order: 100,
          active: true,
        },
  })

  const onSubmit = (values: ProgramFormValues) => {
    if (editing) {
      update.mutate(
        { id: editing.id, patch: values },
        {
          onSuccess: () => {
            toast.success('Program diupdate')
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
          toast.success('Program dibuat')
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
            {editing ? 'Edit Program' : 'Tambah Program'}
          </DialogTitle>
          <DialogDescription>
            Definisikan program dengan label denominator dan count.
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
                      placeholder='TURBA_GPN'
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
            <div className='grid gap-3 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='denominator_label'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Denominator Label</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder='Sensus GPN' />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='count_label'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Count Label</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder='Tervisit' />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
                name='is_cumulative'
                render={({ field }) => (
                  <FormItem className='flex items-center gap-2'>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <Label>Cumulative (tahunan)</Label>
                  </FormItem>
                )}
              />
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

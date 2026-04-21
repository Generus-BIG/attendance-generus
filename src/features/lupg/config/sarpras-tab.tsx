import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
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
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
  useAllSarprasItems,
  useCreateSarprasItem,
  useDeleteSarprasItem,
  useUpdateSarprasItem,
} from '../hooks/use-lupg-queries'
import { type SarprasItemRow } from '../types'

const sarprasSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sort_order: z.number().int().min(0),
  active: z.boolean(),
})

type SarprasFormValues = z.infer<typeof sarprasSchema>

export function SarprasConfigTab() {
  const { data: items = [], isLoading } = useAllSarprasItems()
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<SarprasItemRow | null>(null)
  const [deleting, setDeleting] = useState<SarprasItemRow | null>(null)

  const handleNew = () => {
    setEditing(null)
    setEditOpen(true)
  }

  const handleEdit = (row: SarprasItemRow) => {
    setEditing(row)
    setEditOpen(true)
  }

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <div>
          <CardTitle>Sarpras Items</CardTitle>
        </div>
        <Button onClick={handleNew}>
          <Plus className='mr-2 h-4 w-4' />
          Tambah
        </Button>
      </CardHeader>
      <CardContent className='overflow-x-auto'>
        {isLoading ? (
          <div className='text-muted-foreground flex items-center justify-center py-8'>
            <Loader2 className='mr-2 h-5 w-5 animate-spin' />
            Memuat...
          </div>
        ) : items.length === 0 ? (
          <div className='text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm'>
            Belum ada item sarpras.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className='text-center'>Sort</TableHead>
                <TableHead className='text-center'>Active</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className='font-medium'>{r.name}</TableCell>
                  <TableCell className='text-center tabular-nums'>
                    {r.sort_order}
                  </TableCell>
                  <TableCell className='text-center'>
                    {r.active ? '✓' : '-'}
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
                        className='h-8 w-8'
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
        )}
      </CardContent>

      <SarprasFormDialog
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
            <AlertDialogTitle>Hapus item sarpras?</AlertDialogTitle>
            <AlertDialogDescription>
              Item <strong>{deleting?.name}</strong> akan dihapus. Data laporan
              yang sudah tersimpan tidak akan terhapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <DeleteSarprasButton
              row={deleting}
              onDone={() => setDeleting(null)}
            />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

function DeleteSarprasButton({
  row,
  onDone,
}: {
  row: SarprasItemRow | null
  onDone: () => void
}) {
  const del = useDeleteSarprasItem()
  if (!row) return null
  return (
    <AlertDialogAction
      onClick={() =>
        del.mutate(row.id, {
          onSuccess: () => {
            toast.success('Item dihapus')
            onDone()
          },
          onError: (e: unknown) => {
            toast.error(e instanceof Error ? e.message : 'Gagal menghapus')
          },
        })
      }
    >
      {del.isPending ? (
        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
      ) : null}
      Hapus
    </AlertDialogAction>
  )
}

interface FormDialogProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  editing: SarprasItemRow | null
}

function SarprasFormDialog({ open, onOpenChange, editing }: FormDialogProps) {
  const create = useCreateSarprasItem()
  const update = useUpdateSarprasItem()

  const form = useForm<SarprasFormValues>({
    resolver: zodResolver(sarprasSchema),
    values: editing
      ? {
          name: editing.name,
          sort_order: editing.sort_order,
          active: editing.active,
        }
      : {
          name: '',
          sort_order: 100,
          active: true,
        },
  })

  const onSubmit = (values: SarprasFormValues) => {
    if (editing) {
      update.mutate(
        { id: editing.id, patch: values },
        {
          onSuccess: () => {
            toast.success('Item diupdate')
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
          toast.success('Item dibuat')
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
            {editing ? 'Edit Sarpras Item' : 'Tambah Sarpras Item'}
          </DialogTitle>
          <DialogDescription>
            Definisikan item sarana & prasarana.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='flex flex-col gap-3'
          >
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder='Papan Tulis' />
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
                {isPending && (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                )}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

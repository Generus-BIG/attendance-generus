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
  FormDescription,
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
import { Textarea } from '@/components/ui/textarea'
import {
  useAllMustinTemplates,
  useCreateMustinTemplate,
  useDeleteMustinTemplate,
  useUpdateMustinTemplate,
} from '../hooks/use-lupg-queries'
import { type MustinTemplateRow } from '../types'

const templateSchema = z.object({
  code: z
    .string()
    .min(1, 'Code wajib diisi')
    .max(60)
    .regex(
      /^[A-Z0-9_]+$/,
      'Hanya huruf kapital, angka, dan underscore'
    ),
  label: z.string().min(1, 'Label wajib diisi'),
  sub_items_text: z.string(),
  placeholder: z.string(),
  sort_order: z.number().int().min(0),
  active: z.boolean(),
})

type TemplateFormValues = z.infer<typeof templateSchema>

function parseSubItems(raw: string): string[] | null {
  const items = raw
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  return items.length > 0 ? items : null
}

function subItemsToText(value: MustinTemplateRow['sub_items']): string {
  if (!Array.isArray(value)) return ''
  return value.filter((v): v is string => typeof v === 'string').join('\n')
}

function subItemsArray(value: MustinTemplateRow['sub_items']): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string')
}

export function MustinTemplatesConfigTab() {
  const { data: items = [], isLoading } = useAllMustinTemplates()
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<MustinTemplateRow | null>(null)
  const [deleting, setDeleting] = useState<MustinTemplateRow | null>(null)

  const handleNew = () => {
    setEditing(null)
    setEditOpen(true)
  }

  const handleEdit = (row: MustinTemplateRow) => {
    setEditing(row)
    setEditOpen(true)
  }

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <div>
          <CardTitle>Template Resume Mustin</CardTitle>
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
            Belum ada template.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Sub-items</TableHead>
                <TableHead className='text-center'>Sort</TableHead>
                <TableHead className='text-center'>Active</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r) => {
                const subs = subItemsArray(r.sub_items)
                return (
                  <TableRow key={r.id}>
                    <TableCell className='font-mono text-xs'>{r.code}</TableCell>
                    <TableCell className='font-medium'>{r.label}</TableCell>
                    <TableCell
                      className='text-muted-foreground text-xs'
                      title={subs.join(', ')}
                    >
                      {subs.length > 0 ? `${subs.length} item` : '-'}
                    </TableCell>
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
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <TemplateFormDialog
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
            <AlertDialogTitle>Hapus template?</AlertDialogTitle>
            <AlertDialogDescription>
              Template <strong>{deleting?.label}</strong> akan dihapus.
              Catatan mustin yang sudah ada akan tetap tersimpan tapi tidak
              lagi terhubung ke template ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <DeleteTemplateButton
              row={deleting}
              onDone={() => setDeleting(null)}
            />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

function DeleteTemplateButton({
  row,
  onDone,
}: {
  row: MustinTemplateRow | null
  onDone: () => void
}) {
  const del = useDeleteMustinTemplate()
  if (!row) return null
  return (
    <AlertDialogAction
      onClick={() =>
        del.mutate(row.id, {
          onSuccess: () => {
            toast.success('Template dihapus')
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
  editing: MustinTemplateRow | null
}

function TemplateFormDialog({ open, onOpenChange, editing }: FormDialogProps) {
  const create = useCreateMustinTemplate()
  const update = useUpdateMustinTemplate()

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    values: editing
      ? {
          code: editing.code,
          label: editing.label,
          sub_items_text: subItemsToText(editing.sub_items),
          placeholder: editing.placeholder ?? '',
          sort_order: editing.sort_order,
          active: editing.active,
        }
      : {
          code: '',
          label: '',
          sub_items_text: '',
          placeholder: '',
          sort_order: 100,
          active: true,
        },
  })

  const onSubmit = (values: TemplateFormValues) => {
    const payload = {
      code: values.code,
      label: values.label,
      sub_items: parseSubItems(values.sub_items_text),
      placeholder: values.placeholder.trim() || null,
      sort_order: values.sort_order,
      active: values.active,
    }
    if (editing) {
      update.mutate(
        { id: editing.id, patch: payload },
        {
          onSuccess: () => {
            toast.success('Template diupdate')
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
          toast.success('Template dibuat')
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
      <DialogContent className='sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle>
            {editing ? 'Edit Template Mustin' : 'Tambah Template Mustin'}
          </DialogTitle>
          <DialogDescription>
            Template topik pembahasan untuk Resume Mustin. TM akan mengisi
            findings/keputusan berdasarkan struktur ini.
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
                      placeholder='MONITORING_29_KARAKTER'
                      disabled={!!editing}
                    />
                  </FormControl>
                  <FormDescription className='text-xs'>
                    Identifier stabil. Huruf kapital, angka, underscore. Tidak
                    bisa diubah setelah dibuat.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='label'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label (Judul Pokok Pembahasan)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder='MONITORING 29 KARAKTER GENERUS'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='sub_items_text'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sub-items (opsional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={5}
                      placeholder={'ACR\nAPR\nAR\nGPN-A\nGPN-B'}
                    />
                  </FormControl>
                  <FormDescription className='text-xs'>
                    Satu baris = satu sub-item. Ditampilkan sebagai bullet a, b,
                    c... di bawah label. Biarkan kosong jika topik tidak punya
                    sub-bullet.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='placeholder'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Placeholder Findings (opsional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={3}
                      placeholder='Tulis temuan untuk: a. ACR — ...; b. APR — ...'
                    />
                  </FormControl>
                  <FormDescription className='text-xs'>
                    Teks bantuan yang muncul di textarea TM sebelum mereka
                    mulai mengetik. Kosongkan untuk pakai placeholder default.
                  </FormDescription>
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

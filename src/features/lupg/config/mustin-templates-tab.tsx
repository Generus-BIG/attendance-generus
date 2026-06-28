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
    .regex(/^[A-Z0-9_]+$/, 'Hanya huruf kapital, angka, dan underscore'),
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
    <div className='space-y-4'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <h3 className='text-lg font-bold tracking-tight'>
            Template Resume Mustin
          </h3>
          <p className='mt-0.5 text-xs text-muted-foreground'>
            Template topik pembahasan untuk Resume Mustin bulanan kelompok.
          </p>
        </div>
        <Button onClick={handleNew} size='sm'>
          <Plus className='mr-1.5 h-4 w-4' />
          Tambah Topik
        </Button>
      </div>

      {isLoading ? (
        <div className='flex items-center justify-center rounded-md border py-12 text-muted-foreground'>
          <Loader2 className='mr-2 h-5 w-5 animate-spin' />
          Memuat...
        </div>
      ) : items.length === 0 ? (
        <div className='rounded-md border border-dashed bg-muted/10 p-12 text-center text-sm text-muted-foreground'>
          Belum ada template. Klik "Tambah Topik" untuk memulai.
        </div>
      ) : (
        <div className='overflow-hidden rounded-md border border-border/70 bg-card shadow-sm'>
          <Table>
            <TableHeader className='bg-muted/30'>
              <TableRow>
                <TableHead className='w-[150px]'>Code</TableHead>
                <TableHead>Label</TableHead>
                <TableHead className='w-[150px]'>Sub-items</TableHead>
                <TableHead className='w-[100px] text-center'>Sort</TableHead>
                <TableHead className='w-[100px] text-center'>Active</TableHead>
                <TableHead className='w-[80px]'></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r) => {
                const subs = subItemsArray(r.sub_items)
                return (
                  <TableRow key={r.id}>
                    <TableCell className='font-mono text-xs text-muted-foreground'>
                      {r.code}
                    </TableCell>
                    <TableCell className='font-medium'>{r.label}</TableCell>
                    <TableCell
                      className='text-xs text-muted-foreground'
                      title={subs.join(', ')}
                    >
                      {subs.length > 0 ? (
                        <span className='inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary'>
                          {subs.length} item
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
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

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
              Template <strong>{deleting?.label}</strong> akan dihapus. Catatan
              mustin yang sudah ada akan tetap tersimpan tapi tidak lagi
              terhubung ke template ini.
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
    </div>
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
      {del.isPending ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
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
                    Teks bantuan yang muncul di textarea TM sebelum mereka mulai
                    mengetik. Kosongkan untuk pakai placeholder default.
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

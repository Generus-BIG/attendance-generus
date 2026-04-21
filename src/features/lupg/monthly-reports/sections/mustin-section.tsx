import { useState } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  useMustinNotes,
  useCreateMustinNote,
  useUpdateMustinNote,
  useDeleteMustinNote,
} from '../../hooks/use-lupg-queries'
import {
  type MonthlyReportRow,
  type MustinNoteRow,
  type MustinStatus,
} from '../../types'
import { MUSTIN_STATUS_LABELS } from '../../constants'

interface Props {
  report: MonthlyReportRow
  readOnly: boolean
}

export function MustinSection({ report, readOnly }: Props) {
  const { data: notes = [] } = useMustinNotes(report.id)
  const create = useCreateMustinNote()

  const handleAdd = () => {
    create.mutate(
      {
        monthly_report_id: report.id,
        pokok_masalah: '',
        keputusan_rencana: '',
        sort_order: notes.length * 10 + 100,
      },
      {
        onError: (e: unknown) => {
          toast.error(e instanceof Error ? e.message : 'Gagal menambah')
        },
      }
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex items-start justify-between'>
          <div>
            <CardTitle>Resume Mustin</CardTitle>
            <CardDescription>
              Daftar pokok masalah dan keputusan bulan ini.
            </CardDescription>
          </div>
          {!readOnly && (
            <Button
              onClick={handleAdd}
              size='sm'
              disabled={create.isPending}
            >
              {create.isPending ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <Plus className='mr-2 h-4 w-4' />
              )}
              Tambah
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>
        {notes.length === 0 ? (
          <div className='rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground'>
            Belum ada. Klik "Tambah" untuk mulai.
          </div>
        ) : (
          notes.map((note) => (
            <MustinRow
              key={note.id}
              note={note}
              monthlyReportId={report.id}
              readOnly={readOnly}
            />
          ))
        )}
      </CardContent>
    </Card>
  )
}

interface RowProps {
  note: MustinNoteRow
  monthlyReportId: string
  readOnly: boolean
}

function MustinRow({ note, monthlyReportId, readOnly }: RowProps) {
  const update = useUpdateMustinNote()
  const del = useDeleteMustinNote()

  const [pokokMasalah, setPokokMasalah] = useState(note.pokok_masalah)
  const [keputusan, setKeputusan] = useState(note.keputusan_rencana)
  const [pic, setPic] = useState(note.pic ?? '')
  const [deadline, setDeadline] = useState(note.deadline ?? '')
  const [status, setStatus] = useState<MustinStatus>(
    note.status as MustinStatus
  )

  const save = (override?: Partial<{ status: MustinStatus }>) => {
    update.mutate(
      {
        id: note.id,
        monthlyReportId,
        patch: {
          pokok_masalah: pokokMasalah,
          keputusan_rencana: keputusan,
          pic: pic || null,
          deadline: deadline || null,
          status: override?.status ?? status,
        },
      },
      {
        onError: (e: unknown) => {
          toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
        },
      }
    )
  }

  const handleDelete = () => {
    del.mutate(
      { id: note.id, monthlyReportId },
      {
        onError: (e: unknown) => {
          toast.error(e instanceof Error ? e.message : 'Gagal menghapus')
        },
      }
    )
  }

  return (
    <div className='rounded-md border p-3'>
      <div className='grid gap-3 sm:grid-cols-2'>
        <div className='flex flex-col gap-1'>
          <Label>Pokok Masalah</Label>
          <Textarea
            value={pokokMasalah}
            onChange={(e) => setPokokMasalah(e.target.value)}
            onBlur={() => save()}
            disabled={readOnly}
            rows={3}
          />
        </div>
        <div className='flex flex-col gap-1'>
          <Label>Keputusan / Rencana</Label>
          <Textarea
            value={keputusan}
            onChange={(e) => setKeputusan(e.target.value)}
            onBlur={() => save()}
            disabled={readOnly}
            rows={3}
          />
        </div>
        <div className='flex flex-col gap-1'>
          <Label>PIC</Label>
          <Input
            value={pic}
            onChange={(e) => setPic(e.target.value)}
            onBlur={() => save()}
            disabled={readOnly}
          />
        </div>
        <div className='flex flex-col gap-1'>
          <Label>Deadline</Label>
          <Input
            type='date'
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            onBlur={() => save()}
            disabled={readOnly}
          />
        </div>
        <div className='flex flex-col gap-1'>
          <Label>Status</Label>
          <Select
            value={status}
            onValueChange={(v) => {
              const next = v as MustinStatus
              setStatus(next)
              save({ status: next })
            }}
            disabled={readOnly}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(MUSTIN_STATUS_LABELS) as MustinStatus[]).map(
                (s) => (
                  <SelectItem key={s} value={s}>
                    {MUSTIN_STATUS_LABELS[s]}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
        {!readOnly && (
          <div className='flex items-end justify-end'>
            <Button
              variant='ghost'
              size='sm'
              onClick={handleDelete}
              disabled={del.isPending}
            >
              <Trash2 className='mr-1 h-4 w-4' />
              Hapus
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

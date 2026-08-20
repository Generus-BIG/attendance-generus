import { useState } from 'react'
import { parse } from 'date-fns'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/page-header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  useCreatePhqParticipant,
  useDeletePhqParticipant,
  usePhqParticipants,
  useUpdatePhqParticipant,
} from '../hooks/use-lupg-queries'
import { type PhqParticipantRow } from '../types'
import { PhqScopeControls } from './components/phq-scope-controls'
import { usePhqKelompokScope } from './components/use-phq-kelompok-scope'

const categories = ['ACR', 'APR', 'AR', 'GPN_A', 'GPN_B']
type FormValues = Omit<
  PhqParticipantRow,
  'id' | 'kelompok_id' | 'created_at' | 'updated_at' | 'birth_date'
> & { birth_date: string }
const emptyForm: FormValues = {
  name: '',
  category_code: 'ACR',
  gender: 'L',
  status_active: true,
  birth_date: '',
  highest_juz: null,
  highest_surat: null,
  highest_ayat_from: null,
  highest_ayat_to: null,
  highest_juz_mastery_percent: null,
}
const toForm = (row: PhqParticipantRow): FormValues => ({
  ...row,
  birth_date: row.birth_date ?? '',
})
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Gagal menyimpan peserta PHQ.'

interface Props {
  initialMonthKey: string
  initialKelompokId?: string
}
export function PhqParticipantsPage({
  initialMonthKey,
  initialKelompokId,
}: Props) {
  const [monthKey, setMonthKey] = useState(initialMonthKey)
  const [kelompokId, setKelompokId] = useState<string | undefined>(
    initialKelompokId
  )
  const [dialogRow, setDialogRow] = useState<
    PhqParticipantRow | null | undefined
  >(undefined)
  const scope = usePhqKelompokScope(kelompokId)
  const { data: participants = [], isLoading } = usePhqParticipants(
    scope.kelompokId
  )
  const create = useCreatePhqParticipant()
  const update = useUpdatePhqParticipant()
  const remove = useDeletePhqParticipant()
  const close = () => setDialogRow(undefined)
  const save = async (values: FormValues) => {
    if (!scope.kelompokId) return
    try {
      const patch = {
        ...values,
        birth_date: values.birth_date
          ? parse(values.birth_date, 'yyyy-MM-dd', new Date())
          : null,
      }
      if (dialogRow)
        await update.mutateAsync({
          id: dialogRow.id,
          patch,
          kelompokId: scope.kelompokId,
          month: monthKey,
        })
      else
        await create.mutateAsync({
          ...patch,
          kelompok_id: scope.kelompokId,
          month: monthKey,
        })
      toast.success('Peserta PHQ disimpan.')
      close()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }
  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center gap-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <PageHeader
          kicker='LUPG · PHQ'
          title='Peserta PHQ'
          description='Roster master peserta dan snapshot hafalan tertinggi. Periode tampilan tidak memfilter roster.'
          actions={
            <>
              <PhqScopeControls
                monthKey={monthKey}
                onMonthChange={setMonthKey}
                kelompokId={kelompokId}
                onKelompokChange={setKelompokId}
              />
              <Button
                onClick={() => setDialogRow(null)}
                disabled={!scope.kelompokId}
              >
                <Plus data-icon='inline-start' />
                Tambah peserta
              </Button>
            </>
          }
        />
        {scope.isResolving ? (
          <Empty message='Memuat kelompok PHQ...' />
        ) : !scope.kelompokId ? (
          <Empty message='Pilih kelompok untuk melihat dan mengelola roster PHQ.' />
        ) : isLoading ? (
          <Empty message='Memuat peserta PHQ...' />
        ) : participants.length === 0 ? (
          <Empty message='Belum ada peserta PHQ pada kelompok ini.' />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Hafalan tertinggi</TableHead>
                <TableHead className='text-end'>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className='font-medium'>{row.name}</TableCell>
                  <TableCell>{row.category_code}</TableCell>
                  <TableCell>{row.gender}</TableCell>
                  <TableCell>
                    {row.status_active ? 'Aktif' : 'Nonaktif'}
                  </TableCell>
                  <TableCell>
                    {row.highest_juz
                      ? `Juz ${row.highest_juz}${row.highest_surat ? ` · ${row.highest_surat}` : ''}${row.highest_juz_mastery_percent !== null ? ` · ${row.highest_juz_mastery_percent}%` : ''}`
                      : '-'}
                  </TableCell>
                  <TableCell className='text-end'>
                    <Button
                      variant='ghost'
                      size='icon'
                      aria-label={`Edit ${row.name}`}
                      onClick={() => setDialogRow(row)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant='ghost'
                      size='icon'
                      aria-label={`Hapus ${row.name}`}
                      onClick={async () => {
                        if (
                          !confirm(
                            `Hapus ${row.name}? Progres dan absensi peserta ini juga akan dihapus; pertemuan tetap tersimpan.`
                          ) ||
                          !scope.kelompokId
                        )
                          return
                        try {
                          await remove.mutateAsync({
                            id: row.id,
                            kelompokId: scope.kelompokId,
                            month: monthKey,
                          })
                          toast.success('Peserta dihapus.')
                        } catch (error) {
                          toast.error(errorMessage(error))
                        }
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {dialogRow !== undefined && (
          <ParticipantDialog
            row={dialogRow}
            onClose={close}
            onSave={save}
            pending={create.isPending || update.isPending}
          />
        )}
      </Main>
    </>
  )
}
function Empty({ message }: { message: string }) {
  return (
    <div className='rounded-lg border border-dashed p-10 text-center text-muted-foreground'>
      {message}
    </div>
  )
}
function ParticipantDialog({
  row,
  onClose,
  onSave,
  pending,
}: {
  row: PhqParticipantRow | null
  onClose: () => void
  onSave: (values: FormValues) => void
  pending: boolean
}) {
  const [values, setValues] = useState<FormValues>(
    row ? toForm(row) : emptyForm
  )
  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }))
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-h-[calc(100dvh-2rem)] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>
            {row ? 'Edit peserta PHQ' : 'Tambah peserta PHQ'}
          </DialogTitle>
          <DialogDescription>
            Kelompok peserta ditetapkan saat dibuat dan tidak dapat diubah.
          </DialogDescription>
        </DialogHeader>
        <form
          id='phq-participant-form'
          className='grid gap-4 sm:grid-cols-2'
          onSubmit={(event) => {
            event.preventDefault()
            if (!values.name.trim())
              return toast.error('Nama peserta wajib diisi.')
            onSave(values)
          }}
        >
          <label className='grid gap-2 sm:col-span-2'>
            Nama
            <Input
              value={values.name}
              onChange={(event) => set('name', event.target.value)}
              required
            />
          </label>
          <label className='grid gap-2'>
            Kategori
            <Select
              value={values.category_code}
              onValueChange={(value) => set('category_code', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>
          <label className='grid gap-2'>
            Gender
            <Select
              value={values.gender}
              onValueChange={(value) => set('gender', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value='L'>Laki-laki</SelectItem>
                  <SelectItem value='P'>Perempuan</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>
          <label className='grid gap-2'>
            Tanggal lahir
            <Input
              type='date'
              value={values.birth_date}
              onChange={(event) => set('birth_date', event.target.value)}
            />
          </label>
          <label className='grid gap-2'>
            Status
            <Select
              value={values.status_active ? 'active' : 'inactive'}
              onValueChange={(value) =>
                set('status_active', value === 'active')
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value='active'>Aktif</SelectItem>
                  <SelectItem value='inactive'>Nonaktif</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>
          <label className='grid gap-2'>
            Juz tertinggi
            <Input
              type='number'
              min='1'
              max='30'
              value={values.highest_juz ?? ''}
              onChange={(event) =>
                set(
                  'highest_juz',
                  event.target.value ? Number(event.target.value) : null
                )
              }
            />
          </label>
          <label className='grid gap-2'>
            Surat tertinggi
            <Input
              value={values.highest_surat ?? ''}
              onChange={(event) =>
                set('highest_surat', event.target.value || null)
              }
            />
          </label>
          <label className='grid gap-2'>
            Ayat awal
            <Input
              type='number'
              min='1'
              value={values.highest_ayat_from ?? ''}
              onChange={(event) =>
                set(
                  'highest_ayat_from',
                  event.target.value ? Number(event.target.value) : null
                )
              }
            />
          </label>
          <label className='grid gap-2'>
            Ayat akhir
            <Input
              type='number'
              min='1'
              value={values.highest_ayat_to ?? ''}
              onChange={(event) =>
                set(
                  'highest_ayat_to',
                  event.target.value ? Number(event.target.value) : null
                )
              }
            />
          </label>
          <label className='grid gap-2 sm:col-span-2'>
            Penguasaan juz (%)
            <Input
              type='number'
              min='0'
              max='100'
              step='0.01'
              value={values.highest_juz_mastery_percent ?? ''}
              onChange={(event) =>
                set(
                  'highest_juz_mastery_percent',
                  event.target.value ? Number(event.target.value) : null
                )
              }
            />
          </label>
        </form>
        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Batal
          </Button>
          <Button type='submit' form='phq-participant-form' disabled={pending}>
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

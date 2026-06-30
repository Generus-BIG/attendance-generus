import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { exportToExcel } from '@/lib/export'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useParticipantsCRUD } from '../context/participants-context'
import { useParticipants } from './participants-provider'

export function ExportParticipantsDialog() {
  const { open, setOpen } = useParticipants()
  const { participants } = useParticipantsCRUD()
  const isOpen = open === 'export'

  const role = useAuthStore((s) => s.auth.role)
  const userKelompok = useAuthStore((s) => s.auth.kelompok)

  // Form states
  const [selectedKelompok, setSelectedKelompok] = useState<string>('all')
  const [selectedKategori, setSelectedKategori] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedGender, setSelectedGender] = useState<string>('all')
  const [isExporting, setIsExporting] = useState(false)

  // Extract kelompok options from participants
  const [kelompokOptions, setKelompokOptions] = useState<string[]>([])
  useEffect(() => {
    if (isOpen && participants.length > 0) {
      const groups = new Set<string>()
      participants.forEach((p) => {
        if (p.kelompok) groups.add(p.kelompok)
      })
      setKelompokOptions(Array.from(groups).sort())
    }
  }, [isOpen, participants])

  // Reset fields when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedKelompok('all')
      setSelectedKategori('all')
      setSelectedStatus('all')
      setSelectedGender('all')
    }
  }, [isOpen])

  const handleExportSubmit = async () => {
    setIsExporting(true)
    try {
      if (participants.length === 0) {
        toast.info('Tidak ada data peserta untuk diexport')
        setIsExporting(false)
        return
      }

      // Client-side filtering
      const filtered = participants.filter((p) => {
        // Team Manager Scoping Check
        if (role === 'team_manager' && userKelompok) {
          if (p.kelompok !== userKelompok) return false
        } else if (selectedKelompok !== 'all') {
          if (p.kelompok !== selectedKelompok) return false
        }

        // Category check
        if (selectedKategori !== 'all') {
          if (p.kategori !== selectedKategori) return false
        }

        // Status check
        if (selectedStatus !== 'all') {
          if (p.status !== selectedStatus) return false
        }

        // Gender check
        if (selectedGender !== 'all') {
          if (p.gender !== selectedGender) return false
        }

        return true
      })

      if (filtered.length === 0) {
        toast.info('Tidak ada data peserta yang cocok dengan filter')
        setIsExporting(false)
        return
      }

      // Format export data
      const dataToExport = filtered.map((p) => ({
        Nama: p.name || '-',
        Kelompok: p.kelompok || '-',
        Kategori: p.kategori === 'A' ? 'GPN A' : p.kategori === 'B' ? 'GPN B' : p.kategori || '-',
        Gender: p.gender === 'L' ? 'Laki-laki' : 'Perempuan',
        Status: p.status === 'active' ? 'Aktif' : 'Nonaktif',
        'Tempat Lahir': p.birthPlace || '-',
        'Tanggal Lahir': p.birthDate ? format(p.birthDate, 'dd MMMM yyyy', { locale: idLocale }) : '-',
        'Tanggal Dibuat': p.createdAt instanceof Date ? format(p.createdAt, 'dd MMMM yyyy', { locale: idLocale }) : '-',
      }))

      // Subtitle meta
      const activeKelompokTitle =
        (role === 'team_manager' ? userKelompok : selectedKelompok !== 'all' ? selectedKelompok : 'Semua Kelompok') || undefined
      const activeKategoriTitle =
        selectedKategori !== 'all' ? (selectedKategori === 'A' ? 'GPN A' : selectedKategori === 'B' ? 'GPN B' : selectedKategori) : 'Semua Kategori'

      await exportToExcel(dataToExport, 'Daftar_Peserta_MuMiBig', {
        title: 'Laporan Daftar Peserta GPN',
        description: 'Daftar data detail peserta GPN MuMiBig.',
        metadata: {
          Kelompok: activeKelompokTitle,
          Kategori: activeKategoriTitle,
          Status: selectedStatus !== 'all' ? (selectedStatus === 'active' ? 'Aktif' : 'Nonaktif') : 'Semua Status',
          Gender: selectedGender !== 'all' ? (selectedGender === 'L' ? 'Laki-laki' : 'Perempuan') : 'Semua Gender',
          'Jumlah Peserta': `${filtered.length} Orang`,
          'Tanggal Unduh': format(new Date(), 'dd MMMM yyyy HH:mm', { locale: idLocale }),
        },
      })

      toast.success('Daftar peserta berhasil diexport')
      setOpen(null)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Export failed:', err)
      toast.error(`Gagal export peserta: ${err.message || 'Error tidak diketahui'}`)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Kustomisasi Export Peserta</DialogTitle>
          <DialogDescription>
            Pilih filter peserta untuk diunduh sebagai file Microsoft Excel (.xlsx).
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4 py-4'>
          {/* Kelompok (Admin Only) */}
          {role !== 'team_manager' && (
            <div className='grid gap-2'>
              <Label htmlFor='export-kelompok-p' className='text-[13px] font-medium'>
                Kelompok
              </Label>
              <Select value={selectedKelompok} onValueChange={setSelectedKelompok}>
                <SelectTrigger id='export-kelompok-p'>
                  <SelectValue placeholder='Pilih Kelompok' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Semua Kelompok</SelectItem>
                  {kelompokOptions.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Kategori */}
          <div className='grid gap-2'>
            <Label htmlFor='export-kategori-p' className='text-[13px] font-medium'>
              Kategori
            </Label>
            <Select value={selectedKategori} onValueChange={setSelectedKategori}>
              <SelectTrigger id='export-kategori-p'>
                <SelectValue placeholder='Pilih Kategori' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Semua Kategori</SelectItem>
                <SelectItem value='A'>GPN A</SelectItem>
                <SelectItem value='B'>GPN B</SelectItem>
                <SelectItem value='AR'>AR</SelectItem>
                <SelectItem value='APR'>APR</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className='grid gap-2'>
            <Label htmlFor='export-status-p' className='text-[13px] font-medium'>
              Status Keanggotaan
            </Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger id='export-status-p'>
                <SelectValue placeholder='Pilih Status' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Semua Status</SelectItem>
                <SelectItem value='active'>Aktif</SelectItem>
                <SelectItem value='inactive'>Nonaktif</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Gender */}
          <div className='grid gap-2'>
            <Label htmlFor='export-gender-p' className='text-[13px] font-medium'>
              Jenis Kelamin
            </Label>
            <Select value={selectedGender} onValueChange={setSelectedGender}>
              <SelectTrigger id='export-gender-p'>
                <SelectValue placeholder='Pilih Jenis Kelamin' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Semua Jenis Kelamin</SelectItem>
                <SelectItem value='L'>Laki-laki</SelectItem>
                <SelectItem value='P'>Perempuan</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => setOpen(null)} disabled={isExporting}>
            Batal
          </Button>
          <Button onClick={handleExportSubmit} disabled={isExporting} className='bg-[#9A3412] hover:bg-[#7C2D12] text-white'>
            {isExporting ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Memproses...
              </>
            ) : (
              'Unduh Excel'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

import { Download, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { exportToExcel } from '@/lib/export'
import { usePermissions } from '@/hooks/use-permissions'
import { Button } from '@/components/ui/button'
import { PermissionGate } from '@/components/permission-gate'
import { useParticipantsCRUD } from '../context/participants-context'
import { useParticipants } from './participants-provider'

export function ParticipantsPrimaryButtons() {
  const { setOpen } = useParticipants()
  const { participants } = useParticipantsCRUD()
  const { can } = usePermissions()

  const handleExport = async () => {
    try {
      const dataToExport = participants.map((p) => ({
        Nama: p.name || '-',
        Kelompok: p.kelompok || '-',
        Kategori: p.kategori || '-',
        Gender: p.gender === 'L' ? 'Laki-laki' : 'Perempuan',
        Status: p.status === 'active' ? 'Aktif' : 'Nonaktif',
        'Tanggal Dibuat':
          p.createdAt instanceof Date
            ? p.createdAt.toLocaleDateString('id-ID')
            : '-',
      }))
      await exportToExcel(dataToExport, 'Daftar_Peserta_GPN')
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Export peserta gagal:', error)
      toast.error('Gagal export daftar peserta')
    }
  }

  return (
    <div className='flex gap-2'>
      <Button
        variant='outline'
        className='space-x-1'
        onClick={handleExport}
        disabled={participants.length === 0}
      >
        <span>Export</span> <Download size={18} />
      </Button>
      <PermissionGate allowed={can.createParticipant}>
        <Button className='space-x-1' onClick={() => setOpen('add')}>
          <span>Tambah Peserta</span> <Plus size={18} />
        </Button>
      </PermissionGate>
    </div>
  )
}

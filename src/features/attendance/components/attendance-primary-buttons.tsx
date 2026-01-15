import { Download, Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { exportToExcel } from '@/lib/export'
import { getAttendanceList } from '../services'
import { useAttendance } from './attendance-provider'

export function AttendancePrimaryButtons() {
  const { setOpen } = useAttendance()
  const { data: attendanceData = [] } = useQuery({
    queryKey: ['attendance_list'],
    queryFn: getAttendanceList,
  })

  const handleExport = async () => {
    try {
      const dataToExport = attendanceData.map((item) => {
        const date = item.timestamp ? new Date(item.timestamp) : null
        return {
          Tanggal: date ? format(date, 'dd MMMM yyyy HH:mm', { locale: idLocale }) : '-',
          Nama: item.participant?.name || item.tempName || '-',
          Kelompok: item.participant?.kelompok || item.tempKelompok || '-',
          Kategori: item.participant?.kategori || item.tempKategori || '-',
          Gender: (item.participant?.gender || item.tempGender) === 'L' ? 'Laki-laki' : 'Perempuan',
          Status: (item.status || '').toUpperCase(),
          Alasan: item.permissionReason || '-',
          Keterangan: item.notes || '-',
          'Form Acara': item.form?.title || '-',
        }
      })
      await exportToExcel(dataToExport, 'Log_Absensi_GPN')
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Export absensi gagal:', error)
      toast.error('Gagal export log absensi')
    }
  }

  return (
    <div className='flex gap-2'>
      <Button
        variant='outline'
        className='space-x-1'
        onClick={handleExport}
        disabled={attendanceData.length === 0}
      >
        <span>Export</span> <Download size={18} />
      </Button>
      <Button className='space-x-1' onClick={() => setOpen('add')}>
        <span>Input Absensi</span> <Plus size={18} />
      </Button>
    </div>
  )
}

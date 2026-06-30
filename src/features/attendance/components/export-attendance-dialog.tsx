import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { toast } from 'sonner'
import { Loader2, Check, ChevronsUpDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth-store'
import { exportToExcel } from '@/lib/export'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/date-picker'
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAttendance } from './attendance-provider'

interface MultiSelectProps {
  label: string
  placeholder: string
  options: { label: string; value: string }[]
  selected: string[]
  onChange: (values: string[]) => void
}

function MultiSelect({ label, placeholder, options, selected, onChange }: MultiSelectProps) {
  const [open, setOpen] = useState(false)

  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const selectedLabels = selected
    .map((val) => options.find((opt) => opt.value === val)?.label)
    .filter(Boolean) as string[]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          className='w-full justify-between h-auto min-h-[38px] py-1.5 px-3 text-left font-normal hover:bg-background'
        >
          <div className='flex flex-wrap gap-1 items-center max-w-[90%]'>
            {selectedLabels.length === 0 ? (
              <span className='text-muted-foreground text-sm'>{placeholder}</span>
            ) : selectedLabels.length > 2 ? (
              <Badge variant='secondary' className='rounded-sm font-normal text-xs'>
                {selectedLabels.length} terpilih
              </Badge>
            ) : (
              selectedLabels.map((lbl) => (
                <Badge variant='secondary' key={lbl} className='rounded-sm font-normal text-xs'>
                  {lbl}
                </Badge>
              ))
            )}
          </div>
          <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50 self-center' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-80 p-0' align='start'>
        <Command>
          <CommandInput placeholder={`Cari ${label.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>Tidak ada hasil</CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  if (selected.length === options.length) {
                    onChange([])
                  } else {
                    onChange(options.map((o) => o.value))
                  }
                }}
                className='font-semibold border-b border-border mb-1 rounded-none py-2'
              >
                <div
                  className={cn(
                    'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                    selected.length === options.length
                      ? 'bg-[#9A3412] border-[#9A3412] text-white'
                      : 'opacity-50'
                  )}
                >
                  {selected.length === options.length && <Check className='h-3 w-3 text-white' />}
                </div>
                Pilih Semua
              </CommandItem>
              {options.map((option) => {
                const isSelected = selected.includes(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => handleToggle(option.value)}
                  >
                    <div
                      className={cn(
                        'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                        isSelected
                          ? 'bg-[#9A3412] border-[#9A3412] text-white'
                          : 'opacity-50'
                      )}
                    >
                      {isSelected && <Check className='h-3 w-3 text-white' />}
                    </div>
                    <span>{option.label}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function ExportAttendanceDialog() {
  const { open, setOpen } = useAttendance()
  const isOpen = open === 'export'

  const role = useAuthStore((s) => s.auth.role)
  const userKelompok = useAuthStore((s) => s.auth.kelompok)

  // Form states
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined)
  const [toDate, setToDate] = useState<Date | undefined>(undefined)
  const [selectedForms, setSelectedForms] = useState<string[]>([])
  const [selectedKelompoks, setSelectedKelompoks] = useState<string[]>([])
  const [selectedKategoris, setSelectedKategoris] = useState<string[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [isExporting, setIsExporting] = useState(false)

  // Fetch active forms for filter
  const { data: forms = [] } = useQuery({
    queryKey: ['export_attendance_forms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_forms')
        .select('id, title')
        .order('title', { ascending: true })

      if (error) throw error
      return data || []
    },
    enabled: isOpen,
  })

  // Fetch kelompok for filter (restricted to admin/super_admin)
  const { data: kelompokList = [] } = useQuery({
    queryKey: ['export_kelompok_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lookup_values')
        .select('id, value')
        .eq('type', 'GROUP')
        .order('value', { ascending: true })

      if (error) throw error
      return data || []
    },
    enabled: isOpen && role !== 'team_manager',
  })

  // Reset fields when dialog opens
  useEffect(() => {
    if (isOpen) {
      setFromDate(undefined)
      setToDate(undefined)
      setSelectedForms([])
      setSelectedKelompoks([])
      setSelectedKategoris([])
      setSelectedStatus('all')
    }
  }, [isOpen])

  const handleExportSubmit = async () => {
    setIsExporting(true)
    try {
      let query = supabase
        .from('attendance')
        .select(`
          *,
          participant:participants!attendance_participant_id_fkey(
            id,
            name,
            gender,
            group_id,
            category_id,
            group:group_id(value),
            category:category_id(value)
          ),
          form:form_id(title)
        `)
        .order('timestamp', { ascending: false })

      // Apply date filters in query
      if (fromDate) {
        query = query.gte('timestamp', `${format(fromDate, 'yyyy-MM-dd')}T00:00:00`)
      }
      if (toDate) {
        query = query.lte('timestamp', `${format(toDate, 'yyyy-MM-dd')}T23:59:59.999`)
      }
      
      // Apply forms filter in query if selected (using IN operator)
      if (selectedForms.length > 0) {
        query = query.in('form_id', selectedForms)
      }

      const { data, error } = await query
      if (error) throw error

      if (!data || data.length === 0) {
        toast.info('Tidak ada data absensi yang cocok dengan filter')
        setIsExporting(false)
        return
      }

      // Map DB category values to App categories (e.g. 'GPN A' -> 'A')
      const mapDbCategoryToLabel = (val: string) => {
        if (val === 'GPN A') return 'GPN A'
        if (val === 'GPN B') return 'GPN B'
        return val
      }

      // Client-side filtering for remaining conditions
      const filtered = data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => ({
          ...item,
          kelompok: item.participant?.group?.value || item.temp_group || '-',
          kategori: mapDbCategoryToLabel(item.participant?.category?.value || item.temp_category || '-'),
          gender: (item.participant?.gender || item.temp_gender) === 'L' ? 'Laki-laki' : 'Perempuan',
          status: item.status?.toUpperCase() || '-',
          name: item.participant?.name || item.temp_name || '-',
          kategoriRaw: item.participant?.category?.value || item.temp_category || '-', // for filter checks
          groupId: item.participant?.group_id || null,
        }))
        .filter((item) => {
          // Team Manager Scoping Check
          if (role === 'team_manager' && userKelompok) {
            if (item.kelompok !== userKelompok) return false
          } else if (selectedKelompoks.length > 0) {
            if (!item.groupId || !selectedKelompoks.includes(item.groupId)) return false
          }

          // Category check
          if (selectedKategoris.length > 0) {
            // Map selected values ('A', 'B', etc.) to DB lookup values
            const mappedSelected = selectedKategoris.map((kat) => 
              kat === 'A' ? 'GPN A' : kat === 'B' ? 'GPN B' : kat
            )
            if (!mappedSelected.includes(item.kategoriRaw) && !selectedKategoris.includes(item.kategoriRaw)) return false
          }

          // Status check
          if (selectedStatus !== 'all') {
            if (item.status.toLowerCase() !== selectedStatus.toLowerCase()) return false
          }

          return true
        })

      if (filtered.length === 0) {
        toast.info('Tidak ada data absensi yang cocok dengan filter detail')
        setIsExporting(false)
        return
      }

      // Format export data
      const dataToExport = filtered.map((item) => {
        const date = item.timestamp ? new Date(item.timestamp) : null
        return {
          Tanggal: date ? format(date, 'dd MMMM yyyy HH:mm', { locale: idLocale }) : '-',
          Nama: item.name,
          Kelompok: item.kelompok,
          Kategori: item.kategori,
          Gender: item.gender,
          Status: item.status === 'HADIR' ? 'Hadir' : 'Izin',
          'Alasan Izin': item.permission_reason || '-',
          Keterangan: item.permission_description || '-',
          'Form Acara': item.form?.title || '-',
        }
      })

      // Title description
      const periodLabel =
        fromDate && toDate
          ? `${format(fromDate, 'dd MMM yyyy')} - ${format(toDate, 'dd MMM yyyy')}`
          : fromDate
            ? `Mulai ${format(fromDate, 'dd MMM yyyy')}`
            : toDate
              ? `Hingga ${format(toDate, 'dd MMM yyyy')}`
              : 'Semua Periode'

      const activeFormTitle =
        selectedForms.length === 0
          ? 'Semua Form'
          : selectedForms.map((id) => forms.find((f) => f.id === id)?.title).filter(Boolean).join(', ')

      const activeKelompokTitle =
        role === 'team_manager'
          ? userKelompok
          : selectedKelompoks.length === 0
            ? 'Semua Kelompok'
            : selectedKelompoks.map((id) => kelompokList.find((k) => k.id === id)?.value).filter(Boolean).join(', ')

      const activeKategoriTitle =
        selectedKategoris.length === 0
          ? 'Semua Kategori'
          : selectedKategoris.map((kat) => (kat === 'A' ? 'GPN A' : kat === 'B' ? 'GPN B' : kat)).join(', ')

      await exportToExcel(dataToExport, 'Log_Absensi_MuMiBig', {
        title: 'Laporan Log Kehadiran Peserta',
        description: 'Laporan rekap log absensi kehadiran kegiatan GPN MuMiBig.',
        metadata: {
          Periode: periodLabel,
          Formulir: activeFormTitle,
          Kelompok: activeKelompokTitle || '-',
          Kategori: activeKategoriTitle,
          Status: selectedStatus !== 'all' ? (selectedStatus === 'HADIR' ? 'Hadir' : 'Izin') : 'Semua Status',
          'Tanggal Unduh': format(new Date(), 'dd MMMM yyyy HH:mm', { locale: idLocale }),
        },
      })

      toast.success('Log absensi berhasil diexport')
      setOpen(null)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Export failed:', err)
      toast.error(`Gagal export absensi: ${err.message || 'Error tidak diketahui'}`)
    } finally {
      setIsExporting(false)
    }
  }

  // Map forms for MultiSelect component
  const formOptions = forms.map((f) => ({ label: f.title, value: f.id }))
  
  // Map kelompok for MultiSelect component
  const kelompokOptions = kelompokList.map((k) => ({ label: k.value, value: k.id }))

  // Kategori options
  const kategoriOptions = [
    { label: 'GPN A', value: 'A' },
    { label: 'GPN B', value: 'B' },
    { label: 'AR', value: 'AR' },
    { label: 'APR', value: 'APR' },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Customize Export Attendance</DialogTitle>
          <DialogDescription>
            Pilih filter absensi untuk diunduh sebagai file Microsoft Excel (.xlsx).
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4 py-4'>
          {/* Rentang Waktu */}
          <div className='grid gap-2'>
            <Label className='text-[13px] font-medium'>Rentang Waktu</Label>
            <div className='flex flex-col sm:flex-row sm:items-center gap-2'>
              <DatePicker
                selected={fromDate}
                onSelect={setFromDate}
                placeholder='Mulai Dari'
                className='w-full sm:flex-1'
              />
              <span className='hidden sm:inline text-muted-foreground text-xs self-center'>—</span>
              <DatePicker
                selected={toDate}
                onSelect={setToDate}
                placeholder='Hingga'
                className='w-full sm:flex-1'
              />
            </div>
          </div>

          {/* Form Acara (MultiSelect) */}
          <div className='grid gap-2'>
            <Label className='text-[13px] font-medium'>Form Acara</Label>
            <MultiSelect
              label='Form'
              placeholder='Semua Form'
              options={formOptions}
              selected={selectedForms}
              onChange={setSelectedForms}
            />
          </div>

          {/* Kelompok (MultiSelect, Admin Only) */}
          {role !== 'team_manager' && (
            <div className='grid gap-2'>
              <Label className='text-[13px] font-medium'>Kelompok</Label>
              <MultiSelect
                label='Kelompok'
                placeholder='Semua Kelompok'
                options={kelompokOptions}
                selected={selectedKelompoks}
                onChange={setSelectedKelompoks}
              />
            </div>
          )}

          {/* Kategori (MultiSelect) */}
          <div className='grid gap-2'>
            <Label className='text-[13px] font-medium'>Kategori</Label>
            <MultiSelect
              label='Kategori'
              placeholder='Semua Kategori'
              options={kategoriOptions}
              selected={selectedKategoris}
              onChange={setSelectedKategoris}
            />
          </div>

          {/* Status */}
          <div className='grid gap-2'>
            <Label htmlFor='export-status' className='text-[13px] font-medium'>
              Status Kehadiran
            </Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger id='export-status'>
                <SelectValue placeholder='Pilih Status' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Semua Status</SelectItem>
                <SelectItem value='HADIR'>Hadir</SelectItem>
                <SelectItem value='IZIN'>Izin</SelectItem>
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

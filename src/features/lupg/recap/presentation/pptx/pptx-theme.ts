import {
  formatMonthLabel,
  isCalendarMonthKey,
} from '../../../utils/month-utils'
import { type PresentationData } from '../slides'

export function presentationFilename(
  data: Pick<PresentationData, 'monthKey' | 'kelompokFilter' | 'kelompokList'>
) {
  if (!isCalendarMonthKey(data.monthKey))
    throw new Error('Bulan laporan tidak valid.')
  const kelompok = data.kelompokList.find((k) => k.id === data.kelompokFilter)
  if (data.kelompokFilter && !kelompok)
    throw new Error('Kelompok belum tersedia. Pilih kelompok kembali.')
  const name = kelompok
    ? `Lap. Mustin LUPG-${kelompok.value}`
    : 'Laporan Pembinaan Generus BIG'
  return `${`${name} ${formatMonthLabel(data.monthKey)}`
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/[ .]+$/g, '')}.pptx`
}

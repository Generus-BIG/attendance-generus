export const captureFixture = {
  monthKey: '2026-07',
  kelompokList: [
    { id: 'a', value: 'Kel. Alpha' },
    { id: 'b', value: 'Kel. Beta' },
  ],
  reports: [
    { id: 'r', kelompok_id: 'a', month: '2026-07-01', status: 'draft' },
  ],
  programs: [
    {
      code: 'GOMA',
      name: 'Gerakan Orang Tua Mengajar Al Quran',
      reporting_style: 'quarterly',
    },
    {
      code: 'GMKM',
      name: 'Gerakan Mengajak Keluarga Mengaji',
      reporting_style: 'quarterly',
    },
    {
      code: 'NIKAH_JM',
      name: 'Nikah Sesama Jamaah',
      reporting_style: 'monthly',
    },
  ],
  metrics: [{ code: 'ATT_PCT_ACR', name: 'Kehadiran ACR' }],
  sarprasItems: [{ id: 's', name: 'Papan tulis', active: true, sort_order: 1 }],
  sensusCells: [
    { kelompok_id: 'a', category_code: 'ACR', gender: 'L', count: 15 },
    { kelompok_id: 'a', category_code: 'ACR', gender: 'P', count: 10 },
  ],
  programReports: [],
  metricReports: [
    { monthly_report_id: 'r', metric_code: 'ATT_PCT_ACR', current_value: 80 },
  ],
  sarprasReports: [
    { monthly_report_id: 'r', item_id: 's', is_fulfilled: true, notes: 'Baik' },
  ],
  shodaqohRows: [
    {
      monthly_report_id: 'r',
      nominal: 250000,
      jumlah_kk: 10,
      notes: 'Terkumpul',
    },
  ],
  mustinRows: [
    {
      id: 'note-long',
      monthly_report_id: 'r',
      pokok_masalah: 'Pertemuan pembinaan',
      keputusan_rencana: 'Catatan lengkap '.repeat(150) + 'AKHIR CATATAN',
      sort_order: 1,
      status: 'open',
      pic: 'Pengurus',
      deadline: '2026-07-31',
    },
  ],
  characterActivities: [
    {
      id: 'act',
      level_code: 'ACR',
      activity_label: 'Kemandirian',
      sort_order: 1,
    },
  ],
  characterReports: [
    {
      monthly_report_id: 'r',
      activity_id: 'act',
      status: 'needs_guidance',
      notes: 'Pendampingan keluarga',
    },
  ],
  yearlyMonthlyReports: [{ id: 'r', kelompok_id: 'a', month: '2026-07-01' }],
  yearlyProgramReports: [
    {
      monthly_report_id: 'r',
      program_code: 'GOMA',
      denominator: 20,
      count_this_month: 15,
      notes: 'Kegiatan keluarga\u000b(Menu kombinasi\u000c GMKM)',
    },
  ],
  yearlyMetricMonthlyReports: [
    { id: 'r', kelompok_id: 'a', month: '2026-07-01' },
  ],
  yearlyMetricReports: [
    { monthly_report_id: 'r', metric_code: 'ATT_PCT_ACR', current_value: 80 },
  ],
  activityPhotos: [
    {
      id: 'photo',
      signedUrl: '',
      caption: 'Foto kegiatan — placeholder saat sumber tidak tersedia.',
    },
  ],
}

captureFixture.mustinRows.push(...Array.from({ length: 8 }, (_, i) => ({
  id: `note-${i}`, monthly_report_id: 'r', pokok_masalah: `Pembahasan ${i + 2}`,
  keputusan_rencana: `Rencana tindak lanjut ${i + 2}. ` .repeat(12), sort_order: i + 2,
})))

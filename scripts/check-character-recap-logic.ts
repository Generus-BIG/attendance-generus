import assert from 'node:assert/strict'
import {
  averageFilled,
  buildMonitoringRecapRows,
  buildTargetRecapLevel,
  buildTargetRecapGroups,
  monitoringSensusTotal,
} from '../src/features/lupg/recap/presentation/slide-renderers/character-recap-utils'

const kelompok = [
  { id: 'k-1', value: 'Kelompok Satu' },
  { id: 'k-2', value: 'Kelompok Dua' },
]
const reports = [
  { id: 'r-1', kelompok_id: 'k-1' },
  { id: 'r-2', kelompok_id: 'k-2' },
]

const targetGroups = buildTargetRecapGroups(
  [
    { id: 'item-2', level_code: 'APR', sort_order: 1, category_label: 'B', material_label: 'Dua' },
    { id: 'item-1', level_code: 'APR', sort_order: 2, category_label: 'A', material_label: 'Satu' },
  ] as never,
  [{ monthly_report_id: 'r-1', target_item_id: 'item-1', realization_percent: 80 }] as never,
  reports as never,
  kelompok
)
assert.deepEqual(targetGroups.map((group) => group.category), ['B', 'A'])
assert.deepEqual(targetGroups[1].rows.map((row) => row.item.id), ['item-1'])
assert.deepEqual(targetGroups[1].rows[0].values, [80, null])
assert.equal(targetGroups[1].rows[0].average, 80)
assert.equal(targetGroups[0].rows[0].average, null)
assert.equal(averageFilled([80, null, 100]), 90)

const targetLevel = buildTargetRecapLevel(
  [
    { id: 'item-3', level_code: 'ACR', sort_order: 2, category_label: 'Alim', material_label: 'Dua' },
    { id: 'item-2', level_code: 'ACR', sort_order: 1, category_label: 'Alim', material_label: 'Satu' },
    { id: 'item-1', level_code: 'ACR', sort_order: 1, category_label: 'Akhlakul Karimah', material_label: 'Tata Krama' },
  ] as never,
  [{ monthly_report_id: 'r-1', target_item_id: 'item-2', realization_percent: 80 }] as never,
  reports as never,
  kelompok,
  'ACR'
)
assert.deepEqual(targetLevel.map((group) => group.category), ['Akhlakul Karimah', 'Alim'])
assert.deepEqual(targetLevel[1].rows.map((row) => row.item.id), ['item-2', 'item-3'])
assert.deepEqual(targetLevel[1].rows[0].values, [80, null])

const monitoringActivities = ['ACR', 'APR', 'AR', 'GPN'].map((level) => ({
  id: `activity-${level}`,
  level_code: level,
  sort_order: 1,
  activity_label: `Konteks ${level}`,
}))
const monitoringReports = monitoringActivities.map((activity) => ({
  monthly_report_id: 'r-1',
  activity_id: activity.id,
  status: 'consistent',
}))
for (const level of ['ACR', 'APR', 'AR', 'GPN'] as const) {
  const monitoring = buildMonitoringRecapRows(
    level,
    monitoringActivities as never,
    monitoringReports as never,
    reports as never,
    kelompok
  )
  assert.deepEqual(monitoring[0].statuses, ['consistent', null])
  assert.equal(monitoring[0].desa, '1 Mulai konsisten')
}

const notApplied = buildMonitoringRecapRows(
  'ACR',
  monitoringActivities as never,
  [{ monthly_report_id: 'r-1', activity_id: 'activity-ACR', status: 'not_applied' }] as never,
  reports as never,
  kelompok
)
assert.equal(notApplied[0].desa, '1 Belum diterapkan')

const missing = buildMonitoringRecapRows(
  'ACR',
  monitoringActivities as never,
  [],
  reports as never,
  kelompok
)
assert.equal(missing[0].desa, 'Belum')

const masterSensus = [
  { kelompok_id: 'k-1', category_code: 'ACR', gender: 'L', count: 4 },
  { kelompok_id: 'k-1', category_code: 'ACR', gender: 'P', count: 5 },
  { kelompok_id: 'k-2', category_code: 'ACR', gender: 'L', count: 6 },
]
const derivedSensus = [
  { kelompok_id: 'k-1', category_code: 'GPN_A', gender: 'L', count: 7 },
  { kelompok_id: 'k-2', category_code: 'GPN_B', gender: 'P', count: 8 },
]
assert.equal(
  monitoringSensusTotal('ACR', masterSensus as never, derivedSensus as never, kelompok),
  15
)
assert.equal(
  monitoringSensusTotal('GPN', masterSensus as never, derivedSensus as never, kelompok),
  15
)
assert.equal(
  monitoringSensusTotal(
    'ACR',
    masterSensus as never,
    derivedSensus as never,
    [kelompok[0]]
  ),
  9
)

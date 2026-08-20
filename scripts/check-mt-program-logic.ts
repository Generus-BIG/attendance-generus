import assert from 'node:assert/strict'
import {
  calculateAverageAttendancePercent,
  calculateAttendancePercent,
  getHafalanPredicate,
} from '../src/features/lupg/utils/program-attendance'
import { isCalendarMonthKey } from '../src/features/lupg/utils/month-utils'

assert.equal(getHafalanPredicate(90), 'Mumtaz')
assert.equal(getHafalanPredicate(80), 'Jayyid Jiddan')
assert.equal(getHafalanPredicate(70), 'Jayyid')
assert.equal(getHafalanPredicate(60), 'Maqbul')
assert.equal(getHafalanPredicate(59), 'Dhaif')
assert.equal(calculateAttendancePercent(['hadir', 'izin', 'sakit', 'alpa']), 25)
assert.equal(calculateAttendancePercent([]), 0)
assert.equal(calculateAttendancePercent(['hadir'], 2), 50)
assert.equal(calculateAttendancePercent([], 2), 0)
assert.ok(
  Math.abs(calculateAttendancePercent(['hadir', 'alpa', 'alpa'], 3) - 100 / 3) <
    1e-12
)
assert.equal(calculateAttendancePercent(['hadir'], 0), 0)
assert.equal(
  calculateAttendancePercent(['hadir', 'alpa'], 2),
  50
)
assert.equal(
  calculateAverageAttendancePercent([
    { attendance: 0, meetingCount: 2 },
    { attendance: 100, meetingCount: 0 },
  ]),
  0
)
assert.equal(
  calculateAverageAttendancePercent([{ attendance: 0, meetingCount: 0 }]),
  null
)
assert.equal(isCalendarMonthKey('2026-01'), true)
assert.equal(isCalendarMonthKey('2026-12'), true)
assert.equal(isCalendarMonthKey('2026-00'), false)
assert.equal(isCalendarMonthKey('2026-13'), false)

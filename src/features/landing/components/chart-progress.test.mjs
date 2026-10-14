import assert from 'node:assert/strict'
import { test } from 'node:test'
import { chartProgress, demoRows } from './chart-progress.ts'

test('scroll progress is bounded and reversible', () => {
  assert.equal(chartProgress(900, 1000), 0)
  assert.equal(chartProgress(500, 1000), 0.5)
  assert.equal(chartProgress(100, 1000), 1)
  assert.equal(chartProgress(500, 1000), 0.5)
})
test('all chart values fill from zero, scrub proportionally, and reach their final values', () => {
  const data = [
    { label: 'Present', value: 86 },
    { label: 'Excused', value: 8 },
    { label: 'Absent', value: 6 },
  ]
  assert.deepEqual(
    demoRows(data, 0).map((row) => row.value),
    [0, 0, 0]
  )
  assert.deepEqual(
    demoRows(data, 0.5).map((row) => row.value),
    [43, 4, 3]
  )
  assert.deepEqual(demoRows(data, 1), data)
  assert.deepEqual(demoRows(data, -1), demoRows(data, 0))
  assert.deepEqual(demoRows(data, 2), data)
  assert.equal(demoRows([{ label: 'Group', value: 92 }], 0.5)[0].value, 46)
})

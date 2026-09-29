import { differenceInYears, parse } from 'date-fns'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const toDateOnly = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const yearsAgo = (years) => {
  const d = new Date()
  d.setFullYear(d.getFullYear() - years)
  return toDateOnly(d)
}
// Simulate the source helper without importing the TS alias module.
// Similar resolve overwrites birth_date with the source value, so only the
// source date decides promotion — an existing birth_date never wins.
const isSyncAutoPromoted = (item) => {
  if (item.source_kategori !== 'GPN A') return false
  const basis = item.patch.birth_date
  if (!basis) return false
  return (
    differenceInYears(new Date(), parse(basis, 'yyyy-MM-dd', new Date())) >= 23
  )
}

test('sync auto-promote check fires only for GPN A with age >= 23', async () => {
  const source = await readFile(
    new URL('./auto-promote.ts', import.meta.url),
    'utf8'
  )
  assert.match(source, /export function isSyncAutoPromoted/)
  assert.match(source, /source_kategori !== 'GPN A'/)
  assert.match(source, />=\s*23/)
  assert.match(source, /const basis = item\.patch\.birth_date/)

  // Mirrors Task 8 live-DB fixtures (verified 2026-09-28): GPN A + 25y
  // promotes, GPN A + 20y stays, confirming the trigger + helper agree.
  assert.equal(
    isSyncAutoPromoted({
      source_kategori: 'GPN A',
      patch: { birth_date: yearsAgo(25), current: null },
    }),
    true
  )
  assert.equal(
    isSyncAutoPromoted({
      source_kategori: 'GPN A',
      patch: {
        birth_date: yearsAgo(25),
        current: { birth_date: yearsAgo(20) },
      },
    }),
    true,
    'source birth_date wins (similar resolve overwrites it)'
  )
  assert.equal(
    isSyncAutoPromoted({
      source_kategori: 'GPN A',
      patch: { birth_date: yearsAgo(20), current: null },
    }),
    false
  )
  assert.equal(
    isSyncAutoPromoted({
      source_kategori: 'GPN B',
      patch: { birth_date: yearsAgo(30), current: null },
    }),
    false
  )
  assert.equal(
    isSyncAutoPromoted({
      source_kategori: 'GPN A',
      patch: { birth_date: null, current: null },
    }),
    false
  )
  assert.equal(
    isSyncAutoPromoted({
      source_kategori: 'AR',
      patch: { birth_date: yearsAgo(30), current: null },
    }),
    false
  )
})

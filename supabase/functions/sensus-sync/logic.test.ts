import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeName,
  normalizeKelompok,
  parseTanggalLahir,
  mapKategori,
  keepRow,
  matchRow,
} from './logic.ts'

describe('sensus sync logic', () => {
  it('normalizes names like checkDuplicate', () => {
    assert.equal(normalizeName('M. Ibnu Addin Pratama'), 'mibnuaddinpratama')
  })

  it('maps BIG1 to BIG 1 and case-insensitive kelompok', () => {
    assert.equal(normalizeKelompok('BIG1'), 'BIG 1')
    assert.equal(normalizeKelompok('cakra'), 'Cakra')
    assert.equal(normalizeKelompok('MERUYUNG'), 'Meruyung')
  })

  it('parses only valid DD-MM-YYYY dates without UTC conversion', () => {
    assert.equal(parseTanggalLahir('01-05-2007'), '2007-05-01')
    assert.equal(parseTanggalLahir(''), null)
    assert.equal(parseTanggalLahir('31-02-2007'), null)
    assert.equal(parseTanggalLahir('1-05-2007'), null)
    assert.equal(parseTanggalLahir('01-13-2007'), null)
  })

  it('maps categories, dropping Balita', () => {
    assert.equal(mapKategori('GPN A'), 'GPN A')
    assert.equal(mapKategori('Paud'), 'Paud')
    assert.equal(mapKategori('ACR'), 'ACR')
    assert.equal(mapKategori('Balita'), null)
  })

  it('keeps only Aktif/Khusus keterangan', () => {
    assert.equal(keepRow('Aktif'), 'active')
    assert.equal(keepRow('Khusus'), 'khusus')
    assert.equal(keepRow('Sakit'), null)
    assert.equal(keepRow('Meninggal Dunia'), null)
  })

  it('matches exact automatically but requires confirmation for a sole similar match', () => {
    const existing = [
      { id: '1', name: 'Nuhi Khoiri Febriansyah', kelompok: 'BIG 1', gender: 'L' },
    ]
    const exact = matchRow(
      { name: 'Nuhi Khoiri Febriansyah', kelompok: 'BIG 1', gender: 'L' },
      existing,
    )
    const similar = matchRow(
      { name: 'Nuhi Khoiri', kelompok: 'BIG 1', gender: 'L' },
      existing,
    )

    assert.equal(exact.confidence, 'exact')
    assert.equal(exact.participantId, '1')
    assert.equal(similar.confidence, 'similar')
    assert.equal(similar.participantId, null)
    assert.deepEqual(similar.candidates?.map((candidate) => candidate.id), ['1'])
    assert.equal(
      matchRow({ name: 'Orang Baru Sekali', kelompok: 'BIG 1', gender: 'P' }, existing).confidence,
      'none',
    )
  })

  it('treats name lookalikes from a different kelompok as new', () => {
    const existing = [
      { id: '1', name: 'Nuhi Khoiri Febriansyah', kelompok: 'BIG 1', gender: 'L' },
    ]
    const crossGroup = matchRow(
      { name: 'Nuhi Khoiri', kelompok: 'BIG 2', gender: 'L' },
      existing,
    )

    assert.equal(crossGroup.confidence, 'none')
    assert.equal(crossGroup.participantId, null)
    assert.equal(crossGroup.candidates?.length ?? 0, 0)
  })

  it('does not auto-select the same participant for duplicate source names', () => {
    const existing = [{ id: '1', name: 'Siti Aminah', kelompok: 'BIG 1', gender: 'P' }]
    const sourceRows = [
      { name: 'Siti Aminah', kelompok: 'BIG 1', gender: 'P' },
      { name: 'Siti  Aminah', kelompok: 'BIG 2', gender: 'P' },
    ]
    const results = sourceRows.map((source) => matchRow(source, existing, sourceRows))

    assert.deepEqual(results.map((result) => result.participantId), [null, null])
    assert.deepEqual(results.map((result) => result.confidence), ['similar', 'none'])
    assert.deepEqual(results[0].candidates?.map((candidate) => candidate.id), ['1'])
  })

  it('does not auto-select duplicate exact matches', () => {
    const existing = [
      { id: '1', name: 'Siti Aminah', kelompok: 'BIG 1', gender: 'P' },
      { id: '2', name: 'Siti Aminah', kelompok: 'BIG 1', gender: 'P' },
    ]
    const result = matchRow({ name: 'Siti Aminah', kelompok: 'BIG 1', gender: 'P' }, existing)
    assert.equal(result.confidence, 'none')
    assert.equal(result.participantId, null)
    assert.deepEqual(result.candidates?.map((candidate) => candidate.id), ['1', '2'])
  })

  it('returns ambiguous similar candidates without selecting one', () => {
    const existing = [
      { id: '1', name: 'Nuhi Khoiri Febriansyah', kelompok: 'BIG 1', gender: 'L' },
      { id: '2', name: 'Nuhi Khoiri Pratama', kelompok: 'BIG 1', gender: 'L' },
    ]
    const result = matchRow({ name: 'Nuhi Khoiri', kelompok: 'BIG 1', gender: 'L' }, existing)
    assert.equal(result.confidence, 'similar')
    assert.equal(result.participantId, null)
    assert.deepEqual(result.candidates?.map((candidate) => candidate.id), ['1', '2'])
  })

  it('flags abbreviated names as similar via shared words', () => {
    const existing = [
      { id: '9', name: 'M Izzan Maldini', kelompok: 'Limo', gender: 'L' },
    ]
    const result = matchRow(
      { name: 'Muhamad Izzan Maldini', kelompok: 'Limo', gender: 'L' },
      existing,
    )
    assert.equal(result.confidence, 'similar')
    assert.equal(result.participantId, null)
    assert.deepEqual(result.candidates?.map((candidate) => candidate.id), ['9'])
  })

  it('requires at least two shared words for similarity', () => {
    const existing = [
      { id: '1', name: 'Ahmad Fauzi Rahman', kelompok: 'Limo', gender: 'L' },
    ]
    const oneShared = matchRow(
      { name: 'Ahmad Yani', kelompok: 'Limo', gender: 'L' },
      existing,
    )
    assert.equal(oneShared.confidence, 'none')

    const reordered = matchRow(
      { name: 'Fauzi Ahmad Hidayat', kelompok: 'Limo', gender: 'L' },
      existing,
    )
    assert.equal(reordered.confidence, 'similar')
    assert.equal(reordered.participantId, null)
  })
})

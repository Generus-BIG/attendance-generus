import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseTableRows } from './parse.ts'
const header =
  '<tr><th>No</th><th>Kelompok</th><th>KK</th><th>Nama</th><th>Jenis Kelamin</th>' +
  '<th>Tanggal Lahir</th><th>Usia</th><th>Kategori</th><th>Status</th><th>Keterangan</th></tr>'

describe('sensus-sync source parser', () => {
  it('parses exact-header rows and selected option text with decoded entities', () => {
    const html =
      `<table>${header}` +
      '<tr><td>1</td><td>BIG 1</td><td>KK1</td><td>Ibnu &amp; Addin</td><td>L</td>' +
      '<td>01-05-2007</td><td>19</td><td>GPN A</td><td>Aktif</td>' +
      '<td><select><option>Aktif</option><option selected>Khusus</option></select></td></tr></table>'
    assert.deepEqual(parseTableRows(html), [
      ['1', 'BIG 1', 'KK1', 'Ibnu & Addin', 'L', '01-05-2007', '19', 'GPN A', 'Aktif', 'Khusus'],
    ])
  })

  it('parses live header filter controls as exact headers but keeps selected data options', () => {
    const html =
      '<table><tr><th>No</th><th>Kelompok</th>' +
      '<th>KK<br><select id="filterKK"><option value="">Semua</option></select></th>' +
      '<th>Nama</th><th>Jenis Kelamin<br><select id="filterJK"><option value="">Semua</option><option value="L">Laki-Laki</option></select></th>' +
      '<th>Tanggal Lahir</th><th>Usia<br><select id="filterUsia"><option value="">Semua</option></select></th>' +
      '<th>Kategori<br><select id="filterKategori"><option value="">Semua</option><option>GPN A</option></select></th>' +
      '<th>Status</th>' +
      '<th>Keterangan<br><select id="filterKet"><option value="">Semua</option><option>Khusus</option></select></th></tr>' +
      '<tr><td>1</td><td>BIG1</td><td>KK1</td><td>Siti</td><td>P</td>' +
      '<td>01-05-2007</td><td>19</td><td>GPN A</td><td>BELUM MENIKAH</td>' +
      "<td><select><option value='Aktif'>Aktif</option><option value='Khusus' selected>Khusus</option></select></td></tr></table>"
    assert.deepEqual(parseTableRows(html), [
      ['1', 'BIG1', 'KK1', 'Siti', 'P', '01-05-2007', '19', 'GPN A', 'BELUM MENIKAH', 'Khusus'],
    ])
  })
  it('returns empty text for an indeterminate select instead of concatenating its options', () => {
    const html =
      `<table>${header}` +
      '<tr><td>1</td><td>BIG1</td><td>KK1</td><td>Siti</td><td>P</td>' +
      '<td>01-05-2007</td><td>19</td><td>GPN A</td><td>Aktif</td>' +
      '<td><select><option>Aktif</option><option>Khusus</option></select></td></tr></table>'
    assert.equal(parseTableRows(html)[0][9], '')
  })

  it('rejects wrong headers and ragged data rows instead of silent success', () => {
    assert.throws(
      () => parseTableRows('<table><tr><th>No</th><th>Wrong</th></tr></table>'),
      /Source table structure changed/,
    )
    assert.throws(
      () =>
        parseTableRows(
          `<table>${header}<tr><td>1</td><td>BIG 1</td></tr></table>`,
        ),
      /Source table structure changed/,
    )
  })
})

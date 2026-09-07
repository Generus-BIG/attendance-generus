// Run against files downloaded by export.browser-test.html (or a real export).
// node src/features/lupg/recap/presentation/pptx/verify-pptx.mjs file.pptx ...
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'

assert.ok(process.argv.length > 2, 'Pass at least one downloaded PPTX')
for (const path of process.argv.slice(2)) {
  execFileSync('unzip', ['-t', path])
  const entries = execFileSync('unzip', ['-Z1', path], { encoding: 'utf8' }).split('\n')
  const read = entry => execFileSync('unzip', ['-p', path, entry.replace(/[\[\]*?]/g, '\\$&')], { maxBuffer: 32 * 1024 * 1024 })
  const slides = entries.filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f))
  const images = entries.filter(f => /^ppt\/media\/.*\.png$/.test(f))
  assert.ok(slides.length > 0)
  assert.equal(slides.length, images.length, 'exactly one PNG per slide')
  assert.equal(entries.filter(f => /^ppt\/charts\/[^/]+\.xml$|^ppt\/embeddings\/.+\.xlsx$/.test(f)).length, 0)
  for (const entry of slides) {
    const xml = read(entry).toString()
    assert.equal((xml.match(/<p:pic>/g) || []).length, 1)
    assert.doesNotMatch(xml, /<a:tbl>|<p:sp>|<c:chart/)
    assert.match(xml, /<a:off x="0" y="0"\/>/)
    assert.match(xml, /<a:ext cx="12192000" cy="6858000"\/>/)
    assert.match(xml, /descr="[^"]+"/)
  }
  for (const entry of images) {
    const png = read(entry)
    assert.equal(png.subarray(1, 4).toString(), 'PNG')
    assert.equal(png.readUInt32BE(16), 2560)
    assert.equal(png.readUInt32BE(20), 1440)
  }
  for (const entry of entries.filter(f => /\.xml$|\.rels$/.test(f))) {
    assert.doesNotMatch(read(entry).toString(), /token=|\/storage\/v1\/object\/sign\//)
  }
  console.log(`PASS ${path}: ${slides.length} full-slide PNGs, 2560×1440, no native tables/charts or signed URLs`)
}

/// <reference lib="es2022.intl" />

type Cell = { cell: HTMLTableCellElement; start: number; end: number }
const clone = <T extends Node>(node: T): T => node.cloneNode(true) as T
function fail(message: string): never {
  throw new Error(`Cannot paginate capture table: ${message}`)
}

// A logical grid is needed for both Sensus grouped headers and monitoring rowspans.
function grid(rows: HTMLTableRowElement[]): Cell[][] {
  const result: Cell[][] = rows.map(() => [])
  rows.forEach((row, y) => {
    let x = 0
    for (const cell of row.cells) {
      while (result[y][x]) x++
      const item = { cell, start: x, end: x + cell.colSpan }
      const span = cell.rowSpan || rows.length - y
      for (let r = y; r < Math.min(rows.length, y + span); r++) {
        for (let c = x; c < item.end; c++) result[r][c] = item
      }
      x = item.end
    }
  })
  return result
}

function bounds(table: HTMLTableElement, root: HTMLElement) {
  const rect = root.getBoundingClientRect()
  let { left, right, top, bottom } = rect
  const view = root.ownerDocument.defaultView!
  for (let el = table.parentElement; el; el = el.parentElement) {
    const css = view.getComputedStyle(el)
    const box = el.getBoundingClientRect()
    if (css.overflowX !== 'visible') {
      left = Math.max(left, box.left + el.clientLeft)
      right = Math.min(right, box.left + el.clientLeft + el.clientWidth)
    }
    if (css.overflowY !== 'visible') {
      top = Math.max(top, box.top + el.clientTop)
      bottom = Math.min(bottom, box.top + el.clientTop + el.clientHeight)
    }
    if (el === root) break
  }
  const box = table.getBoundingClientRect()
  // Fixed-layout tables can keep their own box small while nowrap cell text spills.
  let contentRight = box.right
  let contentBottom = box.bottom
  for (const cell of table.querySelectorAll('th,td')) {
    for (const el of [cell, ...cell.querySelectorAll('*')]) {
      const css = view.getComputedStyle(el)
      if (
        (css.overflowX !== 'visible' && el.scrollWidth > el.clientWidth + 1) ||
        (css.overflowY !== 'visible' && el.scrollHeight > el.clientHeight + 1)
      ) {
        fail(
          'content is clipped inside a table cell; remove the inner overflow constraint before capture'
        )
      }
    }
    const range = table.ownerDocument.createRange()
    range.selectNodeContents(cell)
    for (const rect of range.getClientRects()) {
      contentRight = Math.max(contentRight, rect.right)
      contentBottom = Math.max(contentBottom, rect.bottom)
    }
  }
  return {
    x: box.left < left - 1 || contentRight > right + 1,
    y: box.top < top - 1 || contentBottom > bottom + 1,
  }
}

function measured<T>(page: HTMLElement, source: HTMLElement, run: () => T): T {
  const style = page.getAttribute('style')
  // Keep the same ancestor selectors/container queries without changing source layout.
  page.style.position = 'absolute'
  page.style.left = '0'
  page.style.top = '0'
  page.style.width = `${source.offsetWidth}px`
  page.style.height = `${source.offsetHeight}px`
  source.parentElement!.append(page)
  try {
    return run()
  } finally {
    page.remove()
    if (style === null) {
      page.setAttribute('style', '')
      page.removeAttribute('style')
    } else page.setAttribute('style', style)
  }
}

function selectColumns(
  table: HTMLTableElement,
  columns: number[],
  widths: number[]
) {
  for (const section of [table.tHead, ...table.tBodies, table.tFoot]) {
    if (!section) continue
    const rows = [...section.rows]
    const cells = grid(rows)
    rows.forEach((row, y) => {
      for (const item of new Set(cells[y])) {
        if (!item || item.cell.parentElement !== row) continue
        const count = columns.filter(
          (c) => c >= item.start && c < item.end
        ).length
        if (!count) item.cell.remove()
        else {
          item.cell.colSpan = count
          item.cell.style.width = ''
          item.cell.style.minWidth = '0'
          item.cell.style.maxWidth = 'none'
        }
      }
    })
  }
  for (const group of table.querySelectorAll(':scope > colgroup'))
    group.remove()
  const group = table.ownerDocument.createElement('colgroup')
  for (const c of columns) {
    const col = table.ownerDocument.createElement('col')
    col.style.width = `${widths[c]}px`
    group.append(col)
  }
  table.insertBefore(group, table.tHead ?? table.tBodies[0] ?? null)
  const width = columns.reduce((sum, c) => sum + widths[c], 0)
  table.style.width = `${width}px`
  table.style.minWidth = '0'
  table.style.maxWidth = 'none'
  table.style.tableLayout = 'fixed'
}

function normalizeBodySpans(table: HTMLTableElement) {
  for (const body of table.tBodies) {
    const rows = [...body.rows]
    const cells = grid(rows)
    rows.forEach((row, y) => {
      row.replaceChildren(
        ...[...new Set(cells[y])].map((item) => {
          const cell = clone(item.cell)
          cell.rowSpan = 1
          return cell
        })
      )
    })
  }
}

// Trim text in a deep clone so even same-text-node slices keep every ancestor.
function textSlice(cell: HTMLTableCellElement, start: number, end: number) {
  const result = clone(cell)
  const walker = cell.ownerDocument.createTreeWalker(result, 4 /* SHOW_TEXT */)
  let offset = 0
  while (walker.nextNode()) {
    const node = walker.currentNode as Text
    const length = node.length
    node.data = node.data.slice(
      Math.max(0, start - offset),
      Math.max(0, end - offset)
    )
    offset += length
  }
  return result
}

function splitTable(
  page: HTMLElement,
  index: number,
  source: HTMLElement
): HTMLElement[] {
  const table = page.querySelectorAll('table')[index]
  const overflow = bounds(table, page)
  if (!overflow.x && !overflow.y) return [clone(page)]
  if (table.querySelector('table')) fail('nested tables are unsupported')
  if (!table.tHead || !table.tBodies.length)
    fail('overflowing tables require thead and tbody')
  const all = grid([...table.rows])
  const count = Math.max(...all.map((row) => row.length))
  const edges = new Map<number, number>()
  for (const row of all)
    for (const item of new Set(row)) {
      if (!item) fail('irregular table grid')
      const box = item.cell.getBoundingClientRect()
      edges.set(item.start, box.left)
      edges.set(item.end, box.right)
    }
  const widths = Array.from({ length: count }, (_, c) => {
    const width = (edges.get(c + 1) ?? NaN) - (edges.get(c) ?? NaN)
    if (!(width > 0)) fail(`cannot measure column ${c + 1} boundaries`)
    return width
  })
  const horizontal: HTMLElement[] = []
  const make = (columns: number[]) => {
    const next = clone(page)
    selectColumns(next.querySelectorAll('table')[index], columns, widths)
    return next
  }
  if (overflow.x) {
    for (let start = 1; start < count; ) {
      let accepted: HTMLElement | undefined
      let end = start
      for (; end < count; end++) {
        const candidate = make([
          0,
          ...Array.from({ length: end - start + 1 }, (_, i) => start + i),
        ])
        if (
          measured(
            candidate,
            source,
            () =>
              bounds(candidate.querySelectorAll('table')[index], candidate).x
          )
        )
          break
        accepted = candidate
      }
      if (!accepted)
        fail(
          `identity column plus column ${start + 1} exceeds the available width`
        )
      horizontal.push(accepted)
      start = end
    }
    if (!horizontal.length)
      fail('the identifying column exceeds the available width')
  } else horizontal.push(make(Array.from({ length: count }, (_, i) => i)))

  return horizontal.flatMap((next) =>
    measured(next, source, () => {
      const target = next.querySelectorAll('table')[index]
      normalizeBodySpans(target)
      const entries = [...target.tBodies].flatMap((body) =>
        [...body.rows].map((row) => ({ body, row: clone(row) }))
      )
      for (const body of target.tBodies) body.replaceChildren()
      const pages: HTMLElement[] = []
      const fits = () => {
        const b = bounds(target, next)
        return !b.x && !b.y
      }
      if (!fits()) fail('table header/footer alone exceeds the available area')
      const flush = () => {
        pages.push(clone(next))
        for (const body of target.tBodies) body.replaceChildren()
      }
      for (const { body, row } of entries) {
        body.append(row)
        if (fits()) continue
        row.remove()
        if ([...target.tBodies].some((b) => b.rows.length)) flush()
        body.append(row)
        if (fits()) continue
        row.remove()
        const original = [...row.cells]
        if (
          original.length < 2 ||
          original.some((c) =>
            c.querySelector('img,svg,canvas,video,br,input,button')
          )
        ) {
          fail(
            'oversized row requires text cells and a repeatable first-column identity'
          )
        }
        const texts = original.map((c) => c.textContent ?? '')
        if (!texts.slice(1).some(Boolean))
          fail('oversized row has no splittable text')
        const offsets = original.map(() => 0)
        while (offsets.some((offset, i) => i > 0 && offset < texts[i].length)) {
          const fragment = clone(row)
          fragment.replaceChildren(
            clone(original[0]),
            ...original.slice(1).map((c) => textSlice(c, 0, 0))
          )
          body.append(fragment)
          if (!fits())
            fail(
              'row identity or cell padding exceeds the available page height'
            )
          let consumed = 0
          for (let i = 1; i < original.length; i++) {
            // Grapheme boundaries avoid breaking surrogate pairs or combining sequences.
            const segments = [
              ...new Intl.Segmenter(undefined, {
                granularity: 'grapheme',
              }).segment(texts[i].slice(offsets[i])),
            ]
            const stops = [
              0,
              ...segments.map((s) => s.index + s.segment.length),
            ]
            let low = 0,
              high = stops.length - 1
            while (low < high) {
              const mid = Math.ceil((low + high) / 2)
              fragment.cells[i].replaceWith(
                textSlice(original[i], offsets[i], offsets[i] + stops[mid])
              )
              if (fits()) low = mid
              else high = mid - 1
            }
            fragment.cells[i].replaceWith(
              textSlice(original[i], offsets[i], offsets[i] + stops[low])
            )
            offsets[i] += stops[low]
            consumed += stops[low]
          }
          if (!consumed) fail('oversized row has no text boundary that fits')
          flush()
        }
      }
      if ([...target.tBodies].some((b) => b.rows.length) || !pages.length)
        pages.push(clone(next))
      return pages
    })
  )
}

/** Paginate only overflowing tables. Source must be settled and mounted at slide size. */
export function paginateCaptureTables(root: HTMLElement): HTMLElement[] {
  if (
    !root.isConnected ||
    !root.parentElement ||
    !root.offsetWidth ||
    !root.offsetHeight
  ) {
    fail('source slide must be mounted with nonzero dimensions')
  }
  const batches: HTMLTableElement[][] = []
  for (let index = 0; index < root.querySelectorAll('table').length; index++) {
    const page = clone(root)
    batches.push(
      measured(page, root, () => splitTable(page, index, root)).map(
        (fragment) => fragment.querySelectorAll('table')[index]
      )
    )
  }
  // Independent tables advance together; exhausted tables retain only their headers.
  const pages = Array.from(
    { length: Math.max(1, ...batches.map((batch) => batch.length)) },
    (_, pageIndex) => {
      const page = clone(root)
      const tables = [...page.querySelectorAll('table')]
      batches.forEach((batch, index) => {
        const table = clone(batch[Math.min(pageIndex, batch.length - 1)])
        if (pageIndex >= batch.length) {
          for (const body of table.tBodies) body.replaceChildren()
          table.tFoot?.replaceChildren()
        }
        tables[index].replaceWith(table)
      })
      return page
    }
  )
  for (const page of pages) {
    measured(page, root, () => {
      for (const table of page.querySelectorAll('table')) {
        const overflow = bounds(table, page)
        if (overflow.x || overflow.y) {
          fail(
            'tables share a clipping container that cannot fit their paginated content'
          )
        }
      }
    })
  }
  return pages
}

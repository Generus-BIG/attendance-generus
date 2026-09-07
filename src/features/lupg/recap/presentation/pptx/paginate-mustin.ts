// Pagination uses the export DOM's actual font/layout, never a glyph estimate.
export function paginateMustin(source: HTMLElement): HTMLElement[] {
  const cards = Array.from(source.querySelectorAll<HTMLElement>('[data-mustin-card]'))
  if (!cards.length) return [source.cloneNode(true) as HTMLElement]
  const pages: HTMLElement[] = []
  let page: HTMLElement
  let columns: HTMLElement[] = []
  let index = 0
  const nextPage = () => {
    page = source.cloneNode(true) as HTMLElement
    columns = Array.from(page.querySelectorAll<HTMLElement>('[data-mustin-column]'))
    columns.forEach(column => column.replaceChildren())
    source.parentElement!.append(page)
    pages.push(page)
    index = 0
  }
  const nextColumn = () => { if (++index === 2) nextPage() }
  const fits = () => columns[index].scrollHeight <= columns[index].clientHeight + 1
  try {
    nextPage()
    for (const original of cards) {
      let card = original.cloneNode(true) as HTMLElement
      card.style.flexShrink = '0'
      columns[index].append(card)
      if (fits()) continue
      card.remove()
      if (columns[index].childElementCount) nextColumn()
      columns[index].append(card)
      if (fits()) continue
      // An oversized card is continued at text boundaries in a full column.
      const selectors = ['[data-mustin-topic]', '[data-mustin-decision]']
      const remaining = selectors.map(selector => Array.from(card.querySelector(selector)?.textContent ?? ''))
      let continuation = false
      card.remove()
      while (remaining.some(text => text.length)) {
        card = original.cloneNode(true) as HTMLElement
        card.style.flexShrink = '0'
        if (continuation) {
          const label = card.ownerDocument.createElement('small')
          label.textContent = ' (lanjutan)'
          card.querySelector('[data-mustin-number]')?.append(label)
        }
        selectors.forEach(selector => { card.querySelector(selector)!.textContent = '' })
        columns[index].append(card)
        let consumed = 0
        for (let field = 0; field < selectors.length; field++) {
          const node = card.querySelector(selectors[field])!
          const chars = remaining[field]
          let low = 0, high = chars.length
          while (low < high) {
            const mid = Math.ceil((low + high) / 2)
            node.textContent = chars.slice(0, mid).join('')
            if (fits()) low = mid
            else high = mid - 1
          }
          if (low < chars.length) {
            const boundary = chars.slice(0, low).join('').search(/\s\S*$/u)
            if (boundary > 0) low = Array.from(chars.slice(0, low).join('').slice(0, boundary + 1)).length
          }
          node.textContent = chars.splice(0, low).join('')
          consumed += low
          if (chars.length) break
        }
        if (!consumed || !fits()) throw new Error('Catatan Mustin tidak dapat dimuat pada kolom PPTX.')
        continuation = true
        if (remaining.some(text => text.length)) nextColumn()
      }
    }
    return pages
  } finally { pages.forEach(page => page.remove()) }
}

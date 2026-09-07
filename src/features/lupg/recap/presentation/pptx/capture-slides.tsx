import { createRoot } from 'react-dom/client'
import { domAnimation, LazyMotion } from 'framer-motion'
import { getFontEmbedCSS, toPng } from 'html-to-image'
import { flushSync } from 'react-dom'
import { type Palette } from '@/context/palette-provider'
import { AnimationProvider } from '../context/animation-context'
import { buildSlides, type PresentationData } from '../slides'
import {
  PresentationPaletteOverride,
  readPresentationTokens,
} from '../use-pres-palette'
import { paginateCaptureTables } from './paginate-capture-tables'
import { paginateMustin } from './paginate-mustin'
import { sanitizeDomForXml } from './xml-sanitize'

export type CaptureProgress = {
  completed: number
  total: number
  phase: 'layout' | 'capture'
}

async function bounded<T>(promise: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} melewati batas waktu.`)),
          30_000
        )
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

export async function capturePresentationSlides(
  data: PresentationData,
  palette: Palette,
  consume: (png: string, title: string, index: number, total: number) => void,
  onProgress?: (progress: CaptureProgress) => void
) {
  const frame = document.createElement('iframe')
  frame.title = 'Menyiapkan gambar PPTX'
  frame.setAttribute('aria-hidden', 'true')
  frame.tabIndex = -1
  frame.style.cssText =
    'position:fixed;left:-20000px;top:0;width:1280px;height:720px;border:0;pointer-events:none'
  document.body.append(frame)
  const doc = frame.contentDocument!
  const win = frame.contentWindow!
  let reactRoot: ReturnType<typeof createRoot> | undefined
  const fontProbe = document.createElement('div')
  fontProbe.style.cssText = 'position:fixed;left:-20000px;top:0'
  try {
    const base = doc.createElement('base')
    base.href = document.baseURI
    doc.head.append(base)
    doc.documentElement.dataset.palette = palette
    doc.documentElement.lang = 'id'
    const styles = Array.from(
      document.querySelectorAll('style, link[rel="stylesheet"]')
    )
    await bounded(
      Promise.all(
        styles.map((source) => {
          const clone = source.cloneNode(true) as
            | HTMLStyleElement
            | HTMLLinkElement
          if (
            clone instanceof HTMLLinkElement &&
            new URL(clone.href).origin !== location.origin
          )
            clone.crossOrigin = 'anonymous'
          const loaded =
            clone.tagName === 'LINK'
              ? new Promise<void>((resolve, reject) => {
                  clone.onload = () => resolve()
                  clone.onerror = () =>
                    reject(new Error('Stylesheet PPTX gagal dimuat.'))
                })
              : Promise.resolve()
          doc.head.append(clone)
          return loaded
        })
      ),
      'Stylesheet'
    )
    const reset = doc.createElement('style')
    reset.textContent =
      'html,body{margin:0;width:1280px;height:720px;overflow:hidden}*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important} [data-mustin-card]{flex-shrink:0}'
    doc.head.append(reset)
    const host = doc.createElement('div')
    doc.body.append(host)
    reactRoot = createRoot(host)
    const tokens = readPresentationTokens(doc)
    const descriptors = buildSlides(data, { capture: true })
    const pages: { node: HTMLElement; title: string }[] = []
    const settle = async () => {
      await bounded(doc.fonts.ready, 'Font')
      await bounded(
        Promise.all(
          Array.from(doc.images).map((img) => img.decode().catch(() => {}))
        ),
        'Gambar'
      )
      await bounded(
        new Promise<void>((resolve) =>
          win.requestAnimationFrame(() =>
            win.requestAnimationFrame(() => resolve())
          )
        ),
        'Layout'
      )
      for (const font of doc.fonts)
        if (font.status === 'error') throw new Error('Font PPTX gagal dimuat.')
    }
    for (let i = 0; i < descriptors.length; i++) {
      const slide = descriptors[i]
      onProgress?.({ completed: i, total: descriptors.length, phase: 'layout' })
      flushSync(() =>
        reactRoot!.render(
          <LazyMotion features={domAnimation}>
            <AnimationProvider>
              <PresentationPaletteOverride.Provider value={tokens}>
                <div
                  key={slide.key}
                  data-capture-surface
                  style={{
                    width: 1280,
                    height: 720,
                    containerType: 'size',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {slide.render()}
                </div>
              </PresentationPaletteOverride.Provider>
            </AnimationProvider>
          </LazyMotion>
        )
      )
      await settle()
      const surface = host.querySelector<HTMLElement>('[data-capture-surface]')!
      sanitizeDomForXml(surface)
      const expanded = surface.querySelector('[data-mustin-columns]')
        ? paginateMustin(surface)
        : paginateCaptureTables(surface)
      for (const pageNode of expanded) {
        sanitizeDomForXml(pageNode)
      }
      pages.push(...expanded.map((node) => ({ node, title: slide.title })))
    }
    flushSync(() => reactRoot!.render(null))
    // html-to-image's font walker uses the caller's HTMLElement realm. Gather
    // the two presentation font families in that realm, then reuse their CSS.
    for (const family of [tokens.fontSans, tokens.fontMono]) {
      const span = document.createElement('span')
      span.style.fontFamily = family
      span.textContent = 'Laporan 0123456789'
      fontProbe.append(span)
    }
    doc.body.append(fontProbe)
    const fontEmbedCSS = await bounded(
      getFontEmbedCSS(fontProbe),
      'Embedding font'
    )
    if (!fontEmbedCSS.includes('data:'))
      throw new Error('Font web tidak dapat disertakan dalam PPTX.')
    for (let i = 0; i < pages.length; i++) {
      const { node, title } = pages[i]
      node.querySelectorAll('[data-capture-page-number]').forEach((label) => {
        label.textContent = `${String(i + 1).padStart(2, '0')} — ${String(pages.length).padStart(2, '0')}`
      })
      sanitizeDomForXml(node)
      host.replaceChildren(node)
      await settle()
      onProgress?.({ completed: i, total: pages.length, phase: 'capture' })
      let png: string
      try {
        png = await bounded(
          toPng(node, {
            width: 1280,
            height: 720,
            pixelRatio: 2,
            fontEmbedCSS,
            preferredFontFormat: 'woff2',
          }),
          `Capture slide "${title}"`
        )
      } catch (err) {
        if (err instanceof Error) throw err
        const eventDetail =
          err && typeof err === 'object' && 'type' in err
            ? `event: ${err.type}`
            : String(err)
        throw new Error(
          `Slide "${title}" gagal dirender menjadi gambar (${eventDetail}).`
        )
      }
      if (!png.startsWith('data:image/png;base64,'))
        throw new Error(`Gambar slide PPTX "${title}" tidak valid.`)
      consume(png, title, i, pages.length)
      node.remove()
    }
    onProgress?.({
      completed: pages.length,
      total: pages.length,
      phase: 'capture',
    })
  } finally {
    reactRoot?.unmount()
    frame.remove()
    fontProbe.remove()
  }
}

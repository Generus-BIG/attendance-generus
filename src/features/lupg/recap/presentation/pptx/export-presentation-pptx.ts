import PptxGenJS from 'pptxgenjs'
import { type Palette } from '@/context/palette-provider'
import { type PresentationData } from '../slides'
import { capturePresentationSlides, type CaptureProgress } from './capture-slides'
import { loadPptxPhotos } from './pptx-assets'
import { presentationFilename } from './pptx-theme'

import { sanitizePresentationData } from './xml-sanitize'

export type PptxExportResult = { warnings: string[] }

export async function exportPresentationPptx(
  data: PresentationData,
  options: { palette: Palette; onProgress?: (progress: CaptureProgress) => void }
): Promise<PptxExportResult> {
  const cleanData = sanitizePresentationData(data)
  const fileName = presentationFilename(cleanData)
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.author = 'LUPG'
  pptx.subject = 'Laporan Pembinaan Generus'
  pptx.title = fileName.slice(0, -5)
  const { images, warnings } = await loadPptxPhotos(cleanData.activityPhotos ?? [])
  const placeholder = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><rect width="800" height="450" fill="#eeeeee"/><text x="400" y="225" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#555555">Foto tidak tersedia</text></svg>')
  const captureData = { ...cleanData, activityPhotos: cleanData.activityPhotos?.map(photo => ({ ...photo, signedUrl: images.get(photo.id)?.data ?? placeholder })) }
  await capturePresentationSlides(captureData, options.palette, (png, title) => {
    pptx.addSlide().addImage({ data: png, x: 0, y: 0, w: 13.333333, h: 7.5, altText: title })
  }, options.onProgress)
  await pptx.writeFile({ fileName, compression: true })
  return { warnings }
}

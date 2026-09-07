import { type ActivityPhotoWithUrl } from '../slide-renderers/render-dokumentasi'

export type PptxPhoto = { data: string; width: number; height: number }

async function decodePhoto(blob: Blob): Promise<PptxPhoto> {
  const bitmap = await createImageBitmap(blob)
  try {
    // PowerPoint supports JPEG/PNG. Other browser-decodable uploads are converted
    // individually; report text and chart data never enter this canvas.
    let officeBlob = blob
    if (!['image/jpeg', 'image/png'].includes(blob.type)) {
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Image decoding unavailable')
      context.drawImage(bitmap, 0, 0)
      officeBlob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (value) =>
            value
              ? resolve(value)
              : reject(new Error('Image conversion failed')),
          'image/png'
        )
      )
    }
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('Image read failed'))
      reader.readAsDataURL(officeBlob)
    })
    return { data, width: bitmap.width, height: bitmap.height }
  } finally {
    bitmap.close()
  }
}

export async function loadPptxPhotos(
  photos: ActivityPhotoWithUrl[],
  fetchPhoto: typeof fetch = fetch
) {
  const images = new Map<string, PptxPhoto | null>()
  const warnings: string[] = []
  // Four concurrent reads bound decode pressure without a queue dependency.
  for (let offset = 0; offset < photos.length; offset += 4) {
    await Promise.all(
      photos.slice(offset, offset + 4).map(async (photo) => {
        try {
          if (!photo.signedUrl) throw new Error('Photo unavailable')
          const response = await fetchPhoto(photo.signedUrl, {
            signal: AbortSignal.timeout(20_000),
            credentials: 'omit',
          })
          if (!response.ok) throw new Error('Photo unavailable')
          const blob = await response.blob()
          if (!blob.type.startsWith('image/') || !blob.size)
            throw new Error('Invalid image')
          images.set(photo.id, await decodePhoto(blob))
        } catch {
          images.set(photo.id, null)
          warnings.push('Foto tidak tersedia')
        }
      })
    )
  }
  return { images, warnings }
}

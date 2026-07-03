/**
 * Client-side image compression utility.
 * Lazy-loads browser-image-compression to avoid bundle bloat on pages
 * that don't use the upload section.
 */

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 2048,
  useWebWorker: true,
  fileType: 'image/webp' as const,
  initialQuality: 0.85,
  preserveExif: false,
}

export async function compressImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<File> {
  const imageCompression = (await import('browser-image-compression')).default
  return imageCompression(file, {
    ...COMPRESSION_OPTIONS,
    onProgress,
  })
}

/** Accepted input MIME types for the file picker */
export const ACCEPTED_IMAGE_TYPES =
  'image/jpeg,image/png,image/webp,image/heic'

/** Max photos per monthly report */
export const MAX_PHOTOS_PER_REPORT = 6

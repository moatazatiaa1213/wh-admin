// Vercel Serverless Functions hard-cap the request body at 4.5MB (platform
// limit, not configurable) — see /api/media/upload. A DSLR/phone photo at
// full resolution routinely exceeds that. Rather than reject those uploads
// outright, shrink only the ones that need it, as little as possible, so
// most photos still go through completely untouched at full quality.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
const MAX_DIMENSION = 4096 // generous ceiling; well beyond typical web/PDF use
const MIN_QUALITY = 0.5
const QUALITY_STEP = 0.08

/**
 * Returns the original file unchanged if it already fits under the upload
 * limit. Otherwise re-encodes it as JPEG, first by lowering quality and then,
 * if still too large, by shrinking dimensions, stopping as soon as it fits
 * — so the result is the highest quality/resolution version that fits.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (file.size <= MAX_UPLOAD_BYTES) return file
  if (file.type === 'image/gif') {
    // Re-encoding would destroy any animation — better to fail clearly than
    // silently ship a broken static frame.
    throw new Error(`GIF is ${(file.size / 1024 / 1024).toFixed(1)}MB — animated GIFs can't be auto-compressed. Please shrink it before uploading.`)
  }

  const bitmap = await createImageBitmap(file)
  let width = bitmap.width
  let height = bitmap.height
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(width, height)
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported in this browser')

  for (let attempt = 0; attempt < 12; attempt++) {
    canvas.width = width
    canvas.height = height
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)

    const quality = Math.max(MIN_QUALITY, 0.92 - attempt * QUALITY_STEP)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) throw new Error('Failed to process image')

    if (blob.size <= MAX_UPLOAD_BYTES || (quality <= MIN_QUALITY && width <= 800)) {
      const name = file.name.replace(/\.\w+$/, '') + '.jpg'
      return new File([blob], name, { type: 'image/jpeg' })
    }

    // Quality floor reached for this size — shrink dimensions and retry.
    if (quality <= MIN_QUALITY) {
      width = Math.round(width * 0.85)
      height = Math.round(height * 0.85)
    }
  }

  throw new Error('Could not compress this image enough to upload. Please try a smaller file.')
}

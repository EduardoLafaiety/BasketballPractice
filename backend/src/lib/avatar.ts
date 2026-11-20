import sharp from 'sharp'
import { HttpError } from './http-error.js'

export async function normalizeAvatar(image: string) {
  const invalid = () => new HttpError(400, 'Use uma imagem PNG, JPG ou WebP válida.')
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image)
  if (!match || match[2].length % 4 !== 0) throw invalid()
  const input = Buffer.from(match[2], 'base64')
  if (!input.length || input.length > 262144) throw new HttpError(400, 'A imagem preparada é muito grande. Escolha outra foto.')
  try {
    const pipeline = sharp(input, { limitInputPixels: 4_000_000, failOn: 'warning' })
    const metadata = await pipeline.metadata()
    if (metadata.format !== match[1] || !metadata.width || !metadata.height || (metadata.pages ?? 1) > 1) throw invalid()
    // Reprocessar a imagem retira EXIF e outros metadados; somente pixels são guardados.
    const output = await pipeline.rotate().resize(256, 256, { fit: 'cover', position: 'centre' }).webp({ quality: 80 }).toBuffer()
    if (output.length > 85000) throw invalid()
    return `data:image/webp;base64,${output.toString('base64')}`
  } catch (error) {
    if (error instanceof HttpError) throw error
    throw invalid()
  }
}

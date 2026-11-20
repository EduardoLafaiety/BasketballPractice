/** Enquadramento central e redução antes do envio; o servidor também valida e otimiza. */
export async function prepararFoto(file: File) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Escolha uma foto em PNG, JPG ou WebP.')
  if (file.size > 5 * 1024 * 1024) throw new Error('A foto pode ter até 5 MB.')
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 40_000_000) throw new Error('Escolha uma imagem com resolução menor.')
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 256
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Não foi possível preparar a foto neste navegador.')
    const size = Math.min(image.naturalWidth, image.naturalHeight)
    ctx.drawImage(image, (image.naturalWidth - size) / 2, (image.naturalHeight - size) / 2, size, size, 0, 0, 256, 256)
    return canvas.toDataURL('image/webp', 0.85)
  } finally { URL.revokeObjectURL(url) }
}

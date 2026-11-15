// Trabalhador do pixel art das fotos: recebe só o endereço da foto, baixa (já está no cache do navegador),
// decodifica, redesenha pequena, reduz as cores e devolve um PNG. Tudo, inclusive a decodificação, roda
// fora da thread principal, então a rolagem não engasga enquanto as fotos são convertidas.
import { reduzirCores, tamanhoPixelado } from './pixelar'

export interface Pedido {
  id: number
  url: string
  /** Tamanho da caixa onde a foto aparece, em px de CSS (0 = sem medida). */
  largura: number
  altura: number
}
export type Resposta = { id: number; png: Blob } | { id: number; erro: true }

const escopo = self as unknown as { onmessage: ((e: MessageEvent<Pedido>) => void) | null; postMessage(m: Resposta): void }

escopo.onmessage = async ({ data: { id, url, largura: lw, altura: lh } }) => {
  try {
    // Foto de outro site só é lida se ele liberar o CORS; senão o fetch falha e a foto aparece como veio.
    const resposta = await fetch(url, { mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer' })
    if (!resposta.ok) throw new Error('foto indisponível')
    const imagem = await createImageBitmap(await resposta.blob())
    const { largura, altura } = tamanhoPixelado(imagem.width, imagem.height, lw || imagem.width, lh || imagem.height)
    const canvas = new OffscreenCanvas(largura, altura)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('sem canvas')
    ctx.drawImage(imagem, 0, 0, largura, altura)
    imagem.close()
    const quadro = ctx.getImageData(0, 0, largura, altura)
    reduzirCores(quadro.data, largura)
    ctx.putImageData(quadro, 0, 0)
    escopo.postMessage({ id, png: await canvas.convertToBlob({ type: 'image/png' }) })
  } catch {
    escopo.postMessage({ id, erro: true })
  }
}

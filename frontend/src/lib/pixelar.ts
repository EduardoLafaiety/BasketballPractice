// Pixel art das fotos: cada foto que termina de carregar é redesenhada pequena num canvas, com poucas
// cores, e volta para o mesmo <img>; o CSS (image-rendering: pixelated) amplia em blocos, como num jogo
// 8 bits. Fica de fora o que não dá para ler (foto de outro site sem permissão de CORS), o que já é
// desenho (SVG) e o que é pequeno demais para virar blocos.

/** Lado de cada bloco na tela, em px de CSS. */
export const BLOCO = 4
/** Tons por canal de cor: 6 dá uma paleta de 216 cores, como a dos consoles antigos. */
export const NIVEIS = 6
/** Abaixo disso (px de CSS) a imagem viraria um borrão de meia dúzia de blocos. */
const LADO_MINIMO = 48

// Matriz de Bayer 4 × 4: espalha o erro do arredondamento num padrão fixo (o "pontilhado" dos 8 bits).
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

/** Tamanho, em blocos, da versão pixelada de uma foto `nw × nh` mostrada numa caixa `lw × lh` (object-fit: cover). */
export function tamanhoPixelado(nw: number, nh: number, lw: number, lh: number, bloco = BLOCO) {
  const escala = Math.max(lw / nw, lh / nh)
  const largura = Math.max(8, Math.min(nw, Math.round((nw * escala) / bloco)))
  return { largura, altura: Math.max(1, Math.round((largura * nh) / nw)) }
}

/** Reduz cada canal a `niveis` tons, com pontilhado ordenado; altera `dados` (RGBA) no lugar. */
export function reduzirCores(dados: Uint8ClampedArray, largura: number, niveis = NIVEIS) {
  const passo = 255 / (niveis - 1)
  for (let i = 0; i < dados.length; i += 4) {
    const p = i / 4
    const limiar = (BAYER[((Math.floor(p / largura) & 3) << 2) | (p % largura & 3)] / 16 - 0.5) * 0.4
    for (let c = 0; c < 3; c++) {
      const tom = Math.round(dados[i + c] / passo + limiar)
      dados[i + c] = Math.max(0, Math.min(niveis - 1, tom)) * passo
    }
  }
  return dados
}

// O endereço que cada <img> recebeu daqui: o "load" da versão pixelada não pode ser pixelado de novo.
const feitas = new WeakMap<HTMLImageElement, string>()

function ficaDeFora(img: HTMLImageElement) {
  const src = img.currentSrc || img.src
  if (img.closest('[data-sem-pixel]')) return true
  if (/\.svg($|\?)/i.test(src) || src.startsWith('data:image/svg')) return true
  const caixa = img.clientWidth ? img : img.parentElement
  const lado = Math.max(caixa?.clientWidth ?? 0, caixa?.clientHeight ?? 0)
  return img.naturalWidth < 16 || (lado > 0 && lado < LADO_MINIMO)
}

/** Desenha `fonte` em blocos e devolve o PNG; lança se o canvas não puder ler a imagem (outro site sem CORS). */
function emBlocos(fonte: HTMLImageElement, lw: number, lh: number) {
  const { largura, altura } = tamanhoPixelado(fonte.naturalWidth, fonte.naturalHeight, lw || fonte.naturalWidth, lh || fonte.naturalHeight)
  const canvas = document.createElement('canvas')
  canvas.width = largura
  canvas.height = altura
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('sem canvas')
  ctx.drawImage(fonte, 0, 0, largura, altura)
  const quadro = ctx.getImageData(0, 0, largura, altura)
  reduzirCores(quadro.data, largura)
  ctx.putImageData(quadro, 0, 0)
  return canvas.toDataURL('image/png')
}

function trocar(img: HTMLImageElement, url: string) {
  feitas.set(img, url)
  // Com srcset o navegador ignoraria o novo src.
  img.removeAttribute('srcset')
  img.removeAttribute('sizes')
  img.src = url
  img.dataset.pixel = 'sim'
}

function pixelar(img: HTMLImageElement) {
  if (feitas.get(img) === img.src) return
  // Marca sempre, mesmo quando fica como está: o CSS esconde a foto até ela ter essa marca.
  img.dataset.pixel = 'fora'
  if (ficaDeFora(img)) return
  const caixa = img.clientWidth ? img : img.parentElement
  const lw = caixa?.clientWidth ?? 0
  const lh = caixa?.clientHeight ?? 0
  try {
    trocar(img, emBlocos(img, lw, lh))
  } catch {
    // Foto de outro site: o canvas só lê se ela for pedida de novo com CORS. Se o site de origem não
    // liberar, a cópia nem carrega e a foto fica como veio.
    const origem = img.currentSrc || img.src
    if (!/^https?:/.test(origem) || img.crossOrigin !== null) return
    const copia = new Image()
    copia.crossOrigin = 'anonymous'
    copia.referrerPolicy = img.referrerPolicy
    copia.onload = () => {
      if ((img.currentSrc || img.src) !== origem) return
      try {
        trocar(img, emBlocos(copia, lw, lh))
      } catch {
        // fica como veio
      }
    }
    copia.src = origem
  }
}

/** Liga o pixel art das fotos no site inteiro. "load" e "error" não sobem pela árvore, por isso a captura. */
export function iniciarPixelArt() {
  document.addEventListener('load', (e) => e.target instanceof HTMLImageElement && pixelar(e.target), true)
  document.addEventListener('error', (e) => e.target instanceof HTMLImageElement && (e.target.dataset.pixel = 'fora'), true)
}

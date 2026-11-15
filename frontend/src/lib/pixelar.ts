// Pixel art das fotos: cada foto que termina de carregar é redesenhada pequena (num Web Worker), com poucas
// cores, e volta para o mesmo <img>; o CSS (image-rendering: pixelated) amplia em blocos, como num jogo
// 8 bits. Fica de fora o que não dá para ler (foto de outro site sem permissão de CORS), o que já é
// desenho (SVG) e o que é pequeno demais para virar blocos.

import type { Pedido, Resposta } from './pixelar.worker'

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

// A conversão (canvas, leitura de pixels, PNG) roda num Web Worker: na thread principal ela engasgava a
// rolagem. Sem Worker/OffscreenCanvas (navegador antigo), as fotos aparecem como vieram.
type Espera = { resolve: (png: Blob | null) => void }
const pendentes = new Map<number, Espera>()
let proximoId = 0
let trabalhador: Worker | null | undefined

function obterTrabalhador() {
  if (trabalhador !== undefined) return trabalhador
  trabalhador = null
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') return trabalhador
  try {
    const w = new Worker(new URL('./pixelar.worker.ts', import.meta.url), { type: 'module' })
    w.onmessage = ({ data }: MessageEvent<Resposta>) => {
      pendentes.get(data.id)?.resolve('png' in data ? data.png : null)
      pendentes.delete(data.id)
    }
    w.onerror = () => {
      for (const p of pendentes.values()) p.resolve(null)
      pendentes.clear()
    }
    trabalhador = w
  } catch {
    trabalhador = null
  }
  return trabalhador
}

/** Pede ao trabalhador o PNG em blocos da foto (ele mesmo baixa e decodifica); null se não deu. */
function converter(url: string, largura: number, altura: number): Promise<Blob | null> {
  const w = obterTrabalhador()
  if (!w) return Promise.resolve(null)
  return new Promise((resolve) => {
    const id = proximoId++
    pendentes.set(id, { resolve })
    const pedido: Pedido = { id, url, largura, altura }
    w.postMessage(pedido)
  })
}

function ficaDeFora(img: HTMLImageElement) {
  const src = img.currentSrc || img.src
  if (img.closest('[data-sem-pixel]')) return true
  if (/\.svg($|\?)/i.test(src) || src.startsWith('data:image/svg')) return true
  const caixa = img.clientWidth ? img : img.parentElement
  const lado = Math.max(caixa?.clientWidth ?? 0, caixa?.clientHeight ?? 0)
  return img.naturalWidth < 16 || (lado > 0 && lado < LADO_MINIMO)
}

function trocar(img: HTMLImageElement, png: Blob) {
  const anterior = feitas.get(img)
  if (anterior?.startsWith('blob:')) URL.revokeObjectURL(anterior)
  const url = URL.createObjectURL(png)
  feitas.set(img, url)
  // Com srcset o navegador ignoraria o novo src.
  img.removeAttribute('srcset')
  img.removeAttribute('sizes')
  img.src = url
  img.dataset.pixel = 'sim'
}

async function pixelar(img: HTMLImageElement) {
  if (feitas.get(img) === img.src) return
  // Enquanto converte a foto fica escondida (CSS: sem data-pixel); onde não há conversão, aparece como veio.
  delete img.dataset.pixel
  const origem = img.currentSrc || img.src
  const caixa = img.clientWidth ? img : img.parentElement
  const lw = caixa?.clientWidth ?? 0
  const lh = caixa?.clientHeight ?? 0
  if (ficaDeFora(img) || !obterTrabalhador()) {
    img.dataset.pixel = 'fora'
    return
  }
  // Rede de segurança: se a conversão demorar demais, mostra a foto original.
  const limite = setTimeout(() => !img.dataset.pixel && (img.dataset.pixel = 'fora'), 4000)
  const png = /^(https?|blob):/.test(origem) ? await converter(origem, lw, lh) : null
  clearTimeout(limite)
  // A foto pode ter mudado enquanto isso (lista que recarregou): vale só o que ainda é o mesmo endereço.
  if ((img.currentSrc || img.src) !== origem) return
  if (png) trocar(img, png)
  else img.dataset.pixel = 'fora'
}

/** Liga o pixel art das fotos no site inteiro. "load" e "error" não sobem pela árvore, por isso a captura. */
export function iniciarPixelArt() {
  document.addEventListener('load', (e) => e.target instanceof HTMLImageElement && pixelar(e.target), true)
  document.addEventListener('error', (e) => e.target instanceof HTMLImageElement && (e.target.dataset.pixel = 'fora'), true)
}

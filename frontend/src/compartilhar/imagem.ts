// Imagem da semana para compartilhar nos stories (1080 × 1920), desenhada num canvas.
// Tudo sai daqui: fundo, mapa de arremessos (a mesma meia-quadra de components/Quadra.tsx) e os números.
import { CANTO_TRES, CESTA, RAIO_TRES, ROTULO, SETORES, Y_FIM_CANTO, corAproveitamento, type DadosZonas } from '../components/Quadra'
import type { Zona } from '../types'

export const LARGURA = 1080
export const ALTURA = 1920

export interface DadosImagem {
  /** Ex.: "3 a 9 de nov." */
  periodo: string
  zonas: DadosZonas
  sequencia: number
  acertos: number
  tentativas: number
  treinos: number
  minutos: number
  endereco: string
}

/** O pedaço do CanvasRenderingContext2D que o desenho usa (os testes passam um contexto falso). */
export type Contexto = Pick<
  CanvasRenderingContext2D,
  | 'fillStyle' | 'strokeStyle' | 'lineWidth' | 'font' | 'textAlign' | 'textBaseline'
  | 'fillRect' | 'fillText' | 'beginPath' | 'moveTo' | 'lineTo' | 'arc' | 'closePath' | 'fill' | 'stroke'
  | 'save' | 'restore' | 'clip' | 'rect' | 'translate' | 'scale'
>

const COR = { fundo: '#101010', texto: '#f4f2ea', muted: '#a3a3a3', laranja: '#ff6a13', linha: '#3a3a3a', vazia: '#202020' }
const DISPLAY = "'Big Shoulders Display Variable', 'Arial Narrow', Impact, sans-serif"
const TEXTO = "'Manrope Variable', system-ui, sans-serif"

const pct = (acertos: number, tentativas: number) => (tentativas ? Math.round((acertos / tentativas) * 100) : null)

function cunha(ctx: Contexto, de: number, ate: number) {
  ctx.beginPath()
  ctx.moveTo(CESTA.x, CESTA.y)
  for (let a = de; a <= ate; a += 4) {
    const rad = (a * Math.PI) / 180
    ctx.lineTo(CESTA.x + 1000 * Math.cos(rad), CESTA.y + 1000 * Math.sin(rad))
  }
  ctx.closePath()
}

/** Área de dentro da linha de três: lateral, arco por baixo da cesta e a outra lateral. */
function dentroDosTres(ctx: Contexto) {
  const alfa = Math.atan2(Y_FIM_CANTO - CESTA.y, CESTA.x - CANTO_TRES)
  ctx.beginPath()
  ctx.moveTo(CANTO_TRES, 0)
  ctx.lineTo(CANTO_TRES, Y_FIM_CANTO)
  ctx.arc(CESTA.x, CESTA.y, RAIO_TRES, Math.PI - alfa, alfa, true)
  ctx.lineTo(500 - CANTO_TRES, 0)
  ctx.closePath()
}

const corZona = (zonas: DadosZonas, z: Zona) => {
  const d = zonas[z]
  return d?.tentativas ? corAproveitamento((d.acertos / d.tentativas) * 100) : COR.vazia
}

/** Meia-quadra 500 × 470 com o mapa de calor, desenhada em (x, y) com a escala dada. */
function desenharQuadra(ctx: Contexto, zonas: DadosZonas, x: number, y: number, escala: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(escala, escala)
  ctx.beginPath()
  ctx.rect(0, 0, 500, 470)
  ctx.clip()

  for (const s of SETORES) {
    ctx.fillStyle = corZona(zonas, `tres_${s.sufixo}` as Zona)
    cunha(ctx, s.de, s.ate)
    ctx.fill()
  }
  ctx.save()
  dentroDosTres(ctx)
  ctx.clip()
  for (const s of SETORES) {
    ctx.fillStyle = corZona(zonas, `media_${s.sufixo}` as Zona)
    cunha(ctx, s.de, s.ate)
    ctx.fill()
  }
  ctx.restore()
  ctx.fillStyle = corZona(zonas, 'garrafao')
  ctx.fillRect(170, 0, 160, 190)
  ctx.fillStyle = corZona(zonas, 'lance_livre')
  ctx.beginPath()
  ctx.arc(250, 190, 34, 0, Math.PI * 2)
  ctx.fill()

  // Linhas da quadra
  ctx.strokeStyle = COR.fundo
  ctx.lineWidth = 3
  for (const s of SETORES.slice(1)) {
    const rad = (s.de * Math.PI) / 180
    ctx.beginPath()
    ctx.moveTo(CESTA.x + 160 * Math.cos(rad), CESTA.y + 160 * Math.sin(rad))
    ctx.lineTo(CESTA.x + 1000 * Math.cos(rad), CESTA.y + 1000 * Math.sin(rad))
    ctx.stroke()
  }
  ctx.strokeStyle = COR.texto
  ctx.lineWidth = 2.5
  dentroDosTres(ctx)
  ctx.stroke()
  ctx.beginPath()
  ctx.rect(170, 0, 160, 190)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(250, 190, 60, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(CESTA.x, CESTA.y, 8, 0, Math.PI * 2)
  ctx.stroke()

  // Porcentagem de cada zona com arremessos
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const z of Object.keys(ROTULO) as Zona[]) {
    const d = zonas[z]
    if (!d?.tentativas) continue
    const [tx, ty] = ROTULO[z]
    const pequeno = z === 'tres_canto_e' || z === 'tres_canto_d'
    ctx.font = `800 ${pequeno ? 13 : 22}px ${TEXTO}`
    ctx.fillText(`${pct(d.acertos, d.tentativas)}%`, tx, ty)
  }
  ctx.restore()
}

function numero(ctx: Contexto, valor: string, rotulo: string, x: number, y: number, destaque = false) {
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = destaque ? COR.laranja : COR.texto
  ctx.font = `900 150px ${DISPLAY}`
  ctx.fillText(valor, x, y)
  ctx.fillStyle = COR.muted
  ctx.font = `800 26px ${TEXTO}`
  ctx.fillText(rotulo.toUpperCase(), x, y + 46)
}

/** Desenha a imagem inteira no contexto (1080 × 1920). */
export function desenharSemana(ctx: Contexto, d: DadosImagem) {
  ctx.fillStyle = COR.fundo
  ctx.fillRect(0, 0, LARGURA, ALTURA)
  ctx.fillStyle = COR.laranja
  ctx.fillRect(0, 0, LARGURA, 18)

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = COR.laranja
  ctx.font = `800 30px ${TEXTO}`
  ctx.fillText('BASKETBALL PRACTICE', 80, 150)
  ctx.fillStyle = COR.texto
  ctx.font = `900 190px ${DISPLAY}`
  ctx.fillText('MINHA', 72, 330)
  ctx.fillText('SEMANA', 72, 500)
  ctx.fillStyle = COR.muted
  ctx.font = `800 32px ${TEXTO}`
  ctx.fillText(d.periodo.toUpperCase(), 80, 570)

  desenharQuadra(ctx, d.zonas, 80, 640, 920 / 500)

  const aproveitamento = pct(d.acertos, d.tentativas)
  numero(ctx, String(d.sequencia), d.sequencia === 1 ? 'dia seguido' : 'dias seguidos', 80, 1640, true)
  numero(ctx, aproveitamento === null ? '—' : `${aproveitamento}%`, `${d.acertos}/${d.tentativas} arremessos`, 560, 1640)

  ctx.fillStyle = COR.texto
  ctx.font = `800 30px ${TEXTO}`
  ctx.fillText(`${d.treinos} ${d.treinos === 1 ? 'TREINO' : 'TREINOS'} · ${d.minutos} MIN`, 80, 1800)
  ctx.fillStyle = COR.muted
  ctx.font = `700 26px ${TEXTO}`
  ctx.fillText(d.endereco, 80, 1850)
}

/** Gera o PNG. Espera as fontes do site carregarem para o canvas usar as mesmas letras. */
export async function gerarPng(d: DadosImagem): Promise<Blob> {
  await Promise.all([document.fonts?.load(`900 150px ${DISPLAY}`), document.fonts?.load(`800 30px ${TEXTO}`)]).catch(() => undefined)
  const canvas = document.createElement('canvas')
  canvas.width = LARGURA
  canvas.height = ALTURA
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Seu navegador não conseguiu gerar a imagem.')
  desenharSemana(ctx, d)
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Seu navegador não conseguiu gerar a imagem.'))), 'image/png'),
  )
}

/** "3 a 9 de nov." para a semana de segunda a domingo que contém `d`. */
export function periodoDaSemana(segunda: Date) {
  const domingo = new Date(segunda.getFullYear(), segunda.getMonth(), segunda.getDate() + 6)
  const mes = (x: Date) => x.toLocaleDateString('pt-BR', { month: 'short' })
  return segunda.getMonth() === domingo.getMonth()
    ? `${segunda.getDate()} a ${domingo.getDate()} de ${mes(domingo)}`
    : `${segunda.getDate()} de ${mes(segunda)} a ${domingo.getDate()} de ${mes(domingo)}`
}

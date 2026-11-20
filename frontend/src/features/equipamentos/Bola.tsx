import { useId, useMemo, useState } from 'react'
import { CANAL_DO_MEIO, LADO, bolaModeloPng, canais } from '../../shared/ui/bolaPixel'
import { ICONES_TIMES, type IconeTime } from './icones-times'
import { LOGOS_RETRO, type LogoRetro } from './logos-retro'

// Bola em pixel art, réplica da bola de verdade vista de frente, como na foto do produto: a marca na faixa
// de cima, o logo do time (ou o nome do modelo) na faixa de baixo, e os canais na cor de destaque. O sprite
// das faixas é desenhado aqui, com 3 pixels por bloco; o logo vem do mesmo lugar dos escudos da aba NBA, em alta resolução. Não usa fotos da Amazon.

/** Luminância relativa (WCAG) de uma cor #rrggbb. */
function luminancia(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
}

/** Faixa escura pede o logo na versão para fundo escuro. */
export const ehEscura = (cor: string) => luminancia(cor) < 0.25
/** Tinta preta, como nas bolas de verdade, a não ser onde ela sumiria (faixa preta, couro escuro). */
const tinta = (fundo: string) => ((luminancia(fundo) + 0.05) / (luminancia('#141414') + 0.05) >= 3 ? '#141414' : '#F4F2EA')

// O sprite (40 × 40, raio 19) ocupa o círculo de centro (60, 60) e raio 52 do desenho.
const ESCALA = 52 / 19
const DESLOCA = 60 - (LADO / 2) * ESCALA
/** O sprite tem vários pixels por bloco (RESOLUCAO_VITRINE): o desenho cobre o mesmo espaço, com mais detalhe. */
const LADO_DO_SPRITE = LADO * ESCALA
/** Linha do desenho onde passa o canal do meio: a marca fica acima, o logo abaixo. */
const MEIO = DESLOCA + CANAL_DO_MEIO * ESCALA
/** Lado do logo no desenho (cerca de 44 px na tela). */
const LOGO = 30
export const LADO_DO_LOGO = 90
type Logo = { claro: string; escuro: string }

/** Logos dos times espalhados pela bola, como nas Wilson NBA All Team: só nas calotas ou na bola toda. */
export interface Colagem {
  logos: Logo[]
  onde: 'tudo' | 'calotas'
  /** Distância entre os logos (All Team, nas calotas), no desenho. */
  passo: number
  /** Adesivos grandes por cima do fundo, cada um na posição em que aparece na foto do produto. */
  adesivos?: { x: number; y: number; lado: number; giro: number; logo: LogoRetro }[]
}

const px = (bloco: number) => DESLOCA + bloco * ESCALA
const CANTO = 8
const FIM = 112

/** Faixa entre duas curvas (em blocos da grade), como caminho do desenho: onde os logos podem aparecer. */
function faixaEntre(de: (x: number) => number, ate: (x: number) => number) {
  const xs = Array.from({ length: LADO + 1 }, (_, i) => i)
  const ponto = (x: number, f: (x: number) => number) => `${px(x).toFixed(1)} ${px(f(x)).toFixed(1)}`
  return `M${xs.map((x) => ponto(x, de)).join('L')}L${[...xs].reverse().map((x) => ponto(x, ate)).join('L')}Z`
}

/** As calotas, que levam logo na All Team: a folga em volta dos canais (em blocos) deixa a costura limpa. */
function regioes(onde: Colagem['onde']) {
  const recuo = onde === 'calotas' ? 2 : 0
  const cima = (x: number) => canais(x, recuo).cima - 1
  const baixo = (x: number) => canais(x, recuo).baixo + 1
  return [faixaEntre(() => -10, cima), faixaEntre(baixo, () => 50)]
}

/** Sombra em degraus, no lado de baixo e da direita, para os logos acompanharem o volume. */
const SOMBRA = [7, 15, 24].map((d) => (
  <path key={d} fillRule="evenodd" fill="#000" opacity=".13" d={`M8 60a52 52 0 1 0 104 0a52 52 0 1 0-104 0ZM${8 - d} ${60 - d}a52 52 0 1 0 104 0a52 52 0 1 0-104 0Z`} />
))

/** Linha de um canal (em blocos da grade) como caminho do desenho. */
const linhaDoCanal = (f: (x: number) => number) =>
  `M${Array.from({ length: LADO + 1 }, (_, x) => `${px(x).toFixed(1)} ${px(f(x)).toFixed(1)}`).join('L')}`
const CANAIS_DA_BOLA = [(x: number) => canais(x).cima, () => CANAL_DO_MEIO, (x: number) => canais(x).baixo].map(linhaDoCanal)

/** Contorno branco fino em volta do logo, nos quatro lados. */
const CONTORNO = ['0.8px 0', '-0.8px 0', '0 0.8px', '0 -0.8px'].map((d) => `drop-shadow(${d} 0 #fff)`).join(' ')

interface Props {
  /** Cor da faixa do logo (e da calota de cima) e da faixa da marca (e da calota de baixo). */
  frente: string
  faixa: string
  canal: string
  /** O que vem impresso na faixa de cima: a marca da bola. */
  marca: string
  /** Bola de time: endereço do logo (para fundo claro e para fundo escuro) e o ícone que entra se ele não carregar. */
  logo?: { claro: string; escuro: string }
  icone?: IconeTime
  /** Bola de marca: o nome do modelo, no lugar do logo. */
  modelo?: string
  canalLargo?: boolean
  faixaClara?: string
  /** Contorno branco em volta do logo, para quando ele se perde na cor da faixa (logo vermelho em faixa vermelha). */
  logoContorno?: boolean
  grao?: boolean
  /** Calotas de outra cor que as faixas, e os logos dos times espalhados pela bola (as All Team). */
  calota?: string
  colagem?: Colagem
  /** Cor da marca quando não é a tinta automática (o dourado da Retro) e o contorno escuro que a destaca da colagem. */
  marcaCor?: string
  marcaContorno?: string
  /** Tamanho da letra da marca (a Retro tem o "Wilson" dourado bem grande). */
  marcaTamanho?: number
  /** Mini logo da liga ao lado do nome do modelo. */
  emblema?: boolean
}

export default function Bola({ frente, faixa, canal, marca, logo, icone, modelo, canalLargo, faixaClara, grao, logoContorno, calota, colagem, marcaCor, marcaContorno, marcaTamanho = 19, emblema }: Props) {
  const [semLogo, setSemLogo] = useState(false)
  // Uma imagem por modelo (e não centenas de retângulos de SVG por bola): a lista tem uma bola por time.
  const sprite = useMemo(
    () => bolaModeloPng({ gomos: [frente, faixa], costura: canal, canalLargo, faixa: faixaClara, grao, calota }),
    [frente, faixa, canal, canalLargo, faixaClara, grao, calota],
  )
  const id = useId()
  const regioesDaColagem = useMemo(() => (colagem?.onde === 'calotas' ? regioes(colagem.onde) : []), [colagem])
  const logosDaColagem = useMemo(() => {
    if (colagem?.onde !== 'calotas') return []
    const { passo, logos } = colagem
    const saida: { x: number; y: number; href: string }[] = []
    for (let linha = 0, y = CANTO; y < FIM; linha++, y += passo * 0.88) {
      for (let coluna = 0, x = CANTO + (linha % 2 ? passo / 2 : 0); x < FIM; coluna++, x += passo) {
        const t = logos[(linha * 5 + coluna * 11 + linha * coluna) % logos.length]
        saida.push({ x, y, href: t.claro })
      }
    }
    return saida
  }, [colagem])
  const centroDoLogo = MEIO + 2 + LOGO / 2

  return (
    <svg className="bola-desenho" viewBox="0 0 120 126" width="176" height="185" aria-hidden>
      {/* Sombra no chão. */}
      <ellipse cx="60" cy="118" rx="36" ry="5" fill="#000" opacity=".2" />

      <image href={sprite} x={DESLOCA} y={DESLOCA} width={LADO_DO_SPRITE} height={LADO_DO_SPRITE} />

      {colagem && (
        <g clipPath={`url(#${id}-bola)`}>
          <defs>
            <clipPath id={`${id}-bola`}>
              <circle cx="60" cy="60" r="51.5" />
            </clipPath>
            <clipPath id={`${id}-faixas`}>
              {regioesDaColagem.map((d) => <path key={d} d={d} />)}
            </clipPath>
            <pattern id={`${id}-grao`} width="1.5" height="1.5" patternUnits="userSpaceOnUse">
              <rect width=".75" height=".75" fill="#000" />
            </pattern>
          </defs>
          {colagem.onde === 'calotas' ? (
            <g clipPath={`url(#${id}-faixas)`}>
              {logosDaColagem.map((l, i) => (
                <image key={i} className="bola-colagem-logo" href={l.href} x={l.x - colagem.passo * 0.46} y={l.y - colagem.passo * 0.46} width={colagem.passo * 0.92} height={colagem.passo * 0.92} />
              ))}
              {SOMBRA}
            </g>
          ) : (
            <>
              {/* Borracha preta lisa: o brilho do sprite clarearia o preto até o cinza entre os adesivos. */}
              <circle cx="60" cy="60" r="52" fill={frente} />
              {colagem.adesivos?.map((a, i) => (
                <g
                  key={`a${i}`}
                  className="bola-colagem-logo bola-adesivo"
                  data-logo={a.logo}
                  transform={`translate(${a.x} ${a.y}) rotate(${a.giro}) scale(${a.lado / 100}) translate(-50 -50)`}
                >
                  {LOGOS_RETRO[a.logo]}
                </g>
              ))}
              {/* Grão da borracha em pontilhado, por cima de tudo: os adesivos ficam impressos na bola, em pixel. */}
              <rect x="8" y="8" width="104" height="104" fill={`url(#${id}-grao)`} opacity=".12" />
              {CANAIS_DA_BOLA.map((d) => (
                <path key={d} d={d} fill="none" stroke={canal} strokeWidth="2.3" />
              ))}
              {SOMBRA}
            </>
          )}
        </g>
      )}

      {marcaContorno && (
        // Sombra em degrau da marca: o relevo da letra dourada da Retro.
        <text className="bola-nome" x="60.9" y={MEIO - 6.6 - (marcaTamanho - 19) / 3} textAnchor="middle" fill={marcaContorno} stroke={marcaContorno} strokeWidth={marcaTamanho / 7} strokeLinejoin="round" fontSize={marcaTamanho} textLength={Math.min(64 * (marcaTamanho / 19), 74, marca.length * 9.5 * (marcaTamanho / 19))} lengthAdjust="spacingAndGlyphs">
          {marca}
        </text>
      )}
      <text className="bola-nome" x="60" y={MEIO - 8 - (marcaTamanho - 19) / 3} textAnchor="middle" fill={marcaCor ?? tinta(faixa)} stroke={marcaContorno} strokeWidth={marcaContorno ? marcaTamanho / 7 : undefined} paintOrder="stroke" strokeLinejoin="round" fontSize={marcaTamanho} textLength={Math.min(64 * (marcaTamanho / 19), 74, marca.length * 9.5 * (marcaTamanho / 19))} lengthAdjust="spacingAndGlyphs">
        {marca}
      </text>

      {logo && !semLogo && (
        <image
          className="bola-logo"
          href={ehEscura(frente) ? logo.escuro : logo.claro}
          x={60 - LOGO / 2}
          y={centroDoLogo - LOGO / 2}
          width={LOGO}
          height={LOGO}
          style={{ filter: logoContorno ? CONTORNO : undefined }}
          onError={() => setSemLogo(true)}
        />
      )}
      {logo && semLogo && icone && (
        <g transform={`translate(${60 - 13} ${centroDoLogo - 13}) scale(1.1)`} color={tinta(frente)} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" strokeLinejoin="miter">
          {ICONES_TIMES[icone]}
        </g>
      )}
      {emblema && (
        <g transform={`translate(32 ${centroDoLogo - 9})`} aria-hidden>
          <rect width="10" height="18" fill="#17408B" stroke="#F4F2EA" strokeWidth="0.8" />
          <path d="M0 10L10 6V18H0z" fill="#C9082A" />
          <path d="M2 12.5L8 8.5" stroke="#F4F2EA" strokeWidth="1.6" />
          <rect x="3.4" y="2" width="3" height="3" fill="#F4F2EA" />
        </g>
      )}
      {modelo && (
        <text className="bola-nome" x={emblema ? 70 : 60} y={centroDoLogo + 4} textAnchor="middle" fill={tinta(frente)} fontSize="13" textLength={Math.min(emblema ? 34 : 52, modelo.length * 7)} lengthAdjust="spacingAndGlyphs">
          {modelo}
        </text>
      )}
    </svg>
  )
}

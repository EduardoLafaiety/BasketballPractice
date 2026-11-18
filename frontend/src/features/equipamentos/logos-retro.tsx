import type { ReactNode } from 'react'

// Os logos antigos (anos 70 a 90) que a Wilson NBA All Team Retro traz colados na bola, redesenhados à mão como
// adesivos: cada um numa caixa de 100 × 100, com a borda branca recortada em volta. Não há arquivo público
// desses logos (a ESPN só tem os atuais), por isso são desenhos próprios inspirados nos originais.

export type LogoRetro =
  | 'rockets'
  | 'hawks'
  | 'kings'
  | 'jazz'
  | 'suns'
  | 'pistons'
  | 'celtics'
  | 'warriors'
  | 'raptors'
  | 'blazers'
  | 'magic'
  | 'nuggets'
  | 'grizzlies'
  | 'knicks'

const LETRA = "'Arial Black', 'Arial Bold', Arial, sans-serif"
const BRANCO = '#FFFFFF'
const TINTA = '#141414'

/** Texto pesado de logo, esticado para caber na largura pedida. */
function Letreiro(p: { x: number; y: number; largura: number; tamanho: number; cor: string; contorno?: string; italico?: boolean; children: string }) {
  return (
    <text
      x={p.x}
      y={p.y}
      textAnchor="middle"
      fontFamily={LETRA}
      fontWeight="900"
      fontSize={p.tamanho}
      fontStyle={p.italico ? 'italic' : undefined}
      textLength={p.largura}
      lengthAdjust="spacingAndGlyphs"
      fill={p.cor}
      stroke={p.contorno}
      strokeWidth={p.contorno ? p.tamanho / 7 : undefined}
      strokeLinejoin="round"
      paintOrder="stroke"
    >
      {p.children}
    </text>
  )
}

/** Texto em volta do círculo (os anéis "BOSTON CELTICS", "TORONTO RAPTORS"). */
function Anel(p: { id: string; raio: number; tamanho: number; cor: string; children: string; embaixo?: boolean }) {
  const r = p.raio
  // Por cima: arco da esquerda para a direita passando pelo alto; por baixo, passando por baixo (o texto fica de pé).
  const d = p.embaixo ? `M${50 - r} 50A${r} ${r} 0 0 0 ${50 + r} 50` : `M${50 - r} 50A${r} ${r} 0 0 1 ${50 + r} 50`
  return (
    <>
      <path id={p.id} d={d} fill="none" />
      <text fontFamily={LETRA} fontWeight="900" fontSize={p.tamanho} fill={p.cor} letterSpacing="0.5">
        <textPath href={`#${p.id}`} startOffset="50%" textAnchor="middle">
          {p.children}
        </textPath>
      </text>
    </>
  )
}

/** Bola de basquete pequena, com as costuras. */
function Bolinha({ cx, cy, r, cor = '#E8742A' }: { cx: number; cy: number; r: number; cor?: string }) {
  const s = r * 0.12
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={cor} stroke={TINTA} strokeWidth={s} />
      <path
        d={`M${cx} ${cy - r}V${cy + r}M${cx - r} ${cy}H${cx + r}M${cx - r * 0.7} ${cy - r * 0.7}Q${cx - r * 0.2} ${cy} ${cx - r * 0.7} ${cy + r * 0.7}M${cx + r * 0.7} ${cy - r * 0.7}Q${cx + r * 0.2} ${cy} ${cx + r * 0.7} ${cy + r * 0.7}`}
        fill="none"
        stroke={TINTA}
        strokeWidth={s}
      />
    </g>
  )
}

/** Estrela de cinco pontas. */
const estrela = (cx: number, cy: number, r: number) =>
  `M${Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2
    const ri = i % 2 ? r * 0.42 : r
    return `${(cx + ri * Math.cos(a)).toFixed(1)} ${(cy + ri * Math.sin(a)).toFixed(1)}`
  }).join('L')}Z`

/** O recorte branco do adesivo: a forma do logo, um pouco maior. */
const recorteRedondo = <circle cx="50" cy="50" r="50" fill={BRANCO} />
const recorteRetangulo = (y: number, h: number) => <rect x="0" y={y} width="100" height={h} rx="10" fill={BRANCO} />

export const LOGOS_RETRO: Record<LogoRetro, ReactNode> = {
  // Houston Rockets, 1972–1995: bola amarela com anel vermelho e o nome atravessado.
  rockets: (
    <>
      {recorteRedondo}
      <circle cx="50" cy="50" r="46" fill="#CE1141" />
      <circle cx="50" cy="50" r="38" fill="#FDB927" />
      <path d="M24 20Q44 50 24 80M76 20Q56 50 76 80M50 12V88" fill="none" stroke="#CE1141" strokeWidth="3" />
      <rect x="6" y="39" width="88" height="22" fill="#CE1141" />
      <Letreiro x={50} y={57.5} largura={78} tamanho={18} cor="#FDB927" italico>
        ROCKETS
      </Letreiro>
    </>
  ),
  // Atlanta Hawks, 1972–1995: a cabeça de falcão em forma de "pac-man" dentro do círculo vermelho.
  hawks: (
    <>
      {recorteRedondo}
      <circle cx="50" cy="50" r="46" fill="#E03A3E" />
      <circle cx="50" cy="50" r="46" fill="none" stroke={TINTA} strokeWidth="2.5" />
      <path d="M56 50L20 33A36 36 0 1 1 20 67Z" fill={BRANCO} />
      <path d="M56 50L28 41A28 28 0 1 1 28 59Z" fill="#E03A3E" />
      <path d="M56 50L36 45A20 20 0 1 1 36 55Z" fill={BRANCO} />
      <circle cx="58" cy="38" r="4.5" fill={TINTA} />
      <path d="M20 33L56 50L20 67" fill="none" stroke={TINTA} strokeWidth="2.5" strokeLinejoin="round" />
    </>
  ),
  // Kansas City / Sacramento Kings, anos 70 e 80: a placa vermelha com a coroa em cima.
  kings: (
    <>
      <path d="M30 26L32 6L42 17L50 2L58 17L68 6L70 26Z" fill={BRANCO} stroke={BRANCO} strokeWidth="8" strokeLinejoin="round" />
      {recorteRetangulo(20, 64)}
      <path d="M32 26L33 9L42 19L50 6L58 19L67 9L68 26Z" fill="#F2B33D" stroke={TINTA} strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="5" y="25" width="90" height="54" rx="6" fill="#CE1141" />
      <rect x="10" y="30" width="80" height="44" rx="3" fill="none" stroke={BRANCO} strokeWidth="2.5" />
      <Letreiro x={50} y={63} largura={70} tamanho={26} cor={BRANCO}>
        KINGS
      </Letreiro>
    </>
  ),
  // Utah Jazz, 1980–1996: "JAZZ" roxo com a nota musical e a bola laranja.
  jazz: (
    <>
      {recorteRetangulo(14, 72)}
      <path d="M22 22V64" stroke="#4F2683" strokeWidth="5" />
      <path d="M22 22Q34 26 32 38" fill="none" stroke="#4F2683" strokeWidth="5" strokeLinecap="round" />
      <Bolinha cx={15} cy={66} r={11} />
      <Letreiro x={62} y={68} largura={66} tamanho={34} cor="#4F2683" contorno="#C4A3E6" italico>
        JAZZ
      </Letreiro>
    </>
  ),
  // Phoenix Suns, 1992–2000: o sol laranja com raios e "SUNS" roxo.
  suns: (
    <>
      {recorteRetangulo(6, 88)}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (Math.PI / 6) * i
        return <path key={i} d={`M${66 + 15 * Math.cos(a)} ${32 + 15 * Math.sin(a)}L${66 + 26 * Math.cos(a)} ${32 + 26 * Math.sin(a)}`} stroke="#1D1160" strokeWidth="4" strokeLinecap="round" />
      })}
      <circle cx="66" cy="32" r="13" fill="#E56020" />
      <path d="M6 50H44M6 56H38" stroke="#E56020" strokeWidth="3" strokeLinecap="round" />
      <Letreiro x={50} y={86} largura={84} tamanho={34} cor="#1D1160" contorno="#E56020">
        SUNS
      </Letreiro>
    </>
  ),
  // Detroit Pistons, 1979–1996: círculo vermelho em cima, azul embaixo e o nome na faixa branca.
  pistons: (
    <>
      {recorteRedondo}
      <path d="M4 50A46 46 0 0 1 96 50Z" fill="#C8102E" />
      <path d="M4 50A46 46 0 0 0 96 50Z" fill="#1D42BA" />
      <circle cx="50" cy="50" r="46" fill="none" stroke={TINTA} strokeWidth="2" />
      <rect x="4" y="36" width="92" height="28" fill={BRANCO} />
      <path d="M4 36H96M4 64H96" stroke={TINTA} strokeWidth="1.5" />
      <Letreiro x={50} y={47} largura={46} tamanho={10} cor="#1D42BA">
        DETROIT
      </Letreiro>
      <Letreiro x={50} y={61} largura={74} tamanho={15} cor="#C8102E">
        PISTONS
      </Letreiro>
      <Bolinha cx={50} cy={20} r={9} />
    </>
  ),
  // Boston Celtics: o anel com o nome e o trevo no meio.
  celtics: (
    <>
      {recorteRedondo}
      <circle cx="50" cy="50" r="46" fill="#5C3A21" />
      <circle cx="50" cy="50" r="31" fill="#F4F2EA" />
      <Anel id="anel-celtics" raio={36} tamanho={11} cor={BRANCO}>
        BOSTON
      </Anel>
      <Anel id="anel-celtics-baixo" raio={41} tamanho={11} cor={BRANCO} embaixo>
        CELTICS
      </Anel>
      <g fill="#007A33">
        <circle cx="50" cy="38" r="9" />
        <circle cx="39" cy="51" r="9" />
        <circle cx="61" cy="51" r="9" />
        <circle cx="50" cy="50" r="6" />
      </g>
      <path d="M50 55Q52 66 58 72" fill="none" stroke="#007A33" strokeWidth="4" strokeLinecap="round" />
      <Bolinha cx={38} cy={69} r={6} />
    </>
  ),
  // Golden State Warriors, 1971–1988: "The City", a ponte sobre o círculo dourado.
  warriors: (
    <>
      {recorteRedondo}
      <circle cx="50" cy="50" r="46" fill="#1D428A" />
      <circle cx="50" cy="50" r="33" fill="#FDB927" />
      <path d="M17 54Q36 70 37 26M37 26Q50 52 63 26M63 26Q64 70 83 54" fill="none" stroke="#1D428A" strokeWidth="2" />
      <rect x="34" y="22" width="6" height="40" fill="#1D428A" />
      <rect x="60" y="22" width="6" height="40" fill="#1D428A" />
      <rect x="17" y="56" width="66" height="5" fill="#1D428A" />
      <Anel id="anel-warriors" raio={39} tamanho={10} cor="#FDB927" embaixo>
        WARRIORS
      </Anel>
    </>
  ),
  // Toronto Raptors, 1995: a bola vermelha arranhada no anel roxo.
  raptors: (
    <>
      {recorteRedondo}
      <circle cx="50" cy="50" r="46" fill="#753BBD" />
      <Anel id="anel-raptors" raio={39} tamanho={9.5} cor={BRANCO}>
        TORONTO
      </Anel>
      <Anel id="anel-raptors-baixo" raio={44} tamanho={9.5} cor={BRANCO} embaixo>
        RAPTORS
      </Anel>
      <Bolinha cx={50} cy={50} r={28} cor="#CE1141" />
      <path d="M36 32L52 64M45 30L61 62M54 30L68 58" stroke={BRANCO} strokeWidth="3.5" strokeLinecap="round" />
    </>
  ),
  // Portland Trail Blazers, 1970–1990: o cata-vento de cinco faixas vermelhas e cinco pretas.
  blazers: (
    <>
      {recorteRetangulo(0, 100)}
      <g fill="none" strokeWidth="4.2" strokeLinecap="round">
        {Array.from({ length: 5 }, (_, i) => {
          const o = i * 7.5
          return <path key={i} d={`M${16 + o} 10V44Q${16 + o} ${76 - o} ${48} ${76 - o}H90`} stroke="#CE1141" />
        })}
        <g transform="rotate(180 50 50)">
          {Array.from({ length: 5 }, (_, i) => {
            const o = i * 7.5
            return <path key={i} d={`M${16 + o} 10V44Q${16 + o} ${76 - o} ${48} ${76 - o}H90`} stroke={TINTA} />
          })}
        </g>
      </g>
    </>
  ),
  // Orlando Magic, 1989–2000: "Magic" azul com as estrelas.
  magic: (
    <>
      {recorteRetangulo(18, 64)}
      <Letreiro x={36} y={38} largura={36} tamanho={11} cor={TINTA} italico>
        Orlando
      </Letreiro>
      <Letreiro x={50} y={68} largura={80} tamanho={30} cor="#0077C0" contorno="#C4CED4" italico>
        Magic
      </Letreiro>
      <path d={estrela(78, 30, 9)} fill="#C4CED4" stroke={TINTA} strokeWidth="1.2" />
      <path d={estrela(64, 26, 5)} fill="#0077C0" />
      <path d={estrela(90, 46, 4)} fill="#0077C0" />
    </>
  ),
  // Denver Nuggets, 1981–1993: os prédios de Denver em arco-íris sobre o nome.
  nuggets: (
    <>
      {recorteRetangulo(4, 92)}
      {[
        ['#E03A3E', 22],
        ['#F7941D', 34],
        ['#FDB927', 14],
        ['#4FB848', 40],
        ['#00A3E0', 26],
        ['#1D42BA', 46],
        ['#753BBD', 30],
      ].map(([cor, alto], i) => (
        <rect key={i} x={9 + i * 12} y={62 - (alto as number)} width="11" height={alto as number} fill={cor as string} />
      ))}
      <path d="M8 62H92" stroke={TINTA} strokeWidth="2" />
      <Letreiro x={50} y={76} largura={50} tamanho={11} cor="#1D42BA">
        DENVER
      </Letreiro>
      <Letreiro x={50} y={90} largura={82} tamanho={15} cor="#1D42BA">
        NUGGETS
      </Letreiro>
    </>
  ),
  // Vancouver Grizzlies, 1995: o urso no círculo verde-água.
  grizzlies: (
    <>
      {recorteRedondo}
      <circle cx="50" cy="50" r="46" fill="#00B2A9" />
      <circle cx="50" cy="50" r="46" fill="none" stroke="#E43C40" strokeWidth="4" />
      <circle cx="28" cy="30" r="11" fill="#6B3E26" />
      <circle cx="72" cy="30" r="11" fill="#6B3E26" />
      <circle cx="28" cy="30" r="5" fill="#BC9B6A" />
      <circle cx="72" cy="30" r="5" fill="#BC9B6A" />
      <ellipse cx="50" cy="54" rx="30" ry="27" fill="#6B3E26" />
      <ellipse cx="50" cy="65" rx="14" ry="11" fill="#BC9B6A" />
      <ellipse cx="50" cy="60" rx="6" ry="4.5" fill={TINTA} />
      <circle cx="39" cy="47" r="3.5" fill={TINTA} />
      <circle cx="61" cy="47" r="3.5" fill={TINTA} />
      <path d="M44 71Q50 76 56 71" fill="none" stroke={TINTA} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  // New York Knicks, 1964–1989: a bola laranja com "KNICKS" azul atravessado.
  knicks: (
    <>
      {recorteRedondo}
      <Bolinha cx={50} cy={50} r={46} cor="#F58426" />
      <Letreiro x={50} y={60} largura={86} tamanho={28} cor="#006BB6" contorno={BRANCO}>
        KNICKS
      </Letreiro>
    </>
  ),
}

import type { ReactNode } from 'react'

// Ilustrações próprias dos artigos de ciência, em 3:2 como as fotos da História.
// As cores vêm do tema: --c é a cor da categoria do artigo, e o resto acompanha o claro e o escuro.

const COR = 'var(--c)'
const TINTA = 'var(--texto)'
const FUNDO = 'var(--superficie-2)'
const CLARO = 'var(--superficie)'
const BOLA = 'var(--laranja)'

/** Bola de basquete com os gomos. */
function Bola({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={BOLA} stroke={TINTA} strokeWidth={r / 9} />
      <path
        d={`M${x - r} ${y}h${2 * r}M${x} ${y - r}v${2 * r}M${x - r * 0.62} ${y - r * 0.78}c${r * 0.5} ${r * 0.45} ${r * 0.5} ${r * 1.11} 0 ${r * 1.56}M${x + r * 0.62} ${y - r * 0.78}c${-r * 0.5} ${r * 0.45} ${-r * 0.5} ${r * 1.11} 0 ${r * 1.56}`}
        fill="none"
        stroke={TINTA}
        strokeWidth={r / 11}
      />
    </g>
  )
}

/** Tabela e aro vistos de lado. */
function Cesta({ x, y }: { x: number; y: number }) {
  return (
    <g stroke={TINTA} strokeWidth={6} strokeLinecap="round" fill="none">
      <rect x={x} y={y - 60} width={12} height={110} fill={CLARO} />
      <path d={`M${x} ${y}h-70`} stroke={COR} strokeWidth={8} />
      <path d={`M${x - 66} ${y + 4}l10 44h36l10-44M${x - 50} ${y + 6}l6 42M${x - 26} ${y + 6}l-6 42`} strokeWidth={3} />
    </g>
  )
}

const Ceu = () => (
  <g fill={TINTA}>
    <path d="M470 70a50 50 0 1 0 40 82a42 42 0 1 1-40-82z" fill={COR} />
    {[[90, 70], [160, 120], [250, 60], [330, 110], [400, 50]].map(([x, y]) => (
      <circle key={`${x}-${y}`} cx={x} cy={y} r={4} />
    ))}
  </g>
)

const DESENHOS: Record<string, ReactNode> = {
  // Mentalidade
  'mentalidade-de-crescimento': (
    <>
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={110 + i * 100} y={300 - i * 55} width={100} height={60 + i * 55} fill={i === 3 ? COR : CLARO} stroke={TINTA} strokeWidth={5} />
      ))}
      <path d="M150 230q60-90 130-60q70-90 140-80" fill="none" stroke={TINTA} strokeWidth={5} strokeDasharray="4 14" strokeLinecap="round" />
      <path d="M440 92l-28-8m28 8l-18 22" stroke={TINTA} strokeWidth={6} strokeLinecap="round" />
      <Bola x={470} y={105} r={36} />
    </>
  ),
  'treino-deliberado': (
    <>
      {[130, 95, 60, 25].map((r, i) => (
        <circle key={r} cx={250} cy={200} r={r} fill={i % 2 ? CLARO : COR} stroke={TINTA} strokeWidth={5} />
      ))}
      <Bola x={250} y={200} r={20} />
      <g stroke={TINTA} strokeWidth={7} strokeLinecap="round">
        {[0, 1, 2, 3].map((i) => <path key={i} d={`M${430 + i * 22} 140v80`} />)}
        <path d="M420 210l90-60" stroke={COR} />
        <path d="M430 270h80" />
      </g>
    </>
  ),
  'pressao-e-rotina': (
    <>
      <Cesta x={520} y={120} />
      <path d="M150 300q140-260 310-170" fill="none" stroke={TINTA} strokeWidth={5} strokeDasharray="4 14" strokeLinecap="round" />
      <Bola x={140} y={300} r={44} />
      <g>
        <path d="M210 120h150a20 20 0 0 1 20 20v40a20 20 0 0 1-20 20h-110l-30 26v-26h-10a20 20 0 0 1-20-20v-40a20 20 0 0 1 20-20z" fill={COR} stroke={TINTA} strokeWidth={5} />
        <path d="M235 150h110M235 172h70" stroke={TINTA} strokeWidth={6} strokeLinecap="round" />
      </g>
    </>
  ),
  'metas-de-processo': (
    <>
      <rect x={150} y={70} width={260} height={270} rx={10} fill={CLARO} stroke={TINTA} strokeWidth={6} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={180} y={110 + i * 72} width={40} height={40} fill={i < 2 ? COR : CLARO} stroke={TINTA} strokeWidth={5} />
          {i < 2 && <path d={`M188 ${130 + i * 72}l10 10 18-22`} fill="none" stroke={TINTA} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />}
          <path d={`M245 ${130 + i * 72}h${i === 1 ? 110 : 135}`} stroke={TINTA} strokeWidth={7} strokeLinecap="round" />
        </g>
      ))}
      <path d="M450 330V80" stroke={TINTA} strokeWidth={7} strokeLinecap="round" />
      <path d="M454 84h80l-20 30 20 30h-80z" fill={COR} stroke={TINTA} strokeWidth={5} strokeLinejoin="round" />
    </>
  ),
  'olhar-quieto': (
    <>
      <path d="M60 200q110-110 220 0q-110 110-220 0z" fill={CLARO} stroke={TINTA} strokeWidth={6} />
      <circle cx={170} cy={200} r={42} fill={COR} stroke={TINTA} strokeWidth={5} />
      <circle cx={170} cy={200} r={17} fill={TINTA} />
      <path d="M260 200L455 150" stroke={TINTA} strokeWidth={5} strokeDasharray="4 14" strokeLinecap="round" />
      <Cesta x={540} y={140} />
      <circle cx={467} cy={146} r={10} fill="none" stroke={COR} strokeWidth={5} />
    </>
  ),
  'treino-variado': (
    <>
      {/* Em cima, o treino em bloco (tudo igual); embaixo, misturado, com as setas de embaralhar */}
      {[0, 1, 2].map((i) => (
        <rect key={i} x={90 + i * 90} y={80} width={64} height={64} rx={8} fill={CLARO} stroke={TINTA} strokeWidth={5} />
      ))}
      <rect x={90} y={250} width={64} height={64} rx={8} fill={COR} stroke={TINTA} strokeWidth={5} />
      <circle cx={212} cy={282} r={34} fill={CLARO} stroke={TINTA} strokeWidth={5} />
      <path d="M302 248l36 66h-72z" fill={COR} stroke={TINTA} strokeWidth={5} strokeLinejoin="round" />
      <g fill="none" stroke={TINTA} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M400 150q50 0 70 50t70 50M400 250q50 0 70-50t70-50" />
        <path d="M520 130l22 20-22 20M520 230l22 20-22 20" stroke={COR} />
      </g>
      <Bola x={470} y={330} r={30} />
    </>
  ),
  'foco-no-aro': (
    <>
      <Cesta x={540} y={150} />
      {/* A mira em volta do aro: a atenção vai para o alvo */}
      <circle cx={505} cy={152} r={58} fill="none" stroke={COR} strokeWidth={7} />
      <circle cx={505} cy={152} r={30} fill="none" stroke={COR} strokeWidth={4} opacity={0.6} />
      <path d="M505 76v34M505 194v34M429 152h34" stroke={COR} strokeWidth={7} strokeLinecap="round" />
      <path d="M150 300q150-260 300-150" fill="none" stroke={TINTA} strokeWidth={5} strokeDasharray="4 14" strokeLinecap="round" />
      <Bola x={130} y={310} r={42} />
    </>
  ),
  'fadiga-mental': (
    <>
      <rect x={110} y={60} width={150} height={280} rx={24} fill={CLARO} stroke={TINTA} strokeWidth={7} />
      <rect x={128} y={92} width={114} height={210} rx={8} fill={COR} />
      <path d="M160 320h50" stroke={TINTA} strokeWidth={6} strokeLinecap="round" />
      <path d="M150 140h70M150 170h50M150 200h70M150 230h40" stroke={CLARO} strokeWidth={7} strokeLinecap="round" />
      {/* Bateria quase vazia */}
      <rect x={330} y={150} width={200} height={100} rx={14} fill={CLARO} stroke={TINTA} strokeWidth={7} />
      <rect x={530} y={180} width={18} height={40} rx={4} fill={TINTA} />
      <rect x={346} y={166} width={36} height={68} rx={6} fill={COR} />
      <path d="M420 300l-20 30h40l-20 30" fill="none" stroke={TINTA} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),

  // Condicionamento
  'o-que-o-jogo-exige': (
    <>
      <path d="M40 220h120l25-90 35 170 30-130 20 50h70l25-110 35 170 30-130 20 70h110" fill="none" stroke={COR} strokeWidth={12} strokeLinejoin="round" strokeLinecap="round" />
      <path d="M40 220h120l25-90 35 170 30-130 20 50h70l25-110 35 170 30-130 20 70h110" fill="none" stroke={TINTA} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
      <g stroke={TINTA} strokeWidth={6} strokeLinecap="round">
        <path d="M70 330h80M100 355h60M50 355h20" />
        <path d="M450 330h80M440 355h60" />
      </g>
    </>
  ),
  'salto-vertical': (
    <>
      <rect x={110} y={250} width={160} height={110} fill={COR} stroke={TINTA} strokeWidth={6} />
      <path d="M110 275h160" stroke={TINTA} strokeWidth={4} />
      <path d="M190 245q70-220 160-30" fill="none" stroke={TINTA} strokeWidth={5} strokeDasharray="4 14" strokeLinecap="round" />
      <Bola x={300} y={120} r={38} />
      <g stroke={TINTA} strokeWidth={5} strokeLinecap="round">
        <path d="M470 360V60" strokeWidth={7} />
        {[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M470 ${330 - i * 50}h${i % 2 ? 22 : 40}`} />)}
        <path d="M440 90l30-30 30 30" stroke={COR} strokeWidth={8} fill="none" />
      </g>
    </>
  ),
  'prevencao-de-lesoes': (
    <>
      <path d="M150 330a150 70 0 0 1 300 0z" fill={COR} stroke={TINTA} strokeWidth={6} />
      {/* Tênis de cano alto, de perfil, em cima da meia-bola de equilíbrio */}
      <path d="M205 262V150q0-12 12-12h52q10 0 12 10l8 40q4 14 20 20l70 22q32 10 32 32z" fill={CLARO} stroke={TINTA} strokeWidth={6} strokeLinejoin="round" />
      <path d="M198 262h228q12 0 12 12v4q0 10-12 10H198q-10 0-10-10v-4q0-12 10-12z" fill={TINTA} />
      <path d="M268 176l22-6M276 198l24-6M290 216l22-6" stroke={TINTA} strokeWidth={5} strokeLinecap="round" />
      <path d="M205 168h-14" stroke={COR} strokeWidth={8} strokeLinecap="round" />
      <path d="M120 230q-25-40 0-80M480 230q25-40 0-80" fill="none" stroke={TINTA} strokeWidth={5} strokeLinecap="round" />
      <path d="M90 250q-40-60 0-120M510 250q40-60 0-120" fill="none" stroke={TINTA} strokeWidth={5} strokeLinecap="round" opacity={0.5} />
    </>
  ),
  'forca-para-jovens': (
    <>
      <path d="M150 210h300" stroke={TINTA} strokeWidth={14} strokeLinecap="round" />
      {[[120, 90], [165, 120], [435, 120], [480, 90]].map(([x, h], i) => (
        <rect key={i} x={x - 18} y={210 - h / 2} width={36} height={h} rx={6} fill={i === 1 || i === 2 ? CLARO : COR} stroke={TINTA} strokeWidth={6} />
      ))}
      <path d="M300 150V60M265 95l35-35 35 35" fill="none" stroke={COR} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M180 320h240" stroke={TINTA} strokeWidth={6} strokeLinecap="round" />
    </>
  ),
  'alongamento-antes-do-jogo': (
    <>
      <circle cx={210} cy={215} r={120} fill={CLARO} stroke={TINTA} strokeWidth={7} />
      <path d="M210 215V95A120 120 0 0 1 314 155z" fill={COR} stroke={TINTA} strokeWidth={5} strokeLinejoin="round" />
      <path d="M210 215l60-70" stroke={TINTA} strokeWidth={8} strokeLinecap="round" />
      <rect x={190} y={60} width={40} height={24} rx={4} fill={TINTA} />
      <circle cx={210} cy={215} r={10} fill={TINTA} />
      <path d="M380 150q25-30 50 0t50 0t50 0M380 250q25-30 50 0t50 0t50 0" fill="none" stroke={COR} strokeWidth={10} strokeLinecap="round" />
      <path d="M380 200h150" stroke={TINTA} strokeWidth={6} strokeLinecap="round" />
    </>
  ),
  'ligamento-do-joelho': (
    <>
      {/* O joelho de frente: fêmur em cima, tíbia embaixo e os ligamentos cruzados no meio */}
      <path d="M265 30h70v80q50 10 50 50a32 32 0 0 1-64 0h-42a32 32 0 0 1-64 0q0-40 50-50z" fill={CLARO} stroke={TINTA} strokeWidth={7} strokeLinejoin="round" />
      <path d="M215 232h170q0 24-40 40v98h-90v-98q-40-16-40-40z" fill={CLARO} stroke={TINTA} strokeWidth={7} strokeLinejoin="round" />
      <path d="M272 190l56 40M328 190l-56 40" stroke={COR} strokeWidth={14} strokeLinecap="round" />
      <path d="M100 170q-30 30 0 60M500 170q30 30 0 60" fill="none" stroke={TINTA} strokeWidth={6} strokeLinecap="round" />
      <path d="M70 150q-50 50 0 100M530 150q50 50 0 100" fill="none" stroke={TINTA} strokeWidth={6} strokeLinecap="round" opacity={0.5} />
    </>
  ),
  'nordico': (
    <>
      <rect x={70} y={320} width={460} height={24} rx={10} fill={CLARO} stroke={TINTA} strokeWidth={5} />
      {/* De joelhos, com os tornozelos presos, o corpo desce reto para a frente */}
      <rect x={96} y={290} width={52} height={30} rx={8} fill={COR} stroke={TINTA} strokeWidth={5} />
      <g stroke={TINTA} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M120 306L250 312" />
        <path d="M250 312L380 180" />
        <path d="M352 208l60 26" strokeWidth={10} />
      </g>
      <circle cx={406} cy={150} r={30} fill={CLARO} stroke={TINTA} strokeWidth={7} />
      <path d="M440 128q66 40 60 116" fill="none" stroke={COR} strokeWidth={7} strokeLinecap="round" strokeDasharray="4 14" />
      <path d="M480 228l20 18 16-22" fill="none" stroke={COR} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  'joelho-do-saltador': (
    <>
      {/* A perna de lado: a patela e o tendão logo abaixo, onde dói */}
      <path d="M150 60l90 150" stroke={TINTA} strokeWidth={40} strokeLinecap="round" />
      <path d="M240 210l-40 150" stroke={TINTA} strokeWidth={36} strokeLinecap="round" />
      <ellipse cx={270} cy={200} rx={24} ry={30} fill={CLARO} stroke={TINTA} strokeWidth={6} />
      <path d="M262 232q-6 40-24 66" fill="none" stroke={COR} strokeWidth={12} strokeLinecap="round" />
      <g stroke={COR} strokeWidth={6} strokeLinecap="round">
        <path d="M300 250l30-10M304 280l34 6M290 306l24 20" />
      </g>
      <path d="M460 330V90M420 130l40-40 40 40" fill="none" stroke={TINTA} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M420 350h80" stroke={TINTA} strokeWidth={6} strokeLinecap="round" />
    </>
  ),

  // Sono
  'sono-e-arremesso': (
    <>
      <Ceu />
      <Cesta x={210} y={170} />
      <path d="M120 360q60-260 50-180" fill="none" stroke={TINTA} strokeWidth={5} strokeDasharray="4 14" strokeLinecap="round" />
      <Bola x={170} y={150} r={30} />
      <path d="M380 260h170v70H380z" fill={CLARO} stroke={TINTA} strokeWidth={6} />
      <rect x={395} y={235} width={60} height={30} rx={12} fill={COR} stroke={TINTA} strokeWidth={5} />
      <path d="M380 330v30M550 330v30" stroke={TINTA} strokeWidth={8} strokeLinecap="round" />
    </>
  ),
  'sono-e-lesoes': (
    <>
      <Ceu />
      <path d="M90 250h300v80H90z" fill={CLARO} stroke={TINTA} strokeWidth={6} />
      <rect x={105} y={220} width={80} height={36} rx={14} fill={COR} stroke={TINTA} strokeWidth={5} />
      <path d="M200 250q60-40 180 0" fill={COR} stroke={TINTA} strokeWidth={5} />
      <path d="M90 330v30M390 330v30" stroke={TINTA} strokeWidth={8} strokeLinecap="round" />
      <text x={470} y={320} textAnchor="middle" fontFamily="var(--fonte-display)" fontWeight={800} fontSize={120} fill={TINTA}>8h</text>
    </>
  ),
  'higiene-do-sono': (
    <>
      <Ceu />
      <rect x={90} y={150} width={120} height={210} rx={18} fill={CLARO} stroke={TINTA} strokeWidth={6} />
      <path d="M80 160l140 190" stroke={COR} strokeWidth={12} strokeLinecap="round" />
      <path d="M300 230h130v80a40 40 0 0 1-40 40h-50a40 40 0 0 1-40-40z" fill={CLARO} stroke={TINTA} strokeWidth={6} />
      <path d="M430 250h20a25 25 0 0 1 0 50h-20" fill="none" stroke={TINTA} strokeWidth={6} />
      <path d="M340 200q-12-20 0-40M380 200q-12-20 0-40" fill="none" stroke={TINTA} strokeWidth={5} strokeLinecap="round" />
      <path d="M290 220l150 140" stroke={COR} strokeWidth={12} strokeLinecap="round" />
    </>
  ),
  'sono-e-aprendizado': (
    <>
      <Ceu />
      <path d="M60 330h480" stroke={TINTA} strokeWidth={6} strokeLinecap="round" />
      <path d="M80 200q40 140 80 0t80 0t80 0t80 0" fill="none" stroke={COR} strokeWidth={8} strokeDasharray="2 16" strokeLinecap="round" />
      {[160, 240, 320].map((x) => <path key={x} d={`M${x} 330v-14`} stroke={TINTA} strokeWidth={5} strokeLinecap="round" />)}
      <Bola x={420} y={210} r={36} />
    </>
  ),
  'noite-mal-dormida': (
    <>
      <rect x={110} y={140} width={300} height={150} rx={20} fill={CLARO} stroke={TINTA} strokeWidth={8} />
      <rect x={410} y={185} width={26} height={60} rx={6} fill={TINTA} />
      <rect x={130} y={160} width={60} height={110} rx={8} fill={COR} />
      <text x={520} y={130} textAnchor="middle" fontFamily="var(--fonte-display)" fontWeight={800} fontSize={70} fill={TINTA}>Z</text>
      <text x={480} y={80} textAnchor="middle" fontFamily="var(--fonte-display)" fontWeight={800} fontSize={44} fill={COR}>Z</text>
      <text x={550} y={60} textAnchor="middle" fontFamily="var(--fonte-display)" fontWeight={800} fontSize={30} fill={TINTA}>Z</text>
    </>
  ),
  'tela-antes-de-dormir': (
    <>
      <Ceu />
      {/* O tablet aceso no escuro, com a luz saindo da tela */}
      <rect x={180} y={170} width={240} height={170} rx={18} fill={CLARO} stroke={TINTA} strokeWidth={7} />
      <rect x={198} y={186} width={204} height={138} rx={6} fill={COR} />
      <g stroke={COR} strokeWidth={7} strokeLinecap="round">
        <path d="M150 180l-40-24M140 250h-50M150 320l-40 24M450 180l40-24M460 250h50M450 320l40 24" />
      </g>
      <path d="M240 230h120M240 256h90M240 282h110" stroke={CLARO} strokeWidth={7} strokeLinecap="round" />
    </>
  ),
  'relogio-do-adolescente': (
    <>
      <Ceu />
      <circle cx={260} cy={230} r={130} fill={CLARO} stroke={TINTA} strokeWidth={8} />
      {/* O arco colorido: o sono que o relógio do corpo empurra mais para tarde */}
      <path d="M260 230L163 143A130 130 0 0 1 325 117z" fill={COR} opacity={0.85} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI) / 6
        return <path key={i} d={`M${260 + 108 * Math.sin(a)} ${230 - 108 * Math.cos(a)}L${260 + 122 * Math.sin(a)} ${230 - 122 * Math.cos(a)}`} stroke={TINTA} strokeWidth={6} strokeLinecap="round" />
      })}
      <path d="M260 230V140M260 230l50 30" stroke={TINTA} strokeWidth={9} strokeLinecap="round" />
      <circle cx={260} cy={230} r={11} fill={TINTA} />
      <path d="M260 80A150 150 0 0 1 390 155" fill="none" stroke={COR} strokeWidth={8} strokeLinecap="round" />
      <path d="M371 144L390 155L390 133" fill="none" stroke={COR} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  'cochilo': (
    <>
      <circle cx={480} cy={110} r={46} fill={COR} stroke={TINTA} strokeWidth={6} />
      <g stroke={TINTA} strokeWidth={6} strokeLinecap="round">
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4
          return <path key={i} d={`M${480 + 62 * Math.cos(a)} ${110 + 62 * Math.sin(a)}L${480 + 82 * Math.cos(a)} ${110 + 82 * Math.sin(a)}`} />
        })}
      </g>
      {/* O sofá com a almofada e os 30 minutos */}
      <path d="M80 250h320v80H80z" fill={CLARO} stroke={TINTA} strokeWidth={6} />
      <path d="M60 230h40v120H60zM380 230h40v120h-40z" fill={COR} stroke={TINTA} strokeWidth={6} />
      <rect x={110} y={215} width={90} height={40} rx={16} fill={CLARO} stroke={TINTA} strokeWidth={5} />
      <text x={290} y={190} textAnchor="middle" fontFamily="var(--fonte-display)" fontWeight={800} fontSize={110} fill={TINTA}>30’</text>
    </>
  ),

  // Recuperação
  'hidratacao': (
    <>
      <rect x={250} y={40} width={60} height={30} rx={6} fill={TINTA} />
      <path d="M240 80h80l20 40v220a20 20 0 0 1-20 20h-80a20 20 0 0 1-20-20V120z" fill={CLARO} stroke={TINTA} strokeWidth={7} strokeLinejoin="round" />
      <path d="M227 200h106v140a14 14 0 0 1-14 14h-78a14 14 0 0 1-14-14z" fill={COR} />
      <path d="M240 240h40" stroke={CLARO} strokeWidth={8} strokeLinecap="round" />
      {[[130, 160, 1], [450, 120, 1.3], [470, 280, 0.9], [110, 290, 0.8]].map(([x, y, s], i) => (
        <path key={i} d={`M${x} ${y - 30 * s}q${26 * s} ${34 * s} ${26 * s} ${48 * s}a${26 * s} ${26 * s} 0 0 1-${52 * s} 0q0-${14 * s} ${26 * s}-${48 * s}z`} fill={COR} stroke={TINTA} strokeWidth={5} />
      ))}
    </>
  ),
  'carga-de-treino': (
    <>
      <path d="M80 340h440M80 340V60" stroke={TINTA} strokeWidth={6} strokeLinecap="round" />
      {[120, 150, 110, 260, 140, 170, 80].map((h, i) => (
        <rect key={i} x={105 + i * 58} y={340 - h} width={40} height={h} fill={i === 3 ? COR : CLARO} stroke={TINTA} strokeWidth={5} />
      ))}
      <path d="M90 190h420" stroke={TINTA} strokeWidth={4} strokeDasharray="10 10" />
    </>
  ),
  'proteina': (
    <>
      <ellipse cx={300} cy={220} rx={220} ry={150} fill={CLARO} stroke={TINTA} strokeWidth={7} />
      <ellipse cx={300} cy={220} rx={170} ry={110} fill="none" stroke={TINTA} strokeWidth={3} opacity={0.5} />
      {/* Bife, ovo e brócolis: a carne e o ovo têm cor própria, o brócolis usa a cor da categoria */}
      <path d="M170 230q-10-60 60-70q80-5 90 50q5 60-70 60q-70 0-80-40z" fill="#b8653a" stroke={TINTA} strokeWidth={6} />
      <path d="M190 228q-4-40 44-46q58-2 64 34" fill="none" stroke="#f3dcc4" strokeWidth={6} strokeLinecap="round" />
      <ellipse cx={390} cy={180} rx={58} ry={44} fill="#ffffff" stroke={TINTA} strokeWidth={6} />
      <circle cx={395} cy={178} r={20} fill="#f5c542" stroke={TINTA} strokeWidth={4} />
      <path d="M365 300v-30M385 300v-24" stroke={TINTA} strokeWidth={10} strokeLinecap="round" />
      {[[350, 262, 22], [378, 250, 26], [404, 266, 20], [372, 276, 18]].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={COR} stroke={TINTA} strokeWidth={5} />
      ))}
    </>
  ),
  'banho-frio': (
    <>
      {[[150, 220, 0], [250, 250, 8], [190, 300, -6]].map(([x, y, a], i) => (
        <rect key={i} x={x - 45} y={y - 45} width={90} height={90} rx={14} transform={`rotate(${a} ${x} ${y})`} fill={CLARO} stroke={TINTA} strokeWidth={6} />
      ))}
      <path d="M120 200l25-20M220 230l25-20" stroke={COR} strokeWidth={6} strokeLinecap="round" />
      <rect x={410} y={60} width={50} height={230} rx={25} fill={CLARO} stroke={TINTA} strokeWidth={6} />
      <circle cx={435} cy={310} r={42} fill={COR} stroke={TINTA} strokeWidth={6} />
      <rect x={424} y={200} width={22} height={100} fill={COR} />
      <g stroke={TINTA} strokeWidth={5} strokeLinecap="round">
        {[100, 140, 180].map((y) => <path key={y} d={`M460 ${y}h20`} />)}
      </g>
      <g stroke={COR} strokeWidth={7} strokeLinecap="round">
        <path d="M300 70v90M261 92l78 46M261 138l78-46" />
      </g>
    </>
  ),
  'rolo-de-liberacao': (
    <>
      <path d="M60 320h480" stroke={TINTA} strokeWidth={6} strokeLinecap="round" />
      <rect x={160} y={200} width={280} height={110} rx={55} fill={COR} stroke={TINTA} strokeWidth={7} />
      {[210, 260, 310, 360].map((x) => <path key={x} d={`M${x} 205v100`} stroke={TINTA} strokeWidth={4} opacity={0.5} />)}
      <ellipse cx={440} cy={255} rx={22} ry={55} fill={CLARO} stroke={TINTA} strokeWidth={6} />
      <path d="M120 140h120M200 110l40 30-40 30M480 140H360M400 110l-40 30 40 30" fill="none" stroke={TINTA} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  'carboidrato': (
    <>
      {/* Tigela de arroz, pão e banana: a banana e o pão têm cor própria */}
      <path d="M90 200h260q0 130-130 130T90 200z" fill={COR} stroke={TINTA} strokeWidth={7} strokeLinejoin="round" />
      <path d="M100 200q120-80 240 0" fill={CLARO} stroke={TINTA} strokeWidth={6} />
      {[[150, 180], [190, 165], [230, 162], [270, 170], [300, 185], [210, 185], [250, 188]].map(([x, y]) => (
        <ellipse key={`${x}-${y}`} cx={x} cy={y} rx={9} ry={5} fill={TINTA} opacity={0.35} />
      ))}
      <path d="M400 120q-20 140 100 190q30 10 40-10q-110-50-100-190z" fill="#f5c542" stroke={TINTA} strokeWidth={6} strokeLinejoin="round" />
      <path d="M396 112l8-18" stroke={TINTA} strokeWidth={8} strokeLinecap="round" />
      <path d="M380 330q-10-60 40-60q40 0 40 30v40h-80z" fill="#d9a35c" stroke={TINTA} strokeWidth={6} strokeLinejoin="round" />
    </>
  ),
  'cafeina': (
    <>
      <path d="M110 180h170v100a50 50 0 0 1-50 50h-70a50 50 0 0 1-50-50z" fill={COR} stroke={TINTA} strokeWidth={7} />
      <path d="M280 205h22a30 30 0 0 1 0 60h-22" fill="none" stroke={TINTA} strokeWidth={7} />
      <path d="M80 350h240" stroke={TINTA} strokeWidth={6} strokeLinecap="round" />
      <path d="M160 150q-16-26 0-52M210 150q-16-26 0-52" fill="none" stroke={TINTA} strokeWidth={6} strokeLinecap="round" />
      {/* O relógio: tomar longe da hora de dormir */}
      <circle cx={450} cy={200} r={95} fill={CLARO} stroke={TINTA} strokeWidth={8} />
      <path d="M450 200V130M450 200h50" stroke={TINTA} strokeWidth={9} strokeLinecap="round" />
      <circle cx={450} cy={200} r={9} fill={TINTA} />
      <path d="M450 105a95 95 0 0 1 95 95" fill="none" stroke={COR} strokeWidth={12} strokeLinecap="round" />
    </>
  ),
  'qual-recuperacao-funciona': (
    <>
      {/* Pódio: massagem em primeiro, compressão em segundo, gelo em terceiro */}
      <rect x={230} y={200} width={140} height={160} fill={COR} stroke={TINTA} strokeWidth={6} />
      <rect x={90} y={250} width={140} height={110} fill={CLARO} stroke={TINTA} strokeWidth={6} />
      <rect x={370} y={280} width={140} height={80} fill={CLARO} stroke={TINTA} strokeWidth={6} />
      <text x={300} y={300} textAnchor="middle" fontFamily="var(--fonte-display)" fontWeight={800} fontSize={70} fill={TINTA}>1</text>
      <text x={160} y={330} textAnchor="middle" fontFamily="var(--fonte-display)" fontWeight={800} fontSize={56} fill={TINTA}>2</text>
      <text x={440} y={340} textAnchor="middle" fontFamily="var(--fonte-display)" fontWeight={800} fontSize={44} fill={TINTA}>3</text>
      {/* Mão (massagem) */}
      <path d="M262 190v-60q0-12 12-12t12 12v-20q0-12 12-12t12 12v10q0-12 12-12t12 12v20q0-10 10-10t10 10v48q0 30-30 30h-30q-26 0-26-30z" fill={CLARO} stroke={TINTA} strokeWidth={6} strokeLinejoin="round" />
      {/* Meia de compressão */}
      <path d="M140 140h40v60q0 14 14 20l16 8q14 8 6 20H150q-10 0-10-12z" fill={CLARO} stroke={TINTA} strokeWidth={6} strokeLinejoin="round" />
      <path d="M140 160h40M140 180h40" stroke={TINTA} strokeWidth={4} />
      {/* Cubo de gelo */}
      <rect x={410} y={200} width={60} height={60} rx={10} fill={CLARO} stroke={TINTA} strokeWidth={6} transform="rotate(8 440 230)" />
      <path d="M424 216l14-6" stroke={COR} strokeWidth={6} strokeLinecap="round" />
    </>
  ),
}

/** Diz se o artigo tem ilustração própria. */
export const temIlustracao = (id: string) => id in DESENHOS

/** Ilustração de um artigo de ciência; decorativa, por isso escondida do leitor de tela. */
export default function Ilustracao({ id }: { id: string }) {
  const desenho = DESENHOS[id]
  if (!desenho) return null
  return (
    <svg className="artigo-ilustracao" viewBox="0 0 600 400" aria-hidden focusable="false">
      <rect width={600} height={400} fill={FUNDO} />
      {desenho}
    </svg>
  )
}

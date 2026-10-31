// Peças animadas pela rolagem: a bola da abertura, o boneco comandado pela rolagem e os nomes que correm.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { COREOGRAFIAS } from '../demonstracoes/coreografias'
import { PARTES, pintar, posicionar } from '../demonstracoes/desenho'
import { CHAO, instante, preparar, RAIO_BOLA } from '../demonstracoes/motor'

const movimentoReduzido = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const limite = (x: number) => Math.max(0, Math.min(1, x))

/** Chama `aoRolar` no máximo uma vez por quadro, ao rolar ou redimensionar. */
export function useRolagem(aoRolar: () => void) {
  const atual = useRef(aoRolar)
  atual.current = aoRolar
  useEffect(() => {
    let pendente = 0
    const pedir = () => {
      if (!pendente) pendente = requestAnimationFrame(() => { pendente = 0; atual.current() })
    }
    window.addEventListener('scroll', pedir, { passive: true })
    window.addEventListener('resize', pedir)
    pedir()
    return () => {
      window.removeEventListener('scroll', pedir)
      window.removeEventListener('resize', pedir)
      cancelAnimationFrame(pendente)
    }
  }, [])
}

/** Quanto do trecho preso já foi percorrido: 0 no começo, 1 no fim. */
function progressoDoPino(el: HTMLElement) {
  const caixa = el.getBoundingClientRect()
  return limite(-caixa.top / Math.max(1, caixa.height - window.innerHeight))
}

export interface FiguraApi {
  total: number
  /** Desenha o instante t (ms) e devolve o passo em que o exercício está. */
  desenhar: (t: number) => number
}

/** Boneco de um exercício do catálogo. Sem `apiRef`, a animação fica em ciclo enquanto estiver na tela. */
export function Figura({ nome, viewBox = '0 0 680 330', className, apiRef }: { nome: string; viewBox?: string; className?: string; apiRef?: React.MutableRefObject<FiguraApi | null> }) {
  const coreografia = COREOGRAFIAS[nome]
  const anim = useMemo(() => preparar(coreografia), [coreografia])
  const partes = useRef<Record<string, SVGPathElement | null>>({})
  const bola = useRef<SVGCircleElement>(null)
  const bola2 = useRef<SVGCircleElement>(null)
  const svg = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const desenhar = (t: number) => {
      const agora = instante(anim, Math.max(0, Math.min(anim.total, t)))
      pintar(anim, agora, partes.current)
      posicionar(bola.current, agora.bola)
      posicionar(bola2.current, agora.bola2)
      return agora.fase
    }
    desenhar(anim.total * 0.3)
    if (apiRef) {
      apiRef.current = { total: anim.total, desenhar }
      return () => { apiRef.current = null }
    }
    if (movimentoReduzido() || typeof IntersectionObserver === 'undefined' || !svg.current) return

    let quadro = 0
    let t = anim.total * 0.3
    let anterior = 0
    const passo = (agora: number) => {
      t = (t + Math.min(50, agora - (anterior || agora)) * 0.7) % anim.total
      anterior = agora
      desenhar(t)
      quadro = requestAnimationFrame(passo)
    }
    const olho = new IntersectionObserver(([item]) => {
      cancelAnimationFrame(quadro)
      anterior = 0
      if (item.isIntersecting) quadro = requestAnimationFrame(passo)
    })
    olho.observe(svg.current)
    return () => { olho.disconnect(); cancelAnimationFrame(quadro) }
  }, [anim, apiRef])

  const { cena } = coreografia
  return (
    <svg ref={svg} className={`figura ${className ?? ''}`} viewBox={viewBox} aria-hidden>
      <line x1="0" y1={CHAO} x2="680" y2={CHAO} className="figura-chao" />
      {cena.cesta === 'lado' && (
        <>
          <line x1="664" y1="28" x2="664" y2={CHAO} className="figura-poste" />
          <line x1="614" y1="68" x2="662" y2="68" className="demo-aro" />
        </>
      )}
      {cena.cesta === 'frente' && (
        <>
          <rect x="296" y="20" width="88" height="56" className="figura-poste" />
          <ellipse cx="340" cy="68" rx="18" ry="4" className="demo-aro" />
        </>
      )}
      {cena.cones?.map((c, i) => <path key={i} d={`M${c.x - 8} ${CHAO}L${c.x} ${CHAO - 20}L${c.x + 8} ${CHAO}Z`} className="demo-cone" />)}
      <g className="demo-corpo">
        {PARTES.map((p) => (
          <path key={p.id} ref={(el) => { partes.current[p.id] = el }} className={`demo-${anim.frente ? 'perto' : p.lado}`} />
        ))}
      </g>
      <circle ref={bola} r={RAIO_BOLA} className="demo-bola" />
      <circle ref={bola2} r={RAIO_BOLA} className="demo-bola" />
    </svg>
  )
}

/** Abertura: a bola fica transparente sob o mouse e mostra o atleta dentro dela. */
export function AberturaBola({ titulo, children }: { titulo: ReactNode; children: ReactNode }) {
  const secao = useRef<HTMLElement>(null)
  const camada = useRef<HTMLDivElement>(null)
  const bolas = useRef<(SVGSVGElement | null)[]>([])
  const dentro = useRef<HTMLDivElement>(null)

  useRolagem(() => {
    if (!secao.current || movimentoReduzido()) return
    const p = progressoDoPino(secao.current)
    bolas.current.forEach((b) => { if (b) b.style.transform = `rotate(${p * 260}deg) scale(${1 + p * 1.7})` })
    if (dentro.current) dentro.current.style.transform = `scale(${1 + p * 1.2})`
    secao.current.style.setProperty('--saida', String(p))
  })

  useEffect(() => {
    if (movimentoReduzido() || !camada.current) return
    const el = camada.current
    const mouse = { x: 0, y: 0, usou: false }
    const furo = { x: window.innerWidth / 2, y: window.innerHeight / 2, x2: window.innerWidth / 2, y2: window.innerHeight / 2, r: 0 }
    const aoMover = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      mouse.x = e.clientX
      mouse.y = e.clientY
      mouse.usou = true
    }
    let quadro = 0
    const passo = (t: number) => {
      const caixa = el.getBoundingClientRect()
      if (caixa.bottom > 0 && caixa.top < window.innerHeight) {
        const menor = Math.min(window.innerWidth, window.innerHeight)
        // Sem mouse (celular, ou antes do primeiro movimento), o furo passeia pela bola para mostrar o efeito.
        const alvoX = mouse.usou ? mouse.x : window.innerWidth / 2 + Math.cos(t / 1400) * menor * 0.17
        const alvoY = mouse.usou ? mouse.y : window.innerHeight / 2 + Math.sin(t / 1000) * menor * 0.15
        furo.x += (alvoX - furo.x) * 0.16
        furo.y += (alvoY - furo.y) * 0.16
        furo.x2 += (alvoX - furo.x2) * 0.06
        furo.y2 += (alvoY - furo.y2) * 0.06
        furo.r += (menor * (mouse.usou ? 0.38 : 0.28) - furo.r) * 0.08
        el.style.setProperty('--x', `${(furo.x - caixa.left).toFixed(1)}px`)
        el.style.setProperty('--y', `${(furo.y - caixa.top).toFixed(1)}px`)
        el.style.setProperty('--x2', `${(furo.x2 - caixa.left).toFixed(1)}px`)
        el.style.setProperty('--y2', `${(furo.y2 - caixa.top).toFixed(1)}px`)
        el.style.setProperty('--r', `${furo.r.toFixed(1)}px`)
      }
      quadro = requestAnimationFrame(passo)
    }
    window.addEventListener('pointermove', aoMover, { passive: true })
    quadro = requestAnimationFrame(passo)
    return () => {
      window.removeEventListener('pointermove', aoMover)
      cancelAnimationFrame(quadro)
    }
  }, [])

  return (
    <section className="abertura" ref={secao}>
      <div className="abertura-fixa">
        <LinhasQuadra />
        <div className="abertura-palco" aria-hidden>
          <svg ref={(el) => { bolas.current[0] = el }} className="abertura-bola" viewBox="0 0 400 400">
            <circle cx="200" cy="200" r="190" className="bola-vazada" />
            <path className="bola-grade" d="M10 200h380M200 10v380M64 68c70 62 70 202 0 264M336 68c-70 62-70 202 0 264M30 110h340M30 290h340M110 30v340M290 30v340M15 155h370M15 245h370M155 15v370M245 15v370" />
          </svg>
          <div className="abertura-dentro" ref={dentro}><Figura nome="Mikan drill" viewBox="220 10 240 300" /></div>
        </div>
        <div className="abertura-palco abertura-furada" ref={camada} aria-hidden>
          <svg ref={(el) => { bolas.current[1] = el }} className="abertura-bola" viewBox="0 0 400 400">
            <defs>
              <radialGradient id="couro-bola" cx=".36" cy=".3" r=".8">
                <stop offset="0" stopColor="#ff9a52" />
                <stop offset=".62" stopColor="#ee6210" />
                <stop offset="1" stopColor="#a83d05" />
              </radialGradient>
            </defs>
            <circle cx="200" cy="200" r="190" fill="url(#couro-bola)" />
            <path className="bola-costura" d="M10 200h380M200 10v380M64 68c70 62 70 202 0 264M336 68c-70 62-70 202 0 264" />
          </svg>
        </div>
        <div className="abertura-conteudo">
          {titulo}
          {children}
        </div>
      </div>
    </section>
  )
}

/** Linhas de quadra no fundo, no lugar das curvas de nível do estilo original. */
export function LinhasQuadra() {
  return (
    <svg className="linhas-quadra" viewBox="0 0 1000 620" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <circle cx="500" cy="310" r="110" />
      <circle cx="500" cy="310" r="245" />
      <rect x="-40" y="190" width="240" height="240" />
      <rect x="800" y="190" width="240" height="240" />
      <path d="M500 -20V640M-40 40C120 40 240 170 240 310S120 580-40 580M1040 40C880 40 760 170 760 310S880 580 1040 580" />
    </svg>
  )
}

/** Frase que acende palavra por palavra conforme a rolagem. */
export function FraseRolagem({ texto }: { texto: string }) {
  const caixa = useRef<HTMLElement>(null)
  const [acesas, setAcesas] = useState(() => (movimentoReduzido() ? Number.MAX_SAFE_INTEGER : 0))
  const palavras = texto.split(' ')
  useRolagem(() => {
    if (!caixa.current || movimentoReduzido()) return
    const r = caixa.current.getBoundingClientRect()
    setAcesas(Math.round(limite((window.innerHeight * 0.85 - r.top) / (r.height * 0.72)) * palavras.length))
  })
  return (
    <section className="manifesto faixa-escura" ref={caixa}>
      <p className="manifesto-frase frase-destaque" aria-label={texto}>
        {palavras.map((p, i) => <span key={i} aria-hidden className={i < acesas ? 'aceso' : ''}>{p} </span>)}
      </p>
    </section>
  )
}

/** Trecho preso em que o boneco anda com a rolagem. */
export function EscadaRolagem({ nome, titulo, rotulo }: { nome: string; titulo: ReactNode; rotulo: string }) {
  const secao = useRef<HTMLElement>(null)
  const regua = useRef<HTMLElement>(null)
  const figura = useRef<FiguraApi | null>(null)
  const fases = COREOGRAFIAS[nome].fases
  const [fase, setFase] = useState(0)
  useRolagem(() => {
    if (!secao.current || !figura.current) return
    const p = progressoDoPino(secao.current)
    setFase(figura.current.desenhar(p * figura.current.total))
    if (regua.current) regua.current.style.transform = `scaleX(${p})`
  })
  return (
    <section className="escada" ref={secao}>
      <div className="escada-fixa">
        <div>
          <span className="rotulo-forte">{rotulo}</span>
          <h2 className="escada-titulo">{titulo}</h2>
          <div className="escada-fase">
            <strong>{fases[fase].titulo}</strong>
            <p>{fases[fase].texto}</p>
          </div>
          <div className="escada-regua" aria-hidden><i ref={regua} /></div>
        </div>
        <Figura nome={nome} apiRef={figura} className="escada-figura" />
      </div>
    </section>
  )
}

/** Título parado e nomes correndo em sentidos opostos até passar por todos. Os links ficam na grade logo abaixo. */
export function NomesRolagem({ nomes, titulo, texto }: { nomes: string[]; titulo: ReactNode; texto?: ReactNode }) {
  const pino = useRef<HTMLDivElement>(null)
  const a = useRef<HTMLDivElement>(null)
  const b = useRef<HTMLDivElement>(null)
  const metade = Math.ceil(nomes.length / 2)
  useRolagem(() => {
    if (!pino.current || !a.current || !b.current || movimentoReduzido()) return
    const caixa = pino.current.getBoundingClientRect()
    if (caixa.bottom < 0 || caixa.top > window.innerHeight) return
    const p = progressoDoPino(pino.current)
    const largura = window.innerWidth
    a.current.style.transform = `translateX(${-p * Math.max(0, a.current.offsetWidth - largura)}px)`
    b.current.style.transform = `translateX(${-(1 - p) * Math.max(0, b.current.offsetWidth - largura)}px)`
  })
  const linha = (lista: string[]) => lista.map((n) => <span key={n}>{n}<i>/</i></span>)
  return (
    <div className="nomes-pino" ref={pino}>
      <div className="nomes-fixo">
        {titulo}
        <div className="nomes-linha" ref={a} aria-hidden>{linha(nomes.slice(0, metade))}</div>
        <div className="nomes-linha nomes-contorno" ref={b} aria-hidden>{linha(nomes.slice(metade))}</div>
        {texto}
      </div>
    </div>
  )
}

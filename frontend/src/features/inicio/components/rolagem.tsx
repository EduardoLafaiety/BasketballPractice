// Bola da abertura ligada à rolagem e sequências automáticas de exercícios e nomes.
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { COREOGRAFIAS } from '../../demonstracoes/coreografias'
import { menosMovimento, useAnimacoes } from '../../../shared/lib/movimento'
import { animarQuandoVisivel } from '../../../shared/lib/quadros-visiveis'
import { Atleta, Bola, novaBola, novoAtleta } from '../../demonstracoes/Atleta'
import { pintar, posicionar } from '../../demonstracoes/desenho'
import { CHAO, instante, preparar } from '../../demonstracoes/motor'
import { BolaCouro, LinhasQuadra } from '../../../shared/ui/fundoQuadra'

export { ListraBola } from '../../../shared/ui/fundoQuadra'

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

/** Boneco do catálogo em ciclo automático enquanto estiver na tela. */
export function Figura({ nome, viewBox = '0 0 680 330', className }: { nome: string; viewBox?: string; className?: string }) {
  const coreografia = COREOGRAFIAS[nome]
  const anim = useMemo(() => preparar(coreografia), [coreografia])
  const atleta = useRef(novoAtleta())
  const bola = useRef(novaBola())
  const bola2 = useRef(novaBola())
  const svg = useRef<SVGSVGElement>(null)
  const { reduzido } = useAnimacoes()

  useEffect(() => {
    const desenhar = (t: number) => {
      const agora = instante(anim, Math.max(0, Math.min(anim.total, t)))
      pintar(anim, agora, atleta.current.partes)
      posicionar(bola.current, agora.bola, agora.solo)
      posicionar(bola2.current, agora.bola2, agora.solo)
      return agora.fase
    }
    let t = anim.total * 0.3
    desenhar(t)
    if (reduzido || !svg.current) return
    return animarQuandoVisivel(svg.current, (_agora, dt) => {
      t = (t + dt * 0.7) % anim.total
      desenhar(t)
    })
  }, [anim, reduzido])

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
      <Atleta els={atleta} frente={anim.frente} />
      <Bola els={bola} />
      <Bola els={bola2} />
    </svg>
  )
}

/** Abertura original: bola cresce e gira; as duas linhas abrem para os lados. */
export function AberturaBola({ titulo, children }: { titulo: ReactNode; children?: ReactNode }) {
  const secao = useRef<HTMLElement>(null)
  const bola = useRef<HTMLImageElement>(null)
  const ultimo = useRef(-1)
  useRolagem(() => {
    if (!secao.current || menosMovimento()) return
    const p = progressoDoPino(secao.current)
    if (p === ultimo.current) return
    ultimo.current = p
    if (bola.current) bola.current.style.transform = 'rotate(' + (p * 260) + 'deg) scale(' + (1 + p * 1.7) + ')'
    const a = secao.current.querySelector<HTMLElement>('.abertura-a')
    const b = secao.current.querySelector<HTMLElement>('.abertura-b')
    if (a) a.style.transform = 'translateX(' + (p * -80) + 'vw)'
    if (b) b.style.transform = 'translateX(' + (p * 80) + 'vw)'
  })
  return (
    <>
      <section className="abertura" ref={secao}>
        <div className="abertura-fixa">
          <LinhasQuadra />
          <div className="abertura-palco" aria-hidden><BolaCouro ref={bola} /></div>
          <div className="abertura-conteudo">{titulo}</div>
        </div>
      </section>
      {children}
    </>
  )
}

/** Frase inteira legível desde a entrada, sem escurecer palavras na rolagem. */
export function FraseRolagem({ texto }: { texto: string }) {
  return (
    <section className="manifesto faixa-escura">
      <p className="manifesto-frase frase-destaque">{texto}</p>
    </section>
  )
}

export { NomesRolagem } from './NomesRolagem'
export type { NomeRolagem } from './NomesRolagem'

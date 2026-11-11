import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { FOTOS_JOGADORES } from '../assets/jogadores/fotos'
import { menosMovimento } from '../lib/movimento'
import type { EstiloResumo } from '../types'

const VOLTA = 360
const PASSO_MS = 1400

/** Distância (em graus) entre o ângulo do item e o da frente do tambor, entre -180 e 180. */
const distancia = (angulo: number, rot: number) => ((((angulo - rot) % VOLTA) + 540) % VOLTA) - 180

/**
 * Nomes dos jogadores num tambor que gira. As letras são recortes da foto do jogador, em preto e branco; o nome da
 * frente ganha a cor com um deslizar. Gira sozinho, ao arrastar com o mouse e ao clicar num nome. Decorativo: os
 * links ficam na grade logo abaixo.
 */
export function NomesTambor({ estilos, titulo, texto }: { estilos: EstiloResumo[]; titulo: ReactNode; texto?: ReactNode }) {
  const n = estilos.length
  const parado = menosMovimento() || n < 2
  const caixa = useRef<HTMLDivElement>(null)
  const roda = useRef<HTMLDivElement>(null)
  const itens = useRef<(HTMLDivElement | null)[]>([])
  const rot = useRef(0)
  const raio = useRef(0)
  const noMouse = useRef(false)
  const arrastando = useRef(false)
  const [atual, setAtual] = useState(0)
  const passo = n ? VOLTA / n : VOLTA

  const desenhar = useCallback(() => {
    if (!roda.current) return
    roda.current.style.transform = `translateZ(${-raio.current}px) rotateX(${rot.current}deg)`
    itens.current.forEach((item, i) => {
      if (!item) return
      const d = Math.abs(distancia(i * passo, rot.current))
      const opaco = Math.max(0, 1 - d / 45)
      item.style.opacity = opaco.toFixed(2)
      item.style.visibility = opaco > 0 ? 'visible' : 'hidden'
    })
    setAtual(((Math.round(rot.current / passo) % n) + n) % n)
  }, [n, passo])

  // O raio do cilindro depende da altura da linha, que muda com a largura da tela.
  useLayoutEffect(() => {
    if (parado || !roda.current) return
    const medir = () => {
      if (!roda.current) return
      raio.current = roda.current.offsetHeight / 2 / Math.tan(Math.PI / n)
      roda.current.style.setProperty('--r', `${raio.current}px`)
      desenhar()
    }
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [parado, n, desenhar])

  // Anda sozinho enquanto a seção está na tela e o mouse não está em cima.
  useEffect(() => {
    if (parado || !caixa.current || typeof IntersectionObserver === 'undefined') return
    let timer = 0
    const girar = () => {
      if (noMouse.current || arrastando.current) return
      rot.current += passo
      desenhar()
    }
    const olho = new IntersectionObserver(([item]) => {
      window.clearInterval(timer)
      if (item.isIntersecting) timer = window.setInterval(girar, PASSO_MS)
    }, { threshold: 0.3 })
    olho.observe(caixa.current)
    return () => { olho.disconnect(); window.clearInterval(timer) }
  }, [parado, passo, desenhar])

  const trazer = (i: number) => {
    rot.current += distancia(i * passo, rot.current)
    desenhar()
  }

  const arrastar = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !roda.current) return
    const y0 = e.clientY
    const rot0 = rot.current
    const altura = roda.current.offsetHeight
    let moveu = false
    const mover = (ev: PointerEvent) => {
      const dy = y0 - ev.clientY
      if (!moveu && Math.abs(dy) < 6) return
      if (!moveu) {
        moveu = true
        arrastando.current = true
        roda.current?.classList.add('livre')
        caixa.current?.classList.add('arrastando')
      }
      rot.current = rot0 + (dy / altura) * passo
      desenhar()
    }
    const soltar = () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      if (!moveu) return
      roda.current?.classList.remove('livre')
      caixa.current?.classList.remove('arrastando')
      rot.current = Math.round(rot.current / passo) * passo
      desenhar()
      // O clique que fecha o arrasto não deve escolher um nome.
      window.setTimeout(() => { arrastando.current = false }, 0)
    }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
  }

  if (parado) {
    return (
      <div className="nomes-secao">
        {titulo}
        <div className="nomes-tambor-lista" aria-hidden>
          {estilos.map((e) => <span key={e.id}>{e.nome}</span>)}
        </div>
        {texto}
      </div>
    )
  }

  const info = estilos[atual]
  return (
    <div className="nomes-secao">
      {titulo}
      <div
        ref={caixa}
        className="nomes-tambor"
        style={{ '--passo': `${passo}deg` } as CSSProperties}
        onPointerDown={arrastar}
        onMouseEnter={() => { noMouse.current = true }}
        onMouseLeave={() => { noMouse.current = false }}
        aria-hidden
      >
        <div ref={roda} className="tb-roda">
          {estilos.map((e, i) => {
            const foto = FOTOS_JOGADORES[e.id]
            const estilo = { '--i': i, ...(foto ? { '--foto': `url(${foto.src})` } : {}) } as CSSProperties
            return (
              <div
                key={e.id}
                ref={(el) => { itens.current[i] = el }}
                className={`tb-item ${i === atual ? 'ativo' : ''} ${foto ? '' : 'sem-foto'}`}
                style={estilo}
                onClick={() => { if (!arrastando.current) trazer(i) }}
              >
                <span className="tb-nome tb-cinza">{e.nome}</span>
                <span className="tb-nome tb-cor">{e.nome}</span>
              </div>
            )
          })}
        </div>
        {info && <p className="tb-info">{info.posicao} · {info.arquetipo}</p>}
      </div>
      {texto}
    </div>
  )
}

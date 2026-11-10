import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Atleta, Bola, novaBola, novoAtleta, SombraBola } from './Atleta'
import { menosMovimento } from '../lib/movimento'
import { janela, mirar, QUADRO, seguir, type Mira } from './camera'
import { caminhos, PARTES, pintar, posicionar } from './desenho'
import {
  alturaQuadril,
  ARO,
  CHAO,
  esqueleto,
  espelhar,
  esqueletoDa,
  instante,
  pegadas,
  POSE_NEUTRA,
  preparar,
  type Animacao,
  type Coreografia,
} from './motor'

const VELOCIDADES = [0.25, 0.5, 1]
const Y_PEGADAS = 364

/** Animação de um exercício: manequim, cena, rastro das poses e pegadas vistas de cima. */
export default function Demonstracao({ coreografia, nome }: { coreografia: Coreografia; nome: string }) {
  const anim = useMemo(() => preparar(coreografia), [coreografia])
  const marcas = useMemo(() => pegadas(anim), [anim])
  const [tocando, setTocando] = useState(() => !menosMovimento())
  const [fase, setFase] = useState(0)
  const [rastro, setRastro] = useState(true)
  const [camera, setCamera] = useState(true)
  const [velocidade, setVelocidade] = useState(0.5)

  const tempo = useRef(0)
  const pararEm = useRef<number | null>(null)
  const tocandoRef = useRef(tocando)
  const velocidadeRef = useRef(velocidade)
  const atleta = useRef(novoAtleta())
  const bola = useRef(novaBola())
  const bola2 = useRef(novaBola())
  const parceiro = useRef<SVGGElement>(null)
  const marcasRef = useRef<(SVGGElement | null)[]>([])
  const lente = useRef<SVGGElement>(null)
  const visor = useRef<SVGRectElement>(null)
  const mira = useRef<Mira | null>(null)
  const cameraRef = useRef(camera)
  const ajuste = useRef(0)
  const desenhar = useRef<(t: number, dt?: number) => void>(() => {})
  const recorte = `demo-recorte-${useId().replace(/:/g, '')}`

  tocandoRef.current = tocando
  velocidadeRef.current = velocidade
  cameraRef.current = camera

  /** Desenha o instante t; sem dt (pulo de passo, troca de exercício), a câmera vai direto. */
  desenhar.current = (t: number, dt?: number) => {
    const agora = instante(anim, t)
    const alvo = cameraRef.current ? mirar(agora) : { cx: QUADRO.w / 2, z: 1 }
    mira.current = mira.current && dt !== undefined ? seguir(mira.current, alvo, dt) : alvo
    const j = janela(mira.current)
    lente.current?.setAttribute('transform', `scale(${j.z.toFixed(4)}) translate(${(-j.x).toFixed(2)} ${(-j.y).toFixed(2)})`)
    visor.current?.setAttribute('x', j.x.toFixed(1))
    visor.current?.setAttribute('width', j.w.toFixed(1))
    visor.current?.setAttribute('visibility', j.z > 1.01 ? 'visible' : 'hidden')
    pintar(anim, agora, atleta.current.partes, atleta.current.sombra)
    posicionar(bola.current, agora.bola, agora.solo)
    posicionar(bola2.current, agora.bola2, agora.solo)
    if (parceiro.current && agora.px !== undefined) parceiro.current.setAttribute('transform', `translate(${agora.px.toFixed(1)} 0)`)
    marcas.forEach((m, i) => marcasRef.current[i]?.setAttribute('opacity', t >= m.tempo - 1 ? '1' : '0'))
    setFase(agora.fase)
  }

  // Recomeça do início ao trocar de exercício.
  useEffect(() => {
    tempo.current = 0
    pararEm.current = null
    desenhar.current(0)
  }, [anim])

  useEffect(() => {
    if (typeof requestAnimationFrame !== 'function') return
    let ultimo: number | null = null
    let quadro = requestAnimationFrame(function passo(agora) {
      const dt = ultimo === null ? 0 : Math.min(50, agora - ultimo)
      ultimo = agora
      if (tocandoRef.current) {
        let t = tempo.current + dt * velocidadeRef.current
        if (pararEm.current !== null && t >= pararEm.current) {
          t = pararEm.current
          pararEm.current = null
          setTocando(false)
        }
        if (t > anim.total) t = 0
        tempo.current = t
        desenhar.current(t, dt)
      } else if (ajuste.current > 0) {
        // Pausado, a câmera ainda termina de chegar ao enquadramento ao ligar ou desligar o zoom.
        ajuste.current--
        desenhar.current(tempo.current, dt)
      }
      quadro = requestAnimationFrame(passo)
    })
    return () => cancelAnimationFrame(quadro)
  }, [anim])

  function irPara(t: number) {
    pararEm.current = null
    setTocando(false)
    tempo.current = t
    desenhar.current(t)
  }

  function proxima() {
    const seguinte = anim.inicioFase.find((s) => s > tempo.current + 1)
    if (seguinte === undefined) return irPara(0)
    pararEm.current = seguinte
    setTocando(true)
  }

  function anterior() {
    const antes = [...anim.inicioFase].reverse().find((s) => s < tempo.current - 1)
    irPara(antes ?? 0)
  }

  const { cena, fases } = coreografia
  const fantasmas = useMemo(
    () =>
      anim.inicioFase.map((t) => {
        const k = anim.chaves.find((c) => c.tempo >= t) ?? anim.chaves[0]
        return caminhos(esqueletoDa(anim, k), k.dir, anim.frente)
      }),
    [anim],
  )
  const corpoParceiro = useMemo(() => {
    if (!cena.parceiro) return null
    const pose = { ...POSE_NEUTRA, ...cena.parceiro.pose }
    const e = espelhar(esqueleto(pose, 0, alturaQuadril(pose, 0, 0, false), false), cena.parceiro.dir)
    return caminhos(e, cena.parceiro.dir, false)
  }, [cena.parceiro])

  return (
    <section className="demo" aria-label={`Demonstração: ${nome}`}>
      <svg className="demo-cena" viewBox="0 0 680 400" role="img" aria-label={`Manequim demonstrando ${nome}, passo a passo`}>
        <defs>
          <clipPath id={recorte}>
            <rect width={QUADRO.w} height={QUADRO.h} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${recorte})`}>
          <g ref={lente}>
            <rect x="20" y={CHAO} width="640" height="18" className="demo-piso" />
            <line x1="20" y1={CHAO} x2="660" y2={CHAO} className="demo-linha" />
            <Cenario anim={anim} />
            {fantasmas.map((c, i) => (
              <g key={i} className="demo-fantasma" opacity={rastro && i < fase ? 1 : 0}>
                {PARTES.map((p) => <path key={p.id} d={c[p.id]} />)}
              </g>
            ))}
            {corpoParceiro && (
              <g ref={parceiro} className="demo-parceiro">
                {PARTES.map((p) => <path key={p.id} d={corpoParceiro[p.id]} />)}
              </g>
            )}
            <SombraBola els={bola} />
            <SombraBola els={bola2} />
            <Atleta els={atleta} frente={anim.frente} />
            <Bola els={bola} />
            <Bola els={bola2} />
          </g>
        </g>

        <rect x="20" y="324" width="640" height="70" rx="8" className="demo-mapa" />
        <rect ref={visor} y="346" height="40" rx="4" width="0" className="demo-visor" visibility="hidden" />
        <text x="32" y="341" className="demo-legenda">Pegadas, vista de cima</text>
        <line x1="60" y1={Y_PEGADAS} x2="640" y2={Y_PEGADAS} className="demo-trilha" />
        {cena.cones?.map((c, i) => (
          <circle key={i} cx={c.x} cy={Y_PEGADAS + (c.prof ?? 0) * 14} r="4" className="demo-cone" />
        ))}
        {marcas.map((m, i) => (
          <g key={i} ref={(el) => { marcasRef.current[i] = el }} opacity="0">
            <ellipse cx={m.x} cy={Y_PEGADAS + m.y} rx="9" ry="4.5" className={m.pe === 'F' ? 'demo-pegada-frente' : 'demo-pegada-tras'} />
            <text x={m.x} y={Y_PEGADAS + m.y + 3.5} textAnchor="middle" className="demo-pegada-num">{m.fase + 1}</text>
          </g>
        ))}
      </svg>

      <div className="demo-controles">
        <button type="button" className="chip" onClick={anterior} aria-label="Passo anterior">⏮</button>
        <button type="button" className="chip demo-tocar" onClick={() => { pararEm.current = null; setTocando((v) => !v) }}>
          {tocando ? '❚❚ Pausar' : '▶ Animar'}
        </button>
        <button type="button" className="chip" onClick={proxima} aria-label="Próximo passo">⏭</button>
        <label className="demo-opcao">
          <input type="checkbox" checked={rastro} onChange={(e) => setRastro(e.target.checked)} /> Rastro
        </label>
        <label className="demo-opcao">
          <input type="checkbox" checked={camera} onChange={(e) => { ajuste.current = 90; setCamera(e.target.checked) }} /> Câmera
        </label>
        <span className="demo-espaco" />
        <span className="demo-opcao"><span className="demo-amostra" aria-hidden /> Músculo em ação</span>
        <label className="demo-opcao">
          Velocidade
          <select className="input demo-velocidade" value={velocidade} onChange={(e) => setVelocidade(Number(e.target.value))}>
            {VELOCIDADES.map((v) => <option key={v} value={v}>{String(v).replace('.', ',')}x</option>)}
          </select>
        </label>
      </div>

      <ol className="demo-passos">
        {fases.map((f, i) => (
          <li key={i} className={i === fase ? 'atual' : ''} aria-current={i === fase ? 'step' : undefined}>
            <button type="button" onClick={() => irPara(anim.inicioFase[i])}>
              <b>{i + 1}</b>
              <span><strong>{f.titulo}.</strong> {f.texto}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** Cesta, cones, parede, caixa e o que mais a coreografia pedir. */
function Cenario({ anim }: { anim: Animacao }) {
  const { cena } = anim.coreografia
  const aro = ARO.lado
  return (
    <g className="demo-cenario">
      {cena.cesta === 'lado' && (
        <g>
          <line x1="664" y1="28" x2="664" y2="92" className="demo-tabela" />
          <line x1="664" y1="92" x2="664" y2={CHAO} className="demo-poste" />
          <line x1={aro.x - 22} y1={aro.y} x2="662" y2={aro.y} className="demo-aro" />
          <path d={`M${aro.x - 20} ${aro.y + 2} L${aro.x - 14} ${aro.y + 26} M${aro.x - 8} ${aro.y + 2} L${aro.x - 4} ${aro.y + 26} M${aro.x + 4} ${aro.y + 2} L${aro.x + 4} ${aro.y + 26} M${aro.x + 16} ${aro.y + 2} L${aro.x + 12} ${aro.y + 26} M${aro.x - 16} ${aro.y + 14} L${aro.x + 16} ${aro.y + 14}`} className="demo-rede" />
        </g>
      )}
      {cena.cesta === 'frente' && (
        <g>
          <rect x="296" y="20" width="88" height="56" rx="2" className="demo-tabela-frente" />
          <rect x="326" y="44" width="28" height="22" className="demo-tabela-frente" />
          <ellipse cx={ARO.frente.x} cy={ARO.frente.y} rx="18" ry="4" className="demo-aro" />
          <path d={`M324 70 L330 92 M334 71 L336 92 M346 71 L344 92 M356 70 L350 92 M328 82 L352 82`} className="demo-rede" />
        </g>
      )}
      {cena.linhas?.map((x) => <rect key={x} x={x - 2} y={CHAO - 1} width="4" height="8" className="demo-marca-chao" />)}
      {cena.cones?.map((c, i) => (
        <path key={i} d={`M${c.x - 8} ${CHAO} L${c.x} ${CHAO - 20} L${c.x + 8} ${CHAO} Z`} className="demo-cone" />
      ))}
      {cena.parede !== undefined && <rect x={cena.parede} y="110" width="16" height={CHAO - 110} className="demo-parede" />}
      {cena.caixa && <rect x={cena.caixa.x} y={CHAO - cena.caixa.h} width={cena.caixa.w} height={cena.caixa.h} rx="3" className="demo-caixa" />}
      {cena.cadeira !== undefined && (
        <path
          d={`M${cena.cadeira - 14} ${CHAO} L${cena.cadeira - 14} ${CHAO - 44} M${cena.cadeira + 14} ${CHAO} L${cena.cadeira + 14} ${CHAO - 44} M${cena.cadeira - 18} ${CHAO - 44} L${cena.cadeira + 18} ${CHAO - 44} M${cena.cadeira + 14} ${CHAO - 44} L${cena.cadeira + 14} ${CHAO - 90}`}
          className="demo-cadeira"
        />
      )}
    </g>
  )
}


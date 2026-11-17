import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { menosMovimento } from '../lib/movimento'
import { corpoDoParceiro, corpoNoInstante, ESCALA, type Corpo3D } from './corpo3d'
import { instante, preparar, type Coreografia } from './motor'
import { Boneco, CORES_ATLETA, CORES_PARCEIRO } from './tres-d/boneco'
import { Cenario } from './tres-d/cenario'

/** Fundo de estúdio: escuro em cima, mais claro no horizonte. */
function fundoDegrade() {
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 256
  const g = c.getContext('2d')
  if (g) {
    const d = g.createLinearGradient(0, 0, 0, 256)
    d.addColorStop(0, '#15160f')
    d.addColorStop(0.55, '#2b2c26')
    d.addColorStop(1, '#4a4a40')
    g.fillStyle = d
    g.fillRect(0, 0, 4, 256)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

const VELOCIDADES = [0.1, 0.25, 0.5, 1]

type Vista = 'padrao' | 'perfil' | 'frente' | 'costas' | 'cima' | 'tres-quartos'
const VISTAS: { id: Vista; rotulo: string }[] = [
  { id: 'padrao', rotulo: 'Padrão' },
  { id: 'perfil', rotulo: 'Perfil' },
  { id: 'frente', rotulo: 'Frente' },
  { id: 'costas', rotulo: 'Costas' },
  { id: 'tres-quartos', rotulo: '3/4' },
  { id: 'cima', rotulo: 'Cima' },
]

type Foco = 'corpo' | 'pernas' | 'tronco' | 'maos' | 'pes'
const FOCOS: { id: Foco; rotulo: string; distancia: number }[] = [
  { id: 'corpo', rotulo: 'Corpo', distancia: 6 },
  { id: 'pernas', rotulo: 'Pernas', distancia: 2.7 },
  { id: 'tronco', rotulo: 'Tronco', distancia: 2.4 },
  { id: 'maos', rotulo: 'Mãos', distancia: 1.3 },
  { id: 'pes', rotulo: 'Pés', distancia: 1.5 },
]

const ROTULOS_ANGULOS = (frente: boolean) =>
  frente
    ? ([['joelhoF', 'Joelho direito'], ['joelhoT', 'Joelho esquerdo'], ['quadrilF', 'Quadril direito'], ['quadrilT', 'Quadril esquerdo'], ['cotoveloP', 'Cotovelo direito'], ['cotoveloL', 'Cotovelo esquerdo'], ['tronco', 'Inclinação do tronco']] as const)
    : ([['joelhoF', 'Joelho (perto)'], ['joelhoT', 'Joelho (longe)'], ['quadrilF', 'Quadril (perto)'], ['quadrilT', 'Quadril (longe)'], ['cotoveloP', 'Cotovelo (perto)'], ['cotoveloL', 'Cotovelo (longe)'], ['tronco', 'Inclinação do tronco']] as const)

interface Props {
  coreografia: Coreografia
  nome: string
  /** O navegador não conseguiu abrir o 3D: quem chamou mostra a versão 2D. */
  aoFalhar: () => void
  aoVer2D: () => void
}

/** Demonstração em 3D: gire, aproxime, mova e veja por dentro (músculos e esqueleto). */
export default function Demonstracao3D({ coreografia, nome, aoFalhar, aoVer2D }: Props) {
  const anim = useMemo(() => preparar(coreografia), [coreografia])
  const [tocando, setTocando] = useState(() => !menosMovimento())
  const [fase, setFase] = useState(0)
  const [velocidade, setVelocidade] = useState(0.5)
  const [musculos, setMusculos] = useState(false)
  const [esqueleto, setEsqueleto] = useState(false)
  const [trajetorias, setTrajetorias] = useState(false)
  const [pegadas, setPegadas] = useState(true)
  const [seguir, setSeguir] = useState(true)
  const [foco, setFoco] = useState<Foco>('corpo')
  const [ampliado, setAmpliado] = useState(false)

  const palco = useRef<HTMLDivElement>(null)
  const tempo = useRef(0)
  const pararEm = useRef<number | null>(null)
  const estado = useRef({ tocando, velocidade, musculos, esqueleto, trajetorias, pegadas, seguir, foco })
  const api = useRef<{
    irPara: (t: number) => void
    vista: (v: Vista) => void
    focar: (f: Foco) => void
    redesenhar: () => void
  } | null>(null)
  const linha = useRef<HTMLInputElement>(null)
  const angulos = useRef<HTMLUListElement>(null)
  const faseAtual = useRef(0)

  estado.current = { tocando, velocidade, musculos, esqueleto, trajetorias, pegadas, seguir, foco }

  useEffect(() => {
    const el = palco.current
    if (!el) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    } catch {
      aoFalhar()
      return
    }
    const largura = () => Math.max(2, el.clientWidth)
    const altura = () => Math.max(2, el.clientHeight)
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    renderer.setSize(largura(), altura(), false)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.domElement.className = 'demo3d-canvas'
    renderer.domElement.setAttribute('role', 'img')
    renderer.domElement.setAttribute('aria-label', `Demonstração 3D de ${nome}: arraste para girar, role para aproximar`)
    el.appendChild(renderer.domElement)
    renderer.domElement.addEventListener('webglcontextlost', (ev) => { ev.preventDefault(); aoFalhar() })

    const cena = new THREE.Scene()
    cena.background = fundoDegrade()
    cena.fog = new THREE.Fog(0x2b2c26, 18, 42)
    const camera = new THREE.PerspectiveCamera(32, largura() / altura(), 0.05, 120)

    cena.add(new THREE.HemisphereLight(0xffffff, 0x4a4332, 1.05))
    const sol = new THREE.DirectionalLight(0xfff4e0, 2.4)
    sol.position.set(3, 9, 6)
    sol.castShadow = true
    sol.shadow.mapSize.set(2048, 2048)
    sol.shadow.camera.left = -4
    sol.shadow.camera.right = 4
    sol.shadow.camera.top = 4
    sol.shadow.camera.bottom = -4
    sol.shadow.camera.near = 1
    sol.shadow.camera.far = 30
    sol.shadow.bias = -0.0004
    sol.shadow.normalBias = 0.02
    cena.add(sol, sol.target)
    const contra = new THREE.DirectionalLight(0x9db8ff, 0.7)
    contra.position.set(-5, 4, -6)
    cena.add(contra)

    const cenario = new Cenario(anim)
    cena.add(cenario.raiz)
    const atleta = new Boneco(CORES_ATLETA)
    cena.add(atleta.raiz)
    let parceiro: Boneco | null = null
    if (coreografia.cena.parceiro) {
      parceiro = new Boneco(CORES_PARCEIRO)
      parceiro.atualizar(corpoDoParceiro(coreografia.cena.parceiro.pose, coreografia.cena.parceiro.dir, 0))
      cena.add(parceiro.raiz)
    }

    const controles = new OrbitControls(camera, renderer.domElement)
    controles.enableDamping = true
    controles.dampingFactor = 0.09
    controles.minDistance = 0.7
    controles.maxDistance = 16
    controles.maxPolarAngle = Math.PI * 0.495
    controles.screenSpacePanning = true
    controles.zoomSpeed = 0.9
    controles.rotateSpeed = 0.8
    controles.target.set(anim.frente ? 4.4 : 3.5, 0.95, 0)

    const resolucao = new THREE.Vector2(largura(), altura())
    cenario.construirTrajetorias(resolucao)

    const olhando = anim.frente ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0)
    const lateral = anim.frente ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1)
    // Câmera começa como o 2D: de lado (ou de frente), um pouco acima, afastada.
    const posicaoPadrao = () => new THREE.Vector3(0.0, 0.55, 6)
    camera.position.copy(controles.target).add(posicaoPadrao())

    let sujo = true
    let corpo: Corpo3D = corpoNoInstante(instante(anim, 0), anim.frente, coreografia.cena)
    const alvoVisto = new THREE.Vector3().copy(controles.target)
    let distanciaAlvo: number | null = null
    let tweenCamera: { de: THREE.Vector3; para: THREE.Vector3; t: number } | null = null

    const pontoDoFoco = (f: Foco, c: Corpo3D) => {
      const v = (p: { x: number; y: number; z: number }) => new THREE.Vector3(p.x, p.y, p.z)
      switch (f) {
        case 'pernas': return v(c.perna.F.meio).add(v(c.perna.T.meio)).multiplyScalar(0.5).setY(0.55)
        case 'tronco': return v(c.pelve).add(v(c.pescoco)).multiplyScalar(0.5)
        case 'maos': {
          const comBola = c.bolas.find((b) => b.presa > 0.3)
          return comBola ? v(comBola.centro) : v(c.braco.P.ponta)
        }
        case 'pes': return v(c.pe.F.tornozelo).add(v(c.pe.T.tornozelo)).multiplyScalar(0.5).setY(0.15)
        default: return v(c.pelve).setY(1.12)
      }
    }

    const desenhar = (t: number, dt = 0) => {
      const inst = instante(anim, t)
      corpo = corpoNoInstante(inst, anim.frente, coreografia.cena)
      atleta.atualizar(corpo, t)
      cenario.pousarBola(0, corpo.bolas[0])
      cenario.pousarBola(1, corpo.bolas[1])
      cenario.mostrarPegadas(t, estado.current.pegadas)
      if (parceiro && inst.px !== undefined) parceiro.raiz.position.x = inst.px * ESCALA
      if (faseAtual.current !== inst.fase) {
        faseAtual.current = inst.fase
        setFase(inst.fase)
      }
      if (linha.current && document.activeElement !== linha.current) linha.current.value = String(Math.round(t))
      if (angulos.current) {
        angulos.current.querySelectorAll('li').forEach((li, i) => {
          const chave = ROTULOS_ANGULOS(anim.frente)[i][0]
          const v = corpo.angulos[chave]
          const b = li.querySelector('b')
          if (b) b.textContent = `${Math.round(v)}°`
        })
      }
      // A luz e a câmera acompanham o atleta.
      sol.position.set(corpo.pelve.x + 3, 9, corpo.pelve.z + 6)
      sol.target.position.set(corpo.pelve.x, 0, corpo.pelve.z)
      if (estado.current.seguir) {
        const alvo = pontoDoFoco(estado.current.foco, corpo)
        const k = dt ? Math.min(1, dt * 0.007) : 1
        const antes = controles.target.clone()
        controles.target.lerp(alvo, k)
        camera.position.add(controles.target.clone().sub(antes))
      }
      sujo = true
    }

    api.current = {
      irPara: (t) => {
        tempo.current = t
        desenhar(t)
      },
      redesenhar: () => {
        atleta.definirModos({ musculos: estado.current.musculos, esqueleto: estado.current.esqueleto })
        cenario.trajetorias.visible = estado.current.trajetorias
        desenhar(tempo.current)
      },
      vista: (v) => {
        const alvo = controles.target.clone()
        const d = Math.max(3.5, camera.position.distanceTo(controles.target))
        let dir: THREE.Vector3
        switch (v) {
          case 'perfil': dir = anim.frente ? new THREE.Vector3(1, 0.1, 0) : new THREE.Vector3(0, 0.1, 1); break
          case 'frente': dir = olhando.clone().setY(0.1); break
          case 'costas': dir = olhando.clone().multiplyScalar(-1).setY(0.1); break
          case 'cima': dir = new THREE.Vector3(0.001, 1, 0.001); break
          case 'tres-quartos': dir = olhando.clone().add(lateral).setY(0.45); break
          default: dir = new THREE.Vector3(0, 0.09, 1)
        }
        tweenCamera = { de: camera.position.clone(), para: alvo.add(dir.normalize().multiplyScalar(d)), t: 0 }
      },
      focar: (f) => {
        const dist = FOCOS.find((x) => x.id === f)!.distancia
        distanciaAlvo = dist
      },
    }
    atleta.definirModos({ musculos: false, esqueleto: false })
    cenario.trajetorias.visible = false
    desenhar(0)

    const ro = new ResizeObserver(() => {
      renderer.setSize(largura(), altura(), false)
      camera.aspect = largura() / altura()
      camera.updateProjectionMatrix()
      resolucao.set(largura(), altura())
      cenario.redimensionar(resolucao)
      sujo = true
    })
    ro.observe(el)
    controles.addEventListener('change', () => { sujo = true })

    let ultimo: number | null = null
    let quadro = requestAnimationFrame(function passo(agora) {
      const dt = ultimo === null ? 0 : Math.min(50, agora - ultimo)
      ultimo = agora
      const e = estado.current
      if (e.tocando) {
        let t = tempo.current + dt * e.velocidade
        if (pararEm.current !== null && t >= pararEm.current) {
          t = pararEm.current
          pararEm.current = null
          setTocando(false)
        }
        if (t > anim.total) t = 0
        tempo.current = t
        desenhar(t, dt)
      } else if (e.seguir && controles.target.distanceTo(alvoVisto) > 1e-3) {
        // Pausado, a câmera ainda termina de chegar ao foco novo.
        desenhar(tempo.current, dt)
      }
      alvoVisto.copy(pontoDoFoco(e.foco, corpo))
      if (tweenCamera) {
        tweenCamera.t = Math.min(1, tweenCamera.t + dt / 650)
        const u = tweenCamera.t * tweenCamera.t * (3 - 2 * tweenCamera.t)
        camera.position.lerpVectors(tweenCamera.de, tweenCamera.para, u)
        if (tweenCamera.t >= 1) tweenCamera = null
        sujo = true
      }
      if (distanciaAlvo !== null) {
        const dir = camera.position.clone().sub(controles.target)
        const d = dir.length()
        const novo = d + (distanciaAlvo - d) * Math.min(1, dt * 0.006)
        camera.position.copy(controles.target).add(dir.normalize().multiplyScalar(novo))
        if (Math.abs(novo - distanciaAlvo) < 0.01) distanciaAlvo = null
        sujo = true
      }
      controles.update()
      if (sujo) {
        renderer.render(cena, camera)
        sujo = false
      }
      quadro = requestAnimationFrame(passo)
    })

    return () => {
      cancelAnimationFrame(quadro)
      ro.disconnect()
      controles.dispose()
      atleta.liberar()
      parceiro?.liberar()
      cenario.liberar()
      renderer.dispose()
      renderer.domElement.remove()
      api.current = null
    }
  }, [anim, coreografia.cena.parceiro, nome, aoFalhar])

  // Camadas e opções: redesenha o quadro atual.
  useEffect(() => {
    api.current?.redesenhar()
  }, [musculos, esqueleto, trajetorias, pegadas, anim])

  function irPara(t: number) {
    pararEm.current = null
    setTocando(false)
    api.current?.irPara(t)
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
  function escolherFoco(f: Foco) {
    setFoco(f)
    setSeguir(true)
    api.current?.focar(f)
  }

  const { fases } = coreografia
  const rotulos = ROTULOS_ANGULOS(anim.frente)

  return (
    <section className={`demo demo3d ${ampliado ? 'ampliado' : ''}`} aria-label={`Demonstração em 3D: ${nome}`}>
      <div className="demo3d-palco" ref={palco}>
        <div className="demo3d-vistas" role="group" aria-label="Pontos de vista">
          {VISTAS.map((v) => (
            <button key={v.id} type="button" className="chip" onClick={() => api.current?.vista(v.id)}>{v.rotulo}</button>
          ))}
        </div>
        <p className="demo3d-dica" aria-hidden>Arraste para girar · role para aproximar · botão direito para mover</p>
        <button type="button" className="chip demo3d-ampliar" onClick={() => setAmpliado((a) => !a)} aria-pressed={ampliado}>
          {ampliado ? 'Reduzir' : 'Ampliar'}
        </button>
      </div>

      <div className="demo-controles">
        <button type="button" className="chip" onClick={anterior} aria-label="Passo anterior">⏮</button>
        <button type="button" className="chip demo-tocar" onClick={() => { pararEm.current = null; setTocando((v) => !v) }}>
          {tocando ? '❚❚ Pausar' : '▶ Animar'}
        </button>
        <button type="button" className="chip" onClick={proxima} aria-label="Próximo passo">⏭</button>
        <input
          ref={linha}
          className="demo3d-linha"
          type="range"
          min={0}
          max={Math.round(anim.total)}
          step={10}
          defaultValue={0}
          aria-label="Momento do movimento"
          onInput={(e) => irPara(Number((e.target as HTMLInputElement).value))}
        />
        <label className="demo-opcao">
          Velocidade
          <select className="input demo-velocidade" value={velocidade} onChange={(e) => setVelocidade(Number(e.target.value))}>
            {VELOCIDADES.map((v) => <option key={v} value={v}>{String(v).replace('.', ',')}x</option>)}
          </select>
        </label>
      </div>

      <div className="demo3d-camadas">
        <div className="chips" role="group" aria-label="Camadas">
          <button type="button" className={`chip ${musculos ? 'ativo' : ''}`} aria-pressed={musculos} onClick={() => { setMusculos((v) => !v); setEsqueleto(false) }}>Músculos</button>
          <button type="button" className={`chip ${esqueleto ? 'ativo' : ''}`} aria-pressed={esqueleto} onClick={() => { setEsqueleto((v) => !v); setMusculos(false) }}>Esqueleto</button>
          <button type="button" className={`chip ${trajetorias ? 'ativo' : ''}`} aria-pressed={trajetorias} onClick={() => setTrajetorias((v) => !v)}>Trajetórias</button>
          <button type="button" className={`chip ${pegadas ? 'ativo' : ''}`} aria-pressed={pegadas} onClick={() => setPegadas((v) => !v)}>Pegadas</button>
          <button type="button" className={`chip ${seguir ? 'ativo' : ''}`} aria-pressed={seguir} onClick={() => setSeguir((v) => !v)}>Seguir atleta</button>
        </div>
        <div className="chips" role="group" aria-label="Aproximar">
          <span className="demo-opcao">Aproximar:</span>
          {FOCOS.map((f) => (
            <button key={f.id} type="button" className={`chip ${foco === f.id ? 'ativo' : ''}`} aria-pressed={foco === f.id} onClick={() => escolherFoco(f.id)}>{f.rotulo}</button>
          ))}
        </div>
        {musculos && <p className="demo-opcao"><span className="demo-amostra" aria-hidden /> Músculo em ação (laranja); os demais em vermelho escuro</p>}
        {trajetorias && (
          <p className="demo-opcao demo3d-legenda">
            <i style={{ background: '#ff6a13' }} aria-hidden /> mão perto <i style={{ background: '#3a86ff' }} aria-hidden /> mão longe <i style={{ background: '#f4f1e8' }} aria-hidden /> bola <i style={{ background: '#a8f0b8' }} aria-hidden /> quadril
          </p>
        )}
      </div>

      <details className="demo3d-angulos">
        <summary>Ângulos das articulações</summary>
        <ul ref={angulos}>
          {rotulos.map(([id, rotulo]) => (
            <li key={id}><span>{rotulo}</span> <b>0°</b></li>
          ))}
        </ul>
        <p className="muted">Joelho, quadril e cotovelo: 0° é a articulação esticada; quanto maior, mais dobrada.</p>
      </details>

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
      <p className="demo3d-rodape">
        <button type="button" className="link botao-link" onClick={aoVer2D}>Ver em 2D</button>
      </p>
    </section>
  )
}

import { Component, lazy, Suspense, useCallback, useState, type ReactNode } from 'react'
import Demonstracao2D from './Demonstracao2D'
import type { Coreografia } from './motor'

// O 3D só é baixado por escolha explícita ou preferência salva.
const Demonstracao3D = lazy(() => import('./Demonstracao3D'))

const CHAVE = 'bp-demo-vista'

/** O navegador abre WebGL? (Em teste, o jsdom não abre.) */
export function webglDisponivel() {
  if (typeof document === 'undefined' || navigator.userAgent.includes('jsdom')) return false
  try {
    const c = document.createElement('canvas')
    const contexto = c.getContext('webgl2') || c.getContext('webgl')
    contexto?.getExtension?.('WEBGL_lose_context')?.loseContext()
    return !!contexto
  } catch {
    return false
  }
}

function vistaSalva(): '2d' | '3d' {
  try {
    const salva = localStorage.getItem(CHAVE)
    if (salva === '2d' || salva === '3d') return salva
    return '2d'
  } catch {
    return '2d'
  }
}

class Limite3D extends Component<{ children: ReactNode; fallback: ReactNode }, { falhou: boolean }> {
  state = { falhou: false }
  static getDerivedStateFromError() { return { falhou: true } }
  render() { return this.state.falhou ? this.props.fallback : this.props.children }
}

/** Demonstração do exercício: em 3D (girar, aproximar, ver músculos) ou, sem WebGL, o 2D de sempre. */
export default function Demonstracao({ coreografia, nome }: { coreografia: Coreografia; nome: string }) {
  const [inicial] = useState(() => {
    const salva = vistaSalva()
    return salva === '3d' ? { vista: webglDisponivel() ? '3d' as const : '2d' as const, testado: true } : { vista: '2d' as const, testado: false }
  })
  const [vista, setVista] = useState<'2d' | '3d'>(inicial.vista)
  const [pode3D, setPode3D] = useState(!inicial.testado || inicial.vista === '3d')
  const [indisponivel, setIndisponivel] = useState(inicial.testado && inicial.vista !== '3d')

  const escolher = (v: '2d' | '3d') => {
    if (v === '3d' && !webglDisponivel()) { setPode3D(false); setIndisponivel(true); return }
    setVista(v)
    try {
      localStorage.setItem(CHAVE, v)
    } catch {
      // sem armazenamento: vale só nesta visita
    }
  }
  const falhou = useCallback(() => {
    setPode3D(false)
    setIndisponivel(true)
    setVista('2d')
  }, [])
  const ver2D = useCallback(() => escolher('2d'), [])

  if (vista === '3d' && pode3D) {
    return (
      <Limite3D fallback={<><p role="status">O 3D está indisponível. Continue com a demonstração 2D.</p><Demonstracao2D coreografia={coreografia} nome={nome} /></>}>
        <Suspense fallback={<div className="demo demo3d demo3d-carregando" role="status">Carregando o 3D…</div>}>
          <Demonstracao3D coreografia={coreografia} nome={nome} aoFalhar={falhou} aoVer2D={ver2D} />
        </Suspense>
      </Limite3D>
    )
  }
  return <>{indisponivel && <p role="status">O 3D está indisponível neste navegador. Continue em 2D.</p>}<Demonstracao2D coreografia={coreografia} nome={nome} aoVer3D={pode3D ? () => escolher('3d') : undefined} /></>
}

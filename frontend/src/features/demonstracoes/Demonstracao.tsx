import { menosMovimento } from '../../shared/lib/movimento'
import { lazy, Suspense, useCallback, useState } from 'react'
import Demonstracao2D from './Demonstracao2D'
import type { Coreografia } from './motor'

// O 3D (three.js) é um arquivo à parte, baixado só quando uma demonstração aparece.
const Demonstracao3D = lazy(() => import('./Demonstracao3D'))

const CHAVE = 'bp-demo-vista'

/** O navegador abre WebGL? (Em teste, o jsdom não abre.) */
export function webglDisponivel() {
  if (typeof document === 'undefined' || navigator.userAgent.includes('jsdom')) return false
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

function vistaSalva(): '2d' | '3d' {
  try {
    const salva = localStorage.getItem(CHAVE)
    if (salva === '2d' || salva === '3d') return salva
    const rede = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
    return menosMovimento() || rede?.saveData || /(^|-)2g$/.test(rede?.effectiveType ?? '') ? '2d' : '3d'
  } catch {
    return '3d'
  }
}

/** Demonstração do exercício: em 3D (girar, aproximar, ver músculos) ou, sem WebGL, o 2D de sempre. */
export default function Demonstracao({ coreografia, nome }: { coreografia: Coreografia; nome: string }) {
  const [vista, setVista] = useState<'2d' | '3d'>(() => (webglDisponivel() ? vistaSalva() : '2d'))
  const [pode3D, setPode3D] = useState(() => webglDisponivel())

  const escolher = (v: '2d' | '3d') => {
    setVista(v)
    try {
      localStorage.setItem(CHAVE, v)
    } catch {
      // sem armazenamento: vale só nesta visita
    }
  }
  const falhou = useCallback(() => {
    setPode3D(false)
    setVista('2d')
  }, [])
  const ver2D = useCallback(() => escolher('2d'), [])

  if (vista === '3d' && pode3D) {
    return (
      <Suspense fallback={<div className="demo demo3d demo3d-carregando" role="status">Carregando o 3D…</div>}>
        <Demonstracao3D coreografia={coreografia} nome={nome} aoFalhar={falhou} aoVer2D={ver2D} />
      </Suspense>
    )
  }
  return <Demonstracao2D coreografia={coreografia} nome={nome} aoVer3D={pode3D ? () => escolher('3d') : undefined} />
}

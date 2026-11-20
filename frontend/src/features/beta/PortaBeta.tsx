import { Link } from '../../shared/i18n/links'
import { useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import TelaBeta, { VARIANTES, VARIANTE_PADRAO } from './TelaBeta'

export const CHAVE_BETA = 'bp.beta'

function jaViu() {
  try {
    return localStorage.getItem(CHAVE_BETA) === 'visto'
  } catch {
    return false
  }
}

function marcarVisto() {
  try {
    localStorage.setItem(CHAVE_BETA, 'visto')
  } catch {
    /* sem armazenamento: o aviso volta na próxima visita, sem prejuízo */
  }
}

/** Antes da tela de cadastro: mostra o aviso do beta uma vez por navegador e então libera o formulário. */
export function PortaBeta({ children }: { children: ReactNode }) {
  const [visto, setVisto] = useState(jaViu)
  const [params] = useSearchParams()
  if (visto) return <>{children}</>
  return (
    <TelaBeta
      variante={Number(params.get('v')) || VARIANTE_PADRAO}
      aoContinuar={() => {
        marcarVisto()
        setVisto(true)
      }}
    />
  )
}

/** /beta?v=1..5: lado a lado das cinco versões, para escolher. Não grava nada e continua no cadastro. */
export function PreviaBeta() {
  const [params, definir] = useSearchParams()
  const navigate = useNavigate()
  const atual = VARIANTES.some((v) => v.numero === Number(params.get('v'))) ? Number(params.get('v')) : VARIANTE_PADRAO
  return (
    <>
      <TelaBeta variante={atual} aoContinuar={() => navigate('/cadastro')} />
      <nav className="beta-previa" aria-label="Versões da tela de beta">
        <span>Prévia</span>
        {VARIANTES.map((v) => (
          <button key={v.numero} type="button" aria-pressed={v.numero === atual} onClick={() => definir({ v: String(v.numero) })}>
            {v.numero} {v.nome}
          </button>
        ))}
        <Link to="/entrar">Sair da prévia</Link>
      </nav>
    </>
  )
}

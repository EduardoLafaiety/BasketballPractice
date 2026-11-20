import LinkInicio from '../../../shared/ui/LinkInicio'
import { Link } from '../../../shared/i18n/links'
import { useState, type ReactNode } from 'react'

import LogoBola from '../../../shared/ui/LogoBola'
import { BolaCouro, LinhasQuadra } from '../../../shared/ui/fundoQuadra'
import PreferenciasCabecalho from '../../../shared/ui/PreferenciasCabecalho'

/** A moldura das telas de conta: a quadra de um lado, o formulário do outro. */
export default function TelaAuth({ children }: { children: ReactNode }) {
  return (
    <div className="auth auth-atualizada">
      <header className="topo auth-cabecalho">
      <LinkInicio className="auth-marca" aria-label="Basketball Practice">
        <span className="marca"><LogoBola tamanho={28} /></span>
        <span className="auth-nome">Basketball Practice</span>
      </LinkInicio>
      <PreferenciasCabecalho />
      </header>
      <section className="auth-palco" aria-hidden="true">
        <LinhasQuadra />
        <div className="auth-ilustracao">
          <h2 className="auth-titulo">
            <span className="auth-titulo-a">Bora pra</span>
            <span className="auth-titulo-b">quadra<span className="ponto">.</span></span>
          </h2>
          <BolaCouro />
        </div>
      </section>

      <section className="auth-lado">
        {children}
        <details className="auth-legal">
          <summary>Privacidade e termos</summary>
          <LinksLegais />
        </details>
      </section>
    </div>
  )
}

export function LinksLegais() {
  return (
    <nav className="links-legais" aria-label="Documentos">
      <Link to="/privacidade">Política de Privacidade</Link>
      <Link to="/termos">Termos de Uso</Link>
    </nav>
  )
}

export function ErroCampo({ msgs }: { msgs?: string[] }) {
  return msgs?.length ? <span className="erro">{traduzir(msgs[0])}</span> : null
}

// Mensagens padrão do Zod chegam em inglês.
function traduzir(msg: string) {
  if (/email/i.test(msg)) return 'E-mail inválido.'
  if (/at least 8/i.test(msg)) return 'A senha precisa ter pelo menos 8 caracteres.'
  if (/at least 2/i.test(msg)) return 'O nome precisa ter pelo menos 2 letras.'
  if (/at least/i.test(msg)) return 'Campo obrigatório.'
  return msg
}

/** Campo de senha com o botão de mostrar o que foi digitado. */
export function CampoSenha({
  rotulo = 'Senha',
  valor,
  aoMudar,
  autoComplete,
  dica,
  erros,
}: {
  rotulo?: string
  valor: string
  aoMudar: (senha: string) => void
  autoComplete: 'new-password' | 'current-password'
  dica?: string
  erros?: string[]
}) {
  const [ver, setVer] = useState(false)
  return (
    <div className="campo-grupo">
      <label className="campo campo-senha">
        <input
          type={ver ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          minLength={autoComplete === 'new-password' ? 8 : undefined}
          placeholder=" "
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
        />
        <span className="campo-rotulo">{rotulo}</span>
        {dica && !erros && <span className="meta">{dica}</span>}
        <ErroCampo msgs={erros} />
      </label>
      <button
        type="button"
        className="campo-ver"
        aria-pressed={ver}
        aria-label={ver ? 'Ocultar o que foi digitado' : 'Mostrar o que foi digitado'}
        onClick={() => setVer((v) => !v)}
      >
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {ver && <path d="m3 3 18 18" />}
        </svg>
      </button>
    </div>
  )
}

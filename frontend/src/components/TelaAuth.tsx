import { useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Icone from './Icone'
import { BolaCouro, BolaVazada, Figura, LinhasQuadra, ListraBola, useFuroBola } from './rolagem'

/** A moldura das telas de conta: a quadra de um lado, o formulário do outro. */
export default function TelaAuth({ children }: { children: ReactNode }) {
  const camada = useRef<HTMLDivElement>(null)
  useFuroBola(camada)

  return (
    <div className="auth">
      <Link to="/entrar" className="auth-marca" aria-label="Basketball Practice">
        <span className="marca"><Icone nome="bola" tamanho={28} /></span>
        <span className="topo-secao">Basketball Practice</span>
      </Link>
      <section className="auth-palco" aria-hidden="true">
        <LinhasQuadra />
        <div className="abertura-palco">
          <BolaVazada />
          <div className="abertura-dentro"><Figura nome="Mikan drill" viewBox="220 10 240 300" /></div>
        </div>
        <div className="abertura-palco abertura-furada" ref={camada}>
          <BolaCouro />
        </div>
        <h2 className="auth-titulo">
          <span className="auth-titulo-a">Bora pra</span>
          <span className="auth-titulo-b">quadra.</span>
        </h2>
      </section>

      <section className="auth-lado faixa-preta com-listra">
        <ListraBola />
        {children}
        <LinksLegais />
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
        {ver ? 'Ocultar' : 'Mostrar'}
      </button>
    </div>
  )
}

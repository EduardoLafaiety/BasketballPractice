import { Link } from '../../../shared/i18n/links'
import { useState, type FormEvent } from 'react'

import { api, ApiError, definirToken } from '../../../shared/api/backend'
import { useAuth } from '../../autenticacao/model/auth'
import { limparTreinosLocais } from '../../sessao/model/treino-local'
import FotoPerfil from '../components/FotoPerfil'

export default function Configuracoes() {
  const { usuario, sair } = useAuth()
  const nome = usuario?.name || 'Visitante'

  return (
    <div className="conta-pagina">
      <header className="conta-cabecalho">
        <p className="conta-sobretitulo">Seu espaço</p>
        <h1>Minha conta</h1>
        <p className="muted">Seus dados e sua segurança, em um só lugar.</p>
      </header>
      <section className="card conta-perfil" aria-labelledby="conta-perfil-titulo">
        <FotoPerfil />
        <div className="conta-identidade">
          <span className="conta-etiqueta">{__DEMO__ ? 'Acesso de visitante' : 'Perfil pessoal'}</span>
          <h2 id="conta-perfil-titulo" translate={__DEMO__ ? undefined : 'no'}>{nome}</h2>
          {!__DEMO__ && <p className="muted" translate="no">{usuario?.email}</p>}
        </div>
      </section>
      <div className="conta-grade">
        <section className="card conta-painel" aria-labelledby="conta-dados-titulo">
          <h2 id="conta-dados-titulo">Dados da conta</h2>
          <p className="muted">Informações usadas para identificar seu acesso.</p>
          <dl className="conta-dados">
            <div><dt>Nome</dt><dd translate={__DEMO__ ? undefined : 'no'}>{nome}</dd></div>
            <div><dt>E-mail</dt><dd translate={__DEMO__ ? undefined : 'no'}>{__DEMO__ ? 'Acesso sem e-mail' : usuario?.email}</dd></div>
            <div><dt>Tipo de acesso</dt><dd>{__DEMO__ ? 'Visitante' : usuario?.isAdmin ? 'Administrador' : 'Conta pessoal'}</dd></div>
          </dl>
        </section>
        <section className="card conta-painel" aria-labelledby="conta-seguranca-titulo">
          <h2 id="conta-seguranca-titulo">Segurança</h2>
          {__DEMO__ ? (
            <p className="muted">Você está usando o acesso de visitante. Não há uma senha vinculada a este perfil.</p>
          ) : (
            <>
              <p className="muted">Atualize sua senha para proteger seu acesso.</p>
              <TrocarSenha />
            </>
          )}
        </section>
      </div>
      {!__DEMO__ && <section className="card conta-painel"><h2>Assinatura</h2><p className="muted">Consulte seu acesso, confirme pagamentos ou cancele as próximas cobranças.</p><Link to="/assinatura" className="btn">Gerenciar assinatura</Link></section>}
      <section className="card conta-sessao" aria-labelledby="conta-sessao-titulo">
        <div>
          <h2 id="conta-sessao-titulo">Sessão e privacidade</h2>
          <p className="muted">Consulte como seus dados são tratados ou encerre seu acesso.</p>
          <div className="conta-links">
            <Link to="/privacidade">Política de privacidade</Link>
            <Link to="/termos">Termos de uso</Link>
          </div>
        </div>
        <button className="btn" onClick={sair}>Sair da conta</button>
      </section>
      {!__DEMO__ && (
        <section className="conta-encerrar" aria-label="Encerramento da conta">
          <h2>Encerrar conta</h2>
          <p className="muted">A exclusão é permanente e remove seus treinos e registros.</p>
          <ExcluirConta />
        </section>
      )}
    </div>
  )
}

function TrocarSenha() {
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<ApiError | Error | null>(null)
  const [trocada, setTrocada] = useState(false)
  const campos = erro instanceof ApiError ? erro.details : undefined

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setTrocada(false)
    setEnviando(true)
    try {
      // O token antigo acaba de deixar de valer; sem guardar o novo, o próximo pedido deslogaria a pessoa.
      definirToken((await api.trocarSenha(atual, nova)).token)
      setAtual('')
      setNova('')
      setTrocada(true)
    } catch (falha) {
      setErro(falha as Error)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="form" onSubmit={enviar} noValidate>
      <h3 className="sem-margem">Trocar a senha</h3>
      <label>
        Senha atual
        <input className="input" type="password" autoComplete="current-password" value={atual} onChange={(e) => setAtual(e.target.value)} />
        {campos?.currentPassword && <span className="erro">{campos.currentPassword[0]}</span>}
      </label>
      <label>
        Senha nova
        <input className="input" type="password" autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} />
        {campos?.newPassword && <span className="erro">{campos.newPassword[0]}</span>}
      </label>
      {erro && !campos && <p className="erro" role="alert">{erro.message}</p>}
      {trocada && <p className="sucesso" role="status">Senha trocada. As sessões em outros aparelhos foram encerradas.</p>}
      <div className="acoes">
        <button className="btn btn-primario" type="submit" disabled={enviando || !atual || !nova}>
          {enviando ? 'Trocando' : 'Trocar a senha'}
        </button>
      </div>
    </form>
  )
}

function ExcluirConta() {
  const { encerrarLocal } = useAuth()
  const [aberto, setAberto] = useState(false)
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<ApiError | Error | null>(null)
  const doCampo = erro instanceof ApiError ? erro.details?.password?.[0] : undefined

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      await api.excluirConta(senha)
      try { limparTreinosLocais() } catch { /* armazenamento indisponível */ }
      encerrarLocal()
    } catch (falha) {
      setErro(falha as Error)
      setEnviando(false)
    }
  }

  if (!aberto) {
    return (
      <div className="acoes">
        <button className="btn btn-perigo" type="button" onClick={() => setAberto(true)}>Excluir minha conta</button>
      </div>
    )
  }

  return (
    <form className="form" onSubmit={enviar} noValidate>
      <h3 className="sem-margem">Excluir minha conta</h3>
      <p className="muted">
        Isto apaga sua conta, sessões e treinos, e não pode ser desfeito.
      </p>
      <label>
        Confirme com sua senha
        <input className="input" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        {doCampo && <span className="erro">{doCampo}</span>}
      </label>
      {erro && !doCampo && <p className="erro" role="alert">{erro.message}</p>}
      <div className="acoes">
        <button className="btn btn-perigo" type="submit" disabled={enviando || !senha}>
          {enviando ? 'Excluindo' : 'Excluir definitivamente'}
        </button>
        <button className="btn" type="button" disabled={enviando} onClick={() => { setAberto(false); setSenha(''); setErro(null) }}>Cancelar</button>
      </div>
    </form>
  )
}

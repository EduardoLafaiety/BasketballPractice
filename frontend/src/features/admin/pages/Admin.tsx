import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { api, type UsuarioAdmin } from '../../../shared/api/backend'
import type { AdminUserDetail } from '../../../../../contracts/api'
import { useAuth } from '../../autenticacao/model/auth'
import { Carregando, ErroCarga } from '../../../shared/ui/Estado'
import Avatar from '../../../shared/ui/Avatar'
import Icone from '../../../shared/ui/Icone'
import { localeAtual, traduzir } from '../../../shared/i18n/idioma'
import './admin.css'

type Filter = 'todos' | 'pagos' | 'sem-acesso' | 'bloqueados' | 'admins'
const paid = (u: UsuarioAdmin) => Boolean(u.paidUntil && new Date(u.paidUntil).getTime() > Date.now())
const status = (u: UsuarioAdmin) => u.blocked ? 'Bloqueado' : u.isAdmin ? 'Administrador' : paid(u) ? 'Assinante' : 'Sem assinatura'
const date = (value?: string | null) => value ? new Intl.DateTimeFormat(localeAtual(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Ainda não entrou'
const auditLabels: Record<string, string> = { blocked: 'Conta bloqueada', unblocked: 'Conta desbloqueada', name_changed: 'Nome atualizado', sessions_revoked: 'Sessões encerradas', deleted: 'Conta excluída' }

export default function Admin() {
  const { usuario } = useAuth()
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[] | null>(null)
  const [erro, setErro] = useState<Error | null>(null)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filter>('todos')
  const [pagina, setPagina] = useState(1)
  const [selecionado, setSelecionado] = useState<UsuarioAdmin | null>(null)
  const [mensagem, setMensagem] = useState('')
  const carregar = useCallback(() => { setErro(null); api.usuariosAdmin().then(setUsuarios).catch(setErro) }, [])
  useEffect(carregar, [carregar])
  const lista = usuarios ?? []
  const filtros: { id: Filter; nome: string; total: number }[] = [
    { id: 'todos', nome: 'Usuários', total: lista.filter(u => !u.isAdmin).length },
    { id: 'pagos', nome: 'Assinantes', total: lista.filter(u => paid(u) && !u.blocked && !u.isAdmin).length },
    { id: 'sem-acesso', nome: 'Sem assinatura', total: lista.filter(u => !paid(u) && !u.blocked && !u.isAdmin).length },
    { id: 'bloqueados', nome: 'Bloqueadas', total: lista.filter(u => u.blocked).length },
    { id: 'admins', nome: 'Administradores', total: lista.filter(u => u.isAdmin).length },
  ]
  const termo = busca.trim().toLocaleLowerCase()
  const filtrados = lista.filter(u => `${u.name} ${u.email}`.toLocaleLowerCase().includes(termo) && (
    filtro === 'todos' && !u.isAdmin || filtro === 'pagos' && paid(u) && !u.blocked && !u.isAdmin || filtro === 'sem-acesso' && !paid(u) && !u.blocked && !u.isAdmin || filtro === 'bloqueados' && u.blocked && !u.isAdmin || filtro === 'admins' && u.isAdmin
  ))
  const paginas = Math.max(1, Math.ceil(filtrados.length / 8)), atual = Math.min(pagina, paginas)
  function atualizar(u: UsuarioAdmin) { setUsuarios(old => old?.map(item => item.id === u.id ? u : item) ?? null); setSelecionado(u) }
  return <div className="gestao">
    <header className="gestao-header"><div><p className="gestao-eyebrow"><Icone nome="admin" /> Área administrativa</p><h1>Gestão de usuários<span>.</span></h1><p className="muted">Pessoas, acessos e assinaturas. Tudo no mesmo lugar.</p></div><span className="gestao-acesso"><Icone nome="cadeado" /> Acesso restrito</span></header>
    <section className="gestao-resumo" aria-label="Resumo de contas">{filtros.slice(0, 4).map((f, index) => <button key={f.id} className={`gestao-metrica ${index === 1 ? 'destaque' : ''}`} onClick={() => { setFiltro(f.id); setPagina(1) }} aria-pressed={filtro === f.id}><span>{f.nome}</span><strong>{f.total.toLocaleString()}</strong><small>{['Contas cadastradas', 'Com período pago ativo', 'Aguardando assinatura', 'Acesso interrompido'][index]}</small></button>)}</section>
    {mensagem && <p className="gestao-feedback" role="status">{mensagem}</p>}
    <section className="gestao-contas" aria-label="Contas cadastradas">
      <div className="gestao-barra"><div><h2>Contas cadastradas</h2><p className="muted">Consulte uma conta para gerenciar o acesso.</p></div><button className="btn" onClick={carregar}>Atualizar</button></div>
      <label className="gestao-busca"><span>Buscar por nome ou e-mail</span><input className="input" type="search" value={busca} placeholder={traduzir('Encontre uma pessoa')} onChange={e => { setBusca(e.target.value); setPagina(1) }} /></label>
      <div className="gestao-filtros" aria-label="Filtrar contas">{filtros.map(f => <button key={f.id} aria-pressed={filtro === f.id} onClick={() => { setFiltro(f.id); setPagina(1) }}>{f.nome}<span>{f.total}</span></button>)}</div>
      {!usuarios ? erro ? <ErroCarga erro={erro} tentarDeNovo={carregar} /> : <Carregando texto="Carregando contas" /> : <>
        <div className="gestao-colunas" aria-hidden="true"><span>Usuário</span><span>Acesso</span><span>Atividade</span><span>Último login</span><span /></div>
        <ul className="gestao-lista">{filtrados.slice((atual - 1) * 8, atual * 8).map(u => <li className="gestao-linha" key={u.id}>
          <div className="gestao-pessoa"><Avatar nome={u.name} /><div><strong translate="no">{u.name}{u.id === usuario?.id && <small className="gestao-voce">Você</small>}</strong><span translate="no">{u.email}</span></div></div>
          <div className={`gestao-status ${u.blocked ? 'bloqueado' : u.isAdmin ? 'admin' : paid(u) ? 'pago' : ''}`}><span>{status(u)}</span>{paid(u) && !u.isAdmin && <small>{u.plan === 'anual' ? 'Plano anual' : 'Plano mensal'}</small>}</div>
          <div className="gestao-atividade"><strong>{u.sessions} sessões</strong><span>{u.workouts} treinos</span></div><span className="gestao-data">{date(u.lastLoginAt)}</span>
          <button className="gestao-ver" aria-label={traduzir(`Ver detalhes de ${u.name}`)} onClick={() => { setSelecionado(u); setMensagem('') }}>Ver detalhes</button>
        </li>)}</ul>
        {!filtrados.length && <div className="gestao-vazio"><Icone nome="jogador" /><h3>{!termo && filtro === 'todos' && !lista.some(u => !u.isAdmin) ? 'Nenhum usuário cadastrado' : 'Nenhuma conta encontrada'}</h3><p className="muted">{!termo && filtro === 'todos' && !lista.some(u => !u.isAdmin) ? 'Os novos cadastros aparecerão aqui. As contas responsáveis ficam em Administradores.' : 'Tente outro nome, e-mail ou filtro.'}</p>{(termo || filtro !== 'todos') && <button className="btn" onClick={() => { setBusca(''); setFiltro('todos') }}>Limpar filtros</button>}</div>}
        <footer className="gestao-paginacao"><span>{filtrados.length} contas encontradas</span><div><button className="btn" disabled={atual <= 1} onClick={() => setPagina(atual - 1)}>Anterior</button><span>{atual} / {paginas}</span><button className="btn" disabled={atual >= paginas} onClick={() => setPagina(atual + 1)}>Próxima</button></div></footer>
      </>}
    </section>
    <p className="gestao-nota"><Icone nome="admin" /> A administração é exclusiva dos responsáveis pelo Basketball Practice.</p>
    {selecionado && <Detalhes key={selecionado.id} conta={selecionado} fechar={() => setSelecionado(null)} atualizar={atualizar} informar={setMensagem} excluir={id => { setUsuarios(old => old?.filter(u => u.id !== id) ?? null); setSelecionado(null); setMensagem('Conta excluída.') }} />}
  </div>
}

function Detalhes({ conta, fechar, atualizar, informar, excluir }: { conta: UsuarioAdmin; fechar: () => void; atualizar: (u: UsuarioAdmin) => void; informar: (text: string) => void; excluir: (id: number) => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [detalhe, setDetalhe] = useState<AdminUserDetail | null>(null)
  const [nome, setNome] = useState(conta.name), [ocupado, setOcupado] = useState(false), [erro, setErro] = useState(''), [sucesso, setSucesso] = useState('')
  const [confirmar, setConfirmar] = useState<'block' | 'revoke' | 'delete' | null>(null), [emailConfirmacao, setEmailConfirmacao] = useState(''), [erroDetalhe, setErroDetalhe] = useState(false)
  const carregar = useCallback(() => { setErroDetalhe(false); api.usuarioAdmin(conta.id).then(setDetalhe).catch(() => setErroDetalhe(true)) }, [conta.id])
  useEffect(() => { carregar(); const el = dialog.current!; if (el.showModal) el.showModal(); else el.setAttribute('open', ''); return () => { if (el.close) el.close() } }, [carregar])
  async function agir(action: () => Promise<void>) {
    setOcupado(true); setErro(''); setSucesso('')
    try { await action(); setConfirmar(null); carregar() } catch (e) { setErro((e as Error).message) } finally { setOcupado(false) }
  }
  function salvar(e: FormEvent) { e.preventDefault(); void agir(async () => { atualizar(await api.atualizarUsuario(conta.id, { name: nome.trim() })); setSucesso('Nome atualizado.'); informar('Nome atualizado.') }) }
  return <dialog ref={dialog} className="gestao-drawer" aria-labelledby="gestao-detalhe-titulo" onCancel={e => { if (ocupado) e.preventDefault(); else fechar() }} onClick={e => { if (e.target === dialog.current && !ocupado) fechar() }}>
    <div className="gestao-drawer-top"><p className="gestao-eyebrow">Detalhes da conta</p><button className="gestao-fechar" aria-label="Fechar detalhes" disabled={ocupado} onClick={fechar}><Icone nome="xis" /></button></div>
    <div className="gestao-drawer-corpo">
      <div className="gestao-drawer-pessoa"><Avatar nome={conta.name} /><div><h2 id="gestao-detalhe-titulo" translate="no">{conta.name}</h2><p translate="no">{conta.email}</p><span className="gestao-badge">{status(conta)}</span></div></div>
      {erro && <p className="erro" role="alert">{erro}</p>}{sucesso && <p className="gestao-feedback" role="status">{sucesso}</p>}
      <section className="gestao-drawer-secao"><h3>Conta e acesso</h3><dl className="gestao-ficha"><div><dt>Cadastro</dt><dd>{date(conta.createdAt)}</dd></div><div><dt>Último login</dt><dd>{date(conta.lastLoginAt)}</dd></div><div><dt>Assinatura</dt><dd>{conta.isAdmin ? 'Acesso administrativo' : conta.plan === 'anual' ? 'Plano anual' : conta.plan === 'mensal' ? 'Plano mensal' : 'Sem plano'}</dd></div><div><dt>Período pago até</dt><dd>{conta.isAdmin ? 'Não se aplica' : conta.paidUntil ? date(conta.paidUntil) : 'Sem período pago'}</dd></div></dl>{conta.blocked && <p className="gestao-alerta">Bloquear o acesso não cancela a cobrança da assinatura.</p>}</section>
      <section className="gestao-drawer-secao"><h3>Atividade de treino</h3><div className="gestao-uso"><div><strong>{conta.workouts}</strong><span>Treinos criados</span></div><div><strong>{conta.sessions}</strong><span>Sessões registradas</span></div></div><p className="muted">Último treino: {conta.lastSessionAt ? date(conta.lastSessionAt) : 'Nenhuma sessão registrada'}</p></section>
      {conta.isAdmin ? <p className="gestao-protegida"><Icone nome="admin" /> Conta responsável protegida. Acesso administrativo sem assinatura.</p> : <>
        <form className="gestao-drawer-secao" onSubmit={salvar}><h3>Dados pessoais</h3><label htmlFor="admin-nome">Nome</label><input className="input" id="admin-nome" value={nome} minLength={2} maxLength={100} required onChange={e => setNome(e.target.value)} /><button className="btn" disabled={ocupado || nome.trim() === conta.name || nome.trim().length < 2}>Salvar nome</button></form>
        <section className="gestao-drawer-secao"><h3>Gerenciar acesso</h3><p className="muted">Encerrar sessões exige um novo login. Bloquear impede novos acessos.</p><div className="gestao-acoes"><button className="btn" disabled={ocupado} onClick={() => setConfirmar('revoke')}>Encerrar sessões</button><button className="btn" disabled={ocupado} onClick={() => setConfirmar('block')}>{conta.blocked ? 'Desbloquear conta' : 'Bloquear conta'}</button></div><button className="gestao-excluir" disabled={ocupado} onClick={() => { setConfirmar('delete'); setEmailConfirmacao('') }}>Excluir conta</button></section>
        {confirmar && <section className="gestao-confirmacao" aria-label="Confirmar ação"><h3>{confirmar === 'delete' ? 'Excluir esta conta?' : confirmar === 'revoke' ? 'Encerrar todas as sessões?' : conta.blocked ? 'Liberar o acesso novamente?' : 'Bloquear esta conta?'}</h3><p>{confirmar === 'delete' ? 'Os dados de treino serão apagados permanentemente. Digite o e-mail da conta para confirmar.' : confirmar === 'revoke' ? 'A pessoa precisará entrar novamente com e-mail e senha.' : 'A alteração é imediata. A cobrança da assinatura permanece inalterada.'}</p>{confirmar === 'delete' && <label>E-mail para confirmar<input className="input" value={emailConfirmacao} onChange={e => setEmailConfirmacao(e.target.value)} autoComplete="off" /></label>}<div className="gestao-acoes"><button className="btn" disabled={ocupado} onClick={() => setConfirmar(null)}>Cancelar</button><button className="btn btn-perigo" disabled={ocupado || confirmar === 'delete' && emailConfirmacao !== conta.email} onClick={() => void agir(async () => { if (confirmar === 'delete') { await api.excluirUsuario(conta.id); excluir(conta.id) } else if (confirmar === 'revoke') { await api.revogarSessoes(conta.id); setSucesso('Sessões encerradas.') } else { atualizar(await api.atualizarUsuario(conta.id, { blocked: !conta.blocked })); setSucesso(conta.blocked ? 'Conta desbloqueada.' : 'Conta bloqueada.') } })}>{ocupado ? 'Salvando…' : 'Confirmar'}</button></div></section>}
      </>}
      <section className="gestao-drawer-secao"><h3>Histórico administrativo</h3>{erroDetalhe ? <><p role="alert">Não foi possível carregar o histórico.</p><button className="btn" onClick={carregar}>Tentar de novo</button></> : !detalhe ? <p className="muted">Carregando histórico…</p> : !detalhe.audit.length ? <p className="muted">Nenhuma alteração administrativa nesta conta.</p> : <ol className="gestao-historico">{detalhe.audit.map(item => <li key={item.id}><strong>{auditLabels[item.action] ?? item.action}</strong><span><span translate="no">{item.actorName ?? 'Administrador'}</span> · {date(item.createdAt)}</span></li>)}</ol>}</section>
    </div>
  </dialog>
}

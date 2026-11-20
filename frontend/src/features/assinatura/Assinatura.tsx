import LinkInicio from '../../shared/ui/LinkInicio'
import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router-dom'
import type { EstadoAssinatura, PlanoAssinatura, ModoPagamento } from '../../../../contracts/billing'
import { Link } from '../../shared/i18n/links'
import { useIdioma } from '../../shared/i18n/idioma'
import { api } from '../../shared/api/backend'
import { useAuth } from '../autenticacao/model/auth'
import PreferenciasCabecalho from '../../shared/ui/PreferenciasCabecalho'
import LogoBola from '../../shared/ui/LogoBola'
import Icone from '../../shared/ui/Icone'
import { Carregando, ErroCarga } from '../../shared/ui/Estado'
import './assinatura.css'
import { CompraInicial } from './Compra'
import FormaPagamento from './FormaPagamento'
import { destinoPagamento } from './checkout-url'

const DEMO: EstadoAssinatura = { required: true, hasAccess: false, ready: false, paidUntil: null, subscription: null }
const ROTULOS: Record<string, string> = { creating: 'Preparando pagamento', pending: 'Aguardando pagamento', authorized: 'Renovação automática ativada', paused: 'Renovação pausada', cancelled: 'Renovação cancelada', failed: 'Pagamento não iniciado' }
const planoValido = (v: string | null): PlanoAssinatura => v === 'anual' ? 'anual' : 'mensal'
const planoSalvo = () => { try { return localStorage.getItem('bp.plano-escolhido') } catch { return null } }

export function RequerAssinatura() {
  const { usuario, erroSessao, reconferirSessao } = useAuth()
  const [agora, setAgora] = useState(Date.now)
  const vence = new Date(usuario?.billing?.paidUntil ?? '').getTime()
  useEffect(() => {
    if (!Number.isFinite(vence) || vence <= agora) return
    const conferir = () => {
      setAgora(Date.now())
      if (Date.now() >= vence) reconferirSessao()
    }
    const timer = window.setTimeout(conferir, Math.min(vence - Date.now(), 2_147_483_647))
    window.addEventListener('focus', conferir)
    document.addEventListener('visibilitychange', conferir)
    return () => { window.clearTimeout(timer); window.removeEventListener('focus', conferir); document.removeEventListener('visibilitychange', conferir) }
  }, [vence, agora, reconferirSessao])
  // Sem confirmação da identidade, mantém a rota e o treino salvo, mas não abre conteúdo.
  // Assim uma queda de rede não transforma a retomada em redirecionamento para o pagamento.
  if (!__DEMO__ && !usuario) return erroSessao ? <ErroCarga erro={erroSessao} tentarDeNovo={reconferirSessao} /> : <Carregando texto="Conferindo sua sessão" />
  const acesso = __DEMO__ || usuario?.billing?.hasAccess === true && (!usuario.billing.required || usuario.isAdmin || vence > agora)
  return acesso ? <Outlet /> : <Navigate to="/assinatura" replace />
}

export default function Assinatura() {
  useEffect(() => { if (!navigator.userAgent.includes('jsdom')) window.scrollTo(0, 0) }, [])
  const { usuario, verificando, reconferirSessao, sair } = useAuth()
  const local = useLocation()
  const [params] = useSearchParams()
  const idioma = useIdioma()
  const [plano, setPlano] = useState(() => planoValido(params.get('plano') ?? planoSalvo()))
  const [modo, setModo] = useState<ModoPagamento>('avulso')
  const [estado, setEstado] = useState<EstadoAssinatura | null>(__DEMO__ ? DEMO : null)
  const [erro, setErro] = useState('')
  const [acao, setAcao] = useState('')
  const [cancelando, setCancelando] = useState(false)
  const [aviso, setAviso] = useState('')
  useEffect(() => { try { localStorage.setItem('bp.plano-escolhido', plano) } catch { /* preferência opcional */ } }, [plano])
  useEffect(() => {
    if (__DEMO__ || !usuario) return
    const controller = new AbortController()
    api.assinatura(controller.signal).then(result => {
      setEstado(result)
      if (result.subscription) {
        if (!params.has('plano')) setPlano(result.subscription.plan)
        setModo(result.subscription.mode ?? 'recorrente')
      }
    }, e => { if (!controller.signal.aborted) setErro(e.message) })
    return () => controller.abort()
  }, [usuario?.id])
  useEffect(() => {
    if (__DEMO__ || !usuario || !params.has('retorno')) return
    let ativo = true
    let timer: ReturnType<typeof setTimeout>
    let tentativas = 0
    const verificar = async () => {
      try {
        const resultado = await api.atualizarAssinatura()
        if (!ativo) return
        setEstado(resultado)
        if (resultado.hasAccess) { reconferirSessao(); return }
        if (++tentativas < 6) timer = setTimeout(verificar, 6000)
      } catch (e) { if (ativo) setErro((e as Error).message) }
    }
    void verificar()
    return () => { ativo = false; clearTimeout(timer) }
  }, [usuario?.id, local.search])

  if (!__DEMO__ && !usuario && !verificando) return <CompraInicial />

  async function verificar() {
    setAcao('verificar'); setErro(''); setAviso('')
    try { const result = await api.atualizarAssinatura(); setEstado(result); reconferirSessao(); setAviso(result.hasAccess ? 'Pagamento confirmado. Seu acesso está liberado.' : 'Ainda não recebemos a confirmação de pagamento. Você pode consultar novamente em instantes.') }
    catch (e) { setErro((e as Error).message) }
    finally { setAcao('') }
  }
  async function pagar() {
    setAcao('pagar'); setErro('')
    try {
      const { url } = await api.iniciarAssinatura(plano, modo)
      window.location.assign(destinoPagamento(url, modo))
    } catch (e) { setErro((e as Error).message); setAcao(''); void api.assinatura().then(setEstado, () => {}) }
  }
  async function cancelar() {
    setAcao('cancelar'); setErro('')
    try { setEstado(await api.cancelarAssinatura()); setCancelando(false); setAviso('Cancelamento confirmado. Não haverá novas cobranças desta assinatura.'); reconferirSessao() }
    catch (e) { setErro((e as Error).message) }
    finally { setAcao('') }
  }
  const acesso = estado?.hasAccess && estado.required
  const vigente = estado?.subscription && estado.subscription.mode !== 'avulso' && !['cancelled', 'failed','completed'].includes(estado.subscription.status)
  const trocando = vigente && (estado?.subscription?.plan !== plano || (estado.subscription.mode ?? 'recorrente') !== modo)
  const data = estado?.paidUntil ? new Intl.DateTimeFormat(idioma === 'en' ? 'en-US' : 'pt-BR', { dateStyle: 'long' }).format(new Date(estado.paidUntil)) : null
  return <div className="assinatura-pagina">
    <header className="topo assinatura-topo"><LinkInicio className="assinatura-marca"><LogoBola /><span>Basketball Practice</span></LinkInicio><PreferenciasCabecalho /></header>
    <main className="assinatura-conteudo">
      <Link to="/conheca#planos" className="assinatura-voltar">← Conheça os planos</Link>
      <p className="assinatura-kicker">Seu próximo passo</p><h1>{acesso ? 'Sua assinatura' : 'Bora pra quadra.'}</h1>
      <p className="assinatura-resumo">{acesso ? 'Acompanhe seu acesso e gerencie as próximas cobranças.' : 'Escolha seu plano. O pagamento é feito no ambiente do Mercado Pago.'}</p>
      {__DEMO__ && <p className="assinatura-aviso" role="status">Prévia local. Pagamentos indisponíveis nesta demonstração; nenhuma cobrança será realizada.</p>}
      {erro && <p className="erro" role="alert">{erro}</p>}
      {aviso && <p className="assinatura-aviso" role="status">{aviso}</p>}
      {!estado && <div className="assinatura-aviso" role="status">Conferindo sua assinatura…</div>}
      {estado && <>
        {estado.subscription && <section className="assinatura-estado" aria-label="Estado da assinatura"><div><h2>{estado.subscription.plan === 'anual' ? 'Plano anual' : 'Plano mensal'}</h2><p>{estado.subscription.mode === 'avulso' ? estado.subscription.status === 'completed' ? 'Período pago, sem renovação automática' : 'Pagamento único em andamento' : ROTULOS[estado.subscription.status] ?? 'Em análise'}</p>{data && <p>Acesso pago até <strong>{data}</strong>.</p>}</div>{acesso && <Link className="btn btn-primario" to="/">Ir para os treinos <Icone nome="seta" /></Link>}</section>}
        {!estado.ready && !__DEMO__ && <p className="assinatura-aviso">As assinaturas estão em configuração. Nenhuma cobrança será iniciada por este site enquanto o pagamento não estiver disponível.</p>}
        {!acesso && <>
          <fieldset className="assinatura-planos" disabled={Boolean(acao)}><legend>Escolha a frequência de pagamento</legend>
            <label className={plano === 'mensal' ? 'selecionado' : ''}><input type="radio" name="plano" value="mensal" checked={plano === 'mensal'} onChange={() => setPlano('mensal')} /><span>Mensal<strong>R$ 15,00<small>por mês</small></strong><small>1 mês de acesso completo.</small></span></label>
            <label className={plano === 'anual' ? 'selecionado' : ''}><input type="radio" name="plano" value="anual" checked={plano === 'anual'} onChange={() => setPlano('anual')} /><span>Anual<strong>R$ 150,00<small>por ano</small></strong><small>Pagamento anual. Equivale a R$ 12,50/mês.</small></span></label>
          </fieldset>
          <FormaPagamento value={modo} onChange={setModo} disabled={Boolean(acao)} />
          {trocando && <p className="assinatura-aviso">Ao continuar, cancelaremos a tentativa anterior antes de abrir o plano escolhido. Cobranças já em processamento precisam ser conferidas primeiro.</p>}
          <div className="assinatura-checkout"><p>{modo === 'avulso' ? 'Pague uma vez pelo período escolhido. Sem renovação automática.' : 'A renovação é automática; você pode cancelá-la por aqui.'} Os dois planos incluem todos os recursos de treino.</p><button className="btn btn-primario" disabled={!estado.ready || Boolean(acao) || estado.subscription?.status === 'creating'} onClick={() => void pagar()}>{acao === 'pagar' ? 'Abrindo Mercado Pago…' : trocando ? 'Trocar plano e continuar' : vigente ? 'Continuar pagamento' : 'Continuar no Mercado Pago'}<Icone nome="seta" /></button><p className="assinatura-nota">O acesso depende da confirmação do pagamento. Seus dados de cartão são informados apenas no Mercado Pago.</p><p className="assinatura-nota">Ao continuar, você concorda com os <Link to="/termos">Termos de Uso</Link> e a <Link to="/privacidade">Política de Privacidade</Link>.</p></div>
        </>}
        {estado.subscription && <div className="assinatura-gerenciar">
          <button className="btn" disabled={Boolean(acao) || !(estado.canManage ?? estado.ready)} onClick={() => void verificar()}>{acao === 'verificar' ? 'Verificando…' : 'Verificar pagamento'}</button>
          {vigente && !cancelando && <button className="btn" disabled={Boolean(acao) || !(estado.canManage ?? estado.ready)} onClick={() => setCancelando(true)}>Cancelar renovação</button>}
          {cancelando && <div className="assinatura-confirmar" role="group" aria-label="Confirmar cancelamento"><p>Deseja cancelar as próximas cobranças? O período já pago continua disponível até a data de vencimento.</p><button className="btn" disabled={Boolean(acao)} onClick={() => void cancelar()}>{acao === 'cancelar' ? 'Cancelando…' : 'Confirmar cancelamento'}</button><button className="btn" disabled={Boolean(acao)} onClick={() => setCancelando(false)}>Voltar</button></div>}
        </div>}
      </>}
      <footer className="assinatura-rodape"><Link to="/contato">Precisa de ajuda?</Link>{usuario && <><Link to="/configuracoes">Minha conta</Link><button onClick={sair}>Sair da conta</button></>}</footer>
    </main>
  </div>
}

import LinkInicio from '../../shared/ui/LinkInicio'
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import type { EstadoCompra, PlanoAssinatura, ModoPagamento } from '../../../../contracts/billing'
import { api, ApiError } from '../../shared/api/backend'
import { Link } from '../../shared/i18n/links'
import { useAuth } from '../autenticacao/model/auth'
import LogoBola from '../../shared/ui/LogoBola'
import PreferenciasCabecalho from '../../shared/ui/PreferenciasCabecalho'
import { compraLocal, prepararCompra } from './compra-local'
import './assinatura.css'
import FormaPagamento from './FormaPagamento'
import { destinoPagamento } from './checkout-url'

function TelaCompra({ children, etapa }: { children: ReactNode; etapa: number }) {
  return <div className="assinatura-pagina"><header className="topo assinatura-topo"><LinkInicio className="assinatura-marca"><LogoBola /><span>Basketball Practice</span></LinkInicio><PreferenciasCabecalho /></header>
    <main className="assinatura-conteudo compra-conteudo">{import.meta.env.DEV && import.meta.env.VITE_CHECKOUT_PREVIEW === 'true' && <p className="assinatura-aviso" role="status">Prévia local de pagamento. Dados simulados, sem cobranças.</p>}<ol className="compra-etapas" aria-label="Etapas de acesso">{['Plano','Pagamento','Sua conta'].map((text,i) => <li key={text} aria-current={i + 1 === etapa ? 'step' : undefined}><span>{i + 1}</span>{text}</li>)}</ol>{children}<footer className="assinatura-rodape"><Link to="/contato">Precisa de ajuda?</Link><Link to="/entrar">Já sou assinante</Link></footer></main></div>
}

export function CompraInicial() {
  const [params] = useSearchParams()
  const [plano, setPlano] = useState<PlanoAssinatura>(params.get('plano') === 'anual' ? 'anual' : params.get('plano') === 'mensal' ? 'mensal' : compraLocal()?.plan ?? 'mensal')
  const [modo, setModo] = useState<ModoPagamento>(compraLocal()?.mode ?? 'avulso')
  useEffect(() => { const requested = params.get('plano'); if (requested === 'anual' || requested === 'mensal') setPlano(requested) }, [params])
  const [email, setEmail] = useState(() => compraLocal()?.email ?? '')
  const [ready, setReady] = useState<boolean | null>(null), [ocupado, setOcupado] = useState(false), [erro, setErro] = useState('')
  const [paga, setPaga] = useState(false)
  useEffect(() => { let active = true; api.pagamentoDisponivel().then(r => { if (active) setReady(r.ready) }, e => { if (active) { setReady(false); setErro(e.message) } }); return () => { active = false } }, [])
  useEffect(() => { const saved = compraLocal(); if (!saved) return; let active = true; api.consultarCompra(saved.key).then(r => { if (active && r.paid) setPaga(true) }, () => {}); return () => { active = false } }, [])
  async function pagar(e: FormEvent) {
    e.preventDefault(); setErro(''); setOcupado(true)
    try {
      const compra = prepararCompra(email.trim().toLowerCase(), plano, modo)
      const { url } = await api.comprarAntesDoCadastro(compra.email, compra.plan, compra.key, modo)
      const target = destinoPagamento(url, modo)
      window.location.assign(import.meta.env.DEV && import.meta.env.VITE_CHECKOUT_PREVIEW === 'true' ? '/compra' : target)
    } catch (e) { setErro((e as Error).message); setOcupado(false) }
  }
  if (paga) return <Navigate to="/compra" replace />
  return <TelaCompra etapa={2}><Link to="/conheca#planos" className="assinatura-voltar">Conheça os planos</Link><p className="assinatura-kicker">Primeiro, seu plano</p><h1>Bora pra quadra.</h1><p className="assinatura-resumo">Pague com segurança no Mercado Pago. Depois, crie sua conta para começar a treinar.</p>
    {compraLocal() && <p className="assinatura-aviso">Ao trocar um plano pendente, confirmamos o cancelamento da tentativa anterior antes de abrir outra. Pagamentos em processamento precisam ser conferidos primeiro.</p>}{erro && <p className="erro" role="alert">{erro}</p>}{ready === null && <p role="status">Conferindo o pagamento disponível…</p>}{ready === false && !erro && <p className="assinatura-aviso">O pagamento está temporariamente indisponível. Nenhuma cobrança foi iniciada.</p>}
    <form onSubmit={e => void pagar(e)}><fieldset className="assinatura-planos" disabled={ocupado}><legend>Escolha a frequência de pagamento</legend>
      <label className={plano === 'mensal' ? 'selecionado' : ''}><input type="radio" name="plano" checked={plano === 'mensal'} onChange={() => setPlano('mensal')} /><span>Mensal<strong>R$ 15,00<small>por mês</small></strong><small>1 mês de acesso completo.</small></span></label>
      <label className={plano === 'anual' ? 'selecionado' : ''}><input type="radio" name="plano" checked={plano === 'anual'} onChange={() => setPlano('anual')} /><span>Anual<strong>R$ 150,00<small>por ano</small></strong><small>Equivale a R$ 12,50/mês.</small></span></label>
    </fieldset><FormaPagamento value={modo} onChange={setModo} disabled={ocupado} /><div className="compra-email"><label htmlFor="email-compra">Seu e-mail de acesso</label><input className="input" type="email" id="email-compra" autoComplete="email" required maxLength={254} value={email} disabled={ocupado} onChange={e => setEmail(e.target.value)} /><p>Use este mesmo e-mail para criar sua conta após o pagamento. Você ainda não precisa escolher uma senha.</p></div>
      <div className="assinatura-checkout"><button className="btn btn-primario" disabled={!ready || ocupado || !email.trim()}>{ocupado ? 'Abrindo Mercado Pago…' : 'Continuar no Mercado Pago'}</button><p className="assinatura-nota">{modo === 'avulso' ? 'Pagamento único pelo período escolhido, sem renovação automática.' : 'A renovação é automática.'} O acesso só é liberado após a confirmação do pagamento.</p><p className="assinatura-nota">Ao continuar, você concorda com os <Link to="/termos">Termos de Uso</Link> e a <Link to="/privacidade">Política de Privacidade</Link>. Seus dados de cartão ficam no Mercado Pago.</p></div>
    </form>{compraLocal() && <Link className="compra-retomar" to="/compra">Já iniciei o pagamento. Retomar compra</Link>}
  </TelaCompra>
}

export default function Compra() {
  const { usuario, reconferirSessao, sair } = useAuth()
  const [local] = useState(compraLocal)
  const [estado, setEstado] = useState<EstadoCompra | null>(null), [erro, setErro] = useState(''), [ocupado, setOcupado] = useState(false)
  const reconferido = useRef('')
  const consultar = useCallback(async () => {
    if (!local) return
    setOcupado(true); setErro('')
    try { const result = await api.consultarCompra(local.key); setEstado(result) }
    catch (e) { setErro(e instanceof ApiError ? e.message : 'Não foi possível confirmar o pagamento. Tente novamente.') }
    finally { setOcupado(false) }
  }, [local])
  useEffect(() => {
    if (!local) return
    let active = true, count = 0
    let timer: ReturnType<typeof setTimeout>
    async function poll() {
      try {
        const result = await api.consultarCompra(local!.key)
        if (!active) return
        setEstado(result); setErro('')
        if (result.paid) return
        if (++count < 6) timer = setTimeout(() => void poll(), 6000)
      } catch (e) { if (active) setErro((e as Error).message) }
    }
    void poll()
    return () => { active = false; clearTimeout(timer) }
  }, [local])
  useEffect(() => {
    if (!estado?.paid || !usuario || usuario.email.toLowerCase() !== estado.email.toLowerCase()) return
    const reference = `${usuario.id}:${local?.key}`
    if (reconferido.current === reference) return
    reconferido.current = reference
    reconferirSessao()
  }, [estado?.paid, estado?.email, usuario?.id, local?.key, reconferirSessao])
  if (usuario?.billing?.hasAccess) return <Navigate to="/" replace />
  const pago = estado?.paid === true
  return <TelaCompra etapa={pago ? 3 : 2}><p className="assinatura-kicker">{pago ? 'Pagamento confirmado' : 'Seu pagamento'}</p><h1>{pago ? 'Agora, seu acesso.' : 'Falta pouco.'}</h1>
    {erro && <p className="erro" role="alert">{erro}</p>}
    {!local ? <><p className="assinatura-resumo">Não encontramos a referência desta compra neste navegador. Se você já pagou, crie ou acesse a conta com o e-mail informado na compra. Confirmaremos o pagamento no servidor.</p><div className="compra-acesso"><Link className="btn btn-primario" to="/cadastro">Criar minha conta</Link><Link className="btn" to="/entrar">Já tenho conta</Link><Link to="/assinatura">Escolher um plano</Link></div></> : pago ? <>
      <p className="assinatura-resumo">Seu pagamento foi aprovado. Crie sua conta ou entre com o mesmo e-mail para acessar a plataforma.</p><div className="compra-recibo"><span>E-mail de acesso</span><strong translate="no">{estado.email}</strong><span>{estado.plan === 'anual' ? 'Plano anual' : 'Plano mensal'}</span></div>
      {usuario ? <><p className="assinatura-aviso">{usuario.email.toLowerCase() === estado.email.toLowerCase() ? 'Estamos vinculando seu acesso. Se ele não for liberado, fale com o atendimento; não pague novamente.' : 'Entre com o e-mail informado nesta compra para vincular seu acesso.'}</p><button className="btn" onClick={sair}>Trocar conta</button></> : <div className="compra-acesso"><Link className="btn btn-primario" to="/cadastro" state={{ email: estado.email, de: '/compra', compraPaga: true }}>Criar minha conta</Link><Link className="btn" to="/entrar" state={{ email: estado.email, de: '/compra', compraPaga: true }}>Já tenho conta</Link></div>}
    </> : <><p className="assinatura-resumo">{estado ? 'Estamos aguardando a confirmação do Mercado Pago. Você não precisa pagar novamente.' : 'Conferindo o pagamento com o Mercado Pago…'}</p><div className="assinatura-aviso" role="status">{estado?.status === 'cancelled' ? 'Renovação cancelada. Nenhum período pago ativo foi confirmado.' : 'O cadastro será o próximo passo após a aprovação.'}</div><div className="compra-acesso"><button className="btn" disabled={ocupado} onClick={() => void consultar()}>{ocupado ? 'Verificando…' : 'Verificar pagamento'}</button>{estado?.url && estado.status !== 'cancelled' && <a className="btn btn-primario" href={destinoPagamento(estado.url, estado.mode ?? 'recorrente')}>Continuar no Mercado Pago</a>}</div></>}
  </TelaCompra>
}

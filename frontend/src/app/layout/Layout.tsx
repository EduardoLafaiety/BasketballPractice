import LogoBola from '../../shared/ui/LogoBola'
import Avatar from '../../shared/ui/Avatar'
import { Link, NavLink } from '../../shared/i18n/links'
import LimiteDeErro from '../../shared/ui/LimiteDeErro'
import { precarregarDestino } from '../../shared/lib/precarregamento'
import { Suspense, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { api, dataLocal } from '../../shared/api/backend'
import { useAuth } from '../../features/autenticacao/model/auth'
import { iniciarEfeitos } from '../../shared/lib/efeitos'
import { useAnimacoes } from '../../shared/lib/movimento'
import { marcarLembrado, notificar, proximoLembrete } from '../../shared/lib/lembretes'
import { aplicarTema } from '../../shared/lib/tema'
import { vibrar } from '../../shared/lib/audio'
import { useConfig } from '../../features/conta/model/usarConfig'
import type { Config } from '../../shared/types'
import Icone from '../../shared/ui/Icone'
import { Carregando } from '../../shared/ui/Estado'
import { LinksLegais } from '../../features/autenticacao/components/TelaAuth'
import SessoesPendentes from '../../features/sessao/components/SessoesPendentes'
import PreferenciasCabecalho from '../../shared/ui/PreferenciasCabecalho'

const LINKS: { to: string; rotulo: string; fim?: boolean }[] = [
  { to: '/', rotulo: 'Início', fim: true },
  { to: '/treinos', rotulo: 'Treinos' },
  { to: '/programas', rotulo: 'Programas' },
  { to: '/jogue-como', rotulo: 'Jogue como' },
  { to: '/nba', rotulo: 'Estatísticas da NBA' },
  { to: '/nbb', rotulo: 'NBB' },
  { to: '/rotina', rotulo: 'Rotina' },
  { to: '/alimentacao', rotulo: 'Alimentação' },
  { to: '/equipamentos', rotulo: 'Equipamentos' },
  { to: '/artigos', rotulo: 'Artigos' },
  { to: '/conquistas', rotulo: 'Conquistas' },
  { to: '/overall', rotulo: 'Overall' },
  { to: '/evolucao', rotulo: 'Evolução' },
]

// Barra de baixo do celular: os atalhos ao alcance do polegar, com a bola de gerar treino no meio.
type AtalhoDoca = { to: string; rotulo: string; icone: 'inicio' | 'treinos' | 'prancheta'; fim?: boolean }
const DOCA_ESQUERDA: AtalhoDoca[] = [
  { to: '/', rotulo: 'Início', icone: 'inicio', fim: true },
  { to: '/treinos', rotulo: 'Treinos', icone: 'treinos' },
]
const DOCA_DIREITA: AtalhoDoca[] = [{ to: '/evolucao', rotulo: 'Evolução', icone: 'prancheta' }]

function voltarAoTopo(e: MouseEvent<HTMLAnchorElement>) {
  if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return
  window.scrollTo(0, 0)
}

function ItemDoca({ to, rotulo, icone, fim }: AtalhoDoca) {
  return (
    <NavLink to={to} end={fim} className="doca-item" onClick={to === '/' ? voltarAoTopo : undefined}>
      <Icone nome={icone} tamanho={22} />
      {rotulo}
    </NavLink>
  )
}

// Maior espera do setTimeout é ~24,8 dias; reagendar a cada 6 h também corrige a hora depois de o PC dormir.
const REAGENDAR_MS = 6 * 60 * 60 * 1000

/** Agenda a notificação de lembrete enquanto o app estiver aberto. */
function useLembretes(lembretes: Config['lembretes']) {
  useEffect(() => {
    let timer: number | undefined
    const agendar = () => {
      const quando = proximoLembrete(lembretes)
      if (!quando) return
      const espera = quando.getTime() - Date.now()
      timer = window.setTimeout(async () => {
        if (espera <= REAGENDAR_MS) {
          try {
            // Já treinou hoje? Então não incomoda.
            const hoje = (await api.sessoes()).filter((s) => dataLocal(new Date(s.data)) === dataLocal(new Date()))
            if (hoje.length === 0 && marcarLembrado(dataLocal(new Date())))
              await notificar('Hora do treino!', 'Sua sessão de hoje ainda não foi registrada. Bora pra quadra?')
          } catch {
            // sem conexão: lembra mesmo assim
            if (marcarLembrado(dataLocal(new Date()))) await notificar('Hora do treino!', 'Bora pra quadra?')
          }
        }
        agendar()
      }, Math.min(espera, REAGENDAR_MS))
    }
    agendar()
    return () => window.clearTimeout(timer)
  }, [lembretes])
}

function antecipar(alvo: EventTarget) {
  const link = alvo instanceof Element ? alvo.closest('a[href]') : null
  if (link) precarregarDestino(link.getAttribute('href')!)
}

export default function Layout() {
  const { usuario, sair } = useAuth()
  const { config, carregado, salvar } = useConfig()
  const { pathname } = useLocation()
  const [menuAberto, setMenuAberto] = useState(false)
  const conteudo = useRef<HTMLElement>(null)
  // Quem abriu o menu (o botão do topo ou o da barra de baixo) recebe o foco de volta no Esc.
  const botaoMenu = useRef<HTMLButtonElement | null>(null)
  const barra = useRef<HTMLElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const rotaAnterior = useRef(pathname)

  useEffect(() => {
    if (carregado) aplicarTema(config.tema)
  }, [carregado, config.tema])
  useLembretes(config.lembretes)

  // Efeitos de entrada e de mouse; religam sozinhos quando o atleta muda a opção de animações.
  const { reduzido } = useAnimacoes()
  useEffect(() => (conteudo.current && !reduzido ? iniciarEfeitos(conteudo.current) : undefined), [reduzido])

  // Cada tela começa do topo, e o menu fecha ao navegar.
  useEffect(() => {
    setMenuAberto(false)
    if (rotaAnterior.current !== pathname) conteudo.current?.focus({ preventScroll: true })
    rotaAnterior.current = pathname
    if (!navigator.userAgent.includes('jsdom')) window.scrollTo(0, 0)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = menuAberto ? 'hidden' : ''
    if (!menuAberto) return
    menu.current?.querySelector<HTMLAnchorElement>('a[href]')?.focus()
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        const itens = [...(menu.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]') ?? [])]
        const primeiro = itens[0], ultimo = itens[itens.length - 1]
        if (!primeiro) return
        if (!menu.current?.contains(document.activeElement) || (!e.shiftKey && document.activeElement === ultimo)) { e.preventDefault(); primeiro.focus() }
        else if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus() }
        return
      }
      if (e.key !== 'Escape') return
      setMenuAberto(false)
      botaoMenu.current?.focus()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => {
      window.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = ''
    }
  }, [menuAberto])

  useEffect(() => {
    let pendente = 0
    const atualizar = () => {
      pendente = 0
      const total = document.documentElement.scrollHeight - window.innerHeight
      if (barra.current) barra.current.style.transform = `scaleX(${total > 0 ? Math.min(1, window.scrollY / total) : 0})`
    }
    const pedir = () => { if (!pendente) pendente = requestAnimationFrame(atualizar) }
    window.addEventListener('scroll', pedir, { passive: true })
    window.addEventListener('resize', pedir)
    pedir()
    return () => {
      window.removeEventListener('scroll', pedir)
      window.removeEventListener('resize', pedir)
      cancelAnimationFrame(pendente)
    }
  }, [pathname])

  const alternarMenu = (e: MouseEvent<HTMLButtonElement>) => {
    botaoMenu.current = e.currentTarget
    setMenuAberto((a) => !a)
  }

  const secao = LINKS.find((l) => (l.fim ? pathname === l.to : pathname.startsWith(l.to)))?.rotulo

  return (
    <div className="app" onPointerOver={(e) => { if (e.pointerType !== 'touch') antecipar(e.target) }} onFocusCapture={(e) => antecipar(e.target)}>
      <a className="pular-conteudo" href="#conteudo">Pular para o conteúdo</a>
      <div className="progresso-pagina" aria-hidden><i ref={barra} /></div>
      <header className="topo">
        <Link to="/" className="marca" aria-label="Basketball Practice, início" onClick={voltarAoTopo}>
          <LogoBola tamanho={34} />
        </Link>
        {secao && (pathname === '/'
          ? <Link to="/" className="topo-secao" onClick={voltarAoTopo}>Início</Link>
          : <span className="topo-secao">{secao}</span>)}
        <nav className="topo-atalhos" aria-label="Navegação rápida">
          {LINKS.filter((l) => ['/treinos', '/rotina', '/evolucao'].includes(l.to)).map((l) => (
            <NavLink key={l.to} to={l.to}>{l.rotulo}</NavLink>
          ))}
        </nav>
        <PreferenciasCabecalho temaConta={carregado ? config.tema : undefined} salvarTema={carregado ? (tema) => salvar({ ...config, tema }) : undefined} />
        <button className="topo-menu" aria-expanded={menuAberto} aria-controls="menu-tela" onClick={alternarMenu}>
          <span className="topo-tracos" aria-hidden />
          {menuAberto ? 'Fechar' : 'Menu'}
        </button>
      </header>

      <div ref={menu} id="menu-tela" role={menuAberto ? 'dialog' : undefined} aria-label="Menu principal" aria-hidden={!menuAberto} {...(!menuAberto ? { inert: '' } : {})} className={`menu-tela ${menuAberto ? 'aberto' : ''}`}>
        <nav className="nav" aria-label="Principal" style={{ '--linhas': Math.ceil((LINKS.length + (usuario?.isAdmin ? 1 : 0)) / 2) } as CSSProperties}>
          {[
            { titulo: 'Treinar', caminhos: ['/', '/rotina', '/treinos', '/programas', '/jogue-como'] },
            { titulo: 'Evolução', caminhos: ['/overall', '/evolucao', '/conquistas'] },
            { titulo: 'Explorar', caminhos: ['/nbb', '/artigos', '/alimentacao', '/equipamentos', '/nba'] },
          ].map((grupo) => <section className="nav-grupo" key={grupo.titulo} aria-label={grupo.titulo}>
            <h2>{grupo.titulo}</h2>
            {grupo.caminhos.map((caminho) => {
              const i = LINKS.findIndex((l) => l.to === caminho)
              const l = LINKS[i]
              return <NavLink key={l.to} to={l.to} end={l.fim} className="nav-link" style={{ '--i': i } as CSSProperties} onClick={(e) => { setMenuAberto(false); if (l.to === '/') voltarAoTopo(e) }}>
                {l.rotulo}
              </NavLink>
            })}
          </section>)}
          {usuario?.isAdmin && (
            <NavLink to="/admin" className="nav-link" style={{ '--i': LINKS.length } as CSSProperties} onClick={() => setMenuAberto(false)}>
              Admin
            </NavLink>
          )}
        </nav>
        <div className="conta">
          {usuario && (
            <NavLink to="/configuracoes" className="conta-nome" aria-label="Meu perfil e configurações" onClick={() => setMenuAberto(false)}>
              <Avatar nome={usuario.name} foto={usuario.avatarUrl} letras={1} />
              <span className="conta-primeiro" translate={__DEMO__ ? undefined : 'no'}>{usuario.name.split(' ')[0]}</span>
            </NavLink>
          )}
          <NavLink to="/configuracoes" className="botao-icone" aria-label="Configurações" title="Configurações" onClick={() => setMenuAberto(false)}>
            <Icone nome="config" />
          </NavLink>
          <button className="botao-icone" onClick={sair} aria-label="Sair" title="Sair">
            <Icone nome="sair" />
          </button>
        </div>
      </div>

      <main id="conteudo" tabIndex={-1} className="conteudo" ref={conteudo} {...(menuAberto ? { inert: '' } : {})}>
        <SessoesPendentes />
        <LimiteDeErro key={pathname}><Suspense fallback={<Carregando />}>
          <Outlet />
        </Suspense></LimiteDeErro>
      </main>
      <footer className="rodape">
        <div className="rodape-principal">
          <Link to="/" className="rodape-marca" onClick={voltarAoTopo}><LogoBola tamanho={28} /> Basketball Practice</Link>
          <nav aria-label="Links do rodapé">
            <Link to="/treinos">Treinos</Link><Link to="/rotina">Rotina</Link><Link to="/evolucao">Evolução</Link>
          </nav>
        </div>
        <LinksLegais />
      </footer>

      <nav className="doca" aria-label="Atalhos" onClick={() => vibrar(8)}>
        {DOCA_ESQUERDA.map((l) => <ItemDoca key={l.to} {...l} />)}
        <NavLink to="/rotina" className="doca-item doca-gerar" aria-label="Rotina">
          <Icone nome="bola" tamanho={22} />
          Rotina
        </NavLink>
        {DOCA_DIREITA.map((l) => <ItemDoca key={l.to} {...l} />)}
        <button className="doca-item" aria-label="Mais seções" aria-expanded={menuAberto} aria-controls="menu-tela" onClick={alternarMenu}>
          <span className="topo-tracos" aria-hidden />
          {menuAberto ? 'Fechar' : 'Mais'}
        </button>
      </nav>
    </div>
  )
}

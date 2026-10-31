import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { api, dataLocal } from '../api'
import { useAuth } from '../auth'
import { iniciarEfeitos } from '../lib/efeitos'
import { marcarLembrado, notificar, proximoLembrete } from '../lib/lembretes'
import { aplicarTema } from '../lib/tema'
import { diasAtras, useConfig } from '../store'
import type { Config } from '../types'
import BarraNoticias from './BarraNoticias'
import Icone from './Icone'

const LINKS: { to: string; rotulo: string; fim?: boolean }[] = [
  { to: '/', rotulo: 'Início', fim: true },
  { to: '/treinos', rotulo: 'Treinos' },
  { to: '/jogue-como', rotulo: 'Jogue como' },
  { to: '/rotina', rotulo: 'Rotina' },
  { to: '/desempenho', rotulo: 'Desempenho' },
  { to: '/metas', rotulo: 'Metas' },
  { to: '/ferramentas', rotulo: 'Ferramentas' },
]

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
            const hoje = await api.resumo(diasAtras(0))
            if (hoje.sessoes === 0 && marcarLembrado(dataLocal(new Date())))
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

export default function Layout() {
  const { usuario, sair } = useAuth()
  const { config, carregado } = useConfig()
  const { pathname } = useLocation()
  const [menuAberto, setMenuAberto] = useState(false)
  const conteudo = useRef<HTMLElement>(null)
  const botaoMenu = useRef<HTMLButtonElement>(null)
  const barra = useRef<HTMLElement>(null)

  useEffect(() => {
    if (carregado) aplicarTema(config.tema)
  }, [carregado, config.tema])
  useLembretes(config.lembretes)

  useEffect(() => (conteudo.current ? iniciarEfeitos(conteudo.current) : undefined), [])

  // Cada tela começa do topo, e o menu fecha ao navegar.
  useEffect(() => {
    setMenuAberto(false)
    if (!navigator.userAgent.includes('jsdom')) window.scrollTo(0, 0)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = menuAberto ? 'hidden' : ''
    if (!menuAberto) return
    const aoTeclar = (e: KeyboardEvent) => {
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

  const secao = LINKS.find((l) => (l.fim ? pathname === l.to : pathname.startsWith(l.to)))?.rotulo

  return (
    <div className="app">
      <div className="progresso-pagina" aria-hidden><i ref={barra} /></div>
      <header className="topo">
        <Link to="/" className="marca" aria-label="Basketball Practice, início">
          <Icone nome="bola" tamanho={34} />
        </Link>
        {secao && <span className="topo-secao">{secao}</span>}
        <Link to="/gerador" className="topo-acao">Gerar treino</Link>
        <button
          ref={botaoMenu}
          className="topo-menu"
          aria-expanded={menuAberto}
          aria-controls="menu-tela"
          onClick={() => setMenuAberto((a) => !a)}
        >
          <span className="topo-tracos" aria-hidden />
          {menuAberto ? 'Fechar' : 'Menu'}
        </button>
      </header>

      <div id="menu-tela" className={`menu-tela ${menuAberto ? 'aberto' : ''}`}>
        <nav className="nav" aria-label="Principal">
          {LINKS.map((l, i) => (
            <NavLink key={l.to} to={l.to} end={l.fim} className="nav-link" onClick={() => setMenuAberto(false)}>
              <span aria-hidden>{String(i + 1).padStart(2, '0')}</span>
              {l.rotulo}
            </NavLink>
          ))}
          {usuario?.isAdmin && (
            <NavLink to="/admin" className="nav-link" onClick={() => setMenuAberto(false)}>
              <span aria-hidden>{String(LINKS.length + 1).padStart(2, '0')}</span>
              Admin
            </NavLink>
          )}
        </nav>
        <div className="conta">
          {usuario && (
            <span className="conta-nome">
              <span className="avatar" aria-hidden>{usuario.name.trim().charAt(0).toUpperCase()}</span>
              <span className="conta-primeiro">{usuario.name.split(' ')[0]}</span>
            </span>
          )}
          <NavLink to="/configuracoes" className="botao-icone" aria-label="Configurações" title="Configurações" onClick={() => setMenuAberto(false)}>
            <Icone nome="config" />
          </NavLink>
          <button className="botao-icone" onClick={sair} aria-label="Sair" title="Sair">
            <Icone nome="sair" />
          </button>
        </div>
      </div>

      <main className="conteudo" ref={conteudo}>
        <Outlet />
      </main>
      <BarraNoticias />
    </div>
  )
}

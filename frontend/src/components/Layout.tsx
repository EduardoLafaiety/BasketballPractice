import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { api, dataLocal } from '../api'
import { useAuth } from '../auth'
import { marcarLembrado, notificar, proximoLembrete } from '../lib/lembretes'
import { aplicarTema } from '../lib/tema'
import { diasAtras, useConfig } from '../store'
import type { Config } from '../types'
import BarraNoticias from './BarraNoticias'
import Icone, { type NomeIcone } from './Icone'
import FaixaDemo from '../demo/FaixaDemo'

const LINKS: { to: string; rotulo: string; icone: NomeIcone; fim?: boolean }[] = [
  { to: '/', rotulo: 'Início', icone: 'inicio', fim: true },
  { to: '/treinos', rotulo: 'Treinos', icone: 'treinos' },
  { to: '/jogue-como', rotulo: 'Jogue como', icone: 'jogador' },
  { to: '/rotina', rotulo: 'Rotina', icone: 'rotina' },
  { to: '/desempenho', rotulo: 'Desempenho', icone: 'desempenho' },
  { to: '/metas', rotulo: 'Metas', icone: 'metas' },
  { to: '/ferramentas', rotulo: 'Ferramentas', icone: 'ferramentas' },
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

  useEffect(() => {
    if (carregado) aplicarTema(config.tema)
  }, [carregado, config.tema])
  useLembretes(config.lembretes)

  return (
    <div className="app">
      <aside className="lateral">
        <NavLink to="/" className="marca">
          <span className="marca-bola"><Icone nome="bola" tamanho={26} /></span>
          Basketball Practice
        </NavLink>
        <nav className="nav" aria-label="Principal">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.fim} className="nav-link">
              <Icone nome={l.icone} />
              {l.rotulo}
            </NavLink>
          ))}
          {usuario?.isAdmin && (
            <NavLink to="/admin" className="nav-link">
              <Icone nome="admin" />
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
          <NavLink to="/configuracoes" className="botao-icone" aria-label="Configurações" title="Configurações">
            <Icone nome="config" />
          </NavLink>
          {!__DEMO__ && (
            <button className="botao-icone" onClick={sair} aria-label="Sair" title="Sair">
              <Icone nome="sair" />
            </button>
          )}
        </div>
      </aside>
      <main className="conteudo">
        {__DEMO__ && <FaixaDemo />}
        <Outlet />
      </main>
      <BarraNoticias />
    </div>
  )
}

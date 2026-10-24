import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { api, dataLocal } from '../api'
import { useAuth } from '../auth'
import { marcarLembrado, notificar, proximoLembrete } from '../lib/lembretes'
import { aplicarTema } from '../lib/tema'
import { diasAtras, useConfig } from '../store'
import type { Config } from '../types'

const LINKS = [
  { to: '/', rotulo: 'Início', fim: true },
  { to: '/treinos', rotulo: 'Treinos' },
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
              await notificar('Hora do treino! 🏀', 'Sua sessão de hoje ainda não foi registrada. Bora pra quadra?')
          } catch {
            // sem conexão: lembra mesmo assim
            if (marcarLembrado(dataLocal(new Date()))) await notificar('Hora do treino! 🏀', 'Bora pra quadra?')
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
      <header className="topo">
        <NavLink to="/" className="marca">
          <span className="marca-bola" aria-hidden>🏀</span>
          Basketball Practice
        </NavLink>
        <nav className="nav">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.fim} className="nav-link">
              {l.rotulo}
            </NavLink>
          ))}
        </nav>
        <div className="conta">
          {usuario && <span className="meta">{usuario.name.split(' ')[0]}</span>}
          <NavLink to="/configuracoes" className="nav-link icone" aria-label="Configurações" title="Configurações">
            ⚙
          </NavLink>
          <button className="chip" onClick={sair}>Sair</button>
        </div>
      </header>
      <main className="conteudo">
        <Outlet />
      </main>
    </div>
  )
}

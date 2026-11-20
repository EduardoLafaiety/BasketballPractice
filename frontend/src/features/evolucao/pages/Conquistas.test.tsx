import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { definirToken } from '../../../shared/api/backend'
import { apiFalsa, configFalsa, usuarioFalso } from '../../../test/api-falsa'
import { abrirApp, abrirMenu } from '../../../test/renderizar'
// A página é baixada sob demanda; já carregada, o primeiro teste não depende do tempo de leitura do módulo.
import './Conquistas'

const exercicios = [
  { id: 1, name: 'Drible cruzado', category: 'drible', metric: 'repeticoes', description: null, custom: false },
  { id: 2, name: 'Defesa lateral', category: 'defesa', metric: 'tempo', description: null, custom: false },
]
const sessao = (id: number, performedAt: string, extra: object = {}) => ({
  id, performedAt, durationMinutes: 30, rating: null, notes: null, entries: [{ exerciseId: 1, exerciseName: 'Drible cruzado', makes: 40, attempts: 60, reps: null, seconds: null, bestStreak: 12 }], shots: [], ...extra,
})

function abrir(sessoes: object[]) {
  definirToken('t')
  const api = apiFalsa({
    'GET /auth/me': usuarioFalso({ name: 'Maria Souza' }),
    'GET /settings': configFalsa,
    'GET /exercises': exercicios,
    'GET /sessions': sessoes,
  })
  abrirApp('/conquistas')
  return api
}

// O resumo tem números em <strong>: o texto da frase vem partido em vários nós.
const resumo = (texto: RegExp) => screen.findByText((_, el) => el?.tagName === 'P' && texto.test(el.textContent ?? ''))

describe('aba Conquistas', () => {
  it('está no menu', async () => {
    abrir([])
    expect(await screen.findByRole('heading', { name: 'Conquistas' })).toBeInTheDocument()
    await abrirMenu()
    expect(within(screen.getByRole('navigation', { name: 'Principal' })).getByRole('link', { name: /Conquistas/ })).toHaveAttribute('href', '/conquistas')
  })

  it('sem sessões, tudo bloqueado, com cadeado e contagem', async () => {
    abrir([])
    expect(await resumo(/0 de 12 desbloqueadas \(0%\)/)).toBeInTheDocument()
    expect(screen.getByText('Primeiro treino').closest('li')).not.toHaveClass('desbloqueada')
    expect(screen.getAllByText(/^0\/\d/).length).toBe(12)
  })

  it('desbloqueia o que o histórico já alcançou e filtra', async () => {
    abrir([sessao(1, '2026-11-10T15:00:00'), sessao(2, '2026-11-11T15:00:00'), sessao(3, '2026-11-12T15:00:00')])
    expect(await resumo(/de 12 desbloqueadas/)).toBeInTheDocument()
    expect(screen.getByText('Primeiro treino').closest('li')).toHaveClass('desbloqueada')
    expect(screen.getByText('Aquecendo').closest('li')).toHaveClass('desbloqueada')
    expect(screen.getByText('Semana perfeita').closest('li')).not.toHaveClass('desbloqueada')
    expect(screen.getByText('Mão quente').closest('li')).toHaveClass('desbloqueada')

    await userEvent.click(screen.getByRole('button', { name: /^Bloqueadas/ }))
    expect(screen.queryByText('Primeiro treino')).not.toBeInTheDocument()
    expect(screen.getByText('Semana perfeita')).toBeInTheDocument()
  })

  it('usa o histórico completo (a API devolve mais que 50 sessões em páginas)', async () => {
    const api = abrir([sessao(1, '2026-11-10T15:00:00')])
    await resumo(/de 12 desbloqueadas/)
    expect(api.chamadas.some((c) => c.caminho === '/sessions' && c.url.searchParams.get('limit') === '200')).toBe(true)
  })
})

describe('ícones das conquistas', () => {
  it('mostra o ícone de todas, também das bloqueadas, com o cadeado ao lado', async () => {
    abrir([])
    await resumo(/de 12 desbloqueadas/)
    const item = screen.getByText('Sniper').closest('li')!
    expect(item.querySelector('.conquista-icone svg')).not.toBeNull()
    expect(item.querySelector('.conquista-estado svg')).not.toBeNull()
    expect(document.querySelectorAll('li.conquista .conquista-icone svg').length).toBe(12)
  })

  it('soma os pontos das desbloqueadas', async () => {
    abrir([sessao(1, '2026-11-10T15:00:00')])
    expect(await screen.findByText((_, el) => el?.tagName === 'P' && /de \d+ pontos/.test(el.textContent ?? ''))).toHaveTextContent(/^30 de 0?\d+/)
  })
})

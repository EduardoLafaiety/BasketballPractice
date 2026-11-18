import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { definirToken } from '../../../shared/api/backend'
import { apiFalsa, configFalsa, usuarioFalso } from '../../../test/api-falsa'
import { abrirApp, abrirMenu } from '../../../test/renderizar'
// A página é baixada sob demanda; já carregada, o primeiro teste não depende do tempo de leitura do módulo.
import './Overall'

const exercicios = [
  { id: 1, name: 'Drible cruzado', category: 'drible', metric: 'repeticoes', description: null, custom: false },
  { id: 2, name: 'Defesa lateral', category: 'defesa', metric: 'tempo', description: null, custom: false },
]

function abrir(sessoes: object[]) {
  definirToken('t')
  apiFalsa({
    'GET /auth/me': usuarioFalso({ name: 'Maria Souza' }),
    'GET /settings': configFalsa,
    'GET /exercises': exercicios,
    'GET /sessions': sessoes,
  })
  abrirApp('/overall')
}

describe('aba Overall', () => {
  it('está no menu e começa em 40 em tudo', async () => {
    abrir([])
    expect(await screen.findByRole('heading', { name: 'Overall' })).toBeInTheDocument()
    await abrirMenu()
    expect(within(screen.getByRole('navigation', { name: 'Principal' })).getByRole('link', { name: /Overall/ })).toHaveAttribute('href', '/overall')
    expect(await screen.findByLabelText('Overall 40')).toBeInTheDocument()
    expect(screen.getAllByText('Novato').length).toBe(2)
    expect(screen.getByText('Estilo em aberto')).toBeInTheDocument()
    for (const nome of ['Arremesso de 3', 'Condicionamento', 'Defesa', 'Drible', 'Passe']) {
      expect(screen.getByRole('meter', { name: nome })).toHaveAttribute('aria-valuenow', '40')
    }
  })

  it('treinar sobe só o atributo trabalhado e o overall acompanha a média', async () => {
    abrir([
      { id: 1, performedAt: '2026-11-10T15:00:00', durationMinutes: 60, rating: null, notes: null, shots: [],
        entries: [{ exerciseId: 1, exerciseName: 'Drible cruzado', makes: null, attempts: null, reps: 50, seconds: null }] },
    ])
    const drible = await screen.findByRole('meter', { name: 'Drible' })
    expect(Number(drible.getAttribute('aria-valuenow'))).toBeGreaterThan(40)
    expect(screen.getByRole('meter', { name: 'Defesa' })).toHaveAttribute('aria-valuenow', '40')
    const subiu = Number(drible.getAttribute('aria-valuenow'))
    expect(screen.getByLabelText(`Overall ${Math.round((subiu + 160) / 5)}`)).toBeInTheDocument()
    expect(screen.getByText('Maria Souza')).toBeInTheDocument()
  })
})

describe('ficha estilo 2K', () => {
  it('mostra o estilo de jogador, o ponto forte e o que melhorar depois de treinar', async () => {
    abrir([
      { id: 1, performedAt: '2026-11-10T15:00:00', durationMinutes: 60, rating: null, notes: null, shots: [],
        entries: [{ exerciseId: 1, exerciseName: 'Drible cruzado', makes: null, attempts: null, reps: 50, seconds: null }] },
    ])
    expect(await screen.findByText('Craque do drible')).toBeInTheDocument()
    expect(screen.getByText('Ponto forte').nextSibling).toHaveTextContent(/^Drible \d+$/)
    expect(screen.getByRole('img', { name: 'Gráfico dos atributos' })).toBeInTheDocument()
  })
})

import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import { definirToken } from '../../shared/api/backend'
import { apiFalsa, configFalsa, Resposta, usuarioFalso } from '../../test/api-falsa'
import { abrirApp } from '../../test/renderizar'

describe('Acesso ao conteúdo da assinatura', () => {
  it.each(['/equipamentos', '/artigos', '/artigos/1', '/treinos'])('visitante precisa entrar antes de acessar %s', async rota => {
    apiFalsa({})
    abrirApp(rota)
    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/entrar'))
  })
  it('falha ao confirmar a sessão mantém a rota sem liberar conteúdo e permite tentar novamente', async () => {
    definirToken('tk')
    let conectado = false
    const fake = apiFalsa({
      'GET /auth/me': () => conectado ? usuarioFalso() : new Resposta(503, { error: 'Não foi possível falar com o servidor.' }),
      'GET /settings': configFalsa,
      'GET /exercises': [],
      'GET /workouts': [],
    })
    abrirApp('/treinos')
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível falar com o servidor.')
    expect(screen.getByTestId('caminho')).toHaveTextContent('/treinos')
    expect(screen.queryByRole('heading', { name: 'Treinos', level: 1 })).toBeNull()
    expect(fake.ultima('GET', '/exercises')).toBeUndefined()
    conectado = true
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByRole('heading', { name: 'Treinos', level: 1 })).toBeInTheDocument()
  })
  it('assinante confirmado vê equipamentos dentro do aplicativo', async () => {
    definirToken('tk')
    apiFalsa({ 'GET /auth/me': { ...usuarioFalso(), billing: { required: true, hasAccess: true, paidUntil: new Date(Date.now() + 86400_000).toISOString() } }, 'GET /settings': configFalsa, 'GET /exercises': [], 'GET /workouts': [] })
    abrirApp('/equipamentos')
    expect(await screen.findByRole('heading', { name: 'Equipamentos', level: 1 }, { timeout: 8000 })).toBeInTheDocument()
  }, 10000)
})

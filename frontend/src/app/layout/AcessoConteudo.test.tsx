import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { definirToken } from '../../shared/api/backend'
import { apiFalsa, configFalsa, usuarioFalso } from '../../test/api-falsa'
import { abrirApp } from '../../test/renderizar'

describe('Acesso ao conteúdo da assinatura', () => {
  it.each(['/equipamentos', '/artigos', '/artigos/1', '/treinos'])('visitante precisa entrar antes de acessar %s', async rota => {
    apiFalsa({})
    abrirApp(rota)
    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/entrar'))
  })
  it('assinante confirmado vê equipamentos dentro do aplicativo', async () => {
    definirToken('tk')
    apiFalsa({ 'GET /auth/me': { ...usuarioFalso(), billing: { required: true, hasAccess: true, paidUntil: new Date(Date.now() + 86400_000).toISOString() } }, 'GET /settings': configFalsa, 'GET /exercises': [], 'GET /workouts': [] })
    abrirApp('/equipamentos')
    expect(await screen.findByRole('heading', { name: 'Equipamentos', level: 1 }, { timeout: 8000 })).toBeInTheDocument()
  })
})

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { definirToken } from '../../../shared/api/backend'
import { apiFalsa, configFalsa, usuarioFalso } from '../../../test/api-falsa'
import { abrirApp } from '../../../test/renderizar'
import { prepararFoto } from '../lib/foto-perfil'

vi.mock('../lib/foto-perfil', () => ({ prepararFoto: vi.fn() }))

it('mostra a prévia antes de salvar e permite remover a foto persistida', async () => {
  const user = userEvent.setup()
  let avatarUrl: string | null = null
  definirToken('tk')
  const { ultima } = apiFalsa({
    'GET /auth/me': () => ({ ...usuarioFalso(), avatarUrl }),
    'GET /settings': configFalsa,
    'PUT /auth/avatar': () => { avatarUrl = 'data:image/webp;base64,YWJj'; return { avatarUrl } },
    'DELETE /auth/avatar': () => { avatarUrl = null; return { avatarUrl } },
  })
  vi.mocked(prepararFoto).mockResolvedValue('data:image/webp;base64,YWJj')
  abrirApp('/configuracoes')
  await screen.findByRole('heading', { name: 'Marina Silva' })
  await user.upload(screen.getByLabelText('Selecionar foto de perfil'), new File(['foto'], 'foto.png', { type: 'image/png' }))
  await screen.findByRole('button', { name: 'Salvar foto' })
  expect(ultima('PUT', '/auth/avatar')).toBeUndefined()
  await user.click(screen.getByRole('button', { name: 'Salvar foto' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Foto de perfil atualizada.')
  expect(ultima('PUT', '/auth/avatar')?.corpo).toEqual({ image: 'data:image/webp;base64,YWJj' })
  await user.click(screen.getByRole('button', { name: 'Remover foto' }))
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Foto removida.'))
  expect(screen.queryByRole('button', { name: 'Remover foto' })).toBeNull()
})

it('informa erro de preparação sem enviar a imagem', async () => {
  definirToken('tk')
  const { ultima } = apiFalsa({ 'GET /auth/me': usuarioFalso(), 'GET /settings': configFalsa })
  vi.mocked(prepararFoto).mockRejectedValue(new Error('A foto pode ter até 5 MB.'))
  abrirApp('/configuracoes')
  await screen.findByRole('heading', { name: 'Marina Silva' })
  await userEvent.upload(screen.getByLabelText('Selecionar foto de perfil'), new File(['foto'], 'foto.jpg', { type: 'image/jpeg' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('A foto pode ter até 5 MB.')
  expect(ultima('PUT', '/auth/avatar')).toBeUndefined()
})

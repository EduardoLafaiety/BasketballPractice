import { screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { definirToken } from '../../../shared/api/backend'
import { apiFalsa, configFalsa, usuarioFalso } from '../../../test/api-falsa'
import { abrirApp } from '../../../test/renderizar'

it('mostra os dados reais da conta e mantém segurança, privacidade e saída sem os antigos blocos', async () => {
  definirToken('tk')
  apiFalsa({ 'GET /auth/me': usuarioFalso(), 'GET /settings': configFalsa })
  abrirApp('/configuracoes')
  await screen.findByRole('heading', { name: 'Marina Silva' })
  const dados = screen.getByRole('region', { name: 'Dados da conta' })
  expect(within(dados).getByText('marina@example.com')).toBeInTheDocument()
  expect(within(dados).getByText('Conta pessoal')).toBeInTheDocument()
  expect(screen.getByLabelText('Senha atual')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Sair da conta' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Política de privacidade' })).toHaveAttribute('href', '/privacidade')
  for (const name of ['Aparência', 'Lembretes de treino', 'Seus dados', 'Aplicativo']) {
    expect(screen.queryByRole('heading', { name })).toBeNull()
  }
  expect(screen.queryByRole('button', { name: 'Importar backup' })).toBeNull()
})

import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { abrirApp } from '../../test/renderizar'
import { apiFalsa } from '../../test/api-falsa'

describe('Apresentação pública', () => {
  it('abre antes do login e apresenta preços e períodos sem exigir autenticação', async () => {
    apiFalsa({})
    abrirApp('/')
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Seu jogo.')
    const mensal = screen.getByRole('link', { name: 'Escolher mensal' })
    const anual = screen.getByRole('link', { name: 'Escolher anual' })
    expect(mensal).toHaveAttribute('href', '/assinatura?plano=mensal')
    expect(anual).toHaveAttribute('href', '/assinatura?plano=anual')
    expect(mensal.closest('article')).toHaveTextContent('15,00')
    expect(anual.closest('article')).toHaveTextContent('150,00')
    expect(anual.closest('article')).toHaveTextContent('pagamento anual')
  })
  it('permite explorar recursos com mouse e teclado e abrir dúvidas', async () => {
    apiFalsa({})
    const user = userEvent.setup()
    abrirApp('/conheca')
    await user.click(await screen.findByRole('tab', { name: 'Rotina' }))
    expect(screen.getByRole('tab', { name: 'Rotina' })).toHaveAttribute('aria-selected', 'true')
    expect(within(screen.getByRole('tabpanel')).getByText('Exemplo de organização')).toBeInTheDocument()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Evolução' })).toHaveFocus()
    expect(within(screen.getByRole('tabpanel')).getByText('Exemplo de acompanhamento')).toBeInTheDocument()
    await user.click(screen.getByText('Funciona no meu celular?'))
    expect(screen.getByText(/Sim. Você acessa pelo navegador/)).toBeVisible()
  })
})

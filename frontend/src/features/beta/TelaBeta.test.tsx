import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { CHAVE_BETA, PortaBeta, PreviaBeta } from './PortaBeta'
import TelaBeta, { CONTATO, VARIANTES } from './TelaBeta'

describe('Aviso do beta', () => {
  it.each(VARIANTES.map((v) => [v.numero, v.nome] as const))('versão %i (%s) explica o beta, dá os contatos e tem o botão principal', async (numero) => {
    const user = userEvent.setup()
    const continuar = vi.fn()
    render(
      <MemoryRouter>
        <TelaBeta variante={numero} aoContinuar={continuar} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: CONTATO.email })).toHaveAttribute('href', `mailto:${CONTATO.email}`)
    expect(screen.getByRole('link', { name: new RegExp(`@${CONTATO.instagram}`) })).toHaveAttribute('href', `https://instagram.com/${CONTATO.instagram}`)
    const principal = screen.getAllByRole('button')[0]
    await user.click(principal)
    expect(continuar).toHaveBeenCalledTimes(1)
  })

  it('antes do cadastro, mostra o aviso uma vez e depois libera o formulário', async () => {
    localStorage.removeItem(CHAVE_BETA)
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/cadastro']}>
        <Routes>
          <Route path="cadastro" element={<PortaBeta><p>Formulário de cadastro</p></PortaBeta>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.queryByText('Formulário de cadastro')).toBeNull()
    await user.click(screen.getAllByRole('button')[0])
    expect(screen.getByText('Formulário de cadastro')).toBeInTheDocument()
    expect(localStorage.getItem(CHAVE_BETA)).toBe('visto')
  })

  it('quem já viu o aviso vai direto ao formulário', () => {
    localStorage.setItem(CHAVE_BETA, 'visto')
    render(
      <MemoryRouter initialEntries={['/cadastro']}>
        <Routes>
          <Route path="cadastro" element={<PortaBeta><p>Formulário de cadastro</p></PortaBeta>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Formulário de cadastro')).toBeInTheDocument()
  })

  it('a prévia troca entre as cinco versões', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/beta?v=2']}>
        <PreviaBeta />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: /2 Cartucho/ })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: /5 Fases/ }))
    expect(screen.getByRole('button', { name: /5 Fases/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { level: 1, name: 'Escolha a fase' })).toBeInTheDocument()
  })
})

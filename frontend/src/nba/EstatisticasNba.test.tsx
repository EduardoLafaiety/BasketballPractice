import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EstatisticasNba from './EstatisticasNba'
import { respostaEspn } from './exemplo-espn'
import { esquecerLideres } from './lideres'

const fetch = vi.fn()
beforeEach(() => {
  esquecerLideres()
  fetch.mockReset()
  vi.stubGlobal('fetch', fetch)
})
afterEach(() => vi.unstubAllGlobals())

describe('Estatísticas da NBA', () => {
  it('mostra um cartão por categoria, com o líder em destaque e os seguintes em ranking', async () => {
    fetch.mockImplementation(async () => new Response(JSON.stringify(respostaEspn)))
    render(<EstatisticasNba />)

    const pontos = await screen.findByRole('region', { name: 'Pontos' })
    expect(screen.getByText(/temporada 2026-27/)).toBeInTheDocument()
    expect(within(pontos).getByText('39,3')).toBeInTheDocument()
    expect(within(pontos).getByText('pontos por jogo')).toBeInTheDocument()
    expect(within(pontos).getByText('Luka Doncic')).toBeInTheDocument()
    expect(within(pontos).getByText('Los Angeles Lakers')).toBeInTheDocument()
    // Do segundo em diante, numa lista que começa no 2.
    const ranking = within(pontos).getByRole('list')
    expect(ranking).toHaveAttribute('start', '2')
    expect(within(ranking).getByRole('listitem')).toHaveTextContent('Stephen Curry')
    expect(within(ranking).getByRole('listitem')).toHaveTextContent('30,6')
    expect(screen.getByRole('region', { name: 'Rebotes' })).toHaveTextContent('Domantas Sabonis')
    expect(screen.getByText(/Dados da ESPN/)).toBeInTheDocument()
  })

  it('sem conexão, avisa e deixa tentar de novo', async () => {
    const user = userEvent.setup()
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    render(<EstatisticasNba />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar as estatísticas da NBA agora.')
    fetch.mockImplementation(async () => new Response(JSON.stringify(respostaEspn)))
    await user.click(screen.getByRole('button', { name: /Tentar de novo/i }))
    expect(await screen.findByRole('region', { name: 'Pontos' })).toBeInTheDocument()
  })
})

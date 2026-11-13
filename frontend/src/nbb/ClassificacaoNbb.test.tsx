import { act, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buscarNbb } from './classificacao'
import ClassificacaoNbb from './ClassificacaoNbb'
import { jsonNbb } from './exemplo-nbb'

const fetch = vi.fn()
beforeEach(() => {
  buscarNbb.esquecer()
  fetch.mockReset()
  vi.stubGlobal('fetch', fetch)
})
afterEach(() => vi.unstubAllGlobals())

describe('Página da NBB', () => {
  it('mostra a classificação com as faixas de playoffs, fora dos playoffs e rebaixamento', async () => {
    fetch.mockImplementation(async () => new Response(JSON.stringify(jsonNbb)))
    render(<ClassificacaoNbb />)

    const tabela = await screen.findByRole('table', { name: 'NBB 2026/27' })
    const linhas = within(tabela).getAllByRole('row').slice(1)
    expect(linhas).toHaveLength(18)
    expect(linhas[0]).toHaveTextContent(/^1Minas StormMIN701\.0007\+7014$/)
    expect(linhas[0]).toHaveClass('nba-direto')
    expect(linhas[15]).toHaveClass('nba-direto')
    expect(linhas[16]).toHaveClass('nba-fora')
    expect(linhas[17]).toHaveClass('nba-rebaixado')
    expect(linhas[17]).toHaveTextContent('Caxias do Sul Basquete')
    expect(linhas[17].querySelector('td.nba-seq-d')).toHaveTextContent('-70')

    expect(screen.getByText('1º ao 16º: playoffs (oitavas de final)')).toBeInTheDocument()
    expect(screen.getByText('17º: fora dos playoffs')).toBeInTheDocument()
    expect(screen.getByText('18º: rebaixado para a Liga Ouro')).toBeInTheDocument()
    expect(screen.getByText(/Dados da LNB.*lidos em/)).toBeInTheDocument()
  })

  it('o escudo é decorativo e, se não carregar, volta a bolinha do time', async () => {
    fetch.mockImplementation(async () => new Response(JSON.stringify(jsonNbb)))
    render(<ClassificacaoNbb />)

    const tabela = await screen.findByRole('table')
    const primeira = within(tabela).getAllByRole('row')[1]
    const escudos = [...primeira.querySelectorAll('img')]
    expect(escudos.map((i) => i.getAttribute('src'))).toEqual(['https://lnb.com.br/uploads/min-150.png', 'https://lnb.com.br/uploads/min-150.png'])
    act(() => escudos[0].dispatchEvent(new Event('error')))
    expect(primeira.querySelector('img')).toBeNull()
    expect(primeira.querySelector('.nba-time-cor')).not.toBeNull()
  })

  it('sem o nbb.json mostra o aviso e deixa tentar de novo', async () => {
    fetch.mockImplementation(async () => new Response('', { status: 404 }))
    render(<ClassificacaoNbb />)

    expect(await screen.findByText(/não está disponível agora/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /tentar de novo/i })).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()
  })
})

import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { definirToken } from '../api'
import { apiFalsa, configFalsa, usuarioFalso } from '../test/api-falsa'
import { abrirApp } from '../test/renderizar'

vi.mock('../lib/audio', () => ({ bipe: vi.fn(), vibrar: vi.fn() }))

function abrir(caminho: string) {
  definirToken('tk')
  apiFalsa({ 'GET /auth/me': usuarioFalso(), 'GET /settings': configFalsa, 'GET /exercises': [], 'GET /workouts': [] })
  abrirApp(caminho)
}

describe('Alimentação', () => {
  it('aparece no menu principal', async () => {
    abrir('/')
    const nav = await screen.findByRole('navigation', { name: 'Principal' })
    expect(within(nav).getByRole('link', { name: /Alimentação/ })).toHaveAttribute('href', '/alimentacao')
  })

  it('avisa que são sugestões e leva da posição ao cardápio', async () => {
    abrir('/alimentacao')
    expect(await screen.findByText(/São sugestões, não uma dieta/)).toBeInTheDocument()
    expect(screen.getByText(/procure um nutricionista/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Armador.*Leve e rápido/ }))
    expect(screen.getByRole('tab', { name: /Cardápio/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'Armador', level: 2 })).toBeInTheDocument()
    for (const refeicao of ['Café da manhã', 'Almoço', 'Café da tarde', 'Janta'])
      expect(screen.getByRole('heading', { name: refeicao })).toBeInTheDocument()
    expect(screen.getByText('Pré-treino · 1h antes')).toBeInTheDocument()
  })

  it('troca de posição e mostra o dia de descanso sem pré e pós-treino', async () => {
    abrir('/alimentacao?aba=cardapio&posicao=ala')
    expect(await screen.findByRole('heading', { name: 'Ala', level: 2 })).toBeInTheDocument()
    expect(screen.getByText('Patinho')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Pivô' }))
    expect(screen.getByRole('heading', { name: 'Pivô', level: 2 })).toBeInTheDocument()
    expect(screen.getByText('Ceia · antes de dormir')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Dia de descanso' }))
    expect(screen.getByText(/Mesma comida, um pouco menos de carboidrato/)).toBeInTheDocument()
    expect(screen.queryByText('Pré-treino · 1h antes')).not.toBeInTheDocument()
  })

  it('dia de jogo e despensa com busca', async () => {
    abrir('/alimentacao?aba=jogo')
    expect(await screen.findByRole('heading', { name: 'Algo rápido de digerir' })).toBeInTheDocument()
    expect(screen.getByText('Fritura')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: /Despensa/ }))
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar alimento' }), 'ovo')
    expect(screen.getByText('Ovo')).not.toHaveClass('apagado')
    expect(screen.getByText('Arroz')).toHaveClass('apagado')
  })
})

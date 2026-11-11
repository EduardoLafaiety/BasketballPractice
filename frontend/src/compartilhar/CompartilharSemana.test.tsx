import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { definirToken } from '../api'
import { limparCache } from '../store'
import { apiFalsa, Resposta } from '../test/api-falsa'
import CompartilharSemana from './CompartilharSemana'

const gerarPng = vi.hoisted(() => vi.fn())
vi.mock('./imagem', async (original) => ({ ...(await original<typeof import('./imagem')>()), gerarPng }))

const rotas = {
  'GET /stats/zones': [{ zone: 'tres_topo', makes: 4, attempts: 10 }],
  'GET /stats/summary': { totals: { sessions: 3, minutes: 95, averageRating: null }, shooting: { makes: 13, attempts: 20, percentage: 65 }, byWeek: [] },
  'GET /stats/progress': { streak: { current: 6, best: 9 }, achievements: [] },
}

beforeEach(() => {
  limparCache()
  definirToken('tk')
  gerarPng.mockResolvedValue(new Blob(['png'], { type: 'image/png' }))
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:semana'), revokeObjectURL: vi.fn() }))
})

afterEach(() => {
  Reflect.deleteProperty(navigator, 'canShare')
  Reflect.deleteProperty(navigator, 'share')
})

describe('Compartilhar a semana', () => {
  it('gera a imagem com os números da semana e oferece o download', async () => {
    const user = userEvent.setup()
    apiFalsa(rotas)
    render(<CompartilharSemana />)

    await user.click(screen.getByRole('button', { name: /Gerar imagem/ }))
    expect(await screen.findByRole('img', { name: /Imagem da semana/ })).toHaveAttribute('src', 'blob:semana')
    expect(gerarPng).toHaveBeenCalledWith(
      expect.objectContaining({ sequencia: 6, acertos: 13, tentativas: 20, treinos: 3, minutos: 95, zonas: { tres_topo: { acertos: 4, tentativas: 10 } } }),
    )
    const baixar = screen.getByRole('link', { name: 'Baixar PNG' })
    expect(baixar.getAttribute('download')).toMatch(/^minha-semana-\d{4}-\d{2}-\d{2}\.png$/)
    expect(screen.queryByRole('button', { name: 'Compartilhar' })).toBeNull()
  })

  it('no celular, compartilha o arquivo direto', async () => {
    const user = userEvent.setup()
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true })
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    apiFalsa(rotas)
    render(<CompartilharSemana />)

    await user.click(screen.getByRole('button', { name: /Gerar imagem/ }))
    await user.click(await screen.findByRole('button', { name: 'Compartilhar' }))
    expect(share.mock.calls[0][0].files[0]).toBeInstanceOf(File)
    expect(share.mock.calls[0][0].files[0].type).toBe('image/png')
  })

  it('avisa quando os dados não carregam', async () => {
    const user = userEvent.setup()
    apiFalsa({ ...rotas, 'GET /stats/zones': new Resposta(500, { error: 'Banco fora do ar' }) })
    render(<CompartilharSemana />)
    await user.click(screen.getByRole('button', { name: /Gerar imagem/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível gerar a imagem: Banco fora do ar')
  })
})

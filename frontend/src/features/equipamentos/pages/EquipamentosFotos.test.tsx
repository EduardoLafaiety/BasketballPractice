import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { definirToken } from '../../../shared/api/backend'
import { apiFalsa, configFalsa, usuarioFalso } from '../../../test/api-falsa'
import { abrirApp } from '../../../test/renderizar'
import { FOTOS } from '../fotos'

vi.mock('../../../shared/lib/audio', () => ({ bipe: vi.fn(), vibrar: vi.fn() }))

describe('Equipamentos: fotos das bolas', () => {
  afterEach(() => { delete FOTOS.LAL })

  it('mostra a foto quando existe e o desenho quando não existe', async () => {
    FOTOS.LAL = '/equipamentos/lal.webp'
    definirToken('tk')
    apiFalsa({ 'GET /auth/me': usuarioFalso(), 'GET /settings': configFalsa, 'GET /exercises': [], 'GET /workouts': [] })
    abrirApp('/equipamentos')

    const foto = await screen.findByRole('img', { name: /Bola Los Angeles Lakers/ }, { timeout: 8000 })
    expect(foto).toHaveAttribute('src', '/equipamentos/lal.webp')
    expect(screen.getAllByRole('img', { name: /Bola / })).toHaveLength(1)
    expect(screen.getByRole('link', { name: /Dallas Mavericks/ })).toBeInTheDocument()
  })
})

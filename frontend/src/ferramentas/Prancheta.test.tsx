import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { definirToken } from '../api'
import { apiFalsa, configFalsa, Resposta, usuarioFalso } from '../test/api-falsa'
import { abrirApp } from '../test/renderizar'

vi.mock('../lib/audio', () => ({ bipe: vi.fn(), vibrar: vi.fn() }))

const salva = {
  id: 3,
  name: 'Saída de bola',
  court: 'inteira',
  pieces: [{ kind: 'ataque', x: 250, y: 900, label: '1' }],
  arrows: [{ kind: 'drible', x1: 250, y1: 900, x2: 250, y2: 500 }],
  notes: null,
  updatedAt: '2026-11-09T12:00:00Z',
}

function abrir(rotas: Parameters<typeof apiFalsa>[0] = {}) {
  definirToken('tk')
  const api = apiFalsa({
    'GET /auth/me': usuarioFalso(),
    'GET /settings': configFalsa,
    'GET /plays': [salva],
    'POST /plays': (corpo: unknown) => new Resposta(201, { id: 9, ...(corpo as object), updatedAt: '2026-11-10T12:00:00Z' }),
    ...rotas,
  })
  abrirApp('/ferramentas?aba=prancheta')
  return api
}

// O jsdom não tem PointerEvent: sem ele, o evento chega sem clientX/clientY.
if (!('PointerEvent' in window)) {
  class PointerEventFalso extends MouseEvent {
    pointerId: number
    constructor(tipo: string, init: PointerEventInit = {}) {
      super(tipo, init)
      this.pointerId = init.pointerId ?? 1
    }
  }
  vi.stubGlobal('PointerEvent', PointerEventFalso)
}

// O desenho ocupa 500 × 470 px na tela: 1 px = 1 unidade da meia quadra.
beforeEach(() => {
  vi.spyOn(SVGElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 500, height: 470, right: 500, bottom: 470, x: 0, y: 0, toJSON: () => ({}) })
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

afterEach(() => {
  vi.restoreAllMocks()
})

const prancheta = () => screen.getByRole('application')
const tocar = (x: number, y: number) => {
  fireEvent.pointerDown(prancheta(), { clientX: x, clientY: y, pointerId: 1 })
  fireEvent.pointerUp(prancheta(), { clientX: x, clientY: y, pointerId: 1 })
}
const arrastar = (x1: number, y1: number, x2: number, y2: number) => {
  fireEvent.pointerDown(prancheta(), { clientX: x1, clientY: y1, pointerId: 1 })
  fireEvent.pointerMove(prancheta(), { clientX: x2, clientY: y2, pointerId: 1 })
  fireEvent.pointerUp(prancheta(), { clientX: x2, clientY: y2, pointerId: 1 })
}

describe('Prancheta tática', () => {
  it('desenha jogadores, bola e setas e salva a jogada', async () => {
    const user = userEvent.setup()
    const { ultima } = abrir()
    await screen.findByText('Saída de bola')

    tocar(250, 300)
    tocar(250, 200)
    await user.click(screen.getByRole('button', { name: 'Defesa' }))
    tocar(250, 260)
    await user.click(screen.getByRole('button', { name: 'Bola' }))
    tocar(262, 300)
    tocar(100, 100) // a bola muda de lugar, não duplica
    await user.click(screen.getByRole('button', { name: 'Bloqueio' }))
    arrastar(250, 200, 250, 280)
    await user.click(screen.getByRole('button', { name: 'Passe' }))
    arrastar(100, 100, 102, 102) // toque curto não vira seta
    arrastar(100, 100, 400, 150)

    expect(prancheta()).toHaveAccessibleName('Prancheta: meia quadra, 4 peças e 2 setas')
    expect(prancheta().querySelectorAll('[data-peca="ataque"]')).toHaveLength(2)
    expect(prancheta().querySelector('[data-seta="passe"]')).not.toBeNull()

    await user.type(screen.getByLabelText('Nome da jogada'), 'Pick and roll')
    await user.click(screen.getByRole('button', { name: 'Salvar jogada' }))
    expect(await screen.findByText('Jogada salva.')).toBeInTheDocument()
    const corpo = ultima('POST', '/plays')?.corpo as { name: string; court: string; pieces: object[]; arrows: object[] }
    expect(corpo.name).toBe('Pick and roll')
    expect(corpo.court).toBe('meia')
    expect(corpo.pieces).toEqual([
      { kind: 'ataque', x: 250, y: 300, label: '1' },
      { kind: 'ataque', x: 250, y: 200, label: '2' },
      { kind: 'defesa', x: 250, y: 260, label: '1' },
      { kind: 'bola', x: 100, y: 100, label: null },
    ])
    expect(corpo.arrows).toEqual([
      { kind: 'bloqueio', x1: 250, y1: 200, x2: 250, y2: 280 },
      { kind: 'passe', x1: 100, y1: 100, x2: 400, y2: 150 },
    ])
    expect(within(screen.getByRole('list')).getByText('Pick and roll')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeInTheDocument()
  })

  it('desfaz, apaga e limita a 5 jogadores por time', async () => {
    const user = userEvent.setup()
    abrir()
    await screen.findByText('Saída de bola')
    for (let i = 0; i < 6; i++) tocar(50 + i * 60, 300)
    expect(screen.getByText('Já tem 5 jogadores de ataque.')).toBeInTheDocument()
    expect(prancheta().querySelectorAll('[data-peca="ataque"]')).toHaveLength(5)

    await user.click(screen.getByRole('button', { name: 'Desfazer' }))
    expect(prancheta().querySelectorAll('[data-peca="ataque"]')).toHaveLength(4)

    await user.click(screen.getByRole('button', { name: 'Apagar' }))
    fireEvent.pointerDown(prancheta().querySelector('[data-peca="ataque"]')!, { clientX: 50, clientY: 300 })
    expect(prancheta().querySelectorAll('[data-peca="ataque"]')).toHaveLength(3)
  })

  it('abre uma jogada salva, exige nome e apaga da lista', async () => {
    const user = userEvent.setup()
    const { ultima } = abrir({ 'DELETE /plays/3': new Resposta(204) })
    await user.click(await screen.findByRole('button', { name: /^Saída de bola/ }))
    expect(prancheta()).toHaveAccessibleName('Prancheta: quadra inteira, 1 peças e 1 setas')
    expect(screen.getByLabelText('Nome da jogada')).toHaveValue('Saída de bola')

    await user.clear(screen.getByLabelText('Nome da jogada'))
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Dê um nome para a jogada.')

    await user.click(screen.getByRole('button', { name: 'Apagar Saída de bola' }))
    expect(ultima('DELETE', '/plays/3')).toBeDefined()
    expect(await screen.findByText('Nenhuma jogada salva ainda.')).toBeInTheDocument()
  })
})

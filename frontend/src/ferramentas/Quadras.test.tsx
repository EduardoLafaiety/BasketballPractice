import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Quadras from './Quadras'

vi.mock('../quadras/Mapa', () => ({
  default: ({ quadras }: { quadras: unknown[] }) => <div data-testid="mapa">{quadras.length} marcadores</div>,
}))

const overpass = {
  elements: [
    { type: 'way', id: 10, center: { lat: -23.552, lon: -46.63 }, tags: { leisure: 'pitch', sport: 'basketball', name: 'Quadra do Parque', surface: 'asphalt', hoops: '2' } },
    { type: 'node', id: 11, lat: -23.5505, lon: -46.63, tags: { leisure: 'pitch', sport: 'basketball' } },
  ],
}

function stubFetch() {
  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.startsWith('https://nominatim')) return new Response(JSON.stringify([{ lat: '-23.55', lon: '-46.63', display_name: 'Sé, São Paulo, Brasil' }]))
    if (url.startsWith('https://overpass') && init?.method === 'POST') return new Response(JSON.stringify(overpass))
    return new Response('', { status: 404 })
  })
  vi.stubGlobal('fetch', fetch)
  return fetch
}

afterEach(() => {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(navigator, 'geolocation')
})

describe('Quadras perto de você', () => {
  it('usa a localização do navegador e lista as quadras da mais perto à mais longe', async () => {
    const user = userEvent.setup()
    const fetch = stubFetch()
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: (ok: PositionCallback) => ok({ coords: { latitude: -23.55, longitude: -46.63 } } as GeolocationPosition) },
    })
    render(<Quadras />)

    await user.click(screen.getByRole('button', { name: 'Usar minha localização' }))
    expect(await screen.findByRole('heading', { name: '2 quadras perto de você' })).toBeInTheDocument()
    const itens = screen.getAllByRole('listitem')
    expect(itens[0]).toHaveTextContent('Quadra de basquete')
    expect(itens[1]).toHaveTextContent('Quadra do Parque')
    expect(itens[1]).toHaveTextContent('Asfalto · 2 aros')
    expect(within(itens[1]).getByRole('link', { name: 'Como chegar' }).getAttribute('href')).toMatch(/^https:\/\/www\.openstreetmap\.org\/directions/)
    expect(await screen.findByTestId('mapa')).toHaveTextContent('2 marcadores')
    expect(String(fetch.mock.calls[0][1]?.body)).toContain(encodeURIComponent('around:5000'))
    // Crédito obrigatório da ODbL.
    expect(screen.getByRole('link', { name: 'colaboradores do OpenStreetMap' })).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright')

    await user.click(screen.getByRole('button', { name: 'Até 10 km' }))
    expect(String(fetch.mock.calls.at(-1)?.[1]?.body)).toContain(encodeURIComponent('around:10000'))
  })

  it('procura pelo nome da cidade quando não há localização', async () => {
    const user = userEvent.setup()
    const fetch = stubFetch()
    render(<Quadras />)
    await user.type(screen.getByRole('searchbox', { name: 'Cidade, bairro ou endereço' }), 'Sé, São Paulo')
    await user.click(screen.getByRole('button', { name: 'Procurar' }))
    expect(await screen.findByRole('heading', { name: '2 quadras perto de Sé' })).toBeInTheDocument()
    expect(String(fetch.mock.calls[0][0])).toContain('q=S%C3%A9%2C+S%C3%A3o+Paulo')
  })

  it('avisa quando a localização é negada ou o serviço falha', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 504 })))
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: (_ok: PositionCallback, falha: PositionErrorCallback) => falha({ code: 1 } as GeolocationPositionError) },
    })
    render(<Quadras />)
    await user.click(screen.getByRole('button', { name: 'Usar minha localização' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Não deu para pegar a sua localização')

    await user.type(screen.getByRole('searchbox'), 'Recife')
    await user.click(screen.getByRole('button', { name: 'Procurar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('A busca de endereços do OpenStreetMap não respondeu')
  })
})

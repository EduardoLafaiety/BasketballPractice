import { describe, expect, it, vi } from 'vitest'
import { consultaOverpass, distancia, formatarDistancia, lerQuadras, linkRota } from './osm'

const origem = { lat: -23.55, lon: -46.63 }

describe('Quadras do OpenStreetMap', () => {
  it('calcula a distância em metros', () => {
    expect(Math.round(distancia(origem, origem))).toBe(0)
    // 0,01° de latitude ≈ 1,1 km
    expect(Math.round(distancia(origem, { lat: -23.56, lon: -46.63 }))).toBeGreaterThan(1100)
    expect(Math.round(distancia(origem, { lat: -23.56, lon: -46.63 }))).toBeLessThan(1120)
    expect(formatarDistancia(347)).toBe('350 m')
    expect(formatarDistancia(2345)).toBe('2,3 km')
  })

  it('monta a consulta com quadras de basquete no raio pedido', () => {
    const q = consultaOverpass(origem, 5000)
    expect(q).toContain('nwr["leisure"="pitch"]["sport"~"basketball"](around:5000,-23.55000,-46.63000)')
    expect(q).toContain('out center tags')
  })

  it('lê pontos e áreas, ignora quadras privadas e ordena pela distância', () => {
    const quadras = lerQuadras(
      [
        { type: 'way', id: 1, center: { lat: -23.56, lon: -46.63 }, tags: { leisure: 'pitch', sport: 'basketball', name: 'Praça do Pôr do Sol', surface: 'concrete', hoops: '2', lit: 'yes' } },
        { type: 'node', id: 2, lat: -23.551, lon: -46.63, tags: { leisure: 'pitch', sport: 'basketball;volleyball', covered: 'yes' } },
        { type: 'way', id: 3, center: { lat: -23.552, lon: -46.63 }, tags: { leisure: 'pitch', sport: 'basketball', access: 'private' } },
        { type: 'relation', id: 4, tags: { leisure: 'pitch' } },
      ],
      origem,
    )
    expect(quadras.map((q) => q.id)).toEqual(['node/2', 'way/1'])
    expect(quadras[0]).toMatchObject({ nome: null, coberta: true, iluminada: false, aros: null })
    expect(quadras[1]).toMatchObject({ nome: 'Praça do Pôr do Sol', piso: 'Concreto', aros: 2, iluminada: true })
  })

  it('leva a rota para o próprio OpenStreetMap', () => {
    expect(linkRota(origem, { lat: -23.56, lon: -46.64 })).toBe('https://www.openstreetmap.org/directions?route=-23.55000%2C-46.63000%3B-23.56000%2C-46.64000')
  })
})

describe('Servidores da Overpass', () => {
  it('passa para o espelho quando o servidor principal está lotado', async () => {
    const { buscarQuadras, OVERPASS } = await import('./osm')
    const fetch = vi.fn(async (url: string) =>
      url === OVERPASS[0]
        ? new Response('# 502 Gateway Timeout', { status: 502 })
        : new Response(JSON.stringify({ elements: [{ type: 'node', id: 1, lat: -23.551, lon: -46.63, tags: {} }] })),
    )
    vi.stubGlobal('fetch', fetch)
    const quadras = await buscarQuadras(origem, 2000)
    expect(quadras).toHaveLength(1)
    expect(fetch.mock.calls.map((c) => c[0])).toEqual(OVERPASS.slice(0, 2))
    vi.unstubAllGlobals()
  })

  it('com todos ocupados, explica o que houve', async () => {
    const { buscarQuadras, OVERPASS } = await import('./osm')
    const fetch = vi.fn(async () => new Response('<?xml version="1.0"?><osm><remark>runtime error</remark></osm>'))
    vi.stubGlobal('fetch', fetch)
    await expect(buscarQuadras(origem, 2000)).rejects.toThrow('Os servidores de mapas do OpenStreetMap estão ocupados')
    expect(fetch).toHaveBeenCalledTimes(OVERPASS.length)
    vi.unstubAllGlobals()
  })
})

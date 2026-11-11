// Quadras públicas de basquete do OpenStreetMap, buscadas direto do navegador.
// Dados © colaboradores do OpenStreetMap, licença ODbL: o crédito aparece no mapa e abaixo da lista.
// Servidores públicos da Overpass API, na ordem de tentativa: o principal vive lotado, então há espelhos.
export const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]
const ESPERA_MS = 15_000
export const NOMINATIM = 'https://nominatim.openstreetmap.org/search'

export interface Ponto {
  lat: number
  lon: number
}

export interface QuadraOsm extends Ponto {
  id: string
  nome: string | null
  distanciaM: number
  piso: string | null
  aros: number | null
  iluminada: boolean
  coberta: boolean
}

interface ElementoOverpass {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: Ponto
  tags?: Record<string, string>
}

const PISO: Record<string, string> = {
  asphalt: 'Asfalto',
  concrete: 'Concreto',
  paving_stones: 'Bloquete',
  wood: 'Madeira',
  tartan: 'Emborrachado',
  acrylic: 'Acrílico',
  rubber: 'Emborrachado',
  artificial_turf: 'Grama sintética',
  sand: 'Areia',
  grass: 'Grama',
  clay: 'Saibro',
}

/** Distância em metros entre dois pontos (fórmula de haversine). */
export function distancia(a: Ponto, b: Ponto) {
  const R = 6_371_000
  const rad = (g: number) => (g * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export const formatarDistancia = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`)

/** Consulta da Overpass: quadras (pontos e áreas) com basquete num raio em volta do ponto. */
export const consultaOverpass = ({ lat, lon }: Ponto, raioM: number) =>
  `[out:json][timeout:25];(nwr["leisure"="pitch"]["sport"~"basketball"](around:${Math.round(raioM)},${lat.toFixed(5)},${lon.toFixed(5)}););out center tags 80;`

/** Converte a resposta da Overpass: só quadras de acesso público, da mais perta à mais longe. */
export function lerQuadras(elementos: ElementoOverpass[], origem: Ponto): QuadraOsm[] {
  return elementos
    .flatMap((e): QuadraOsm[] => {
      const lat = e.lat ?? e.center?.lat
      const lon = e.lon ?? e.center?.lon
      const tags = e.tags ?? {}
      if (lat === undefined || lon === undefined) return []
      if (['private', 'no', 'customers'].includes(tags.access ?? '')) return []
      const aros = Number(tags.hoops)
      return [
        {
          id: `${e.type}/${e.id}`,
          lat,
          lon,
          nome: tags.name ?? null,
          distanciaM: distancia(origem, { lat, lon }),
          piso: tags.surface ? (PISO[tags.surface] ?? tags.surface) : null,
          aros: Number.isFinite(aros) && aros > 0 ? aros : null,
          iluminada: tags.lit === 'yes',
          coberta: tags.covered === 'yes' || tags.indoor === 'yes',
        },
      ]
    })
    .sort((a, b) => a.distanciaM - b.distanciaM)
}

/** Pergunta a cada servidor até um responder; lotado, fora do ar ou lento demais, passa para o próximo. */
export async function buscarQuadras(origem: Ponto, raioM: number, sinal?: AbortSignal) {
  for (const servidor of OVERPASS) {
    if (sinal?.aborted) break
    const limite = new AbortController()
    const relogio = setTimeout(() => limite.abort(), ESPERA_MS)
    const cancelar = () => limite.abort()
    sinal?.addEventListener('abort', cancelar)
    try {
      const resposta = await fetch(servidor, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(consultaOverpass(origem, raioM))}`,
        signal: limite.signal,
      })
      if (!resposta.ok) continue
      const { elements } = (await resposta.json()) as { elements?: ElementoOverpass[] }
      if (Array.isArray(elements)) return lerQuadras(elements, origem)
    } catch {
      // resposta que não é JSON (servidor lotado), queda de rede ou tempo esgotado: tenta o próximo
    } finally {
      clearTimeout(relogio)
      sinal?.removeEventListener('abort', cancelar)
    }
  }
  if (sinal?.aborted) throw new DOMException('Busca cancelada', 'AbortError')
  throw new Error('Os servidores de mapas do OpenStreetMap estão ocupados. Tente de novo em alguns minutos.')
}

/** Procura uma cidade, bairro ou endereço no Nominatim (OpenStreetMap). */
export async function buscarLugar(texto: string, sinal?: AbortSignal): Promise<(Ponto & { nome: string }) | null> {
  const url = `${NOMINATIM}?${new URLSearchParams({ q: texto, format: 'jsonv2', limit: '1', 'accept-language': 'pt-BR' })}`
  const resposta = await fetch(url, { signal: sinal })
  if (!resposta.ok) throw new Error('A busca de endereços do OpenStreetMap não respondeu. Tente de novo.')
  const [lugar] = (await resposta.json()) as { lat: string; lon: string; display_name: string }[]
  return lugar ? { lat: Number(lugar.lat), lon: Number(lugar.lon), nome: lugar.display_name } : null
}

/** Link de rota no próprio OpenStreetMap. */
export const linkRota = (origem: Ponto, destino: Ponto) =>
  `https://www.openstreetmap.org/directions?route=${origem.lat.toFixed(5)}%2C${origem.lon.toFixed(5)}%3B${destino.lat.toFixed(5)}%2C${destino.lon.toFixed(5)}`

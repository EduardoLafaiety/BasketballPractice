import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useRef } from 'react'
import type { Ponto, QuadraOsm } from './osm'

// Ícones desenhados em CSS (divIcon): os PNGs padrão do Leaflet não passam pelo empacotador.
const iconeQuadra = (ativa: boolean) =>
  L.divIcon({ className: `mapa-marcador ${ativa ? 'ativo' : ''}`, html: '<span></span>', iconSize: [26, 26], iconAnchor: [13, 13] })
const iconeVoce = L.divIcon({ className: 'mapa-voce', html: '<span></span>', iconSize: [18, 18], iconAnchor: [9, 9] })

interface Props {
  centro: Ponto
  quadras: QuadraOsm[]
  selecionada: string | null
  aoSelecionar: (id: string) => void
}

/** Mapa do Leaflet com os blocos do OpenStreetMap; carregado só quando a aba de quadras abre. */
export default function Mapa({ centro, quadras, selecionada, aoSelecionar }: Props) {
  const div = useRef<HTMLDivElement>(null)
  const mapa = useRef<L.Map | null>(null)
  const camada = useRef<L.LayerGroup | null>(null)
  const centroInicial = useRef(centro)

  // O mapa é criado uma vez; centro e marcadores mudam nos efeitos abaixo.
  useEffect(() => {
    const m = L.map(div.current!, { scrollWheelZoom: false }).setView([centroInicial.current.lat, centroInicial.current.lon], 14)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">colaboradores do OpenStreetMap</a> (ODbL)',
    }).addTo(m)
    camada.current = L.layerGroup().addTo(m)
    mapa.current = m
    return () => {
      m.remove()
      mapa.current = null
    }
  }, [])

  useEffect(() => {
    const m = mapa.current
    const grupo = camada.current
    if (!m || !grupo) return
    grupo.clearLayers()
    L.marker([centro.lat, centro.lon], { icon: iconeVoce, keyboard: false, title: 'Ponto de partida' }).addTo(grupo)
    for (const q of quadras) {
      L.marker([q.lat, q.lon], { icon: iconeQuadra(q.id === selecionada), title: q.nome ?? 'Quadra de basquete' })
        .on('click', () => aoSelecionar(q.id))
        .addTo(grupo)
    }
  }, [centro, quadras, selecionada, aoSelecionar])

  // Enquadra o ponto de partida e as quadras mais perto quando a lista muda.
  useEffect(() => {
    const m = mapa.current
    if (!m) return
    const pontos = [[centro.lat, centro.lon], ...quadras.slice(0, 15).map((q) => [q.lat, q.lon])] as [number, number][]
    if (pontos.length > 1) m.fitBounds(L.latLngBounds(pontos), { padding: [30, 30], maxZoom: 16 })
    else m.setView([centro.lat, centro.lon], 14)
  }, [centro, quadras])

  useEffect(() => {
    const q = quadras.find((x) => x.id === selecionada)
    if (q) mapa.current?.panTo([q.lat, q.lon])
  }, [selecionada, quadras])

  return <div ref={div} className="mapa" role="region" aria-label="Mapa das quadras" />
}

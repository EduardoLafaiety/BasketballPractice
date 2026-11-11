import { lazy, Suspense, useCallback, useEffect, useState, type FormEvent } from 'react'
import { buscarLugar, buscarQuadras, formatarDistancia, linkRota, type Ponto, type QuadraOsm } from '../quadras/osm'

const Mapa = lazy(() => import('../quadras/Mapa'))

const RAIOS = [2000, 5000, 10000]

export default function Quadras() {
  const [origem, setOrigem] = useState<(Ponto & { nome: string }) | null>(null)
  const [raio, setRaio] = useState(5000)
  const [quadras, setQuadras] = useState<QuadraOsm[] | null>(null)
  const [selecionada, setSelecionada] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [estado, setEstado] = useState<'parado' | 'localizando' | 'buscando'>('parado')
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!origem) return
    const controle = new AbortController()
    setEstado('buscando')
    setErro(null)
    buscarQuadras(origem, raio, controle.signal)
      .then((lista) => {
        setQuadras(lista)
        setSelecionada(null)
      })
      .catch((e: Error) => e.name !== 'AbortError' && setErro(e.message))
      .finally(() => !controle.signal.aborted && setEstado('parado'))
    return () => controle.abort()
  }, [origem, raio])

  function usarLocalizacao() {
    if (!navigator.geolocation) return setErro('Este navegador não informa a localização. Procure pelo nome da cidade ou do bairro.')
    setEstado('localizando')
    setErro(null)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setOrigem({ lat: coords.latitude, lon: coords.longitude, nome: 'você' }),
      () => {
        setEstado('parado')
        setErro('Não deu para pegar a sua localização. Libere o acesso no navegador ou procure pelo nome da cidade ou do bairro.')
      },
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 300_000 },
    )
  }

  async function procurar(e: FormEvent) {
    e.preventDefault()
    const texto = busca.trim()
    if (texto.length < 3) return setErro('Digite pelo menos 3 letras.')
    setEstado('buscando')
    setErro(null)
    try {
      const lugar = await buscarLugar(texto)
      if (lugar) setOrigem(lugar)
      else {
        setEstado('parado')
        setErro(`Nada encontrado para "${texto}".`)
      }
    } catch (e) {
      setEstado('parado')
      setErro((e as Error).message)
    }
  }

  const selecionar = useCallback((id: string) => setSelecionada(id), [])
  const titulo =
    estado === 'buscando' ? 'Procurando quadras…' : quadras ? `${quadras.length} ${quadras.length === 1 ? 'quadra' : 'quadras'} perto de ${origem?.nome.split(',')[0]}` : ''

  return (
    <div className="quadras">
      <div className="quadras-busca">
        <button className="btn btn-primario" onClick={usarLocalizacao} disabled={estado === 'localizando'}>
          {estado === 'localizando' ? 'Localizando…' : 'Usar minha localização'}
        </button>
        <form className="quadras-form" onSubmit={procurar} role="search">
          <input className="input" type="search" aria-label="Cidade, bairro ou endereço" placeholder="Cidade, bairro ou endereço" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <button className="btn" type="submit">Procurar</button>
        </form>
      </div>
      <div className="chips" role="group" aria-label="Distância">
        {RAIOS.map((r) => (
          <button key={r} className={`chip ${raio === r ? 'ativo' : ''}`} aria-pressed={raio === r} onClick={() => setRaio(r)}>
            Até {r / 1000} km
          </button>
        ))}
      </div>
      <p className="meta">A busca vai direto do seu navegador para os servidores do OpenStreetMap. O Basketball Practice não recebe nem guarda a sua localização.</p>
      {erro && <p className="erro" role="alert">{erro}</p>}

      {origem && (
        <div className="quadras-corpo">
          <Suspense fallback={<div className="mapa mapa-carregando" role="status">Carregando o mapa…</div>}>
            <Mapa centro={origem} quadras={quadras ?? []} selecionada={selecionada} aoSelecionar={selecionar} />
          </Suspense>
          <div className="quadras-lista" aria-busy={estado === 'buscando'}>
            <h3>{titulo}</h3>
            {quadras?.length === 0 && estado !== 'buscando' && (
              <p className="muted">Nenhuma quadra mapeada nessa distância. Aumente o raio ou adicione no OpenStreetMap a quadra que você conhece.</p>
            )}
            <ul className="lista-simples">
              {quadras?.map((q) => (
                <li key={q.id} className={`quadra-item ${q.id === selecionada ? 'ativa' : ''}`}>
                  <button className="botao-link quadra-item-nome" onClick={() => setSelecionada(q.id)}>
                    <strong>{q.nome ?? 'Quadra de basquete'}</strong>
                    <span className="meta">
                      {[formatarDistancia(q.distanciaM), q.piso, q.aros && `${q.aros} ${q.aros === 1 ? 'aro' : 'aros'}`, q.iluminada && 'iluminada', q.coberta && 'coberta']
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </button>
                  <a className="link" href={linkRota(origem, q)} target="_blank" rel="noreferrer">Como chegar</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <p className="meta credito-osm">
        Mapa e dados das quadras ©{' '}
        <a className="link" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">colaboradores do OpenStreetMap</a>, disponíveis sob a licença ODbL. As
        quadras vêm do mapeamento voluntário e podem estar incompletas.
      </p>
    </div>
  )
}

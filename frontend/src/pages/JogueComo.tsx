import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { Carregando, ErroCarga } from '../components/Estado'
import FotoJogador from '../components/FotoJogador'
import Icone from '../components/Icone'
import type { EstiloResumo, FatiaEstilo, Posicao } from '../types'

const FILTROS: (Posicao | 'Todos')[] = ['Todos', 'Armador', 'Ala', 'Pivô']
const PLURAL: Record<Posicao | 'Todos', string> = { Todos: 'Todos', Armador: 'Armadores', Ala: 'Alas', Pivô: 'Pivôs' }

/** Barra fina com a divisão do treino por categoria, nas cores das categorias. */
export function BarraDivisao({ divisao }: { divisao: FatiaEstilo[] }) {
  return (
    <div className="barra-divisao" aria-hidden>
      {divisao.map((f) => (
        <span key={f.categoria} className={`tag-${f.categoria}`} style={{ flexGrow: f.porcentagem }} />
      ))}
    </div>
  )
}

export default function JogueComo() {
  const [estilos, setEstilos] = useState<EstiloResumo[] | null>(null)
  const [erro, setErro] = useState<Error | null>(null)
  const [filtro, setFiltro] = useState<Posicao | 'Todos'>('Todos')

  const carregar = useCallback(() => {
    setErro(null)
    api.estilos().then(setEstilos, setErro)
  }, [])
  useEffect(carregar, [carregar])

  const lista = estilos?.filter((e) => filtro === 'Todos' || e.posicao === filtro) ?? []

  return (
    <>
      <h1>Jogue como</h1>
      <p className="muted">Escolha um jogador e treine os movimentos que definem o jeito dele de jogar.</p>

      <div className="chips filtros" role="group" aria-label="Filtrar por posição">
        {FILTROS.map((f) => (
          <button key={f} className={`chip ${filtro === f ? 'ativo' : ''}`} aria-pressed={filtro === f} onClick={() => setFiltro(f)}>
            {PLURAL[f]}
          </button>
        ))}
      </div>

      {!estilos ? (
        erro ? <ErroCarga erro={erro} tentarDeNovo={carregar} /> : <Carregando texto="Carregando jogadores…" />
      ) : (
        <div className="grade grade-jogadores">
          {lista.map((e) => (
            <Link key={e.id} to={`/jogue-como/${e.id}`} className="card cartao-jogador">
              <FotoJogador id={e.id} nome={e.nome} categoria={e.divisao[0]?.categoria} />
              <div className="cartao-jogador-info">
                <span className="tag">{e.posicao}</span>
                <h3>{e.nome}</h3>
                <p className="muted">{e.arquetipo}</p>
                <BarraDivisao divisao={e.divisao} />
                <span className="cartao-jogador-rodape">
                  {e.totalMovimentos} movimentos · {e.minutos} min
                  <Icone nome="seta" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <p className="meta aviso-estilos">
        As descrições são uma leitura do estilo de jogo para fins de treino. O app não tem relação com os jogadores, com a NBA
        nem com os times. Fotos da Wikimedia Commons; os créditos estão na página de cada jogador.
      </p>
    </>
  )
}

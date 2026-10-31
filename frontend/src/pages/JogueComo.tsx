import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { Carregando, ErroCarga } from '../components/Estado'
import GradeJogadores, { BarraDivisao } from '../components/GradeJogadores'
import { NomesRolagem } from '../components/rolagem'
import type { EstiloResumo, Posicao } from '../types'

export { BarraDivisao }

const FILTROS: (Posicao | 'Todos')[] = ['Todos', 'Armador', 'Ala', 'Pivô']
const PLURAL: Record<Posicao | 'Todos', string> = { Todos: 'Todos', Armador: 'Armadores', Ala: 'Alas', Pivô: 'Pivôs' }

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
    <div className="pagina-larga faixa-escura">
      <NomesRolagem
        nomes={estilos?.map((e) => e.nome) ?? []}
        titulo={<h1>Jogue como</h1>}
        texto={<p className="muted">Escolha um jogador e treine os movimentos que definem o jeito dele de jogar.</p>}
      />

      <div className="jogue-corpo">
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
          <GradeJogadores estilos={lista} />
        )}

        <p className="meta aviso-estilos">
          As descrições são uma leitura do estilo de jogo para fins de treino. O app não tem relação com os jogadores, com a NBA
          nem com os times. Fotos da Wikimedia Commons; os créditos estão na página de cada jogador.
        </p>
      </div>
    </div>
  )
}

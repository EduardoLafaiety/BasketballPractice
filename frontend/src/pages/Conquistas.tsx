import { useState, type CSSProperties } from 'react'
import BarraProgresso from '../components/BarraProgresso'
import { Carregando, ErroCarga } from '../components/Estado'
import Icone from '../components/Icone'
import { conquistas as calcular, ordenarConquistas } from '../progressao/calculos'
import IconeConquista, { fundoDaConquista, temSprite } from '../progressao/IconeConquista'
import { useHistorico } from '../progressao/usarSessoes'

type Filtro = 'todas' | 'desbloqueadas' | 'bloqueadas'
const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: 'todas', rotulo: 'Todas' },
  { id: 'desbloqueadas', rotulo: 'Desbloqueadas' },
  { id: 'bloqueadas', rotulo: 'Bloqueadas' },
]

const GRUPOS: { id: string; titulo: string; ids: string[] }[] = [
  { id: 'sessoes', titulo: 'Sessões', ids: ['primeira-sessao', '10-sessoes', '50-sessoes', '100-sessoes'] },
  { id: 'sequencia', titulo: 'Sequência de dias', ids: ['3-dias', '7-dias', '30-dias'] },
  { id: 'quadra', titulo: 'Arremessos e tempo de quadra', ids: ['10-horas', '100-num-dia', '1000-cestas', 'sequencia-10', 'sequencia-25'] },
]

export default function Conquistas() {
  const { sessoes, erro, recarregar } = useHistorico()
  const [filtro, setFiltro] = useState<Filtro>('todas')

  const lista = sessoes ? calcular(sessoes) : []
  const total = lista.length
  const feitas = lista.filter((c) => c.desbloqueada).length
  const pct = total ? Math.round((feitas / total) * 100) : 0
  const pontosTotal = lista.reduce((t, c) => t + c.pontos, 0)
  const pontosFeitos = lista.filter((c) => c.desbloqueada).reduce((t, c) => t + c.pontos, 0)
  const contagem: Record<Filtro, number> = { todas: total, desbloqueadas: feitas, bloqueadas: total - feitas }
  const ordenadas = ordenarConquistas(lista)
  const visiveis = ordenadas.filter((c) => filtro === 'todas' || (filtro === 'desbloqueadas') === c.desbloqueada)
  const proxima = ordenadas.find((c) => !c.desbloqueada)
  // Conquistas fora de qualquer grupo (novas) não somem: caem num grupo final.
  const conhecidas = GRUPOS.flatMap((g) => g.ids)
  const grupos = [...GRUPOS, { id: 'outras', titulo: 'Outras', ids: lista.filter((c) => !conhecidas.includes(c.id)).map((c) => c.id) }]
    .map((g) => ({ ...g, itens: visiveis.filter((c) => g.ids.includes(c.id)) }))
    .filter((g) => g.itens.length > 0)

  return (
    <>
      <h1>Conquistas</h1>
      <p className="muted">Cada treino registrado aproxima você da próxima. As bloqueadas mostram quanto falta.</p>

      {!sessoes ? (
        erro ? <ErroCarga erro={erro} tentarDeNovo={recarregar} /> : <Carregando texto="Contando suas conquistas" />
      ) : (
        <section className="conquistas-painel" aria-labelledby="titulo-conquistas">
          <aside className="conquistas-lateral card">
            <div className="conquistas-anel" style={{ '--pct': `${pct}%` } as CSSProperties} role="img" aria-label={`${pct}% das conquistas`}>
              <span>
                <Icone nome="trofeu" tamanho={26} />
                <strong>{pct}%</strong>
              </span>
            </div>
            <h2 id="titulo-conquistas">Suas conquistas</h2>
            <p className="muted">
              <strong>{feitas}</strong> de <strong>{total}</strong> desbloqueadas ({pct}%)
            </p>
            <p className="muted conquistas-pontos-total">
              <strong>{pontosFeitos.toLocaleString('pt-BR')}</strong> de {pontosTotal.toLocaleString('pt-BR')} pontos
            </p>
            <div className="conquistas-filtros" role="group" aria-label="Mostrar conquistas">
              {FILTROS.map((f) => (
                <button key={f.id} className={`conquistas-filtro ${filtro === f.id ? 'ativo' : ''}`} aria-pressed={filtro === f.id} onClick={() => setFiltro(f.id)}>
                  {f.rotulo} ({contagem[f.id]})
                </button>
              ))}
            </div>
            {proxima && <p className="conquistas-proxima">{`Próxima: ${proxima.titulo}`}</p>}
          </aside>

          <div className="conquistas-grupos">
            {grupos.map((g) => (
              <section key={g.id} className="conquistas-grupo" aria-label={g.titulo}>
                <h3>
                  <span>{g.titulo}</span>
                  <span className="muted">{g.itens.filter((c) => c.desbloqueada).length} de {g.ids.length}</span>
                </h3>
                <ul className="conquistas">
                  {g.itens.map((c) => (
                    <li key={c.id} className={`conquista ${c.desbloqueada ? 'desbloqueada' : ''}`}>
                      {/* O ícone aparece sempre, colorido; bloqueada, ganha o cadeado no canto. */}
                      <span className="conquista-icone" style={{ '--fundo': fundoDaConquista(c.id) } as CSSProperties}>
                        {temSprite(c.id) ? <IconeConquista id={c.id} /> : <Icone nome="medalha" tamanho={34} />}
                      </span>
                      <div className="conquista-texto">
                        <strong>{c.titulo}</strong>
                        <span className="conquista-descricao">{c.descricao}</span>
                        {!c.desbloqueada && <BarraProgresso valor={c.progresso} alvo={c.alvo} rotulo={`Progresso: ${c.titulo}`} />}
                      </div>
                      <span className="conquista-estado">
                        {c.desbloqueada ? (
                          <>
                            <Icone nome="check" tamanho={14} />
                            Desbloqueada
                          </>
                        ) : (
                          <>
                            <Icone nome="cadeado" tamanho={16} />
                            <span className="conquista-contagem">
                              {c.progresso.toLocaleString('pt-BR')}/{c.alvo.toLocaleString('pt-BR')}
                            </span>
                          </>
                        )}
                        <span className="conquista-pontos">{c.pontos} pts</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>
      )}
    </>
  )
}

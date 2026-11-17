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
  const visiveis = ordenarConquistas(lista).filter((c) => filtro === 'todas' || (filtro === 'desbloqueadas') === c.desbloqueada)

  return (
    <>
      <h1>Conquistas</h1>
      <p className="muted">Cada treino registrado aproxima você da próxima. As bloqueadas mostram quanto falta.</p>

      {!sessoes ? (
        erro ? <ErroCarga erro={erro} tentarDeNovo={recarregar} /> : <Carregando texto="Contando suas conquistas" />
      ) : (
        <section aria-labelledby="titulo-conquistas">
          <div className="conquistas-resumo card">
            <span className="conquistas-trofeu" aria-hidden>
              <Icone nome="trofeu" tamanho={34} />
            </span>
            <div>
              <h2 id="titulo-conquistas">Suas conquistas</h2>
              <p className="muted">
                <strong>{feitas}</strong> de <strong>{total}</strong> desbloqueadas ({pct}%)
              </p>
              <p className="muted conquistas-pontos-total">
                <strong>{pontosFeitos.toLocaleString('pt-BR')}</strong> de {pontosTotal.toLocaleString('pt-BR')} pontos
              </p>
              <BarraProgresso valor={feitas} alvo={Math.max(1, total)} rotulo="Conquistas desbloqueadas" />
            </div>
          </div>

          <div className="chips" role="group" aria-label="Mostrar conquistas">
            {FILTROS.map((f) => (
              <button key={f.id} className={`chip ${filtro === f.id ? 'ativo' : ''}`} aria-pressed={filtro === f.id} onClick={() => setFiltro(f.id)}>
                {f.rotulo} ({contagem[f.id]})
              </button>
            ))}
          </div>

          <ul className="conquistas">
            {visiveis.map((c) => (
              <li key={c.id} className={`conquista ${c.desbloqueada ? 'desbloqueada' : ''}`}>
                {/* O ícone aparece sempre; bloqueada, fica apagado (cinza) e o cadeado vai ao lado. */}
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
                      <Icone nome="cadeado" tamanho={18} />
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
      )}
    </>
  )
}

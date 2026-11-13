import { useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { AvisoDesatualizado, Carregando, ErroCarga } from '../components/Estado'
import { CATEGORIAS } from '../components/FormExercicio'
import { DIAS, useDrills, useModelosRotina, useRotina } from '../store'
import type { Categoria, DiaSemana, Drill, Rotina as RotinaSemana } from '../types'

const ORDEM: DiaSemana[] = [1, 2, 3, 4, 5, 6, 0]
const SIGLA = DIAS.map((d) => d.slice(0, 3).toUpperCase())
const METRICA: Record<Drill['metrica'], string> = { acertos: 'Acertos', repeticoes: 'Repetições', tempo: 'Tempo' }

/** Quantos treinos de cada categoria (na ordem fixa das categorias, só as que aparecem). */
function mixDe(drills: Drill[]): [Categoria, number][] {
  return CATEGORIAS.flatMap((c) => {
    const n = drills.filter((d) => d.categoria === c).length
    return n ? [[c, n] as [Categoria, number]] : []
  })
}

export default function Rotina() {
  const { rotina, carregado, erro, recarregar, alterarDia, aplicarModelo, erroSalvar } = useRotina()
  const drills = useDrills()
  const hoje = new Date().getDay()

  const adicionar = (dia: DiaSemana, drillId: string) => alterarDia(dia, (ids) => [...ids, drillId])
  const remover = (dia: DiaSemana, indice: number) => alterarDia(dia, (ids) => ids.filter((_, i) => i !== indice))

  // Arrastar um treino de um dia para outro (no computador): sai do dia de origem e entra no fim do destino.
  const arrastando = useRef<{ dia: DiaSemana; indice: number; id: string } | null>(null)
  const [alvo, setAlvo] = useState<DiaSemana | null>(null)
  // Enquanto algo é arrastado, todos os dias mostram onde dá para soltar.
  const [emArraste, setEmArraste] = useState(false)
  const soltar = (dia: DiaSemana) => {
    const origem = arrastando.current
    arrastando.current = null
    setAlvo(null)
    setEmArraste(false)
    if (!origem || origem.dia === dia) return
    remover(origem.dia, origem.indice)
    adicionar(dia, origem.id)
  }

  // A API devolve os exercícios ordenados por categoria; agrupar deixa a lista do select legível.
  const porCategoria = useMemo(() => {
    const grupos = new Map<string, Drill[]>()
    for (const d of drills.drills) grupos.set(d.categoria, [...(grupos.get(d.categoria) ?? []), d])
    return [...grupos]
  }, [drills.drills])

  // O que cada dia tem de treino de verdade (um id que não existe mais no catálogo fica de fora da jogada).
  const jogadas = useMemo(
    () =>
      Object.fromEntries(
        ORDEM.map((dia) => [dia, (rotina[dia] ?? []).flatMap((id, indice) => { const d = drills.drillPorId(id); return d ? [{ id, indice, d }] : [] })]),
      ) as Record<DiaSemana, { id: string; indice: number; d: Drill }[]>,
    [rotina, drills],
  )

  const erroCarga = erro ?? drills.erro
  const pronto = carregado && drills.carregado

  return (
    <>
      <h1>Rotina semanal</h1>
      <p className="muted">Planeje o que treinar em cada dia da semana.</p>
      {pronto && <Modelos aplicar={aplicarModelo} />}

      {erroSalvar && <p className="erro" role="alert">Não foi possível salvar a rotina: {erroSalvar.message}</p>}

      {pronto && (
        <AvisoDesatualizado erro={erroCarga} tentarDeNovo={() => { recarregar(); drills.recarregar() }} />
      )}
      {!pronto ? (
        erroCarga ? (
          <ErroCarga erro={erroCarga} tentarDeNovo={() => { recarregar(); drills.recarregar() }} />
        ) : (
          <Carregando texto="Carregando rotina" />
        )
      ) : (
        <>
          <Placar jogadas={jogadas} hoje={hoje} />
          <div className={`semana ${emArraste ? 'em-arraste' : ''}`}>
            {ORDEM.map((dia, posicao) => {
              const itens = rotina[dia]
              const linhas = jogadas[dia]
              const mix = mixDe(linhas.map((l) => l.d))
              return (
                <div
                  key={dia}
                  style={{ '--i': posicao } as CSSProperties}
                  className={`card dia ${dia === hoje ? 'hoje' : ''} ${alvo === dia ? 'alvo' : ''} ${linhas.length ? '' : 'dia-folga'}`}
                  onDragOver={(e) => {
                    if (!arrastando.current) return
                    e.preventDefault()
                    setAlvo(dia)
                  }}
                  onDragLeave={() => setAlvo((a) => (a === dia ? null : a))}
                  onDrop={(e) => {
                    e.preventDefault()
                    soltar(dia)
                  }}
                >
                  <span className="dia-sigla" aria-hidden>{SIGLA[dia]}</span>
                  <div className="dia-topo">
                    <h3>
                      {DIAS[dia]}
                      {dia === hoje && <span className="dia-hoje">Hoje</span>}
                    </h3>
                    <span className="meta">
                      {itens.length ? `${itens.length} ${itens.length === 1 ? 'treino' : 'treinos'}` : 'Descanso'}
                    </span>
                  </div>
                  <div className="dia-mix" aria-hidden title={mix.map(([c, n]) => `${c} ${n}`).join(' · ') || undefined}>
                    {mix.map(([c, n]) => (
                      <i key={c} className={`tag-${c}`} style={{ flexGrow: n }} />
                    ))}
                  </div>
                  {linhas.length ? (
                    <ol className="dia-lista rota">
                      {linhas.map(({ id, indice, d }, n) => (
                        <li
                          key={`${id}-${indice}`}
                          className={`tag-${d.categoria}`}
                          draggable
                          title="Arraste para outro dia"
                          onDragStart={(e) => {
                            arrastando.current = { dia, indice, id }
                            setEmArraste(true)
                            e.dataTransfer.effectAllowed = 'move'
                          }}
                          onDragEnd={() => {
                            arrastando.current = null
                            setAlvo(null)
                            setEmArraste(false)
                          }}
                        >
                          <span className="rota-no" aria-hidden>{n + 1}</span>
                          <span className="rota-texto">
                            <Link to={`/treinos/${d.id}`} className="rota-nome">{d.nome}</Link>
                            <span className="rota-sub">{d.categoria} · {METRICA[d.metrica]}</span>
                          </span>
                          <button className="remover" aria-label={`Remover ${d.nome}`} onClick={() => remover(dia, indice)}>×</button>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="dia-vazio">Arraste um treino para cá ou toque em adicionar.</p>
                  )}
                  <select
                    className="input select"
                    aria-label={`Adicionar treino: ${DIAS[dia]}`}
                    value=""
                    onChange={(e) => e.target.value && adicionar(dia, e.target.value)}
                  >
                    <option value="">+ Adicionar treino</option>
                    {porCategoria.map(([categoria, lista]) => (
                      <optgroup key={categoria} label={categoria}>
                        {lista.map((d) => (
                          <option key={d.id} value={d.id}>{d.nome}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}

/**
 * O placar da semana: um LED por dia (aceso = tem treino), os totais e o equilíbrio por categoria, para ver de relance
 * o que a semana tem demais e o que falta (categoria apagada = nenhum treino dela).
 */
function Placar({ jogadas, hoje }: { jogadas: Record<DiaSemana, { d: Drill }[]>; hoje: number }) {
  const todos = ORDEM.flatMap((dia) => jogadas[dia].map((l) => l.d))
  const mix = new Map(mixDe(todos))
  const diasDeTreino = ORDEM.filter((dia) => jogadas[dia].length).length
  const foco = [...mix].sort((a, b) => b[1] - a[1])[0]?.[0]
  return (
    <section className="placar-semana" aria-label="Resumo da semana">
      <div className="placar-topo">
        <div className="placar-leds" aria-hidden>
          {ORDEM.map((dia) => (
            <span key={dia} className={`led ${jogadas[dia].length ? 'aceso' : ''} ${dia === hoje ? 'hoje' : ''}`}>{SIGLA[dia]}</span>
          ))}
        </div>
        <div className="placar-numeros">
          <span className="placar-item"><b>{todos.length}</b> {todos.length === 1 ? 'treino' : 'treinos'}</span>
          <span className="placar-item"><b>{diasDeTreino}</b> {diasDeTreino === 1 ? 'dia' : 'dias'} de treino</span>
          <span className="placar-item">{foco ? <>foco em <b>{foco}</b></> : 'semana em branco'}</span>
        </div>
      </div>
      <ul className="placar-equilibrio" aria-label="Treinos por categoria">
        {CATEGORIAS.map((c) => (
          <li key={c} className={`tag-${c} ${mix.has(c) ? '' : 'apagada'}`}>
            {c} <b>{mix.get(c) ?? 0}</b>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Rotinas semanais prontas; aplicar substitui a semana inteira. */
function Modelos({ aplicar }: { aplicar: (modelo: RotinaSemana) => void }) {
  const { modelos, carregado, erro } = useModelosRotina()
  const [aberto, setAberto] = useState(false)
  const [aplicado, setAplicado] = useState<string | null>(null)

  if (erro || (carregado && modelos.length === 0)) return null

  return (
    <section className="modelos">
      <button className="link botao-link" onClick={() => setAberto((a) => !a)} aria-expanded={aberto}>
        {aberto ? '▾' : '▸'} Usar um modelo pronto
      </button>
      {aberto && (
        <div className="grade">
          {modelos.map((m) => {
            const dias = Object.values(m.dias).filter((d) => d.length > 0).length
            return (
              <div key={m.id} className="card modelo">
                <strong>{m.nome}</strong>
                <p className="muted">{m.descricao}</p>
                <span className="meta">{dias} dias de treino por semana</span>
                <button
                  className="btn"
                  onClick={() => {
                    if (!window.confirm(`Aplicar "${m.nome}"? Isso substitui toda a sua rotina semanal.`)) return
                    aplicar(m.dias)
                    setAplicado(m.nome)
                    setAberto(false)
                  }}
                >
                  Aplicar
                </button>
              </div>
            )
          })}
        </div>
      )}
      {aplicado && <p className="sucesso" role="status">Rotina “{aplicado}” aplicada.</p>}
    </section>
  )
}

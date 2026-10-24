import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AvisoDesatualizado, Carregando, ErroCarga } from '../components/Estado'
import { DIAS, useDrills, useModelosRotina, useRotina } from '../store'
import type { DiaSemana, Drill, Rotina as RotinaSemana } from '../types'

const ORDEM: DiaSemana[] = [1, 2, 3, 4, 5, 6, 0]

export default function Rotina() {
  const { rotina, carregado, erro, recarregar, alterarDia, aplicarModelo, erroSalvar } = useRotina()
  const drills = useDrills()
  const hoje = new Date().getDay()

  const adicionar = (dia: DiaSemana, drillId: string) => alterarDia(dia, (ids) => [...ids, drillId])
  const remover = (dia: DiaSemana, indice: number) => alterarDia(dia, (ids) => ids.filter((_, i) => i !== indice))

  // A API devolve os exercícios ordenados por categoria; agrupar deixa a lista do select legível.
  const porCategoria = useMemo(() => {
    const grupos = new Map<string, Drill[]>()
    for (const d of drills.drills) grupos.set(d.categoria, [...(grupos.get(d.categoria) ?? []), d])
    return [...grupos]
  }, [drills.drills])

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
          <Carregando texto="Carregando rotina…" />
        )
      ) : (
        <div className="semana">
          {ORDEM.map((dia) => {
            const itens = rotina[dia]
            return (
              <div key={dia} className={`card dia ${dia === hoje ? 'hoje' : ''}`}>
                <div className="dia-topo">
                  <h3>{DIAS[dia]}</h3>
                  <span className="meta">
                    {itens.length ? `${itens.length} ${itens.length === 1 ? 'treino' : 'treinos'}` : 'Descanso'}
                  </span>
                </div>
                <ul className="dia-lista">
                  {itens.map((id, i) => {
                    const d = drills.drillPorId(id)
                    if (!d) return null
                    return (
                      <li key={`${id}-${i}`}>
                        <Link to={`/treinos/${d.id}`} className="link">{d.nome}</Link>
                        <button className="remover" aria-label={`Remover ${d.nome}`} onClick={() => remover(dia, i)}>×</button>
                      </li>
                    )
                  })}
                </ul>
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
      )}
    </>
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

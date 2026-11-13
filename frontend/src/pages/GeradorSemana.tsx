import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api } from '../api'
import { CATEGORIAS } from '../components/FormExercicio'
import { NIVEIS, ROTULO_NIVEL } from '../lib/niveis'
import { DIAS } from '../store'
import type { BlocoPlano, Categoria, DiaSemana, Nivel, Rotina } from '../types'

/** Segunda a domingo. */
export const ORDEM_SEMANA: DiaSemana[] = [1, 2, 3, 4, 5, 6, 0]
const SIGLA = DIAS.map((d) => d.slice(0, 3).toUpperCase())
const ATALHOS_MINUTOS = [30, 45, 60, 90]
const DIAS_PADRAO: DiaSemana[] = [1, 3, 5]
const ATRASO_PREVIA_MS = 500

/** A semana gerada, ainda não salva: os blocos de cada dia de treino (o dia que não está aqui é descanso). */
export type PreviaSemana = Partial<Record<DiaSemana, BlocoPlano[]>>

export interface OpcoesSemana {
  dias: DiaSemana[]
  minutos: number
  nivel: Nivel
  foco: Categoria[]
  aquecimento: boolean
}

type Gerar = typeof api.gerarTreino

/**
 * Monta um treino para cada dia escolhido, um depois do outro, passando os exercícios já usados para a semana não
 * repetir (só repete se a categoria não tiver outro). Cada dia usa uma semente própria, derivada da semente da semana.
 */
export async function gerarPrevia(opcoes: OpcoesSemana, semente: number, gerar: Gerar = (...a) => api.gerarTreino(...a)): Promise<PreviaSemana> {
  const previa: PreviaSemana = {}
  const usados: string[] = []
  const dias = ORDEM_SEMANA.filter((d) => opcoes.dias.includes(d))
  for (const [k, dia] of dias.entries()) {
    const blocos = await gerar(opcoes.minutos, opcoes.foco, opcoes.aquecimento, (semente + k * 7919) % 2 ** 31, opcoes.nivel, usados)
    previa[dia] = blocos
    usados.push(...blocos.map((b) => b.drillId))
  }
  return previa
}

/** A prévia como rotina de verdade (só os ids dos exercícios; o dia sem treino fica vazio). */
export function previaComoRotina(previa: PreviaSemana): Rotina {
  return Object.fromEntries(([0, 1, 2, 3, 4, 5, 6] as DiaSemana[]).map((d) => [d, (previa[d] ?? []).map((b) => b.drillId)])) as Rotina
}

interface Props {
  /** A rotina salva: os dias que já têm treino começam acesos. */
  rotina: Rotina
  previa: PreviaSemana | null
  aoGerar: (previa: PreviaSemana) => void
  aoDescartar: () => void
  aoAplicar: () => void
}

/**
 * O único lugar do app que gera treino: escolhe os dias, o tempo, o nível e o foco, e a semana inteira é montada de uma vez.
 * O resultado aparece como prévia nos cartões da rotina e só vira a rotina de verdade em "Aplicar à rotina".
 */
export default function GeradorSemana({ rotina, previa, aoGerar, aoDescartar, aoAplicar }: Props) {
  const hoje = new Date().getDay()
  const [dias, setDias] = useState<DiaSemana[]>(() => {
    const comTreino = ORDEM_SEMANA.filter((d) => rotina[d].length > 0)
    return comTreino.length ? comTreino : DIAS_PADRAO
  })
  const [minutos, setMinutos] = useState(45)
  const [nivel, setNivel] = useState<Nivel>('iniciante')
  const [foco, setFoco] = useState<Categoria[]>([])
  const [aquecimento, setAquecimento] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  // Só a resposta do pedido mais recente vale: mudar uma escolha no meio de uma geração descarta a anterior.
  const pedido = useRef(0)
  // A semente da última semana gerada: mudar uma escolha remonta a semana com ela, para só o que mudou mudar.
  const semeadura = useRef(0)

  const alternarDia = (d: DiaSemana) => setDias((atual) => (atual.includes(d) ? atual.filter((x) => x !== d) : [...atual, d]))
  const alternarFoco = (c: Categoria) => setFoco((atual) => (atual.includes(c) ? atual.filter((x) => x !== c) : [...atual, c]))

  async function gerar(novaSemente = true) {
    const meu = ++pedido.current
    setErro(null)
    if (!dias.length) {
      aoGerar({})
      return
    }
    setGerando(true)
    try {
      const semente = novaSemente ? Math.floor(Math.random() * 2 ** 31) : semeadura.current
      semeadura.current = semente
      const resultado = await gerarPrevia({ dias, minutos, nivel, foco, aquecimento }, semente)
      if (meu === pedido.current) aoGerar(resultado)
    } catch (e) {
      if (meu === pedido.current) setErro((e as Error).message)
    } finally {
      if (meu === pedido.current) setGerando(false)
    }
  }

  // Prévia ao vivo, como no gerador antigo: depois da primeira semana gerada, mudar uma escolha já remonta a semana
  // (com uma pausa curta para não pedir sete treinos a cada passo do controle de tempo).
  const jaGerou = previa !== null
  useEffect(() => {
    if (!jaGerou) return
    const t = window.setTimeout(() => void gerar(false), ATRASO_PREVIA_MS)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dias, minutos, nivel, foco, aquecimento])

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    void gerar(true)
  }

  const resumo = [
    `${minutos} min`,
    ROTULO_NIVEL[nivel],
    foco.length ? foco.join(', ') : 'Semana equilibrada',
    aquecimento ? 'com aquecimento' : 'sem aquecimento',
  ].join(' · ')
  const nDias = dias.length

  return (
    <form className="gs" onSubmit={enviar} aria-label="Gerar rotina semanal">
      <div className="gs-corpo">
        <div className="gs-coluna">
          <fieldset className="gs-bloco">
            <legend>
              <span className="gs-rotulo">Dias de treino</span>
              <span className="gs-dica" aria-live="polite">
                {nDias ? `${nDias} ${nDias === 1 ? 'dia' : 'dias'} · ${7 - nDias} de descanso` : 'Escolha ao menos um dia'}
              </span>
            </legend>
            <div className="gs-leds">
              {ORDEM_SEMANA.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`led ${d === hoje ? 'hoje' : ''}`}
                  aria-pressed={dias.includes(d)}
                  aria-label={DIAS[d] + (d === hoje ? ' (hoje)' : '')}
                  onClick={() => alternarDia(d)}
                >
                  {SIGLA[d]}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="gs-bloco">
            <div className="gs-titulo">
              <label className="gs-rotulo" htmlFor="gs-minutos">Tempo por treino</label>
              <span className="gs-dica">Do aquecimento ao último exercício</span>
            </div>
            <div className="gs-tempo">
              <span className="gs-minutos" aria-hidden>{minutos}<small>min</small></span>
              <input id="gs-minutos" type="range" min={15} max={90} step={5} value={minutos} onChange={(e) => setMinutos(Number(e.target.value))} />
              <div className="gs-atalhos">
                {ATALHOS_MINUTOS.map((m) => (
                  <button key={m} type="button" className="gs-chip" aria-pressed={minutos === m} onClick={() => setMinutos(m)}>
                    {m} min
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="gs-coluna">
          <fieldset className="gs-bloco">
            <legend><span className="gs-rotulo">Nível</span></legend>
            <div className="gs-niveis">
              {NIVEIS.map((n) => (
                <button key={n.id} type="button" className="gs-nivel" aria-pressed={nivel === n.id} onClick={() => setNivel(n.id)}>
                  <strong>{n.rotulo}</strong>
                  <span>{n.foco}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="gs-bloco">
            <legend>
              <span className="gs-rotulo">Foco</span>
              <span className="gs-dica">Vazio = semana equilibrada</span>
            </legend>
            <div className="gs-focos">
              {CATEGORIAS.map((c) => (
                <button key={c} type="button" className={`gs-foco tag-${c}`} aria-pressed={foco.includes(c)} onClick={() => alternarFoco(c)}>
                  {c}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="gs-aquecimento">
            <input type="checkbox" checked={aquecimento} onChange={(e) => setAquecimento(e.target.checked)} />
            Começar cada treino com o aquecimento do nível
          </label>
        </div>
      </div>

      <div className="gs-rodape">
        <p className="gs-resumo">
          <strong>{nDias} {nDias === 1 ? 'treino' : 'treinos'}</strong> de {resumo}
        </p>
        <div className="gs-acoes">
          {previa ? (
            <>
              <button type="submit" className="gs-botao" disabled={gerando || !nDias}>{gerando ? 'Montando' : 'Gerar outra'}</button>
              <button type="button" className="gs-botao" onClick={aoDescartar}>Descartar</button>
              <button type="button" className="gs-botao gs-primario" disabled={gerando || !nDias} onClick={aoAplicar}>Aplicar à rotina</button>
            </>
          ) : (
            <button type="submit" className="gs-botao gs-primario" disabled={gerando || !nDias}>{gerando ? 'Montando' : 'Gerar semana'}</button>
          )}
        </div>
      </div>
      {previa && !erro && <p className="gs-aviso">Prévia da semana nos cartões abaixo. Ela só vira a sua rotina quando você aplicar.</p>}
      {erro && <p className="gs-aviso gs-erro" role="alert">{erro}</p>}
    </form>
  )
}

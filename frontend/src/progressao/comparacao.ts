import { dataLocal } from '../api'
import type { Sessao } from '../types'

/** Duas janelas consecutivas de dias locais; hoje está incluído na atual. */
export function comparar(sessoes: Sessao[], dias: number, exercicio = '', agora = new Date()) {
  const fim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1)
  const inicio = new Date(fim); inicio.setDate(inicio.getDate() - dias)
  const anterior = new Date(inicio); anterior.setDate(anterior.getDate() - dias)
  const resumir = (de: Date, ate: Date) => {
    let frequencia = 0, minutos = 0, acertos = 0, tentativas = 0, repeticoes = 0, segundos = 0
    const diasAtivos = new Set<string>()
    for (const s of sessoes) {
      const t = new Date(s.data)
      if (t < de || t >= ate) continue
      const entradas = s.entradas.filter((e) => !exercicio || e.drillId === exercicio)
      if (exercicio && !entradas.length) continue
      frequencia++
      diasAtivos.add(dataLocal(t))
      // A duração disponível é da sessão inteira; não inventamos tempo por exercício.
      if (!exercicio) minutos += s.duracaoMin
      if (!exercicio && s.tentativas != null) {
        acertos += s.acertos ?? 0; tentativas += s.tentativas
      } else for (const e of entradas) { acertos += e.acertos ?? 0; tentativas += e.tentativas ?? 0 }
      for (const e of entradas) { repeticoes += e.repeticoes ?? 0; segundos += e.segundos ?? 0 }
    }
    return { frequencia, diasAtivos: diasAtivos.size, minutos, acertos, tentativas, repeticoes, segundos,
      aproveitamento: tentativas ? Math.round(acertos / tentativas * 1000) / 10 : null }
  }
  return { atual: resumir(inicio, fim), anterior: resumir(anterior, inicio) }
}

import { useCallback } from 'react'
import { fuso, request } from '../api'
import { sessaoRegistrada, useRecurso } from '../store'

export interface Desafio {
  id: string
  titulo: string
  descricao: string
  exercicio: string
  modo: 'tentativas' | 'tempo'
  tentativas?: number
  segundos?: number
  meta: number
  maxTentativas: number
}

export interface ResultadoDesafio {
  dia: string // AAAA-MM-DD
  desafioId: string
  titulo: string
  acertos: number
  tentativas: number
  meta: number | null
  cumprido: boolean
}

export interface DesafioDoDia {
  dia: string
  desafio: Desafio
  resultado: ResultadoDesafio | null
}

interface ChallengeApi {
  id: string
  title: string
  description: string
  exercise: string
  mode: 'tentativas' | 'tempo'
  attempts?: number
  seconds?: number
  goal: number
  maxAttempts: number
}

interface ResultApi {
  day: string
  challengeId: string
  title: string
  makes: number
  attempts: number
  goal: number | null
  completed: boolean
}

const paraResultado = (r: ResultApi): ResultadoDesafio => ({
  dia: r.day,
  desafioId: r.challengeId,
  titulo: r.title,
  acertos: r.makes,
  tentativas: r.attempts,
  meta: r.goal,
  cumprido: r.completed,
})

export const apiDesafio = {
  async hoje(): Promise<DesafioDoDia> {
    const r = await request<{ day: string; challenge: ChallengeApi; result: ResultApi | null }>('GET', `/challenges/today?${fuso()}`)
    const c = r.challenge
    return {
      dia: r.day,
      desafio: {
        id: c.id,
        titulo: c.title,
        descricao: c.description,
        exercicio: c.exercise,
        modo: c.mode,
        tentativas: c.attempts,
        segundos: c.seconds,
        meta: c.goal,
        maxTentativas: c.maxAttempts,
      },
      resultado: r.result ? paraResultado(r.result) : null,
    }
  },

  async enviar(r: { acertos: number; tentativas: number; sequencia?: number; segundos?: number }) {
    const corpo = { makes: r.acertos, attempts: r.tentativas, bestStreak: r.sequencia || null, seconds: r.segundos ?? null }
    return paraResultado(await request<ResultApi>('POST', `/challenges/today?${fuso()}`, corpo))
  },

  async historico() {
    return (await request<ResultApi[]>('GET', '/challenges/history')).map(paraResultado)
  },
}

export function useDesafioDoDia() {
  const { dados, setDados, ...resto } = useRecurso('desafio:hoje', apiDesafio.hoje)

  const enviar = useCallback(
    async (r: Parameters<typeof apiDesafio.enviar>[0]) => {
      const resultado = await apiDesafio.enviar(r)
      setDados((atual) => (atual ? { ...atual, resultado } : atual!))
      sessaoRegistrada()
      return resultado
    },
    [setDados],
  )

  return { hoje: dados, enviar, ...resto }
}

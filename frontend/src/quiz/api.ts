import { useCallback } from 'react'
import { fuso, request } from '../api'
import { useRecurso } from '../store'

export type CategoriaQuiz = 'regras' | 'historia' | 'nba' | 'treino'

export const ROTULO_CATEGORIA: Record<CategoriaQuiz, string> = {
  regras: 'Regras',
  historia: 'História',
  nba: 'NBA',
  treino: 'Treino e ciência',
}

export interface PerguntaQuiz {
  id: string
  categoria: CategoriaQuiz
  pergunta: string
  alternativas: string[]
  /** Só depois de responder: */
  escolhida?: number
  certa?: number
  acertou?: boolean
  explicacao?: string
  artigo?: string
}

export interface QuizDoDia {
  dia: string
  perguntas: PerguntaQuiz[]
  resultado: { acertos: number; total: number } | null
}

interface QuizApi {
  day: string
  questions: {
    id: string
    category: CategoriaQuiz
    question: string
    options: string[]
    chosen?: number
    answer?: number
    correct?: boolean
    explanation?: string
    article?: string
  }[]
  result: { correct: number; total: number } | null
}

const paraQuiz = (r: QuizApi): QuizDoDia => ({
  dia: r.day,
  perguntas: r.questions.map((q) => ({
    id: q.id,
    categoria: q.category,
    pergunta: q.question,
    alternativas: q.options,
    escolhida: q.chosen,
    certa: q.answer,
    acertou: q.correct,
    explicacao: q.explanation,
    artigo: q.article,
  })),
  resultado: r.result ? { acertos: r.result.correct, total: r.result.total } : null,
})

export const apiQuiz = {
  hoje: async () => paraQuiz(await request<QuizApi>('GET', `/quiz/today?${fuso()}`)),
  responder: async (respostas: number[]) => paraQuiz(await request<QuizApi>('POST', `/quiz/today?${fuso()}`, { answers: respostas })),
}

export function useQuizDoDia() {
  const { dados, setDados, ...resto } = useRecurso('quiz:hoje', apiQuiz.hoje)
  const responder = useCallback(
    async (respostas: number[]) => {
      const corrigido = await apiQuiz.responder(respostas)
      setDados(() => corrigido)
      return corrigido
    },
    [setDados],
  )
  return { quiz: dados, responder, ...resto }
}

/** Texto para compartilhar, em quadradinhos: laranja para acerto, preto para erro. */
export function textoCompartilhar(quiz: QuizDoDia, endereco: string) {
  const [ano, mes, dia] = quiz.dia.split('-')
  const quadros = quiz.perguntas.map((p) => (p.acertou ? '🟧' : '⬛')).join('')
  return `Entenda o jogo · ${dia}/${mes}/${ano}\n${quadros} ${quiz.resultado?.acertos ?? 0}/${quiz.resultado?.total ?? quiz.perguntas.length}\n${endereco}`
}

import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { definirToken } from '../api'
import { textoCompartilhar } from '../quiz/api'
import { apiFalsa, configFalsa, Resposta, usuarioFalso } from '../test/api-falsa'
import { abrirApp } from '../test/renderizar'

const perguntas = Array.from({ length: 5 }, (_, i) => ({
  id: `p${i}`,
  category: i % 2 ? 'historia' : 'regras',
  question: `Pergunta número ${i + 1}?`,
  options: [`A${i}`, `B${i}`, `C${i}`, `D${i}`],
}))

/** O servidor corrige: a certa é sempre a alternativa B. */
const corrigido = (answers: number[]) => ({
  day: '2026-11-10',
  questions: perguntas.map((q, i) => ({
    ...q,
    chosen: answers[i],
    answer: 1,
    correct: answers[i] === 1,
    explanation: `Explicação ${i + 1}.`,
    article: i === 0 ? 'cesto-de-pessego' : 'regras-que-mudaram',
  })),
  result: { correct: answers.filter((a) => a === 1).length, total: 5 },
})

function abrirQuiz(rotas: Parameters<typeof apiFalsa>[0] = {}) {
  definirToken('tk')
  const api = apiFalsa({
    'GET /auth/me': usuarioFalso(),
    'GET /settings': configFalsa,
    'GET /quiz/today': { day: '2026-11-10', questions: perguntas, result: null },
    'POST /quiz/today': (corpo: unknown) => new Resposta(201, corrigido((corpo as { answers: number[] }).answers)),
    ...rotas,
  })
  abrirApp('/quiz')
  return api
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'clipboard')
})

describe('Quiz do dia', () => {
  it('passa pelas 5 perguntas, envia as respostas e mostra a correção do servidor', async () => {
    const user = userEvent.setup()
    const { ultima } = abrirQuiz()

    expect(await screen.findByText('Pergunta número 1?')).toBeInTheDocument()
    expect(screen.getByText('Pergunta 1 de 5 · Regras')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /B0/ }))
    expect(screen.getByText('Pergunta número 2?')).toBeInTheDocument()
    // Voltar desfaz a última resposta.
    await user.click(screen.getByRole('button', { name: 'Voltar à pergunta anterior' }))
    expect(screen.getByText('Pergunta número 1?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /B0/ }))
    await user.click(screen.getByRole('button', { name: /A1/ }))
    await user.click(screen.getByRole('button', { name: /B2/ }))
    await user.click(screen.getByRole('button', { name: /B3/ }))
    await user.click(screen.getByRole('button', { name: /D4/ }))

    await user.click(screen.getByRole('button', { name: /Ver resultado/ }))
    expect(await screen.findByRole('heading', { name: '3 de 5 certas' })).toBeInTheDocument()
    expect(ultima('POST', '/quiz/today')?.corpo).toEqual({ answers: [1, 0, 1, 1, 3] })

    const respostas = screen.getAllByRole('listitem').filter((li) => li.closest('.quiz-revisao'))
    expect(respostas).toHaveLength(5)
    expect(within(respostas[1]).getByText(/você marcou A1/)).toBeInTheDocument()
    expect(within(respostas[0]).getByRole('link', { name: 'Ler: De um cesto de pêssego à NBA' })).toHaveAttribute('href', '/artigos/cesto-de-pessego')
    expect(screen.getByRole('list', { name: '3 de 5 certas' })).toBeInTheDocument()
  })

  it('quem já respondeu vê a revisão e compartilha o placar em quadradinhos', async () => {
    const user = userEvent.setup()
    const copiar = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: copiar }, configurable: true })
    abrirQuiz({ 'GET /quiz/today': corrigido([1, 1, 0, 1, 2]) })

    expect(await screen.findByRole('heading', { name: '3 de 5 certas' })).toBeInTheDocument()
    expect(screen.queryByText('Pergunta 1 de 5 · Regras')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Compartilhar resultado' }))
    expect(copiar).toHaveBeenCalledWith(expect.stringContaining('🟧🟧⬛🟧⬛ 3/5'))
    expect(await screen.findByText('Resultado copiado. É só colar na conversa.')).toBeInTheDocument()
  })

  it('mostra o erro ao enviar e deixa tentar de novo', async () => {
    const user = userEvent.setup()
    abrirQuiz({ 'POST /quiz/today': new Resposta(409, { error: 'Você já respondeu o quiz de hoje. Volte amanhã!' }) })
    await screen.findByText('Pergunta número 1?')
    for (let i = 0; i < 5; i++) await user.click(screen.getByRole('button', { name: new RegExp(`C${i}`) }))
    await user.click(screen.getByRole('button', { name: /Ver resultado/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Você já respondeu o quiz de hoje')
    expect(screen.getByRole('button', { name: /Ver resultado/ })).toBeEnabled()
  })
})

describe('Texto para compartilhar', () => {
  it('não entrega as respostas: só data, quadradinhos, placar e o endereço', () => {
    const quiz = {
      dia: '2026-11-10',
      perguntas: [true, false, true].map((acertou, i) => ({ id: `${i}`, categoria: 'nba' as const, pergunta: 'Segredo?', alternativas: ['x'], acertou })),
      resultado: { acertos: 2, total: 3 },
    }
    expect(textoCompartilhar(quiz, 'https://exemplo.com/quiz')).toBe('Entenda o jogo · 10/11/2026\n🟧⬛🟧 2/3\nhttps://exemplo.com/quiz')
  })
})

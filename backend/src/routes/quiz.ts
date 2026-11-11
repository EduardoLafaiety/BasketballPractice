import { Router } from 'express'
import { z } from 'zod'
import { many, one, type Database } from '../db/index.js'
import { QUIZ_QUESTIONS, QUIZ_SIZE, type QuizQuestion } from '../db/quiz.js'
import { seededShuffle } from '../lib/daily.js'
import { HttpError } from '../lib/http-error.js'
import { parse } from '../lib/validate.js'
import { currentUser } from '../middleware/auth.js'
import { tzQuery } from './sessions.js'
import { localToday } from './stats.js'

/** As 5 perguntas do dia: as mesmas para todos na mesma data, sem repetir dentro do dia. */
export const questionsFor = (day: string) => seededShuffle(QUIZ_QUESTIONS, `quiz:${day}`).slice(0, QUIZ_SIZE)

const answersSchema = z.object({
  answers: z.array(z.number().int().min(0).max(3)).length(QUIZ_SIZE),
})

// Sem a resposta certa: o servidor só a revela depois que o atleta responde.
const publicQuestion = ({ id, category, question, options }: QuizQuestion) => ({ id, category, question, options })

const review = (questions: QuizQuestion[], answers: number[]) =>
  questions.map((q, i) => ({
    ...publicQuestion(q),
    chosen: answers[i],
    answer: q.answer,
    correct: answers[i] === q.answer,
    explanation: q.explanation,
    article: q.article,
  }))

type ResultRow = { day: string; correct: number; answers: number[] }

export function quizRouter(db: Database) {
  const router = Router()

  router.get('/today', async (req, res) => {
    const { tzOffset } = parse(tzQuery, req.query)
    const day = localToday(tzOffset)
    const questions = questionsFor(day)
    const done = await one<ResultRow>(
      db,
      `SELECT to_char(day, 'YYYY-MM-DD') AS day, correct, answers FROM quiz_results WHERE user_id = $1 AND day = $2`,
      [currentUser(req), day],
    )
    res.json({
      day,
      questions: done ? review(questions, done.answers) : questions.map(publicQuestion),
      result: done ? { correct: done.correct, total: QUIZ_SIZE } : null,
    })
  })

  router.post('/today', async (req, res) => {
    const userId = currentUser(req)
    const { tzOffset } = parse(tzQuery, req.query)
    const { answers } = parse(answersSchema, req.body)
    const day = localToday(tzOffset)
    const questions = questionsFor(day)
    const correct = questions.filter((q, i) => answers[i] === q.answer).length
    // Vale a primeira resposta do dia.
    const { rowCount } = await db.query(
      `INSERT INTO quiz_results (user_id, day, correct, answers) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
      [userId, day, correct, answers],
    )
    if (!rowCount) throw new HttpError(409, 'Você já respondeu o quiz de hoje. Volte amanhã!')
    res.status(201).json({ day, questions: review(questions, answers), result: { correct, total: QUIZ_SIZE } })
  })

  router.get('/history', async (req, res) => {
    res.json(
      await many<{ day: string; correct: number }>(
        db,
        `SELECT to_char(day, 'YYYY-MM-DD') AS day, correct FROM quiz_results WHERE user_id = $1 ORDER BY day DESC LIMIT 30`,
        [currentUser(req)],
      ),
    )
  })

  return router
}

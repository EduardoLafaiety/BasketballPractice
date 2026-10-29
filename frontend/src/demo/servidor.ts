// API da versão de demonstração: as rotas reais do backend rodando no navegador, sobre o PGlite
// (Postgres em WebAssembly) guardado no IndexedDB. Mesmo SQL, mesmas validações e mesmas contas do servidor.
import { PGlite, type Transaction } from '@electric-sql/pglite'
import { one, prepareDatabase, type Database, type Queryable } from '../../../backend/src/db/index'
import { errorHandler, notFoundHandler } from '../../../backend/src/middleware/errors'
import { dataRouter } from '../../../backend/src/routes/data'
import { exercisesRouter } from '../../../backend/src/routes/exercises'
import { goalsRouter } from '../../../backend/src/routes/goals'
import { plansRouter } from '../../../backend/src/routes/plans'
import { sessionsRouter } from '../../../backend/src/routes/sessions'
import { settingsRouter } from '../../../backend/src/routes/settings'
import { statsRouter } from '../../../backend/src/routes/stats'
import { testsRouter } from '../../../backend/src/routes/tests'
import { workoutsRouter } from '../../../backend/src/routes/workouts'
import { popularDemonstracao } from './dados'
import { RespostaDemo, type PedidoDemo, type RouterDemo } from './express'

/** O atleta da demonstração: único, sem senha, nunca admin. */
export const ID_VISITANTE = 1

export interface RespostaApi {
  status: number
  body: unknown
}

export type Executar = (metodo: string, caminho: string, corpo?: unknown) => Promise<RespostaApi>

// Mesma ponte do PGlite usada nos testes do backend (backend/test/pglite.ts).
function envolver(cliente: PGlite | Transaction): Queryable {
  return {
    async query<T>(sql: string, params?: unknown[]) {
      if (params?.length) {
        const r = await cliente.query<T>(sql, params)
        return { rows: r.rows, rowCount: r.affectedRows ?? r.rows.length }
      }
      const resultados = await cliente.exec(sql)
      const ultimo = resultados.at(-1)
      return { rows: (ultimo?.rows ?? []) as T[], rowCount: ultimo?.affectedRows ?? ultimo?.rows.length ?? 0 }
    },
  }
}

/** Apaga tudo do visitante (na ordem do painel admin, por causa das FKs com RESTRICT) e cria de novo. */
async function recriarVisitante(db: Database, executar: Executar, hoje: Date) {
  await db.transaction(async (tx) => {
    await tx.query('DELETE FROM practice_sessions WHERE user_id = $1', [ID_VISITANTE])
    await tx.query('DELETE FROM workouts WHERE user_id = $1', [ID_VISITANTE])
    await tx.query('DELETE FROM users WHERE id = $1', [ID_VISITANTE])
    await tx.query(
      `INSERT INTO users (id, name, email, password_hash) VALUES ($1, 'Visitante', 'visitante@demo.local', '-')`,
      [ID_VISITANTE],
    )
    await tx.query('DROP TABLE IF EXISTS demo_pronta')
  })
  await popularDemonstracao(executar, hoje)
  // Só marca como pronta no fim: se a aba fechar no meio, a próxima visita recomeça do zero.
  await db.query('CREATE TABLE demo_pronta (em timestamptz NOT NULL DEFAULT now())')
}

export interface ServidorDemo {
  executar: Executar
  recomecar: () => Promise<void>
  fechar: () => Promise<void>
}

/** `dados`: "idb://nome" guarda no navegador; vazio, só em memória (testes). `hoje` fixa a data nos testes. */
export async function criarServidor({ dados, hoje = () => new Date() }: { dados?: string; hoje?: () => Date } = {}) {
  const pg = await PGlite.create(dados)
  await pg.exec(`SET TIME ZONE 'UTC'`)
  const db = await prepareDatabase({
    ...envolver(pg),
    transaction: (fn) => pg.transaction((tx) => fn(envolver(tx))),
    close: () => pg.close(),
  })

  // Os routers são do backend; aqui o Express é o RouterDemo (alias no vite.config.ts).
  const montar = (router: unknown) => router as RouterDemo
  const rotas: [string, RouterDemo][] = [
    ['/exercises', montar(exercisesRouter(db))],
    ['/workouts', montar(workoutsRouter(db))],
    ['/sessions', montar(sessionsRouter(db))],
    ['/stats', montar(statsRouter(db))],
    ['/goals', montar(goalsRouter(db))],
    ['/tests', montar(testsRouter(db))],
    ['/plans', montar(plansRouter(db))],
    ['/settings', montar(settingsRouter(db))],
    ['/data', montar(dataRouter(db))],
  ]

  const visitante = () =>
    one(db, 'SELECT id, name, email, is_admin AS "isAdmin" FROM users WHERE id = $1', [ID_VISITANTE])

  const executar: Executar = async (metodo, caminho, corpo) => {
    const url = new URL(caminho, 'http://demo')
    const query: Record<string, string | string[]> = {}
    for (const [chave, valor] of url.searchParams) {
      const atual = query[chave]
      query[chave] = atual === undefined ? valor : [...[atual].flat(), valor]
    }
    // Ida e volta em JSON, como num pedido de verdade.
    const body = corpo === undefined ? undefined : JSON.parse(JSON.stringify(corpo))
    const req: PedidoDemo = { method: metodo, path: url.pathname, params: {}, query, body, headers: {}, userId: ID_VISITANTE }
    const res = new RespostaDemo()
    const caminhoApi = url.pathname

    try {
      if (caminhoApi === '/auth/me') {
        res.json(await visitante())
      } else if (caminhoApi.startsWith('/auth/')) {
        // Sem contas na demonstração: entrar ou cadastrar sempre leva ao visitante.
        res.json({ token: 'demo', user: await visitante() })
      } else if (caminhoApi === '/admin' || caminhoApi.startsWith('/admin/')) {
        res.status(403).json({ error: 'Acesso restrito a administradores' })
      } else {
        const montado = rotas.find(([prefixo]) => caminhoApi === prefixo || caminhoApi.startsWith(`${prefixo}/`))
        req.path = montado ? caminhoApi.slice(montado[0].length) || '/' : caminhoApi
        if (!montado || !(await montado[1].tratar(req, res))) notFoundHandler(req as never, res as never)
      }
    } catch (erro) {
      errorHandler(erro, req as never, res as never, () => {})
    }

    return {
      status: res.statusCode,
      body: res.body === undefined ? null : JSON.parse(JSON.stringify(res.body)),
    }
  }

  const pronta = await one(db, `SELECT to_regclass('demo_pronta') IS NOT NULL AS existe`)
  if (!(pronta as { existe: boolean }).existe) await recriarVisitante(db, executar, hoje())

  return {
    executar,
    recomecar: () => recriarVisitante(db, executar, hoje()),
    fechar: () => pg.close(),
  } satisfies ServidorDemo
}

let servidor: Promise<ServidorDemo> | null = null

/** O servidor do navegador, criado (e populado na primeira visita) no primeiro pedido. */
export function servidorDoNavegador() {
  servidor ??= criarServidor({ dados: 'idb://basketball-practice-demo' })
  return servidor
}

/** Usado pelo api.ts no lugar do fetch: devolve um Response como o da API real. */
export async function responder(metodo: string, caminho: string, corpo?: unknown) {
  const { status, body } = await (await servidorDoNavegador()).executar(metodo, caminho, corpo)
  const semCorpo = status === 204 || body === null
  return new Response(semCorpo ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Apaga o que o visitante fez e volta aos dados de exemplo. */
export async function recomecarDemonstracao() {
  await (await servidorDoNavegador()).recomecar()
}

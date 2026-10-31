import { catalog } from './catalog.js'
import type { Database } from './index.js'

export { catalog }

// Insere no catálogo padrão (exercícios sem dono) o que ainda não estiver lá, pelo nome: um banco novo
// recebe tudo e um banco antigo só os exercícios adicionados depois. O catálogo não pode ser apagado nem
// renomeado pela API, então nada volta sem querer. Um exercício do atleta com o mesmo nome não conta.
// Nível, aquecimento e posição acompanham sempre o catálogo. Tudo em poucas consultas: a demonstração roda isto
// no navegador a cada abertura.
export async function seed(db: Database) {
  const column = (i: number) => catalog.map((item) => item[i])
  const params = [column(0), column(1), column(2), column(3), column(4), column(5), catalog.map((_, i) => i + 1)]
  const rows = `unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::boolean[], $7::int[])
                AS c(name, category, metric, description, level, warmup, position)`
  await db.transaction(async (tx) => {
    // Pode esperar a migração de outra instância, sem o limite de tempo das consultas normais.
    await tx.query('SET LOCAL statement_timeout = 0')
    await tx.query('SELECT pg_advisory_xact_lock(4242)')
    await tx.query(
      `INSERT INTO exercises (name, category, metric, description, level, warmup, position)
       SELECT c.name, c.category, c.metric, c.description, c.level, c.warmup, c.position FROM ${rows}
       WHERE NOT EXISTS (SELECT 1 FROM exercises e WHERE e.user_id IS NULL AND e.name = c.name)
       ORDER BY c.position`,
      params,
    )
    await tx.query(
      `UPDATE exercises e SET level = c.level, warmup = c.warmup, position = c.position FROM ${rows}
       WHERE e.user_id IS NULL AND e.name = c.name
         AND (e.level IS DISTINCT FROM c.level OR e.warmup <> c.warmup OR e.position IS DISTINCT FROM c.position)`,
      params,
    )
  })
}

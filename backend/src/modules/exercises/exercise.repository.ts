import { many, type Queryable } from '../../db/index.js'
import { HttpError } from '../../lib/http-error.js'
// Garante que todos os exercícios existem e são visíveis ao usuário, em uma única consulta.
export async function assertExercisesVisible(db: Queryable, ids: number[], userId: number) {
  const unique = [...new Set(ids)]
  if (!unique.length) return

  const found = await many<{ id: number }>(
    db,
    'SELECT id FROM exercises WHERE id = ANY($1::int[]) AND (user_id IS NULL OR user_id = $2)',
    [unique, userId],
  )
  const visible = new Set(found.map((row) => row.id))
  const missing = unique.find((id) => !visible.has(id))
  if (missing !== undefined) throw new HttpError(400, `Exercício ${missing} não existe`)
}

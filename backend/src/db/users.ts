import type { Queryable } from './index.js'

/** Apaga a conta e tudo dela. Use dentro de uma transação. Devolve quantas contas saíram (0 ou 1). */
export async function deleteUser(tx: Queryable, id: number) {
  // Sessões e treinos saem antes da conta: a cascata apagaria primeiro os exercícios próprios do atleta, e o
  // ON DELETE RESTRICT dos itens que ainda os usam barraria a exclusão inteira.
  await tx.query('DELETE FROM practice_sessions WHERE user_id = $1', [id])
  await tx.query('DELETE FROM workouts WHERE user_id = $1', [id])
  return (await tx.query('DELETE FROM users WHERE id = $1', [id])).rowCount
}

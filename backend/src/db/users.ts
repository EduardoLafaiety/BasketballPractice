import type { Queryable } from './index.js'
import { HttpError } from '../lib/http-error.js'

/** Apaga a conta e tudo dela. Use dentro de uma transação. Devolve quantas contas saíram (0 ou 1). */
export async function deleteUser(tx: Queryable, id: number) {
  const active = await tx.query("SELECT id FROM billing_subscriptions WHERE user_id = $1 AND status NOT IN ('cancelled','failed','completed')", [id])
  if (active.rows.length) throw new HttpError(409, 'Cancele sua assinatura e confirme o cancelamento antes de excluir a conta.')
  // Sessões e treinos saem antes da conta: a cascata apagaria primeiro os exercícios próprios do atleta, e o
  // ON DELETE RESTRICT dos itens que ainda os usam barraria a exclusão inteira.
  await tx.query('DELETE FROM practice_sessions WHERE user_id = $1', [id])
  await tx.query('DELETE FROM workouts WHERE user_id = $1', [id])
  return (await tx.query('DELETE FROM users WHERE id = $1', [id])).rowCount
}

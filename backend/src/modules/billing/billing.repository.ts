import { many, one, type Queryable } from '../../db/index.js'

export type Subscription = { id: string; user_id: number | null; plan: 'mensal' | 'anual'; mode: 'recorrente' | 'avulso'; mp_id: string | null; status: string; checkout_url: string | null; checkout_email: string | null; checkout_key_hash: string | null }

export const billingRepository = {
  lockEmail: (tx: Queryable, email: string) => tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`billing:${email.toLowerCase()}`]),
  byKey: (tx: Queryable, hash: string) => one<Subscription>(tx, 'SELECT * FROM billing_subscriptions WHERE checkout_key_hash = $1', [hash]),
  openByEmail: (tx: Queryable, email: string) => one<Subscription>(tx, `SELECT s.* FROM billing_subscriptions s LEFT JOIN users u ON u.id = s.user_id
    WHERE lower(COALESCE(s.checkout_email, u.email)) = $1 AND (s.status NOT IN ('cancelled','failed','completed') OR EXISTS
      (SELECT 1 FROM billing_payments p WHERE p.subscription_id = s.id AND p.status = 'approved' AND p.paid_until > now())) LIMIT 1`, [email]),
  createGuest: (tx: Queryable, id: string, email: string, plan: Subscription['plan'], hash: string, mode: Subscription['mode']) => one<Subscription>(tx,
    "INSERT INTO billing_subscriptions (id,checkout_email,plan,checkout_key_hash,mode,status) VALUES ($1,$2,$3,$4,$5,'creating') RETURNING *", [id, email, plan, hash, mode]),
  retireKey: (tx: Queryable, id: string, hash: string) => tx.query('UPDATE billing_subscriptions SET checkout_key_hash = $2 WHERE id = $1', [id,hash]),
  paymentIds: (tx: Queryable, id: string) => many<{ payment_id: string }>(tx, 'SELECT payment_id FROM billing_payments WHERE subscription_id = $1', [id]),
  paidUntil: (tx: Queryable, id: string) => one<{ until: Date | null }>(tx, "SELECT MAX(paid_until) AS until FROM billing_payments WHERE subscription_id = $1 AND status = 'approved'", [id]),
  unassignedPaid: (tx: Queryable, email: string) => many<Subscription>(tx, `SELECT s.* FROM billing_subscriptions s WHERE s.user_id IS NULL AND lower(s.checkout_email) = $1
    AND EXISTS (SELECT 1 FROM billing_payments p WHERE p.subscription_id = s.id AND p.status = 'approved' AND p.paid_until > now()) ORDER BY s.created_at`, [email]),
  assign: (tx: Queryable, id: string, userId: number) => tx.query('UPDATE billing_subscriptions SET user_id = $2 WHERE id = $1 AND user_id IS NULL', [id, userId]),
  latest: (tx: Queryable, userId: number) => one<Subscription>(tx, 'SELECT * FROM billing_subscriptions WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1', [userId]),
  user: (tx: Queryable, userId: number) => one<{ id: number; email: string }>(tx, 'SELECT id,email FROM users WHERE id = $1 FOR UPDATE', [userId]),
  access: (tx: Queryable, userId: number) => one<{ admin: boolean; email: string; paid_until: Date | null }>(tx,
    `SELECT u.is_admin AS admin, u.email, (SELECT MAX(p.paid_until) FROM billing_payments p JOIN billing_subscriptions s ON s.id = p.subscription_id
      WHERE s.user_id = u.id AND p.status = 'approved') AS paid_until FROM users u WHERE u.id = $1`, [userId]),
  byProvider: (tx: Queryable, id: string) => one<Subscription>(tx, 'SELECT * FROM billing_subscriptions WHERE mp_id = $1', [id]),
  byReference: (tx: Queryable, id: string) => one<Subscription>(tx, 'SELECT * FROM billing_subscriptions WHERE id::text = $1', [id]),
  status: (tx: Queryable, id: string, status: string) => tx.query('UPDATE billing_subscriptions SET status = $2, updated_at = now() WHERE id = $1', [id, status]),
  recover: (tx: Queryable, id: string, mpId: string, status: string) => tx.query('UPDATE billing_subscriptions SET mp_id = $2, status = $3, updated_at = now() WHERE id = $1 AND mp_id IS NULL', [id, mpId, status]),
  create: (tx: Queryable, id: string, userId: number, plan: Subscription['plan'], mode: Subscription['mode'] = 'recorrente') => one<Subscription>(tx, "INSERT INTO billing_subscriptions (id,user_id,plan,mode,status) VALUES ($1,$2,$3,$4,'creating') RETURNING *", [id, userId, plan, mode]),
  claim: (tx: Queryable, id: string) => tx.query('UPDATE billing_subscriptions SET create_started = true WHERE id = $1 AND NOT create_started RETURNING id', [id]),
  email: (tx: Queryable, userId: number) => one<{ email: string }>(tx, 'SELECT email FROM users WHERE id = $1', [userId]),
  provider: (tx: Queryable, id: string, mpId: string) => tx.query('UPDATE billing_subscriptions SET mp_id = $2 WHERE id = $1', [id, mpId]),
  checkout: (tx: Queryable, id: string, url: string) => tx.query("UPDATE billing_subscriptions SET status = CASE WHEN status = 'creating' THEN 'pending' ELSE status END, checkout_url = $2, updated_at = now() WHERE id = $1 AND status <> 'cancelled' RETURNING id", [id, url]),
  cancel: (tx: Queryable, id: string) => tx.query("UPDATE billing_subscriptions SET status = 'cancelled', checkout_url = NULL, updated_at = now() WHERE id = $1", [id]),
  payment: (tx: Queryable, paymentId: string, subscriptionId: string, invoiceId: string, status: string, until: Date | null) => tx.query(
    `INSERT INTO billing_payments (payment_id, subscription_id, invoice_id, status, paid_until)
      VALUES ($1,$2,$3,$4,$5) ON CONFLICT (payment_id) DO UPDATE SET status = EXCLUDED.status, paid_until = EXCLUDED.paid_until, updated_at = now()
      WHERE billing_payments.subscription_id = EXCLUDED.subscription_id`, [paymentId, subscriptionId, invoiceId, status, until]),
}

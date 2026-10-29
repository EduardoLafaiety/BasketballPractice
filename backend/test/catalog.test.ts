import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { prepareDatabase } from '../src/db/index.js'
import { startApi } from './http.js'

// Banco próprio: os testes apagam exercícios do catálogo para simular um banco de antes deles existirem.
const { api, db, register } = await startApi()

const catalogNames = async () =>
  (await db.query<{ name: string }>('SELECT name FROM exercises WHERE user_id IS NULL ORDER BY id')).rows.map((r) => r.name)

describe('Catálogo padrão', () => {
  it('um banco novo recebe todos os exercícios, sem nomes repetidos', async () => {
    const names = await catalogNames()
    assert.equal(names.length, 23)
    assert.equal(new Set(names).size, names.length)
    assert.ok(names.includes('Lance livre'))
    assert.ok(names.includes('Step-back de três'))
  })

  it('um banco antigo recebe só os exercícios que faltam', async () => {
    const before = await catalogNames()
    await db.query(`DELETE FROM exercises WHERE user_id IS NULL AND name IN ('Step-back de três', 'Corre e arremessa')`)
    await prepareDatabase(db)
    const after = await catalogNames()
    assert.deepEqual([...after].sort(), [...before].sort())
    // Os que já existiam continuam com o mesmo id; os que faltavam entram no fim.
    assert.deepEqual(after.slice(-2), ['Step-back de três', 'Corre e arremessa'])
  })

  it('um exercício do atleta com o mesmo nome não impede o do catálogo nem o substitui nas rotinas prontas', async () => {
    const { token } = await register()
    await db.query(`DELETE FROM exercises WHERE user_id IS NULL AND name = 'Passe na parede'`)
    const own = await api('POST', '/exercises', { name: 'Passe na parede', category: 'passe', metric: 'tempo' }, token)
    assert.equal(own.status, 201)

    await prepareDatabase(db)
    const catalog = await db.query<{ id: number }>(`SELECT id FROM exercises WHERE user_id IS NULL AND name = 'Passe na parede'`)
    assert.equal(catalog.rows.length, 1)
    assert.ok(catalog.rows[0].id > own.body.id)

    const templates = (await api('GET', '/plans/templates', undefined, token)).body
    const ids = templates.flatMap((t: { days: Record<string, { exerciseId: number; name: string }[]> }) =>
      Object.values(t.days).flat().filter((e) => e.name === 'Passe na parede').map((e) => e.exerciseId),
    )
    assert.ok(ids.length > 0)
    assert.ok(ids.every((id: number) => id === catalog.rows[0].id))
  })
})

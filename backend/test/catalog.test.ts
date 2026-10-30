import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { catalog, LEVELS } from '../src/db/catalog.js'
import { prepareDatabase } from '../src/db/index.js'
import { startApi } from './http.js'

// Banco próprio: os testes apagam exercícios do catálogo para simular um banco de antes deles existirem.
const { api, db, register } = await startApi()

const catalogNames = async () =>
  (await db.query<{ name: string }>('SELECT name FROM exercises WHERE user_id IS NULL ORDER BY id')).rows.map((r) => r.name)

describe('Catálogo padrão', () => {
  it('cada nível tem pelo menos 50 exercícios, fora o aquecimento', () => {
    for (const level of LEVELS) {
      assert.ok(catalog.filter((c) => c[4] === level && !c[5]).length >= 50, level)
      assert.ok(catalog.filter((c) => c[4] === level && c[5]).length >= 10, level)
    }
  })

  it('o aquecimento de arremesso vem do mais perto para o mais longe, e nunca começa de três', () => {
    const iniciante = catalog.filter((c) => c[4] === 'iniciante' && c[5] && c[1] === 'arremesso').map((c) => c[0])
    assert.deepEqual(iniciante, ['Arremesso colado à cesta', 'Arremesso um passo atrás', 'Arremesso dois passos atrás'])
    const avancado = catalog.filter((c) => c[4] === 'avancado' && c[5] && c[1] === 'arremesso').map((c) => c[0])
    assert.deepEqual(avancado, ['Escada de arremesso', 'Arremesso de três sem salto'])
  })

  it('um banco antigo recebe o nível, o aquecimento e a posição dos exercícios que já tinha', async () => {
    await db.query(`UPDATE exercises SET level = NULL, warmup = false, position = NULL WHERE user_id IS NULL AND name = 'Lance livre'`)
    await prepareDatabase(db)
    const { rows } = await db.query<{ level: string; warmup: boolean; position: number }>(`SELECT level, warmup, position FROM exercises WHERE user_id IS NULL AND name = 'Lance livre'`)
    assert.equal(rows[0].level, 'iniciante')
    assert.equal(rows[0].warmup, false)
    assert.ok(rows[0].position > 0)
  })

  it('um banco novo recebe todos os exercícios, sem nomes repetidos', async () => {
    const names = await catalogNames()
    assert.equal(names.length, catalog.length)
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
    assert.deepEqual([...after.slice(-2)].sort(), ['Corre e arremessa', 'Step-back de três'])
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

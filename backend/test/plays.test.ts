import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { startApi } from './http.js'

const { api, register } = await startApi()

const jogada = (extra: object = {}) => ({
  name: 'Pick and roll central',
  court: 'meia',
  pieces: [
    { kind: 'ataque', x: 250, y: 300, label: '1' },
    { kind: 'ataque', x: 250, y: 200, label: '5' },
    { kind: 'defesa', x: 250, y: 260, label: '1' },
    { kind: 'bola', x: 262, y: 300 },
  ],
  arrows: [
    { kind: 'bloqueio', x1: 250, y1: 200, x2: 250, y2: 280 },
    { kind: 'drible', x1: 250, y1: 300, x2: 360, y2: 220 },
    { kind: 'movimento', x1: 250, y1: 280, x2: 250, y2: 120 },
    { kind: 'passe', x1: 360, y1: 220, x2: 250, y2: 120 },
  ],
  notes: 'O 5 rola para a cesta depois do bloqueio.',
  ...extra,
})

describe('Prancheta tática', () => {
  it('salva, lista, abre, edita e apaga jogadas', async () => {
    const { token } = await register()
    const criada = await api('POST', '/plays', jogada(), token)
    assert.equal(criada.status, 201)
    assert.equal(criada.body.pieces.length, 4)
    assert.equal(criada.body.arrows[0].kind, 'bloqueio')
    assert.equal(criada.body.notes, 'O 5 rola para a cesta depois do bloqueio.')

    await api('POST', '/plays', jogada({ name: 'Contra-ataque', court: 'inteira', pieces: [{ kind: 'ataque', x: 100, y: 900, label: '2' }], arrows: [] }), token)
    const lista = (await api('GET', '/plays', undefined, token)).body
    assert.deepEqual(lista.map((p: { name: string }) => p.name), ['Contra-ataque', 'Pick and roll central'])

    const editada = await api('PUT', `/plays/${criada.body.id}`, jogada({ name: 'Pick and roll lateral' }), token)
    assert.equal(editada.status, 200)
    assert.equal((await api('GET', `/plays/${criada.body.id}`, undefined, token)).body.name, 'Pick and roll lateral')

    assert.equal((await api('DELETE', `/plays/${criada.body.id}`, undefined, token)).status, 204)
    assert.equal((await api('GET', `/plays/${criada.body.id}`, undefined, token)).status, 404)
  })

  it('recusa desenho fora da quadra ou malformado', async () => {
    const { token } = await register()
    const casos = [
      jogada({ name: '' }),
      jogada({ court: 'tres-quartos' }),
      jogada({ pieces: [{ kind: 'ataque', x: 250, y: 600 }] }),
      jogada({ arrows: [{ kind: 'movimento', x1: 0, y1: 0, x2: 501, y2: 10 }] }),
      jogada({ pieces: [{ kind: 'arbitro', x: 1, y: 1 }] }),
      jogada({ pieces: Array.from({ length: 21 }, () => ({ kind: 'ataque', x: 1, y: 1 })) }),
      jogada({ arrows: [{ kind: 'passe', x1: -1, y1: 0, x2: 2, y2: 2 }] }),
    ]
    for (const corpo of casos) assert.equal((await api('POST', '/plays', corpo, token)).status, 400, JSON.stringify(corpo).slice(0, 80))
    // Na quadra inteira, o fundo vai até 940.
    assert.equal((await api('POST', '/plays', jogada({ court: 'inteira', pieces: [{ kind: 'ataque', x: 250, y: 900 }] }), token)).status, 201)
  })

  it('cada atleta vê e mexe só nas próprias jogadas', async () => {
    const a = await register()
    const b = await register()
    const { body } = await api('POST', '/plays', jogada(), a.token)
    assert.deepEqual((await api('GET', '/plays', undefined, b.token)).body, [])
    assert.equal((await api('GET', `/plays/${body.id}`, undefined, b.token)).status, 404)
    assert.equal((await api('PUT', `/plays/${body.id}`, jogada(), b.token)).status, 404)
    assert.equal((await api('DELETE', `/plays/${body.id}`, undefined, b.token)).status, 404)
    assert.equal((await api('GET', '/plays')).status, 401)
  })
})

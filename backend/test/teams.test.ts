import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { startApi } from './http.js'

const { api, register } = await startApi()

const exercicio = async (token: string, nome: string) =>
  ((await api('GET', '/exercises', undefined, token)).body as { id: number; name: string }[]).find((e) => e.name === nome)!.id

async function timeComAtletas(quantos = 2) {
  const tecnico = await register('Técnica Rosa')
  const time = (await api('POST', '/teams', { name: 'Sub-17' }, tecnico.token)).body
  const atletas = []
  for (let i = 0; i < quantos; i++) {
    const a = await register(`Atleta ${i + 1}`)
    assert.equal((await api('POST', '/teams/join', { code: time.inviteCode }, a.token)).status, 201)
    atletas.push(a)
  }
  return { tecnico, time, atletas }
}

describe('Modo técnico: time e convite', () => {
  it('o técnico cria o time, os atletas entram pelo código e cada um vê o time no seu papel', async () => {
    const { tecnico, time, atletas } = await timeComAtletas()
    const convite = (await api('GET', `/teams/invites/${time.inviteCode}`, undefined, atletas[0].token)).body
    assert.deepEqual(convite, { id: time.id, name: 'Sub-17', coachName: 'Técnica Rosa', coach: false, member: true })

    const lista = (await api('GET', '/teams', undefined, tecnico.token)).body
    assert.equal(lista.coaching[0].members, 2)
    assert.deepEqual((await api('GET', '/teams', undefined, atletas[0].token)).body.member.map((t: { name: string }) => t.name), ['Sub-17'])

    const visao = (await api('GET', `/teams/${time.id}`, undefined, tecnico.token)).body
    assert.equal(visao.role, 'tecnico')
    assert.deepEqual(visao.members.map((m: { name: string }) => m.name), ['Atleta 1', 'Atleta 2'])
    const doAtleta = (await api('GET', `/teams/${time.id}`, undefined, atletas[0].token)).body
    assert.equal(doAtleta.role, 'atleta')
    assert.equal(doAtleta.members, undefined)
    assert.equal(doAtleta.inviteCode, undefined)
  })

  it('quem não é do time não vê nada; o técnico não entra no próprio time; código errado dá 404', async () => {
    const { tecnico, time } = await timeComAtletas(1)
    const estranho = await register()
    assert.equal((await api('GET', `/teams/${time.id}`, undefined, estranho.token)).status, 404)
    assert.equal((await api('POST', '/teams/join', { code: time.inviteCode }, tecnico.token)).status, 400)
    assert.equal((await api('POST', '/teams/join', { code: 'naoexiste' }, estranho.token)).status, 404)
    assert.equal((await api('POST', `/teams/${time.id}/assignments`, { kind: 'programa', programId: 'arremesso-30', title: 'X' }, estranho.token)).status, 404)
  })

  it('código novo invalida o antigo; atleta sai; técnico tira atleta e apaga o time', async () => {
    const { tecnico, time, atletas } = await timeComAtletas(2)
    const novo = (await api('POST', `/teams/${time.id}/invite`, undefined, tecnico.token)).body.inviteCode
    assert.notEqual(novo, time.inviteCode)
    assert.equal((await api('POST', '/teams/join', { code: time.inviteCode }, (await register()).token)).status, 404)
    assert.equal((await api('POST', `/teams/${time.id}/invite`, undefined, atletas[0].token)).status, 403)

    assert.equal((await api('DELETE', `/teams/${time.id}/members/${atletas[1].id}`, undefined, atletas[0].token)).status, 403)
    assert.equal((await api('DELETE', `/teams/${time.id}/members/${atletas[0].id}`, undefined, atletas[0].token)).status, 204)
    assert.equal((await api('DELETE', `/teams/${time.id}/members/${atletas[1].id}`, undefined, tecnico.token)).status, 204)
    assert.deepEqual((await api('GET', `/teams/${time.id}`, undefined, tecnico.token)).body.members, [])
    assert.equal((await api('DELETE', `/teams/${time.id}`, undefined, tecnico.token)).status, 204)
    assert.deepEqual((await api('GET', '/teams', undefined, tecnico.token)).body.coaching, [])
  })
})

describe('Modo técnico: tarefas e progresso', () => {
  it('atribui um programa e um treino; o técnico acompanha o progresso de cada atleta', async () => {
    const { tecnico, time, atletas } = await timeComAtletas(2)
    const [a1, a2] = atletas
    const lance = await exercicio(tecnico.token, 'Lance livre')
    const mikan = await exercicio(tecnico.token, 'Mikan drill')

    const programa = await api('POST', `/teams/${time.id}/assignments`, { kind: 'programa', programId: 'mao-fraca-4', title: 'Mão fraca até o campeonato' }, tecnico.token)
    assert.equal(programa.status, 201)
    assert.equal(programa.body.programName, 'Mão fraca em 4 semanas')
    const treino = await api(
      'POST',
      `/teams/${time.id}/assignments`,
      { kind: 'treino', title: 'Finalização de sexta', blocks: [{ exerciseId: mikan, minutes: 10 }, { exerciseId: lance, minutes: 5 }], dueOn: '2026-11-14' },
      tecnico.token,
    )
    assert.equal(treino.status, 201)
    assert.deepEqual(treino.body.blocks.map((b: { name: string }) => b.name), ['Mikan drill', 'Lance livre'])
    assert.equal(treino.body.dueOn, '2026-11-14')

    // Atleta 1 cumpre as duas tarefas.
    await api('POST', '/programs/mao-fraca-4/start', undefined, a1.token)
    await api('POST', '/programs/mao-fraca-4/days/1/complete', {}, a1.token)
    const sessao = (await api('POST', '/sessions', { performedAt: new Date().toISOString(), durationMinutes: 15, entries: [{ exerciseId: lance, makes: 7, attempts: 10 }] }, a1.token)).body
    assert.equal((await api('POST', `/teams/${time.id}/assignments/${treino.body.id}/done`, { sessionId: sessao.id }, a1.token)).status, 201)
    assert.equal((await api('POST', `/teams/${time.id}/assignments/${programa.body.id}/done`, {}, a1.token)).status, 400)
    assert.equal((await api('POST', `/teams/${time.id}/assignments/${treino.body.id}/done`, { sessionId: sessao.id }, a2.token)).status, 404)

    const visao = (await api('GET', `/teams/${time.id}`, undefined, tecnico.token)).body
    const p1 = visao.members.find((m: { id: number }) => m.id === a1.id).progress
    const p2 = visao.members.find((m: { id: number }) => m.id === a2.id).progress
    assert.equal(p1.sessionsWeek, 1)
    assert.equal(p1.minutesWeek, 15)
    assert.equal(p1.streak, 1)
    assert.deepEqual(p1.tasks.find((t: { assignmentId: number }) => t.assignmentId === programa.body.id), { assignmentId: programa.body.id, started: true, done: 1, total: 28, completed: false })
    assert.equal(p1.tasks.find((t: { assignmentId: number }) => t.assignmentId === treino.body.id).completed, true)
    assert.equal(p2.sessionsWeek, 0)
    assert.ok(p2.tasks.every((t: { completed: boolean }) => !t.completed))

    // O atleta vê o próprio progresso.
    const doAtleta = (await api('GET', `/teams/${time.id}`, undefined, a1.token)).body
    assert.equal(doAtleta.progress.tasks.length, 2)
    assert.equal(doAtleta.assignments.length, 2)

    assert.equal((await api('DELETE', `/teams/${time.id}/assignments/${treino.body.id}`, undefined, a1.token)).status, 403)
    assert.equal((await api('DELETE', `/teams/${time.id}/assignments/${treino.body.id}`, undefined, tecnico.token)).status, 204)
  })

  it('recusa tarefa malformada e treino com exercício próprio do técnico', async () => {
    const { tecnico, time } = await timeComAtletas(1)
    const proprio = (await api('POST', '/exercises', { name: 'Meu drill secreto', category: 'drible', metric: 'tempo' }, tecnico.token)).body
    const casos = [
      { kind: 'programa', programId: 'nao-existe', title: 'X1' },
      { kind: 'treino', title: 'Sem blocos', blocks: [] },
      { kind: 'reuniao', title: 'X2' },
      { kind: 'treino', title: 'Y', blocks: [{ exerciseId: 1, minutes: 999 }] },
    ]
    for (const c of casos) assert.equal((await api('POST', `/teams/${time.id}/assignments`, c, tecnico.token)).status, 400, JSON.stringify(c))
    const comProprio = await api('POST', `/teams/${time.id}/assignments`, { kind: 'treino', title: 'Com o meu', blocks: [{ exerciseId: proprio.id, minutes: 5 }] }, tecnico.token)
    assert.equal(comProprio.status, 400)
    assert.match(comProprio.body.error, /catálogo/)
  })
})

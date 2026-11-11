import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mondayOf, weekPeriod } from '../src/routes/social.js'
import { localToday } from '../src/routes/stats.js'
import { startApi } from './http.js'

const { api, db, register } = await startApi()

type Atleta = { token: string; id: number; convite: string }

/** Atleta com perfil; devolve token, id e o código de convite. */
async function atleta(apelido: string, publico = true): Promise<Atleta> {
  const { token, id } = await register(apelido)
  const { body } = await api('PUT', '/social/profile', { nickname: apelido, public: publico }, token)
  return { token, id, convite: body.inviteCode as string }
}

const amigos = async (a: Atleta, b: Atleta) => api('POST', '/social/friends', { code: b.convite }, a.token)

const lanceLivre = async (token: string) =>
  ((await api('GET', '/exercises', undefined, token)).body as { id: number; name: string }[]).find((e) => e.name === 'Lance livre')!.id

async function treinarLances(token: string, makes: number, attempts = makes, quando = new Date()) {
  const exerciseId = await lanceLivre(token)
  return api('POST', '/sessions', { performedAt: quando.toISOString(), durationMinutes: 20, entries: [{ exerciseId, makes, attempts }] }, token)
}

const nomes = (lista: { nickname: string }[]) => lista.map((e) => e.nickname)

describe('Semana do ranking', () => {
  it('começa na segunda e vai até a meia-noite da segunda seguinte, no fuso do atleta', () => {
    assert.equal(mondayOf('2026-11-10'), '2026-11-09')
    assert.equal(mondayOf('2026-11-09'), '2026-11-09')
    assert.equal(mondayOf('2026-11-15'), '2026-11-09')
    const p = weekPeriod('2026-11-09', 180)
    assert.equal(p.from?.toISOString(), '2026-11-09T03:00:00.000Z')
    assert.equal(p.to.toISOString(), '2026-11-16T03:00:00.000Z')
  })
})

describe('Perfil do ranking', () => {
  it('é opcional, com apelido único e convite próprio', async () => {
    const { token } = await register()
    assert.equal((await api('GET', '/social/profile', undefined, token)).body, null)
    const criado = await api('PUT', '/social/profile', { nickname: 'Mão_de_Seda' }, token)
    assert.equal(criado.status, 200)
    assert.equal(criado.body.public, true)
    assert.ok(criado.body.inviteCode.length >= 10)

    const outro = await register()
    assert.equal((await api('PUT', '/social/profile', { nickname: 'mão_de_seda' }, outro.token)).status, 409)
    for (const ruim of ['ab', 'nome com espaço', 'x'.repeat(21), '<script>']) {
      assert.equal((await api('PUT', '/social/profile', { nickname: ruim }, outro.token)).status, 400, ruim)
    }

    const novo = (await api('POST', '/social/profile/invite', undefined, token)).body.inviteCode
    assert.notEqual(novo, criado.body.inviteCode)
  })
})

describe('Ranking', () => {
  it('ordena pelos lances livres da semana, com empate na mesma posição, e mostra só quem tem perfil público', async () => {
    const ana = await atleta('ana_rk')
    const bia = await atleta('bia_rk')
    const caio = await atleta('caio_rk', false)
    const sem = await register('Sem Perfil')
    await treinarLances(ana.token, 30)
    await treinarLances(bia.token, 30)
    await treinarLances(caio.token, 50)
    await treinarLances(sem.token, 99)
    // Treino da semana passada não conta na semana.
    await treinarLances(bia.token, 40, 40, new Date(Date.now() - 8 * 86_400_000))

    const { body } = await api('GET', '/social/ranking?metric=lances_livres&period=semana', undefined, ana.token)
    const nossos = body.entries.filter((e: { nickname: string }) => e.nickname.endsWith('_rk'))
    assert.deepEqual(nossos.map((e: { nickname: string; value: number }) => [e.nickname, e.value]), [['ana_rk', 30], ['bia_rk', 30]])
    assert.equal(nossos[0].position, nossos[1].position)
    assert.equal(body.me.nickname, 'ana_rk')
    assert.equal(body.me.me, true)
    assert.ok(!nomes(body.entries).includes('Sem Perfil'))

    const geral = (await api('GET', '/social/ranking?metric=lances_livres&period=geral', undefined, bia.token)).body
    assert.equal(geral.entries.find((e: { nickname: string }) => e.nickname === 'bia_rk').value, 70)
  })

  it('o perfil fora do público aparece só para os amigos', async () => {
    const dani = await atleta('dani_priv', false)
    const edu = await atleta('edu_priv')
    const fred = await atleta('fred_priv')
    await treinarLances(dani.token, 10)
    assert.ok(!nomes((await api('GET', '/social/ranking', undefined, fred.token)).body.entries).includes('dani_priv'))

    assert.equal((await amigos(edu, dani)).status, 201)
    const visto = (await api('GET', '/social/ranking?scope=amigos', undefined, edu.token)).body
    assert.deepEqual(visto.entries.map((e: { nickname: string; friend: boolean }) => [e.nickname, e.friend]), [['dani_priv', true]])
    // A própria pessoa sempre se vê.
    assert.equal((await api('GET', '/social/ranking', undefined, dani.token)).body.me.nickname, 'dani_priv')
  })

  it('soma desafio do dia, quiz e dias treinados; a nota do cartão vale com a bateria completa', async () => {
    const gil = await atleta('gil_rk')
    await api('POST', '/challenges/today', { makes: 5, attempts: 6 }, gil.token)
    await api('POST', '/quiz/today', { answers: [0, 0, 0, 0, 0] }, gil.token)
    const ranking = async (metric: string, period = 'semana') =>
      (await api('GET', `/social/ranking?metric=${metric}&period=${period}`, undefined, gil.token)).body.me?.value ?? 0

    assert.equal(await ranking('desafio'), 5)
    const { rows } = await db.query<{ correct: number }>('SELECT correct FROM quiz_results WHERE user_id = $1', [gil.id])
    assert.equal(await ranking('quiz'), rows[0].correct)
    assert.equal(await ranking('sequencia'), 1)
    assert.equal(await ranking('sequencia', 'geral'), 1)

    const hoje = localToday(0)
    await api('POST', '/tests', { kind: 'lances_1min', value: 9, performedAt: hoje }, gil.token)
    assert.equal(await ranking('cartao'), 0)
    const resto: [string, number][] = [['arremesso_5_pontos', 11], ['drible_cones', 19.5], ['impulsao', 47.5]]
    for (const [kind, value] of resto) await api('POST', '/tests', { kind, value, performedAt: hoje }, gil.token)
    assert.equal(await ranking('cartao'), 50)
  })

  it('valores absurdos têm teto: uma sessão soma no máximo 200 cestas', async () => {
    const hugo = await atleta('hugo_rk')
    await treinarLances(hugo.token, 5000)
    const { body } = await api('GET', '/social/ranking?metric=lances_livres', undefined, hugo.token)
    assert.equal(body.me.value, 200)
  })

  it('sem perfil, o ranking dos amigos vem vazio e avisa', async () => {
    const { token } = await register()
    const { body } = await api('GET', '/social/ranking?scope=amigos', undefined, token)
    assert.equal(body.hasProfile, false)
    assert.deepEqual(body.entries, [])
    assert.equal((await api('GET', '/social/ranking?metric=altura', undefined, token)).status, 400)
  })
})

describe('Amigos e convites', () => {
  it('convite por link vira amizade dos dois lados; dá para desfazer', async () => {
    const ivo = await atleta('ivo_am')
    const jo = await atleta('jo_am')
    const convite = (await api('GET', `/social/invites/${ivo.convite}`, undefined, jo.token)).body
    assert.deepEqual(convite, { nickname: 'ivo_am', self: false, alreadyFriends: false })
    assert.equal((await amigos(jo, ivo)).status, 201)
    assert.deepEqual(nomes((await api('GET', '/social/friends', undefined, ivo.token)).body), ['jo_am'])
    assert.equal((await api('GET', `/social/invites/${ivo.convite}`, undefined, jo.token)).body.alreadyFriends, true)

    assert.equal((await api('POST', '/social/friends', { code: jo.convite }, jo.token)).status, 400)
    assert.equal((await api('POST', '/social/friends', { code: 'nao-existe-123' }, jo.token)).status, 404)
    const semPerfil = await register()
    assert.equal((await api('POST', '/social/friends', { code: ivo.convite }, semPerfil.token)).status, 409)

    assert.equal((await api('DELETE', `/social/friends/${ivo.id}`, undefined, jo.token)).status, 204)
    assert.deepEqual((await api('GET', '/social/friends', undefined, ivo.token)).body, [])
  })

  it('sair do ranking apaga o perfil e as amizades, mas não os treinos', async () => {
    const kim = await atleta('kim_am')
    const leo = await atleta('leo_am')
    await amigos(kim, leo)
    await treinarLances(kim.token, 3)
    assert.equal((await api('DELETE', '/social/profile', undefined, kim.token)).status, 204)
    assert.deepEqual((await api('GET', '/social/friends', undefined, leo.token)).body, [])
    assert.equal((await api('GET', '/sessions', undefined, kim.token)).body.length, 1)
  })
})

describe('Desafios entre amigos', () => {
  it('desafia um amigo, ele aceita e o placar da semana aparece para os dois', async () => {
    const max = await atleta('max_df')
    const nina = await atleta('nina_df')
    await amigos(max, nina)

    const criado = await api('POST', '/social/challenges', { opponentId: nina.id, metric: 'lances_livres' }, max.token)
    assert.equal(criado.status, 201)
    assert.equal(criado.body.status, 'pendente')
    assert.equal(criado.body.friend.nickname, 'nina_df')
    assert.equal((await api('POST', '/social/challenges', { opponentId: nina.id, metric: 'lances_livres' }, max.token)).status, 409)
    // Só o desafiado responde.
    assert.equal((await api('POST', `/social/challenges/${criado.body.id}/accept`, undefined, max.token)).status, 403)

    await treinarLances(max.token, 12)
    await treinarLances(nina.token, 20)
    const aceito = await api('POST', `/social/challenges/${criado.body.id}/accept`, undefined, nina.token)
    assert.equal(aceito.body.status, 'aceito')
    assert.deepEqual(aceito.body.score, { me: 20, friend: 12 })
    assert.equal(aceito.body.role, 'desafiado')

    const visao = (await api('GET', '/social/challenges', undefined, max.token)).body[0]
    assert.deepEqual(visao.score, { me: 12, friend: 20 })
    assert.equal(visao.result, null)

    // Semana encerrada: o resultado sai.
    await db.query('UPDATE friend_challenges SET week_start = week_start - 7 WHERE id = $1', [criado.body.id])
    await db.query(`UPDATE practice_sessions SET performed_at = performed_at - interval '7 days' WHERE user_id = ANY($1::int[])`, [[max.id, nina.id]])
    const fim = (await api('GET', '/social/challenges', undefined, nina.token)).body[0]
    assert.equal(fim.status, 'encerrado')
    assert.equal(fim.result, 'vitoria')
  })

  it('recusar, cancelar e não poder desafiar quem não é amigo', async () => {
    const olga = await atleta('olga_df')
    const pedro = await atleta('pedro_df')
    const quem = await atleta('quem_df')
    await amigos(olga, pedro)
    assert.equal((await api('POST', '/social/challenges', { opponentId: quem.id, metric: 'quiz' }, olga.token)).status, 400)
    assert.equal((await api('POST', '/social/challenges', { opponentId: pedro.id, metric: 'altura' }, olga.token)).status, 400)

    const a = (await api('POST', '/social/challenges', { opponentId: pedro.id, metric: 'quiz' }, olga.token)).body
    assert.equal((await api('POST', `/social/challenges/${a.id}/decline`, undefined, pedro.token)).body.status, 'recusado')
    assert.equal((await api('POST', `/social/challenges/${a.id}/accept`, undefined, pedro.token)).status, 409)

    const b = (await api('POST', '/social/challenges', { opponentId: pedro.id, metric: 'minutos' }, olga.token)).body
    assert.equal((await api('POST', `/social/challenges/${b.id}/cancel`, undefined, pedro.token)).status, 403)
    assert.equal((await api('POST', `/social/challenges/${b.id}/cancel`, undefined, olga.token)).body.status, 'cancelado')
    assert.equal((await api('POST', `/social/challenges/${b.id}/accept`, undefined, quem.token)).status, 404)
  })
})

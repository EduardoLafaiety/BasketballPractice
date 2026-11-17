import { describe, expect, it } from 'vitest'
import { distancia, MEDIDAS } from './corpo3d'
import { construirBola, corpoMocap, duracao, poseEm, toques, yawParaOlharAMais, type Clipe } from './mocap'
import c0602 from './mocap/06_02.json'
import c0613 from './mocap/06_13.json'
import c0615 from './mocap/06_15.json'

const clipes: Record<string, Clipe> = { '06_02': c0602 as Clipe, '06_13': c0613 as Clipe, '06_15': c0615 as Clipe }

describe('captura de movimento', () => {
  for (const [id, c] of Object.entries(clipes)) {
    it(`${id}: ossos de comprimento fixo, pés no chão e números válidos o clipe todo`, () => {
      const col = { yaw: yawParaOlharAMais(c, 0), origem: { x: 3, y: 0, z: 0 } }
      const bola = construirBola(c)
      for (let t = 0; t <= duracao(c); t += 1000 / 60) {
        const k = corpoMocap(c, t, col, bola)
        for (const [m, a, b] of [[k.perna.F, MEDIDAS.coxa, MEDIDAS.canela], [k.perna.T, MEDIDAS.coxa, MEDIDAS.canela], [k.braco.P, MEDIDAS.braco, MEDIDAS.antebraco], [k.braco.L, MEDIDAS.braco, MEDIDAS.antebraco]] as const) {
          expect(Math.abs(distancia(m.raiz, m.meio) - a)).toBeLessThan(0.005)
          expect(Math.abs(distancia(m.meio, m.ponta) - b)).toBeLessThan(0.005)
        }
        expect(Math.min(k.pe.F.tornozelo.y, k.pe.T.tornozelo.y)).toBeGreaterThan(0.05)
        expect(Number.isFinite(k.pelve.x + k.cabeca.y + k.bolas[0].centro.y)).toBe(true)
        expect(k.bolas[0].centro.y).toBeGreaterThanOrEqual(MEDIDAS.raioBola - 0.005)
      }
    })
  }

  it('o jogador olha para +x depois de alinhado', () => {
    const c = clipes['06_02']
    const col = { yaw: yawParaOlharAMais(c, 0), origem: { x: 0, y: 0, z: 0 } }
    const k = corpoMocap(c, 0, col, null)
    expect(k.torax.frente.x).toBeGreaterThan(0.8)
  })

  it('o drible tem toques regulares (uns 2 a 4 por segundo) e a bola quica no chão entre eles', () => {
    const c = clipes['06_02']
    const ev = toques(c)
    const seg = duracao(c) / 1000
    expect(ev.length / seg).toBeGreaterThan(0.8)
    expect(ev.length / seg).toBeLessThan(5)
    const bola = construirBola(c, ev)
    let minimo = 9
    for (let t = ev[0].t; t < ev[ev.length - 1].t; t += 1000 / 60) minimo = Math.min(minimo, bola(t).centro.y)
    expect(minimo).toBeLessThan(MEDIDAS.raioBola + 0.03)
  })

  it('a pose interpolada fica entre os quadros vizinhos', () => {
    const c = clipes['06_15']
    const a = poseEm(c, 0).Hips
    const b = poseEm(c, 1000 / 30).Hips
    const m = poseEm(c, 1000 / 60).Hips
    expect(m.x).toBeCloseTo((a.x + b.x) / 2, 3)
  })
})

import { COREOGRAFIAS } from './coreografias'
import { CREDITO_MOCAP, MOCAP_DE_EXERCICIO, carregarClipe, prepararCena } from './mocapExercicios'

describe('exercícios com movimento real', () => {
  it('todo exercício mapeado existe no catálogo e o clipe carrega', async () => {
    for (const [nome, id] of Object.entries(MOCAP_DE_EXERCICIO)) {
      expect(COREOGRAFIAS[nome], nome).toBeDefined()
      const clipe = await carregarClipe(id)
      expect(clipe.quadros).toBeGreaterThan(50)
    }
    expect(CREDITO_MOCAP).toContain('CMU')
  })

  it('o arremesso real é colocado a uns 5 m da cesta, e a bola termina no chão depois de passar pelo aro', async () => {
    const cena = prepararCena(await carregarClipe('06_14'))
    expect(cena.arremesso).not.toBeNull()
    const k = corpoMocap(cena.clipe, cena.arremesso!.t, cena.colocacao, cena.bola, cena.arremesso)
    expect(Math.abs(cena.arremesso!.cesta.x - k.pelve.x)).toBeGreaterThan(4.3)
    expect(Math.abs(cena.arremesso!.cesta.x - k.pelve.x)).toBeLessThan(6.2)
    const fim = corpoMocap(cena.clipe, cena.total, cena.colocacao, cena.bola, cena.arremesso)
    expect(fim.bolas[0].centro.y).toBeLessThan(0.5)
  })
})

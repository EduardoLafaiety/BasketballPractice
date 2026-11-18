import { describe, expect, it } from 'vitest'
import { COREOGRAFIAS } from './coreografias'
import { corpoDoParceiro, corpoNoInstante, distancia, doisOssos, ESCALA, MEDIDAS, v3, type Corpo3D } from './corpo3d'
import { instante, preparar } from './motor'

const todos = Object.entries(COREOGRAFIAS)

function varrer(passo = 40) {
  const falhas: string[] = []
  let amostras = 0
  let esticados = 0
  for (const [nome, c] of todos) {
    const anim = preparar(c)
    for (let t = 0; t <= anim.total; t += passo) {
      const inst = instante(anim, t)
      const corpo = corpoNoInstante(inst, anim.frente)
      amostras++
      const pontos: [string, number][] = [
        ['pelve', corpo.pelve.y],
        ['cabeca', corpo.cabeca.y],
        ['joelhoF', corpo.perna.F.meio.y],
        ['tornozeloT', corpo.perna.T.ponta.y],
        ['maoP', corpo.braco.P.ponta.y],
        ['maoLx', corpo.braco.L.ponta.x],
        ['pelveZ', corpo.pelve.z],
      ]
      for (const [rotulo, v] of pontos) if (!Number.isFinite(v)) falhas.push(`${nome} @${t}: ${rotulo} não é número`)
      const lim = (m: Corpo3D['perna']['F'], a: number, b: number, rotulo: string) => {
        const da = distancia(m.raiz, m.meio)
        const db = distancia(m.meio, m.ponta)
        if (Math.abs(da - a) > 0.004 || Math.abs(db - b) > 0.004) falhas.push(`${nome} @${t}: osso ${rotulo} mudou de tamanho (${da.toFixed(3)} / ${db.toFixed(3)})`)
      }
      lim(corpo.perna.F, MEDIDAS.coxa, MEDIDAS.canela, 'perna F')
      lim(corpo.perna.T, MEDIDAS.coxa, MEDIDAS.canela, 'perna T')
      lim(corpo.braco.P, MEDIDAS.braco, MEDIDAS.antebraco, 'braço P')
      lim(corpo.braco.L, MEDIDAS.braco, MEDIDAS.antebraco, 'braço L')
      const piso = inst.solo * ESCALA
      for (const pe of ['F', 'T'] as const) {
        if (corpo.pe[pe].ponta.y < piso - 0.03) falhas.push(`${nome} @${t}: ponta do pé ${pe} furou o chão (${corpo.pe[pe].ponta.y.toFixed(3)})`)
        if (corpo.pe[pe].calcanhar.y < piso - 0.03) falhas.push(`${nome} @${t}: calcanhar ${pe} furou o chão (${corpo.pe[pe].calcanhar.y.toFixed(3)})`)
      }
      // Quanto o alvo do IK ficou fora do alcance (perna/braço esticados além do osso).
      for (const pe of ['F', 'T'] as const) {
        const alvo = distancia(corpo.perna[pe].raiz, corpo.perna[pe].ponta)
        if (alvo > MEDIDAS.coxa + MEDIDAS.canela - 0.002) esticados++
      }
    }
  }
  return { falhas, amostras, esticados }
}

describe('corpo 3D', () => {
  it('há coreografias para testar', () => {
    expect(todos.length).toBeGreaterThan(40)
  })

  it('em todas as coreografias, o corpo tem números válidos e ossos de comprimento fixo', () => {
    const { falhas, amostras } = varrer()
    expect(amostras).toBeGreaterThan(1000)
    expect(falhas.filter((f) => f.includes('não é número') || f.includes('mudou de tamanho')).slice(0, 8)).toEqual([])
  })

  it('os pés não atravessam o chão', () => {
    const { falhas } = varrer()
    expect(falhas.filter((f) => f.includes('furou')).slice(0, 8)).toEqual([])
  })
})

describe('cinemática inversa de dois ossos', () => {
  it('mantém os comprimentos e dobra para o lado do polo', () => {
    const r = doisOssos(v3(0, 1, 0), v3(0.3, 0.2, 0), v3(1, 0.6, 0), 0.45, 0.44, v3(1, 0, 0))
    expect(distancia(v3(0, 1, 0), r.meio)).toBeCloseTo(0.45, 3)
    expect(distancia(r.meio, r.ponta)).toBeCloseTo(0.44, 3)
    expect(r.meio.x).toBeGreaterThan(0.2)
  })

  it('alvo longe demais: estica até o alcance, sem passar dele', () => {
    const r = doisOssos(v3(0, 1, 0), v3(0, -5, 0), v3(1, 0.5, 0), 0.45, 0.44, v3(1, 0, 0))
    expect(distancia(v3(0, 1, 0), r.ponta)).toBeLessThanOrEqual(0.89)
    expect(Number.isFinite(r.meio.x)).toBe(true)
  })

  it('perna esticada sem polo definido usa a direção de reserva', () => {
    const r = doisOssos(v3(0, 1, 0), v3(0, 0.12, 0), v3(0, 0.5, 0), 0.445, 0.44, v3(1, 0, 0))
    expect(r.meio.x).toBeGreaterThan(0)
  })
})

describe('realismo do movimento', () => {
  const quadro = (nome: string, fracao: number) => {
    const c = COREOGRAFIAS[nome]
    const anim = preparar(c)
    const inst = instante(anim, anim.total * fracao)
    return { inst, corpo: corpoNoInstante(inst, anim.frente, c.cena), anim }
  }

  it('o atleta olha para a cesta quando a bola sobe para o arremesso', () => {
    const anim = preparar(COREOGRAFIAS['Lance livre'])
    let achou = false
    for (let t = 0; t <= anim.total; t += 50) {
      const inst = instante(anim, t)
      const corpo = corpoNoInstante(inst, anim.frente, COREOGRAFIAS['Lance livre'].cena)
      const bola = corpo.bolas[0]
      if (bola && bola.presa > 0.9 && bola.centro.y > corpo.pescoco.y + 0.15) {
        // a cabeça aponta para frente (a cesta fica à direita, +x) e um pouco para cima
        expect(corpo.cabecaEixos.frente.x).toBeGreaterThan(0.6)
        expect(corpo.cabecaEixos.frente.y).toBeGreaterThan(0.02)
        achou = true
        break
      }
    }
    expect(achou).toBe(true)
  })

  it('o olhar nunca gira a cabeça além do limite do pescoço', () => {
    for (const nome of ['Lance livre', 'Drible estacionário', 'Deslizamento defensivo', 'Pivô de costas']) {
      if (!COREOGRAFIAS[nome]) continue
      const anim = preparar(COREOGRAFIAS[nome])
      for (let t = 0; t <= anim.total; t += 100) {
        const corpo = corpoNoInstante(instante(anim, t), anim.frente, COREOGRAFIAS[nome].cena)
        const cos = corpo.cabecaEixos.frente.x * corpo.torax.frente.x + corpo.cabecaEixos.frente.y * corpo.torax.frente.y + corpo.cabecaEixos.frente.z * corpo.torax.frente.z
        // 70° de giro com 40° de inclinação dá, no pior caso, um ângulo de uns 78° entre cabeça e tronco
        expect(cos).toBeGreaterThan(Math.cos((80 * Math.PI) / 180))
      }
    }
  })

  it('o peso passa para o pé de apoio quando o outro sai do chão', () => {
    const { corpo: parado } = quadro('Corrida leve na quadra', 0)
    const anim = preparar(COREOGRAFIAS['Corrida leve na quadra'])
    let desvio = 0
    for (let t = 0; t <= anim.total; t += 40) {
      const c = corpoNoInstante(instante(anim, t), false)
      const levantadoT = c.perna.T.ponta.y - c.perna.F.ponta.y
      // pé de trás no ar (mais alto) → pelve para o lado do pé da frente (+z); e o contrário
      if (levantadoT > 0.15) desvio = Math.max(desvio, c.pelve.z - c.pescoco.z)
    }
    expect(desvio).toBeGreaterThan(0.01)
    expect(Number.isFinite(parado.pelve.z)).toBe(true)
  })

  it('o calcanhar sobe e a ponta do pé fica no chão (o pé gira sobre a ponta)', () => {
    const anim = preparar(COREOGRAFIAS['Corrida leve na quadra'])
    let maior = 0
    for (let t = 0; t <= anim.total; t += 40) {
      const c = corpoNoInstante(instante(anim, t), false)
      for (const l of ['F', 'T'] as const) maior = Math.max(maior, -c.pe[l].inclinacao)
    }
    expect(maior).toBeGreaterThan(0.3)
    expect(maior).toBeLessThanOrEqual((55 * Math.PI) / 180 + 1e-9)
  })

  it('a virada gira o corpo de verdade: no meio dela o atleta olha para o lado', () => {
    let medidos = 0
    for (const [nome, c] of Object.entries(COREOGRAFIAS)) {
      if (c.vista === 'frente') continue
      const anim = preparar(c)
      for (let t = 0; t <= anim.total; t += 25) {
        const inst = instante(anim, t)
        if (Math.abs(inst.giro) < 0.5 && Math.abs(inst.giro) > 0.31) {
          const corpo = corpoNoInstante(inst, false, c.cena)
          // frente do tórax tem componente em z (olhando para quem assiste) no meio da virada
          expect(Math.abs(corpo.torax.frente.z), nome).toBeGreaterThan(0.5)
          medidos++
          break
        }
      }
    }
    expect(medidos).toBeGreaterThan(0)
  })

  it('o parceiro aparece parado, no chão', () => {
    const c = COREOGRAFIAS['Base defensiva']
    expect(c).toBeDefined()
    const comParceiro = Object.entries(COREOGRAFIAS).find(([, x]) => x.cena.parceiro)
    expect(comParceiro).toBeDefined()
    const p = comParceiro![1].cena.parceiro!
    const corpo = corpoDoParceiro(p.pose, p.dir, 0)
    expect(corpo.perna.F.ponta.y).toBeGreaterThan(0.05)
    expect(corpo.perna.F.ponta.y).toBeLessThan(0.2)
  })
})

import { describe, expect, it } from 'vitest'
import { acertosParaMeta, efgPct, fgPct, metrosParaPes, pct, pesParaMetros, pontos, tsPct } from './calculos'

describe('percentuais de arremesso', () => {
  it('arredonda para uma casa e devolve null sem tentativas', () => {
    expect(pct(1, 3)).toBe(33.3)
    expect(fgPct(7, 10)).toBe(70)
    expect(pct(0, 0)).toBeNull()
  })

  it('eFG% dá peso 1,5 à bola de três', () => {
    // 4 cestas em 10, sendo 2 de três: (4 + 1) / 10
    expect(efgPct(4, 2, 10)).toBe(50)
    expect(efgPct(0, 0, 0)).toBeNull()
  })

  it('TS% considera os lances livres', () => {
    // 20 pontos em 10 arremessos e 5 lances: 20 / (2 × (10 + 2,2))
    expect(tsPct(20, 10, 5)).toBe(82)
    expect(tsPct(0, 0, 0)).toBeNull()
  })

  it('soma os pontos de dois, três e lance livre', () => {
    // 5 cestas (2 delas de três) e 3 lances: 5×2 + 2 + 3
    expect(pontos(5, 2, 3)).toBe(15)
  })
})

describe('acertosParaMeta', () => {
  it('calcula quantos acertos seguidos faltam', () => {
    // 6/10 = 60%; para 70%: (6 + n) / (10 + n) >= 0,7 → n = 4
    expect(acertosParaMeta(6, 10, 70)).toBe(4)
    expect((6 + 4) / (10 + 4)).toBeGreaterThanOrEqual(0.7)
  })

  it('não pede nada quando a meta já foi atingida', () => {
    expect(acertosParaMeta(8, 10, 80)).toBe(0)
    expect(acertosParaMeta(9, 10, 50)).toBe(0)
  })

  it('sem tentativas, um acerto já basta', () => {
    expect(acertosParaMeta(0, 0, 50)).toBe(0)
  })

  it('100% só é possível sem nenhum erro', () => {
    expect(acertosParaMeta(5, 5, 100)).toBe(0)
    expect(acertosParaMeta(4, 5, 100)).toBeNull()
  })

  it('não erra o arredondamento em metas exatas', () => {
    // 1/2 para 75%: (1 + n) / (2 + n) >= 0,75 → n = 2 exatamente
    expect(acertosParaMeta(1, 2, 75)).toBe(2)
  })
})

describe('conversão de distância', () => {
  it('ida e volta entre metros e pés', () => {
    expect(metrosParaPes(1)).toBeCloseTo(3.28084)
    expect(pesParaMetros(metrosParaPes(6.75))).toBeCloseTo(6.75)
  })
})

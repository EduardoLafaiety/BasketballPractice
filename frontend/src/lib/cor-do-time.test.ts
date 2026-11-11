import { describe, expect, it } from 'vitest'
import { FOTOS_JOGADORES } from '../assets/jogadores/fotos'
import { TIME_DO_JOGADOR } from '../assets/jogadores/times'
import { TIMES } from '../equipamentos/dados'
import { contraste, corDoJogador, corDoTimeNaFaixa } from './cor-do-time'

describe('cor do time na faixa escura', () => {
  it('todo jogador com foto tem um time que existe na tabela de times', () => {
    for (const id of Object.keys(FOTOS_JOGADORES)) {
      const sigla = TIME_DO_JOGADOR[id]
      expect(sigla, `time de ${id}`).toBeDefined()
      expect(TIMES.some((t) => t.sigla === sigla), `${id}: ${sigla}`).toBe(true)
    }
  })

  it('toda cor de time se lê no fundo escuro', () => {
    for (const t of TIMES) expect(contraste(corDoTimeNaFaixa(t.sigla)!, '#1f2019'), t.sigla).toBeGreaterThanOrEqual(3)
  })

  it('mantém a cor principal quando ela aparece e usa a segunda quando some no fundo', () => {
    expect(corDoTimeNaFaixa('ATL')).toBe('#E03A3E')
    expect(corDoTimeNaFaixa('BOS')).toMatch(/^#[0-9A-F]{6}$/)
    expect(corDoTimeNaFaixa('BOS')).not.toBe('#BA9653')
    expect(corDoTimeNaFaixa('DEN')).toBe('#FEC524')
    expect(corDoTimeNaFaixa('BKN')).toBe('#FFFFFF')
    expect(corDoTimeNaFaixa('XXX')).toBeUndefined()
  })

  it('acha a cor pelo id do jogador e ignora id desconhecido', () => {
    expect(corDoJogador('luka-doncic')).toBe(corDoTimeNaFaixa('LAL'))
    expect(corDoJogador('nao-existe')).toBeUndefined()
  })
})

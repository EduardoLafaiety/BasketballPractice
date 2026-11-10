import { describe, expect, it } from 'vitest'
import { escudos, timesCitados } from './escudos'

const siglas = (texto: string) => timesCitados(texto).map((t) => t.sigla)

describe('Escudos dos times', () => {
  it('monta o endereço do CDN da ESPN com a sigla dela, nas versões clara e escura', () => {
    expect(escudos('UTAH')).toEqual({
      escudo: 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/nba/500/utah.png&h=56&w=56',
      escudoEscuro: 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/nba/500-dark/utah.png&h=56&w=56',
    })
  })

  it('acha os times citados na ordem em que aparecem, com os apelidos da imprensa', () => {
    expect(siglas('Sixers beat the Knicks as Cavs and Blazers watch')).toEqual(['PHI', 'NYK', 'CLE'])
    expect(siglas('Trail Blazers waive guard')).toEqual(['POR'])
    expect(siglas('Spurs, Warriors')).toEqual(['SAS', 'GSW'])
  })

  it('usa a sigla da ESPN no escudo (Warriors é GS, Jazz é UTAH)', () => {
    const [warriors, jazz] = timesCitados('Warriors at Jazz')
    expect(warriors).toMatchObject({ nome: 'Golden State Warriors', escudo: expect.stringContaining('/500/gs.png') })
    expect(jazz.escudoEscuro).toContain('/500-dark/utah.png')
  })

  it('só conta nome com maiúscula e palavra inteira', () => {
    expect(siglas('Feeling the heat, he pulled some magic in the clutch')).toEqual([])
    expect(siglas('The Netsuke collector')).toEqual([])
    expect(siglas('Heat-check: the Heat win')).toEqual(['MIA'])
    expect(siglas('Magic Johnson praises the Lakers')).toEqual(['LAL'])
  })

  it('no máximo três escudos, e cada time uma vez só', () => {
    expect(siglas('Lakers, Celtics, Bulls, Knicks and the Lakers again')).toEqual(['LAL', 'BOS', 'CHI'])
  })
})

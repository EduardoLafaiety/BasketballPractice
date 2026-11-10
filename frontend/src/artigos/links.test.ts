import { describe, expect, it } from 'vitest'
import { ARTIGOS } from './dados'
import { linkDaFonte } from './links'

describe('Links das fontes dos artigos', () => {
  const fontes = ARTIGOS.flatMap((a) => a.fontes.map((f) => [a.titulo, f] as const))
  const citacoes = ARTIGOS.flatMap((a) => a.ciencia.map((c) => [a.titulo, c.fonte] as const))

  it.each(fontes)('%s: "%s" tem link', (_, fonte) => {
    expect(linkDaFonte(fonte)).toMatch(/^https:\/\//)
  })

  it.each(citacoes)('%s: a citação "%s" leva ao mesmo estudo da lista de fontes', (titulo, citacao) => {
    const artigo = ARTIGOS.find((a) => a.titulo === titulo)!
    const url = linkDaFonte(citacao)
    expect(url).toMatch(/^https:\/\//)
    expect(artigo.fontes.map(linkDaFonte)).toContain(url)
  })

  it('estudos vão pelo DOI; instituições, pelo site oficial', () => {
    expect(linkDaFonte('Mah CD, Mah KE, Kezirian EJ, Dement WC. The effects of sleep extension on the athletic performance of collegiate basketball players. Sleep, 2011.')).toBe('https://doi.org/10.5665/sleep.1132')
    expect(linkDaFonte('Mah CD, Mah KE, Kezirian EJ, Dement WC. Sleep, 2011.')).toBe('https://doi.org/10.5665/sleep.1132')
    expect(linkDaFonte('FIBA, história da federação e do basquete olímpico.')).toBe('https://www.fiba.basketball/')
    // "NBA" não pode ser confundida com outra instituição que comece parecido.
    expect(linkDaFonte('NBA, história da liga.')).toBe('https://www.nba.com/history')
    expect(linkDaFonte('NCAA, histórico de regras.')).toBe('https://www.ncaa.org/')
  })

  it('referência desconhecida fica sem link, em vez de um link errado', () => {
    expect(linkDaFonte('Silva J. Um estudo que não está na lista. Revista, 2020.')).toBeNull()
    expect(linkDaFonte('Mah CD et al. Sleep, 2012.')).toBeNull()
  })
})

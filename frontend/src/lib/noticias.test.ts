import { describe, expect, it } from 'vitest'
import { assuntoDa } from './noticias'

describe('Assunto da manchete', () => {
  it.each([
    ['Brandon Miller acerta extensão de 5 anos e US$ 209 milhões com o Hornets', 'mercado'],
    ['Lakers trocam armador por duas escolhas de draft', 'mercado'],
    ['Curry sofre entorse no tornozelo e desfalca o Warriors', 'lesao'],
    ['NBB 2026/27 é lançado na Gávea, no Rio de Janeiro', 'nbb'],
    ['Franca vence o Flamengo na prorrogação', 'nbb'],
    ['Knicks e 76ers se enfrentam em 30/10 pela fase de grupos da NBA Cup', 'nba'],
    ['Seleção brasileira convoca 14 para a AmeriCup', 'selecao'],
    ['Caitlin Clark bate recorde de assistências na WNBA', 'wnba'],
    ['Ernie Johnson anuncia que esta será sua última temporada', 'basquete'],
  ])('%s → %s', (titulo, assunto) => {
    expect(assuntoDa(titulo)).toBe(assunto)
  })
})

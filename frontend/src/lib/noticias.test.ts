import { describe, expect, it } from 'vitest'
import { tempoAtras } from './noticias'

describe('Há quanto tempo a notícia saiu', () => {
  const agora = Date.parse('2026-11-13T12:00:00Z')
  const antes = (minutos: number) => new Date(agora - minutos * 60_000).toISOString()

  it('conta em minutos, horas e dias', () => {
    expect(tempoAtras(antes(0), agora)).toBe('agora')
    expect(tempoAtras(antes(1), agora)).toBe('há 1 min')
    expect(tempoAtras(antes(59), agora)).toBe('há 59 min')
    expect(tempoAtras(antes(60), agora)).toBe('há 1 h')
    expect(tempoAtras(antes(23 * 60 + 59), agora)).toBe('há 23 h')
    expect(tempoAtras(antes(24 * 60), agora)).toBe('há 1 dia')
    expect(tempoAtras(antes(3 * 24 * 60), agora)).toBe('há 3 dias')
  })

  it('uma data no futuro (relógio adiantado) vira "agora"', () => {
    expect(tempoAtras(antes(-5), agora)).toBe('agora')
  })
})

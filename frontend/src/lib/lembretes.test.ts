import { describe, expect, it } from 'vitest'
import { marcarLembrado, proximoLembrete } from './lembretes'

// 29/10/2026 é uma quinta-feira (dia 4).
const quinta = (hora: number, minuto = 0) => new Date(2026, 9, 29, hora, minuto)

describe('proximoLembrete', () => {
  it('marca para hoje quando o horário ainda não passou', () => {
    const quando = proximoLembrete({ ativo: true, horario: '18:30', dias: [4] }, quinta(10))
    expect(quando).toEqual(new Date(2026, 9, 29, 18, 30))
  })

  it('pula para o próximo dia marcado quando o horário de hoje já passou', () => {
    const quando = proximoLembrete({ ativo: true, horario: '18:00', dias: [1, 4] }, quinta(19))
    expect(quando).toEqual(new Date(2026, 10, 2, 18, 0)) // segunda, 2 de novembro
  })

  it('volta ao mesmo dia na semana seguinte se só ele estiver marcado', () => {
    const quando = proximoLembrete({ ativo: true, horario: '07:00', dias: [4] }, quinta(8))
    expect(quando).toEqual(new Date(2026, 10, 5, 7, 0))
  })

  it('não agenda nada desligado ou sem dias', () => {
    expect(proximoLembrete({ ativo: false, horario: '18:00', dias: [4] }, quinta(10))).toBeNull()
    expect(proximoLembrete({ ativo: true, horario: '18:00', dias: [] }, quinta(10))).toBeNull()
  })
})

describe('marcarLembrado', () => {
  it('lembra só uma vez por dia', () => {
    expect(marcarLembrado('2026-10-29')).toBe(true)
    expect(marcarLembrado('2026-10-29')).toBe(false)
    expect(marcarLembrado('2026-10-30')).toBe(true)
  })
})

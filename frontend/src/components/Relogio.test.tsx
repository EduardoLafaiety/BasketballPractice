import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Relogio, { posse } from './Relogio'

const as = (h: number, m: number, s: number) => new Date(2026, 10, 10, h, m, s)

afterEach(() => vi.useRealTimers())

describe('Relógio de 24 segundos', () => {
  it('conta a posse de 24 até 0 e recomeça', () => {
    expect(posse(as(0, 0, 0))).toBe(24)
    expect(posse(as(0, 0, 1))).toBe(23)
    expect(posse(as(0, 0, 24))).toBe(0)
    expect(posse(as(0, 0, 25))).toBe(24)
    // O ciclo segue o dia inteiro, sem pular na virada do minuto.
    expect(posse(as(14, 37, 59)) - posse(as(14, 38, 0))).toBe(1)
  })

  it('acende a buzina no zero e o anel volta cheio de uma vez no recomeço', () => {
    vi.useFakeTimers()
    vi.setSystemTime(as(0, 0, 23).getTime() + 100)
    const { container } = render(<Relogio />)
    const caixa = container.querySelector('.shot-relogio')!
    const anel = () => container.querySelector<SVGCircleElement>('.shot-anel-tempo')!
    expect(caixa).not.toHaveClass('buzina')
    expect(anel().style.strokeDashoffset).toBe('23')

    act(() => vi.advanceTimersByTime(1000))
    expect(caixa).toHaveClass('buzina')
    expect(anel().style.strokeDashoffset).toBe('24')

    act(() => vi.advanceTimersByTime(1000))
    expect(caixa).not.toHaveClass('buzina')
    expect(anel()).toHaveClass('reinicio')
    expect(anel().style.strokeDashoffset).toBe('0')
  })
})

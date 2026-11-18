import { expect, it } from 'vitest'
import { segundosPassados } from './relogio'

it('recupera um intervalo inteiro mesmo após suspensão, sem contar frações ou tempo negativo', () => {
  expect(segundosPassados(1000, 121_999)).toBe(120)
  expect(segundosPassados(1000, 1500)).toBe(0)
  expect(segundosPassados(2000, 1000)).toBe(0)
})

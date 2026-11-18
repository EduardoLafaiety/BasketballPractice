import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import Demonstracao from './Demonstracao'
import type { Coreografia } from './motor'

vi.mock('./Demonstracao2D', () => ({ default: ({ aoVer3D }: { aoVer3D?: () => void }) => <section aria-label="Cena 2D">2D{aoVer3D && <button onClick={aoVer3D}>Ver em 3D</button>}</section> }))
vi.mock('./Demonstracao3D', () => ({ default: () => { throw new Error('Falha do módulo 3D') } }))
const coreografia = {} as Coreografia

it('começa em 2D sem testar WebGL e mantém a cena quando o navegador não suporta 3D', async () => {
  const contexto = vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
  render(<Demonstracao coreografia={coreografia} nome="Teste" />)
  expect(screen.getByRole('region', { name: 'Cena 2D' })).toBeVisible()
  expect(contexto).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Ver em 3D' }))
  expect(screen.getByRole('status')).toHaveTextContent('indisponível')
  expect(screen.getByRole('region', { name: 'Cena 2D' })).toBeVisible()
})

it('respeita preferência 3D e contém falhas do módulo sem derrubar o restante da tela', async () => {
  localStorage.setItem('bp-demo-vista', '3d')
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Chrome')
  const contexto = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => ({})) as unknown as HTMLCanvasElement['getContext'])
  vi.spyOn(console, 'error').mockImplementation(() => {})
  render(<><h1>Treino em andamento</h1><Demonstracao coreografia={coreografia} nome="Teste" /></>)
  expect(await screen.findByRole('region', { name: 'Cena 2D' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Treino em andamento' })).toBeVisible()
  expect(screen.getByRole('status')).toHaveTextContent('indisponível')
  expect(contexto).toHaveBeenCalledTimes(1)
})

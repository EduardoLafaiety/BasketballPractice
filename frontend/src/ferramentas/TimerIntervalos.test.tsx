import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TimerIntervalos from './TimerIntervalos'

// Sem Web Audio no jsdom: o som e a vibração viram espiões.
vi.mock('../lib/audio', () => ({ bipe: vi.fn(), vibrar: vi.fn() }))
const { bipe, vibrar } = await import('../lib/audio')

// Um segundo por vez, como no navegador: cada tique do relógio é renderizado.
async function passar(segundos: number) {
  for (let i = 0; i < segundos; i++) await act(() => vi.advanceTimersByTime(1000))
}
const mudar = (rotulo: string, valor: string) => fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } })
const fase = () => document.querySelector('.timer-fase')?.textContent
const relogio = () => document.querySelector('.timer-relogio')?.textContent
const bipesDeContagem = () => vi.mocked(bipe).mock.calls.filter(([f]) => f === 660).length

// Cliques síncronos: o relógio só anda quando o teste mandar.
const clicar = (nome: string) => fireEvent.click(screen.getByRole('button', { name: nome }))

function montar() {
  vi.useFakeTimers()
  render(<TimerIntervalos />)
}

describe('Timer de intervalos', () => {
  beforeEach(() => vi.mocked(bipe).mockClear())

  it('calcula a duração total com o preparo e aplica os modelos prontos', async () => {
    montar()
    expect(screen.getByText('Duração total')).toBeInTheDocument()
    expect(screen.getByText('07:35')).toBeInTheDocument()
    expect(screen.getByText(/Com 5s de preparo/)).toBeInTheDocument()

    clicar('Drible 45/15')
    expect(screen.getByLabelText('Trabalho (s)')).toHaveValue(45)
    expect(screen.getByLabelText('Descanso (s)')).toHaveValue(15)
    expect(screen.getByLabelText('Rodadas')).toHaveValue(6)
    // 5 + 6 × 45 + 5 × 15 = 350 s.
    expect(screen.getByText('05:50')).toBeInTheDocument()
  })

  it('não aceita trabalho nem rodadas abaixo de 1, nem descanso negativo', () => {
    montar()
    mudar('Trabalho (s)', '0')
    mudar('Descanso (s)', '-5')
    mudar('Rodadas', '0')
    expect(screen.getByLabelText('Trabalho (s)')).toHaveValue(1)
    expect(screen.getByLabelText('Descanso (s)')).toHaveValue(0)
    expect(screen.getByLabelText('Rodadas')).toHaveValue(1)
  })

  it('passa por preparo, trabalho e descanso em cada rodada e termina no último trabalho', async () => {
    montar()
    mudar('Trabalho (s)', '3')
    mudar('Descanso (s)', '2')
    mudar('Rodadas', '2')
    expect(screen.getByText('00:13')).toBeInTheDocument()

    clicar('Iniciar')
    expect([fase(), relogio()]).toEqual(['Prepare-se', '00:05'])
    expect(screen.getByText('Rodada 1 de 2')).toBeInTheDocument()

    await passar(4)
    expect(relogio()).toBe('00:01')
    await passar(1)
    expect([fase(), relogio()]).toEqual(['Trabalho', '00:03'])
    expect(screen.getByText('Rodada 1 de 2')).toBeInTheDocument()

    await passar(3)
    expect([fase(), relogio()]).toEqual(['Descanso', '00:02'])
    expect(screen.getByText('Rodada 1 de 2')).toBeInTheDocument()

    await passar(2)
    expect([fase(), relogio()]).toEqual(['Trabalho', '00:03'])
    expect(screen.getByText('Rodada 2 de 2')).toBeInTheDocument()

    await passar(3)
    expect(fase()).toBe('Fim! 💪')
    expect(relogio()).toBeUndefined()
    expect(vibrar).toHaveBeenLastCalledWith([300, 100, 300])
    // Bipe curto em cada um dos 3 últimos segundos de cada fase: 3 + 3 + 2 + 3.
    expect(bipesDeContagem()).toBe(11)

    // Parado no fim: o tempo não anda mais.
    await passar(10)
    expect(fase()).toBe('Fim! 💪')

    clicar('Repetir')
    expect([fase(), relogio()]).toEqual(['Prepare-se', '00:05'])
    expect(screen.getByText('Rodada 1 de 2')).toBeInTheDocument()
  })

  it('sem descanso, emenda uma rodada de trabalho na outra', async () => {
    montar()
    mudar('Trabalho (s)', '2')
    mudar('Descanso (s)', '0')
    mudar('Rodadas', '3')
    clicar('Iniciar')

    await passar(5)
    expect(screen.getByText('Rodada 1 de 3')).toBeInTheDocument()
    await passar(2)
    expect([fase(), relogio()]).toEqual(['Trabalho', '00:02'])
    expect(screen.getByText('Rodada 2 de 3')).toBeInTheDocument()
    await passar(2)
    expect(screen.getByText('Rodada 3 de 3')).toBeInTheDocument()
    await passar(2)
    expect(fase()).toBe('Fim! 💪')
    // Nunca passou pela fase de descanso (nem tocou o som dela).
    expect(bipe).not.toHaveBeenCalledWith(523, 400, 0.4)
  })

  it('pausa e continua de onde parou, e encerrar volta à configuração', async () => {
    montar()
    clicar('Iniciar')
    await passar(2)
    expect(relogio()).toBe('00:03')

    clicar('Pausar')
    await passar(10)
    expect([fase(), relogio()]).toEqual(['Prepare-se', '00:03'])

    clicar('Continuar')
    await passar(1)
    expect(relogio()).toBe('00:02')

    clicar('Encerrar')
    expect(fase()).toBeUndefined()
    expect(screen.getByRole('button', { name: 'Iniciar' })).toBeInTheDocument()
  })
})

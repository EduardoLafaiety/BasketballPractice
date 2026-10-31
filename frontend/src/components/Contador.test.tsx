import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Contador, { useContador, zonasParaLista } from './Contador'

// Sem Web Audio no jsdom: o som e a vibração viram espiões.
vi.mock('../lib/audio', () => ({ bipe: vi.fn(), vibrar: vi.fn() }))
const { bipe, vibrar } = await import('../lib/audio')

let ultimoEstado: ReturnType<typeof useContador>

function ContadorDeTeste() {
  const contador = useContador()
  ultimoEstado = contador
  return <Contador contador={contador} />
}

const placar = () => screen.getByText(/^\d+\/\d+$/).closest('.contador-placar') as HTMLElement

describe('Contador de arremessos', () => {
  it('conta acertos, aproveitamento e sequências', async () => {
    const user = userEvent.setup()
    render(<ContadorDeTeste />)
    const acertou = screen.getByRole('button', { name: /acertou/i })
    const errou = screen.getByRole('button', { name: /errou/i })

    await user.click(acertou)
    await user.click(acertou)
    await user.click(acertou)
    await user.click(errou)
    await user.click(acertou)

    const p = within(placar())
    expect(p.getByText('4/5')).toBeInTheDocument()
    expect(p.getByText('80%')).toBeInTheDocument()
    // Cada botão mostra a própria contagem.
    expect(within(acertou).getByText('4')).toBeInTheDocument()
    expect(within(errou).getByText('1')).toBeInTheDocument()
    expect(ultimoEstado.sequenciaAtual).toBe(1)
    expect(ultimoEstado.melhorSequencia).toBe(3)
    // Som agudo no acerto e grave no erro.
    expect(bipe).toHaveBeenCalledWith(1046, 90, 0.2)
    expect(bipe).toHaveBeenCalledWith(330, 90, 0.2)
    expect(vibrar).toHaveBeenCalledTimes(5)
  })

  it('desfaz o último toque e recalcula a sequência', async () => {
    const user = userEvent.setup()
    render(<ContadorDeTeste />)
    const desfazer = screen.getByRole('button', { name: 'Desfazer' })
    expect(desfazer).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /acertou/i }))
    await user.click(screen.getByRole('button', { name: /errou/i }))
    await user.click(desfazer)

    expect(within(placar()).getByText('1/1')).toBeInTheDocument()
    expect(within(screen.getByRole('button', { name: /errou/i })).getByText('0')).toBeInTheDocument()
    expect(ultimoEstado.sequenciaAtual).toBe(1)
  })

  it('sem arremessos ainda não mostra aproveitamento', () => {
    render(<ContadorDeTeste />)
    const p = within(placar())
    expect(p.getByText('–')).toBeInTheDocument()
    expect(p.getByText('0/0')).toBeInTheDocument()
  })

  it('só zera depois de confirmar', async () => {
    const user = userEvent.setup()
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<ContadorDeTeste />)
    await user.click(screen.getByRole('button', { name: /acertou/i }))

    await user.click(screen.getByRole('button', { name: 'Zerar' }))
    expect(within(placar()).getByText('1/1')).toBeInTheDocument()

    confirmar.mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: 'Zerar' }))
    expect(within(placar()).getByText('0/0')).toBeInTheDocument()
  })

  it('registra cada arremesso na zona escolhida na quadra', async () => {
    const user = userEvent.setup()
    render(<ContadorDeTeste />)
    await user.click(screen.getByRole('button', { name: /marcar a zona/i }))

    await user.click(screen.getByRole('button', { name: 'Três — topo' }))
    expect(screen.getByText('Zona: Três — topo')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /acertou/i }))
    await user.click(screen.getByRole('button', { name: /errou/i }))

    // Tocar de novo na mesma zona desmarca: o próximo arremesso fica sem zona.
    await user.click(screen.getByRole('button', { name: /Três — topo/ }))
    await user.click(screen.getByRole('button', { name: /acertou/i }))

    expect(zonasParaLista(ultimoEstado.zonas)).toEqual([{ zona: 'tres_topo', acertos: 1, tentativas: 2 }])
    expect(ultimoEstado.tentativas).toBe(3)
  })
})

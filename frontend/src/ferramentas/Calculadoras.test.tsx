import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Calculadoras from './Calculadoras'

const resultado = (rotulo: string) => screen.getByText(rotulo, { selector: 'dt' }).nextElementSibling
const mudar = (rotulo: string, valor: string) => fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } })
const meta = () => screen.getByRole('heading', { name: 'Quanto falta para a meta?' }).closest('section')!.querySelector('.resultado-grande')

describe('Calculadoras', () => {
  it('calcula FG%, eFG%, TS% e pontos com os valores do exemplo', () => {
    render(<Calculadoras />)
    // 7/15 de quadra, 2 de três, 4/5 nos lances livres.
    expect(resultado('FG%')).toHaveTextContent('46,7%')
    expect(resultado('eFG%')).toHaveTextContent('53,3%')
    expect(resultado('Pontos')).toHaveTextContent('20')
    expect(resultado('TS%')).toHaveTextContent('58,1%')
  })

  it('recalcula ao digitar, aceitando vírgula decimal e ignorando texto inválido', () => {
    render(<Calculadoras />)
    mudar('Cestas de quadra', '10')
    mudar('Arremessos de quadra', '20')
    mudar('…sendo de três', '4')
    mudar('Lances livres convertidos', '0')
    mudar('Lances livres tentados', '0')
    expect(resultado('FG%')).toHaveTextContent('50%')
    expect(resultado('eFG%')).toHaveTextContent('60%')
    expect(resultado('Pontos')).toHaveTextContent('24')
    expect(resultado('TS%')).toHaveTextContent('60%')

    // Número negativo conta como zero.
    mudar('Cestas de quadra', '-4')
    expect(resultado('FG%')).toHaveTextContent(/^0%$/)

    mudar('Cestas de quadra', '21')
    expect(screen.getByText('Cestas não podem passar dos arremessos.')).toBeInTheDocument()
    mudar('Cestas de quadra', '20')
    expect(resultado('FG%')).toHaveTextContent('100%')

    mudar('Arremessos de quadra', 'abc')
    expect(screen.getByText('Cestas não podem passar dos arremessos.')).toBeInTheDocument()
    expect(screen.queryByText('FG%')).toBeNull()
  })

  it('não deixa as bolas de três passarem do total de cestas', () => {
    render(<Calculadoras />)
    mudar('Cestas de quadra', '2')
    mudar('Arremessos de quadra', '4')
    mudar('…sendo de três', '9')
    mudar('Lances livres convertidos', '0')
    // Conta como 2 de três: eFG = (2 + 1) / 4.
    expect(resultado('eFG%')).toHaveTextContent('75%')
    expect(resultado('Pontos')).toHaveTextContent('6')
  })

  it('sem arremessos, mostra “—” em vez de dividir por zero', () => {
    render(<Calculadoras />)
    mudar('Cestas de quadra', '0')
    mudar('Arremessos de quadra', '0')
    mudar('Lances livres tentados', '0')
    expect(resultado('FG%')).toHaveTextContent('—')
    expect(resultado('eFG%')).toHaveTextContent('—')
    expect(resultado('TS%')).toHaveTextContent('—')
  })

  it('diz quantos acertos seguidos faltam para a meta', () => {
    render(<Calculadoras />)
    // 30/80 (37,5%) até 45%: (0,45·80 − 30) / 0,55 = 10,9 → 11.
    expect(meta()).toHaveTextContent('Faltam 11 acertos seguidos para chegar a 45%.')

    mudar('Meta (%)', '37,5')
    expect(meta()).toHaveTextContent('Meta já alcançada! 🎯')

    mudar('Meta (%)', '100')
    expect(meta()).toHaveTextContent('Com algum erro já registrado, 100% não é mais possível.')

    mudar('Acertos até agora', '81')
    expect(meta()).toHaveTextContent('Acertos não podem passar das tentativas.')
  })

  it('converte metros em pés e pés em metros', () => {
    render(<Calculadoras />)
    expect(screen.getByLabelText('Pés')).toHaveValue('22.15')

    mudar('Metros', '3,05')
    expect(screen.getByLabelText('Pés')).toHaveValue('10.01')

    mudar('Pés', '23.75')
    expect(screen.getByLabelText('Metros')).toHaveValue('7.24')
    expect(screen.getByText('Linha de três NBA (topo)').nextElementSibling).toHaveTextContent('7,24 m · 23,8 pés')
  })
})

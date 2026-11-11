import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { definirToken } from '../api'
import { apiFalsa, configFalsa, Resposta, usuarioFalso } from '../test/api-falsa'
import { abrirApp } from '../test/renderizar'

const skills = [
  { id: 'lance_livre', name: 'Lance livre', test: 'lances_1min', zero: 0, top: 18 },
  { id: 'arremesso', name: 'Arremesso', test: 'arremesso_5_pontos', zero: 0, top: 22 },
  { id: 'drible', name: 'Drible', test: 'drible_cones', zero: 30, top: 9 },
  { id: 'salto', name: 'Salto', test: 'impulsao', zero: 10, top: 85 },
]

const mes = (month: string, notas: (number | null)[]) => {
  const medidas = notas.filter((n): n is number => n !== null)
  return {
    month,
    skills: Object.fromEntries(skills.map((s, i) => [s.id, notas[i] === null ? null : { value: notas[i]! / 5, rating: notas[i] }])),
    overall: medidas.length ? Math.round(medidas.reduce((a, b) => a + b, 0) / medidas.length) : null,
    complete: medidas.length === 4,
  }
}

function abrirCartao(months: object[], rotas: Parameters<typeof apiFalsa>[0] = {}) {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-10T10:00:00-03:00'))
  definirToken('tk')
  const api = apiFalsa({
    'GET /auth/me': usuarioFalso(),
    'GET /settings': configFalsa,
    'GET /card': { skills, months, current: months.at(-1) ?? null },
    'GET /tests': [],
    ...rotas,
  })
  abrirApp('/cartao')
  return api
}

afterEach(() => {
  vi.useRealTimers()
})

describe('Cartão do atleta', () => {
  it('sem testes, convida a começar a bateria', async () => {
    abrirCartao([])
    expect(await screen.findByText(/Seu cartão aparece depois do primeiro teste/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Registrar' })).toHaveLength(4)
  })

  it('mostra a nota geral, as notas por habilidade, o radar e a evolução', async () => {
    abrirCartao([mes('2026-10', [50, 40, 30, null]), mes('2026-11', [66, 45, 60, 52])])

    const ficha = await screen.findByLabelText('Nota geral 56')
    expect(within(ficha).getByText('Marina Silva')).toBeInTheDocument()
    expect(within(ficha).getByText(/Este mês/)).toBeInTheDocument()
    expect(within(ficha).getByText('Bateria completa')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Radar das notas: Lance livre 66, Arremesso 45, Drible 60, Salto 52' })).toBeInTheDocument()

    const tabela = screen.getByRole('table')
    const linhas = within(tabela).getAllByRole('row')
    expect(linhas[1]).toHaveTextContent(/nov\.? de 2026|nov 2026/i)
    expect(within(linhas[2]).getAllByRole('cell').map((c) => c.textContent)).toEqual(['50', '40', '30', '—', '40'])
  })

  it('cartão de outro mês aparece como o último, com aviso do que falta', async () => {
    abrirCartao([mes('2026-09', [50, null, null, 40])])
    const ficha = await screen.findByLabelText('Nota geral 45')
    expect(within(ficha).getByText(/Último cartão/)).toBeInTheDocument()
    expect(within(ficha).getByText('Faltam 2 testes da bateria')).toBeInTheDocument()
    expect(screen.queryByText(/Este mês:/)).toBeNull()
  })

  it('registra um teste da bateria e atualiza o cartão', async () => {
    const user = userEvent.setup()
    let months = [mes('2026-11', [null, null, null, 52])]
    const { ultima } = abrirCartao(months, {
      'GET /card': () => ({ skills, months, current: months.at(-1) }),
      'POST /tests': (corpo: unknown) => {
        months = [mes('2026-11', [55, null, null, 52])]
        return new Resposta(201, { id: 9, ...(corpo as object), notes: null })
      },
    })

    const drible = (await screen.findByRole('heading', { name: 'Lance livre' })).closest('form')!
    await user.type(within(drible).getByLabelText('Resultado (cestas)'), '11')
    await user.click(within(drible).getByRole('button', { name: 'Registrar' }))

    expect(ultima('POST', '/tests')?.corpo).toMatchObject({ kind: 'lances_1min', value: 11 })
    expect(await screen.findByLabelText('Nota geral 54')).toBeInTheDocument()
    expect(within(drible).getByText(/Este mês:/)).toHaveTextContent('nota 55')
  })

  it('mostra o erro do servidor para valor impossível', async () => {
    const user = userEvent.setup()
    abrirCartao([], { 'POST /tests': new Resposta(400, { error: 'Valor fora do possível para este teste' }) })
    const salto = (await screen.findByRole('heading', { name: 'Salto' })).closest('form')!
    await user.type(within(salto).getByLabelText('Resultado (cm)'), '400')
    await user.click(within(salto).getByRole('button', { name: 'Registrar' }))
    expect(await within(salto).findByRole('alert')).toHaveTextContent('Valor fora do possível')
  })
})

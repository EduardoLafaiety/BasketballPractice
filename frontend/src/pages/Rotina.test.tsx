import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { definirToken } from '../api'
import { apiFalsa, configFalsa, Resposta, usuarioFalso } from '../test/api-falsa'
import { abrirApp } from '../test/renderizar'

const catalogo = [
  { id: 1, name: 'Lance livre', category: 'arremesso', metric: 'acertos', description: null, custom: false },
  { id: 2, name: 'Suicídio', category: 'condicionamento', metric: 'tempo', description: null, custom: false },
]

type Corpo = { name: string; description: string; exercises: { exerciseId: number }[] }

/** Servidor de rotina em memória: guarda os treinos "bp-rotina:<dia>" criados e editados pela página. */
function servidorDeRotina(inicial: Record<number, Corpo & { id: number }> = {}) {
  const treinos = new Map(Object.values(inicial).map((t) => [t.id, t]))
  let proximoId = 50
  const rotas: Parameters<typeof apiFalsa>[0] = {
    'GET /auth/me': usuarioFalso(),
    'GET /settings': configFalsa,
    'GET /exercises': catalogo,
    'GET /plans/templates': [],
    'GET /workouts': () => [...treinos.values()].map(({ exercises: _, ...resumo }) => resumo),
    'POST /workouts': (corpo) => {
      const novo = { id: proximoId++, ...(corpo as Corpo) }
      treinos.set(novo.id, novo)
      return novo
    },
    'GET /workouts/:id': (_corpo, _url, { id }) => treinos.get(Number(id)) ?? new Resposta(404),
    'PUT /workouts/:id': (corpo, _url, { id }) => {
      if (!treinos.has(Number(id))) return new Resposta(404)
      const salvo = { id: Number(id), ...(corpo as Corpo) }
      treinos.set(salvo.id, salvo)
      return salvo
    },
  }
  return { treinos, rotas }
}

function abrirRotina(rotas: Parameters<typeof apiFalsa>[0]) {
  definirToken('tk')
  const api = apiFalsa(rotas)
  abrirApp('/rotina')
  return api
}

const cartaoDoDia = (dia: string) => screen.getByRole('heading', { name: dia }).closest('.dia') as HTMLElement

describe('Rotina semanal', () => {
  it('mostra os exercícios de cada dia salvos no servidor', async () => {
    const { rotas } = servidorDeRotina({
      3: { id: 3, name: 'Rotina de quarta', description: 'bp-rotina:3', exercises: [{ exerciseId: 2 }, { exerciseId: 1 }] },
    })
    abrirRotina(rotas)

    await screen.findByRole('heading', { name: 'Quarta' })
    const quarta = cartaoDoDia('Quarta')
    expect(within(quarta).getAllByRole('link').map((l) => l.textContent)).toEqual(['Suicídio', 'Lance livre'])
    expect(within(quarta).getByText('2 treinos')).toBeInTheDocument()
    expect(within(cartaoDoDia('Segunda')).getByText('Descanso')).toBeInTheDocument()
  })

  it('cria o treino do dia uma só vez, mesmo com a segunda adição antes da primeira terminar de salvar', async () => {
    const user = userEvent.setup()
    const { treinos, rotas } = servidorDeRotina()
    // O servidor só responde à criação quando o teste liberar.
    let liberar = () => {}
    const criar = rotas['POST /workouts'] as (corpo: unknown) => unknown
    const { chamadas } = abrirRotina({
      ...rotas,
      'POST /workouts': (corpo) => new Promise((pronto) => (liberar = () => pronto(criar(corpo)))),
    })
    const seletor = await screen.findByRole('combobox', { name: 'Adicionar treino: Segunda' })

    await user.selectOptions(seletor, 'Lance livre')
    await user.selectOptions(seletor, 'Suicídio')
    await waitFor(() => expect(chamadas.some((c) => c.metodo === 'POST')).toBe(true))
    liberar()

    await waitFor(() => expect(treinos.get(50)?.exercises).toEqual([{ exerciseId: 1 }, { exerciseId: 2 }]))
    const gravacoes = chamadas.filter((c) => c.metodo !== 'GET').map((c) => `${c.metodo} ${c.caminho}`)
    expect(gravacoes).toEqual(['POST /workouts', 'PUT /workouts/50'])
    expect(treinos.get(50)).toMatchObject({ name: 'Rotina de segunda', description: 'bp-rotina:1' })
    expect(within(cartaoDoDia('Segunda')).getAllByRole('link').map((l) => l.textContent)).toEqual(['Lance livre', 'Suicídio'])
  })

  it('remove o exercício certo quando o mesmo aparece duas vezes no dia', async () => {
    const user = userEvent.setup()
    const { treinos, rotas } = servidorDeRotina({
      1: { id: 1, name: 'Rotina de segunda', description: 'bp-rotina:1', exercises: [{ exerciseId: 1 }, { exerciseId: 2 }, { exerciseId: 1 }] },
    })
    abrirRotina(rotas)
    await screen.findByRole('heading', { name: 'Segunda' })

    await user.click(within(cartaoDoDia('Segunda')).getAllByRole('button', { name: 'Remover Lance livre' })[1])
    await waitFor(() => expect(treinos.get(1)?.exercises).toEqual([{ exerciseId: 1 }, { exerciseId: 2 }]))
  })

  it('desfaz a mudança e avisa quando o servidor recusa', async () => {
    const user = userEvent.setup()
    const { rotas } = servidorDeRotina()
    // Depois de carregar, a recarga fica pendurada: a tela precisa desfazer sozinha, sem depender dela.
    let carregou = false
    const listar = rotas['GET /workouts'] as () => unknown
    abrirRotina({
      ...rotas,
      'GET /workouts': () => (carregou ? new Promise(() => {}) : ((carregou = true), listar())),
      'POST /workouts': new Resposta(500, { error: 'Banco fora do ar' }),
    })
    const seletor = await screen.findByRole('combobox', { name: 'Adicionar treino: Sexta' })

    await user.selectOptions(seletor, 'Lance livre')

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar a rotina: Banco fora do ar')
    await waitFor(() => expect(within(cartaoDoDia('Sexta')).queryByRole('link')).toBeNull())
    expect(within(cartaoDoDia('Sexta')).getByText('Descanso')).toBeInTheDocument()
  })

  it('só troca a semana inteira por um modelo depois de confirmar', async () => {
    const user = userEvent.setup()
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { treinos, rotas } = servidorDeRotina()
    const modelo = { id: 'arremessador', name: 'Arremessador', description: 'Foco em arremesso', days: { 1: [{ exerciseId: 1 }], 4: [{ exerciseId: 1 }, { exerciseId: 2 }] } }
    const { chamadas } = abrirRotina({ ...rotas, 'GET /plans/templates': [modelo] })

    await user.click(await screen.findByRole('button', { name: /Usar um modelo pronto/ }))
    await user.click(screen.getByRole('button', { name: 'Aplicar' }))
    expect(chamadas.some((c) => c.metodo !== 'GET')).toBe(false)

    // Cancelar deixa a lista de modelos aberta.
    confirmar.mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: 'Aplicar' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Rotina “Arremessador” aplicada.')
    await waitFor(() => expect(treinos.size).toBe(7))
    const porDia = Object.fromEntries([...treinos.values()].map((t) => [t.description, t.exercises.map((e) => e.exerciseId)]))
    expect(porDia).toEqual({
      'bp-rotina:0': [],
      'bp-rotina:1': [1],
      'bp-rotina:2': [],
      'bp-rotina:3': [],
      'bp-rotina:4': [1, 2],
      'bp-rotina:5': [],
      'bp-rotina:6': [],
    })
  })
})

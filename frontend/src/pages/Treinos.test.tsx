import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { definirToken } from '../api'
import { apiFalsa, configFalsa, Resposta, usuarioFalso } from '../test/api-falsa'
import { abrirApp } from '../test/renderizar'

vi.mock('../lib/audio', () => ({ bipe: vi.fn(), vibrar: vi.fn() }))

type Exercicio = { id: number; name: string; category: string; metric: string; description: string | null; custom: boolean }

const exercicio = (id: number, name: string, category: string, metric: string, description: string | null = null, custom = false): Exercicio => ({
  id,
  name,
  category,
  metric,
  description,
  custom,
})

const catalogo = [
  exercicio(1, 'Lance livre', 'arremesso', 'acertos', 'Da linha de lance livre'),
  exercicio(2, 'Arremesso de média', 'arremesso', 'acertos', 'Pull-up da cabeça do garrafão'),
  exercicio(3, 'Crossover', 'drible', 'repeticoes', 'Troca de mão rápida'),
  exercicio(4, 'Suicídio', 'condicionamento', 'tempo', 'Corridas até as linhas'),
  exercicio(5, 'Bandeja', 'finalizacao', 'acertos', null),
]

/** Catálogo em memória: POST e PUT /exercises gravam nele. */
function servidorDeExercicios(inicial = catalogo) {
  const lista = [...inicial]
  let proximoId = 40
  const rotas: Parameters<typeof apiFalsa>[0] = {
    'GET /auth/me': usuarioFalso(),
    'GET /settings': configFalsa,
    'GET /exercises': () => lista,
    'POST /exercises': (corpo) => {
      const novo = { id: proximoId++, custom: true, ...(corpo as Omit<Exercicio, 'id' | 'custom'>) }
      lista.push(novo)
      return novo
    },
    'PUT /exercises/:id': (corpo, _url, { id }) => {
      const i = lista.findIndex((e) => e.id === Number(id))
      if (i < 0) return new Resposta(404)
      lista[i] = { ...lista[i], ...(corpo as object) }
      return lista[i]
    },
  }
  return { lista, rotas }
}

function abrir(rotas: Parameters<typeof apiFalsa>[0], rota = '/treinos') {
  definirToken('tk')
  const api = apiFalsa(rotas)
  abrirApp(rota)
  return api
}

const doNivel = (id: number, name: string, level: string, position: number, warmup = false) => ({ ...exercicio(id, name, 'arremesso', 'acertos'), level, position, warmup })

describe('Níveis', () => {
  const niveis = [
    doNivel(11, 'Arremesso de três', 'avancado', 9),
    doNivel(12, 'Arremesso a um metro', 'iniciante', 3),
    doNivel(13, 'Arremesso dois passos atrás', 'iniciante', 2, true),
    doNivel(14, 'Arremesso colado à cesta', 'iniciante', 1, true),
    doNivel(15, 'Receber e arremessar', 'intermediario', 5),
    exercicio(16, 'Meu exercício', 'arremesso', 'acertos', null, true),
  ]

  it('abre no iniciante, com o aquecimento em ordem antes dos exercícios', async () => {
    abrir({ 'GET /auth/me': usuarioFalso(), 'GET /settings': configFalsa, 'GET /exercises': niveis })
    const aquecimento = await screen.findByRole('region', { name: 'Aquecimento' })
    expect(within(aquecimento).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Arremesso colado à cesta', 'Arremesso dois passos atrás'])
    expect(within(aquecimento).getByText('Passo 1')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Exercícios' })).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Arremesso a um metro', 'Meu exercício'])
    expect(screen.getByRole('button', { name: /Iniciante/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('troca de nível mantendo os exercícios do atleta', async () => {
    const user = userEvent.setup()
    abrir({ 'GET /auth/me': usuarioFalso(), 'GET /settings': configFalsa, 'GET /exercises': niveis })
    await user.click(await screen.findByRole('button', { name: /Avançado/ }))
    expect(nomesNaTela()).toEqual(['Arremesso de três', 'Meu exercício'])
    expect(screen.queryByRole('region', { name: 'Aquecimento' })).toBeNull()
  })

  it('abre direto no nível pedido no link', async () => {
    abrir({ 'GET /auth/me': usuarioFalso(), 'GET /settings': configFalsa, 'GET /exercises': niveis }, '/treinos?nivel=intermediario')
    await waitFor(() => expect(nomesNaTela()).toEqual(['Receber e arremessar', 'Meu exercício']))
  })
})

/** Nomes dos exercícios nos cartões da biblioteca, na ordem da tela. */
const nomesNaTela = () => screen.queryAllByRole('heading', { level: 3 }).map((h) => h.textContent)

describe('Biblioteca de treinos', () => {
  it('lista o catálogo com categoria, registro e descrição', async () => {
    abrir(servidorDeExercicios().rotas)

    await screen.findByRole('heading', { name: 'Lance livre' })
    expect(nomesNaTela()).toEqual(['Lance livre', 'Arremesso de média', 'Crossover', 'Suicídio', 'Bandeja'])
    const cartao = screen.getByRole('link', { name: /Crossover/ })
    expect(cartao).toHaveAttribute('href', '/treinos/3')
    expect(within(cartao).getByText('Drible')).toBeInTheDocument()
    expect(within(cartao).getByText('Repetições')).toBeInTheDocument()
    expect(within(cartao).getByText('Troca de mão rápida')).toBeInTheDocument()
    expect(within(screen.getByRole('link', { name: /Bandeja/ })).getByText('Finalização')).toBeInTheDocument()
  })

  it('não tem busca, filtros por categoria ou registro, nem o botão de novo exercício', async () => {
    abrir(servidorDeExercicios().rotas)
    await screen.findByRole('heading', { name: 'Treinos', level: 1 })

    expect(screen.queryByPlaceholderText('Buscar treino')).toBeNull()
    expect(screen.queryByRole('combobox')).toBeNull()
    for (const nome of ['Todas', 'Arremesso', 'Drible', 'Passe', 'Finalização', 'Defesa', 'Condicionamento']) {
      expect(screen.queryByRole('button', { name: nome })).toBeNull()
    }
    expect(screen.queryByRole('button', { name: '+ Novo exercício' })).toBeNull()
  })

  it('mostra o erro e tenta de novo quando o catálogo não carrega', async () => {
    const user = userEvent.setup()
    const { rotas } = servidorDeExercicios()
    let falhar = true
    abrir({ ...rotas, 'GET /exercises': () => (falhar ? new Resposta(500, { error: 'Banco fora do ar' }) : catalogo) })

    expect(await screen.findByRole('alert')).toHaveTextContent('Banco fora do ar')
    falhar = false
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByRole('heading', { name: 'Lance livre' })).toBeInTheDocument()
  })
})

describe('Editar exercício', () => {
  it('abre o formulário com os dados atuais e salva as mudanças no mesmo exercício', async () => {
    const user = userEvent.setup()
    const meu = exercicio(9, 'Meu floater', 'finalizacao', 'acertos', 'Por cima do pivô', true)
    const { lista, rotas } = servidorDeExercicios([...catalogo, meu])
    const { ultima } = abrir(rotas, '/treinos/9')

    await user.click(await screen.findByRole('button', { name: 'Editar exercício' }))
    expect(screen.getByRole('heading', { name: 'Editar exercício' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toHaveValue('Meu floater')
    expect(screen.getByLabelText('Categoria')).toHaveValue('Finalização')
    expect(screen.getByLabelText('Como medir')).toHaveValue('acertos')
    expect(screen.getByLabelText('Descrição')).toHaveValue('Por cima do pivô')

    await user.clear(screen.getByLabelText('Nome'))
    await user.type(screen.getByLabelText('Nome'), 'Floater alto')
    await user.selectOptions(screen.getByLabelText('Como medir'), 'Tempo')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Floater alto' })).toBeInTheDocument()
    expect(ultima('PUT', '/exercises/9')?.corpo).toEqual({
      name: 'Floater alto',
      category: 'finalizacao',
      metric: 'tempo',
      description: 'Por cima do pivô',
    })
    expect(lista.filter((e) => e.custom)).toHaveLength(1)
    expect(screen.queryByLabelText('Nome')).toBeNull()
  })
})

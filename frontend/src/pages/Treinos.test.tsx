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

  it('filtra por categoria e por forma de registro, e os filtros se somam', async () => {
    const user = userEvent.setup()
    abrir(servidorDeExercicios().rotas)
    await screen.findByRole('heading', { name: 'Lance livre' })

    await user.click(screen.getByRole('button', { name: 'Arremesso' }))
    expect(nomesNaTela()).toEqual(['Lance livre', 'Arremesso de média'])

    await user.click(screen.getByRole('button', { name: 'Todas' }))
    await user.selectOptions(screen.getByRole('combobox'), 'Acertos e tentativas')
    expect(nomesNaTela()).toEqual(['Lance livre', 'Arremesso de média', 'Bandeja'])

    await user.click(screen.getByRole('button', { name: 'Finalização' }))
    expect(nomesNaTela()).toEqual(['Bandeja'])

    await user.click(screen.getByRole('button', { name: 'Condicionamento' }))
    expect(nomesNaTela()).toEqual([])
    expect(screen.getByText('Nenhum treino encontrado com esses filtros.')).toBeInTheDocument()
  })

  it('busca no nome e na descrição sem diferenciar maiúsculas nem acentos', async () => {
    const user = userEvent.setup()
    abrir(servidorDeExercicios().rotas)
    const busca = await screen.findByPlaceholderText('Buscar treino…')

    await user.type(busca, 'MEDIA')
    expect(nomesNaTela()).toEqual(['Arremesso de média'])

    await user.clear(busca)
    await user.type(busca, 'garrafao')
    expect(nomesNaTela()).toEqual(['Arremesso de média'])

    await user.clear(busca)
    await user.type(busca, '  suicidio ')
    expect(nomesNaTela()).toEqual(['Suicídio'])

    // A busca também respeita a categoria escolhida.
    await user.clear(busca)
    await user.type(busca, 'linha')
    expect(nomesNaTela()).toEqual(['Lance livre', 'Suicídio'])
    await user.click(screen.getByRole('button', { name: 'Arremesso' }))
    expect(nomesNaTela()).toEqual(['Lance livre'])
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

describe('Novo exercício', () => {
  it('cria o exercício com os dados do formulário e abre a página dele', async () => {
    const user = userEvent.setup()
    const { lista, rotas } = servidorDeExercicios()
    const { ultima } = abrir(rotas)

    await user.click(await screen.findByRole('button', { name: '+ Novo exercício' }))
    expect(screen.queryByRole('button', { name: '+ Novo exercício' })).toBeNull()
    await user.type(screen.getByLabelText('Nome'), '  Floater  ')
    await user.selectOptions(screen.getByLabelText('Categoria'), 'Finalização')
    await user.selectOptions(screen.getByLabelText('Como medir'), 'Repetições')
    await user.type(screen.getByLabelText('Descrição'), ' Bola alta por cima do pivô ')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(screen.getByTestId('caminho')).toHaveTextContent('/treinos/40'))
    expect(ultima('POST', '/exercises')?.corpo).toEqual({
      name: 'Floater',
      category: 'finalizacao',
      metric: 'repeticoes',
      description: 'Bola alta por cima do pivô',
    })
    expect(lista[lista.length - 1].name).toBe('Floater')
    expect(await screen.findByRole('heading', { level: 1, name: 'Floater' })).toBeInTheDocument()
  })

  it('manda descrição vazia como null e usa Arremesso / acertos como padrão', async () => {
    const user = userEvent.setup()
    const { ultima } = abrir(servidorDeExercicios().rotas)

    await user.click(await screen.findByRole('button', { name: '+ Novo exercício' }))
    await user.type(screen.getByLabelText('Nome'), 'Corner three')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(ultima('POST', '/exercises')).toBeDefined())
    expect(ultima('POST', '/exercises')?.corpo).toEqual({ name: 'Corner three', category: 'arremesso', metric: 'acertos', description: null })
  })

  it('não envia nome com menos de 2 letras (sem contar espaços)', async () => {
    const user = userEvent.setup()
    const { chamadas } = abrir(servidorDeExercicios().rotas)

    await user.click(await screen.findByRole('button', { name: '+ Novo exercício' }))
    await user.type(screen.getByLabelText('Nome'), ' a ')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(screen.getByRole('alert')).toHaveTextContent('O nome precisa ter pelo menos 2 letras.')
    expect(chamadas.some((c) => c.metodo === 'POST')).toBe(false)
  })

  it('mostra o erro do servidor e deixa tentar de novo sem perder o que foi digitado', async () => {
    const user = userEvent.setup()
    const { rotas } = servidorDeExercicios()
    const { chamadas } = abrir({ ...rotas, 'POST /exercises': new Resposta(409, { error: 'Você já tem um exercício com esse nome' }) })

    await user.click(await screen.findByRole('button', { name: '+ Novo exercício' }))
    await user.type(screen.getByLabelText('Nome'), 'Lance livre')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Você já tem um exercício com esse nome')
    expect(screen.getByLabelText('Nome')).toHaveValue('Lance livre')
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled()
    expect(screen.getByTestId('caminho')).toHaveTextContent(/^\/treinos$/)
    expect(chamadas.filter((c) => c.metodo === 'POST')).toHaveLength(1)
  })

  it('cancelar fecha o formulário sem salvar', async () => {
    const user = userEvent.setup()
    const { chamadas } = abrir(servidorDeExercicios().rotas)

    await user.click(await screen.findByRole('button', { name: '+ Novo exercício' }))
    await user.type(screen.getByLabelText('Nome'), 'Rascunho')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByLabelText('Nome')).toBeNull()
    expect(screen.getByRole('button', { name: '+ Novo exercício' })).toBeInTheDocument()
    expect(chamadas.some((c) => c.metodo === 'POST')).toBe(false)
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

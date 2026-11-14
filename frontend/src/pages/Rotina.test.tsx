import { fireEvent, screen, waitFor, within } from '@testing-library/react'
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

// O dia de hoje ganha o selo "Hoje" no título ("SextaHoje"); por isso o nome só precisa começar com o dia.
const cartaoDoDia = (dia: string) => screen.getByRole('heading', { name: new RegExp(`^${dia}`) }).closest('.dia') as HTMLElement

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

  it('mostra o placar da semana e cada dia como uma jogada numerada, com categoria e métrica', async () => {
    const { rotas } = servidorDeRotina({
      3: { id: 3, name: 'Rotina de quarta', description: 'bp-rotina:3', exercises: [{ exerciseId: 2 }, { exerciseId: 1 }] },
      5: { id: 5, name: 'Rotina de sexta', description: 'bp-rotina:5', exercises: [{ exerciseId: 1 }] },
    })
    abrirRotina(rotas)
    await screen.findByRole('heading', { name: 'Quarta' })

    const placar = screen.getByRole('region', { name: 'Resumo da semana' })
    expect(placar).toHaveTextContent('3 treinos')
    expect(placar).toHaveTextContent('2 dias de treino')
    expect(placar).toHaveTextContent('foco em Arremesso')
    // O equilíbrio lista todas as categorias; a que não tem treino fica apagada.
    const equilibrio = within(screen.getByRole('list', { name: 'Treinos por categoria' })).getAllByRole('listitem')
    expect(equilibrio.map((li) => li.textContent)).toEqual(['Arremesso 2', 'Drible 0', 'Passe 0', 'Finalização 0', 'Defesa 0', 'Condicionamento 1'])
    expect(equilibrio[0]).not.toHaveClass('apagada')
    expect(equilibrio[4]).toHaveClass('apagada')

    // O dia é uma rota: treinos numerados na ordem, cada um com a categoria e a métrica.
    const rota = within(cartaoDoDia('Quarta')).getAllByRole('listitem')
    expect(rota.map((li) => li.querySelector('.rota-no')?.textContent)).toEqual(['1', '2'])
    expect(rota.map((li) => li.querySelector('.rota-sub')?.textContent)).toEqual(['Condicionamento · Tempo', 'Arremesso · Acertos'])
    expect(rota[0]).toHaveClass('tag-Condicionamento')
    expect(cartaoDoDia('Quarta').querySelectorAll('.dia-mix i')).toHaveLength(2)
  })

  it('sem treino nenhum, o placar diz que a semana está em branco e os dias convidam a arrastar', async () => {
    abrirRotina(servidorDeRotina().rotas)
    await screen.findByRole('heading', { name: 'Quarta' })

    const placar = screen.getByRole('region', { name: 'Resumo da semana' })
    expect(placar).toHaveTextContent('0 treinos')
    expect(placar).toHaveTextContent('semana em branco')
    const quarta = cartaoDoDia('Quarta')
    expect(quarta).toHaveClass('dia-folga')
    expect(within(quarta).getByText('Descanso')).toBeInTheDocument()
    expect(within(quarta).getByText(/Arraste um treino para cá/)).toBeInTheDocument()
  })

  it('ao arrastar, a semana mostra onde soltar e o treino passa para o outro dia', async () => {
    const { rotas } = servidorDeRotina({
      3: { id: 3, name: 'Rotina de quarta', description: 'bp-rotina:3', exercises: [{ exerciseId: 2 }] },
    })
    abrirRotina(rotas)
    await screen.findByRole('heading', { name: 'Quarta' })
    const semana = cartaoDoDia('Quarta').closest('.semana')!
    const dataTransfer = { effectAllowed: 'none' }

    fireEvent.dragStart(within(cartaoDoDia('Quarta')).getByRole('listitem'), { dataTransfer })
    expect(semana).toHaveClass('em-arraste')
    fireEvent.dragOver(cartaoDoDia('Terça'), { dataTransfer })
    expect(cartaoDoDia('Terça')).toHaveClass('alvo')
    fireEvent.drop(cartaoDoDia('Terça'), { dataTransfer })

    expect(semana).not.toHaveClass('em-arraste')
    expect(cartaoDoDia('Terça')).not.toHaveClass('alvo')
    await waitFor(() => expect(within(cartaoDoDia('Terça')).getAllByRole('link').map((l) => l.textContent)).toEqual(['Suicídio']))
    expect(within(cartaoDoDia('Quarta')).queryByRole('link')).toBeNull()
  })
})

describe('Gerador da rotina semanal', () => {
  const blocos = [
    { exerciseId: 2, name: 'Suicídio', category: 'condicionamento', metric: 'tempo', minutes: 5 },
    { exerciseId: 1, name: 'Lance livre', category: 'arremesso', metric: 'acertos', minutes: 40 },
  ]
  const respostaGerador = { minutes: 45, blocks: blocos }
  const geradas = (api: ReturnType<typeof abrirRotina>) => api.chamadas.filter((c) => c.metodo === 'POST' && c.caminho === '/plans/generate').map((c) => c.corpo as Record<string, unknown>)

  it('gera a semana nos dias escolhidos, com as escolhas no pedido e sem repetir exercício entre os dias', async () => {
    const user = userEvent.setup()
    const { rotas } = servidorDeRotina()
    const api = abrirRotina({ ...rotas, 'POST /plans/generate': respostaGerador })
    await user.click(await screen.findByRole('button', { name: 'Arremesso' }))
    await user.click(screen.getByRole('button', { name: /^Avançado/ }))
    await user.click(screen.getByRole('button', { name: '60 min' }))
    await user.click(screen.getByRole('checkbox', { name: /aquecimento/ }))
    await user.click(screen.getByRole('button', { name: 'Gerar semana' }))

    // Segunda, quarta e sexta são os dias de treino de quem ainda não tem rotina.
    await waitFor(() => expect(geradas(api)).toHaveLength(3))
    const [primeiro, segundo, terceiro] = geradas(api)
    expect(primeiro).toMatchObject({ minutes: 60, focus: ['arremesso'], warmup: false, level: 'avancado' })
    expect(primeiro).not.toHaveProperty('exclude')
    expect(segundo.exclude).toEqual([2, 1])
    expect(terceiro.exclude).toEqual([2, 1, 2, 1])
    expect(new Set([primeiro.seed, segundo.seed, terceiro.seed]).size).toBe(3)
  })

  it('mostra a semana como prévia, sem salvar nada, e só vira a rotina ao aplicar', async () => {
    const user = userEvent.setup()
    const { treinos, rotas } = servidorDeRotina()
    const api = abrirRotina({ ...rotas, 'POST /plans/generate': respostaGerador })
    await user.click(await screen.findByRole('button', { name: 'Gerar semana' }))

    const aviso = await screen.findByText('Prévia, ainda não salva')
    expect(aviso.closest('section')).toHaveTextContent('6 blocos')
    const segunda = cartaoDoDia('Segunda')
    expect(within(segunda).getAllByRole('link').map((l) => l.textContent)).toEqual(['Suicídio', 'Lance livre'])
    expect(segunda.querySelectorAll('.rota-min')).toHaveLength(2)
    expect(within(segunda).getByText('2 blocos · 45 min')).toBeInTheDocument()
    expect(within(cartaoDoDia('Terça')).getByText('Descanso')).toBeInTheDocument()
    // Prévia não se edita nem se arrasta, e nada foi salvo.
    expect(within(segunda).queryByRole('button', { name: /Remover/ })).toBeNull()
    expect(within(segunda).queryByRole('combobox')).toBeNull()
    expect(api.chamadas.some((c) => c.metodo !== 'GET' && c.caminho !== '/plans/generate')).toBe(false)
    expect(treinos.size).toBe(0)

    await user.click(screen.getByRole('button', { name: 'Aplicar à rotina' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Semana gerada aplicada à sua rotina.')
    await waitFor(() => expect(treinos.size).toBe(7))
    const porDia = Object.fromEntries([...treinos.values()].map((t) => [t.description, t.exercises.map((e) => e.exerciseId)]))
    expect(porDia).toEqual({
      'bp-rotina:0': [],
      'bp-rotina:1': [2, 1],
      'bp-rotina:2': [],
      'bp-rotina:3': [2, 1],
      'bp-rotina:4': [],
      'bp-rotina:5': [2, 1],
      'bp-rotina:6': [],
    })
    // Aplicada, a prévia some e os cartões voltam a ser editáveis.
    await waitFor(() => expect(within(cartaoDoDia('Segunda')).getAllByRole('button', { name: /Remover/ })).toHaveLength(2))
    expect(screen.queryByText('Prévia, ainda não salva')).toBeNull()
  })

  it('mudar uma escolha depois de gerar remonta a semana, e descartar volta à rotina salva', async () => {
    const user = userEvent.setup()
    const { rotas } = servidorDeRotina({
      3: { id: 3, name: 'Rotina de quarta', description: 'bp-rotina:3', exercises: [{ exerciseId: 2 }] },
    })
    const api = abrirRotina({ ...rotas, 'POST /plans/generate': respostaGerador })
    // Quem já tem rotina começa com os dias dela acesos: só a quarta.
    const quartaAcesa = await screen.findByRole('button', { name: /^Quarta/ })
    expect(quartaAcesa).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /^Segunda/ })).toHaveAttribute('aria-pressed', 'false')

    await user.click(screen.getByRole('button', { name: 'Gerar semana' }))
    await waitFor(() => expect(geradas(api)).toHaveLength(1))
    await user.click(screen.getByRole('button', { name: /^Terça/ }))
    await waitFor(() => expect(geradas(api)).toHaveLength(3), { timeout: 3000 })
    await waitFor(() => expect(within(cartaoDoDia('Terça')).getAllByRole('link')).toHaveLength(2))

    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(screen.queryByText('Prévia, ainda não salva')).toBeNull()
    expect(within(cartaoDoDia('Quarta')).getAllByRole('link').map((l) => l.textContent)).toEqual(['Suicídio'])
    expect(within(cartaoDoDia('Terça')).getByText('Descanso')).toBeInTheDocument()
  })

  it('pergunta antes de trocar a rotina que já existe e não troca se a pessoa cancelar', async () => {
    const user = userEvent.setup()
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { treinos, rotas } = servidorDeRotina({
      3: { id: 3, name: 'Rotina de quarta', description: 'bp-rotina:3', exercises: [{ exerciseId: 2 }] },
    })
    const api = abrirRotina({ ...rotas, 'POST /plans/generate': respostaGerador })
    await user.click(await screen.findByRole('button', { name: 'Gerar semana' }))
    await screen.findByText('Prévia, ainda não salva')

    await user.click(screen.getByRole('button', { name: 'Aplicar à rotina' }))
    expect(confirmar).toHaveBeenCalledWith('Aplicar a semana gerada? Isso substitui toda a sua rotina semanal.')
    expect(screen.getByText('Prévia, ainda não salva')).toBeInTheDocument()
    expect(api.chamadas.some((c) => c.metodo === 'PUT' || (c.metodo === 'POST' && c.caminho === '/workouts'))).toBe(false)

    confirmar.mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: 'Aplicar à rotina' }))
    await waitFor(() => expect(treinos.get(3)?.exercises).toEqual([{ exerciseId: 2 }, { exerciseId: 1 }]))
  })

  it('mostra o erro quando o servidor não consegue montar a semana, sem criar prévia', async () => {
    const user = userEvent.setup()
    const { rotas } = servidorDeRotina()
    abrirRotina({ ...rotas, 'POST /plans/generate': new Resposta(500, { error: 'Banco fora do ar' }) })
    await user.click(await screen.findByRole('button', { name: 'Gerar semana' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Banco fora do ar')
    expect(screen.queryByText('Prévia, ainda não salva')).toBeNull()
    expect(screen.getByRole('button', { name: 'Gerar semana' })).toBeEnabled()
  })

  it('sem nenhum dia escolhido não dá para gerar, e o endereço antigo do gerador leva para a rotina', async () => {
    const user = userEvent.setup()
    definirToken('tk')
    apiFalsa({ ...servidorDeRotina().rotas, 'POST /plans/generate': respostaGerador })
    abrirApp('/gerador')

    expect(await screen.findByRole('heading', { name: 'Rotina semanal', level: 1 })).toBeInTheDocument()
    for (const dia of ['Segunda', 'Quarta', 'Sexta']) await user.click(screen.getByRole('button', { name: new RegExp(`^${dia}`) }))
    expect(screen.getByText('Escolha ao menos um dia')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gerar semana' })).toBeDisabled()
  })
})

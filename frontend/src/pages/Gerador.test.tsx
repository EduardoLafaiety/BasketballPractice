import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { definirToken } from '../api'
import { apiFalsa, configFalsa, Resposta, usuarioFalso } from '../test/api-falsa'
import { abrirApp } from '../test/renderizar'

const plano = {
  minutes: 45,
  blocks: [
    { exerciseId: 7, name: 'Aquecimento', category: 'condicionamento', metric: 'tempo', minutes: 5 },
    { exerciseId: 1, name: 'Lance livre', category: 'arremesso', metric: 'acertos', minutes: 40 },
  ],
}

function abrirGerador(rotas: Parameters<typeof apiFalsa>[0] = {}, rota = '/gerador') {
  definirToken('tk')
  const api = apiFalsa({
    'GET /auth/me': usuarioFalso(),
    'GET /settings': configFalsa,
    'GET /workouts': [],
    'POST /plans/generate': plano,
    ...rotas,
  })
  abrirApp(rota)
  return api
}

describe('Gerador de treino', () => {
  it.each([
    ['/gerador?minutos=15', 15],
    ['/gerador', 45],
    ['/gerador?minutos=7', 45],
    ['/gerador?minutos=abc', 45],
  ])('%s abre com %i minutos', async (rota, minutos) => {
    const user = userEvent.setup()
    const { ultima } = abrirGerador({}, rota)
    await user.click(await screen.findByRole('button', { name: 'Gerar treino' }))
    await waitFor(() => expect(ultima('POST', '/plans/generate')?.corpo).toMatchObject({ minutes: minutos }))
  })

  it('pede o treino com o tempo, o foco e o aquecimento escolhidos', async () => {
    const user = userEvent.setup()
    const { ultima } = abrirGerador()
    await user.click(await screen.findByRole('button', { name: 'Arremesso' }))
    await user.click(screen.getByRole('button', { name: 'Defesa' }))
    await user.click(screen.getByRole('button', { name: 'Defesa' }))
    await user.click(screen.getByRole('checkbox', { name: /aquecimento/ }))
    await user.click(screen.getByRole('button', { name: 'Gerar treino' }))

    expect(await screen.findByRole('heading', { name: 'Seu treino' })).toBeInTheDocument()
    expect(ultima('POST', '/plans/generate')?.corpo).toEqual({ minutes: 45, focus: ['arremesso'], warmup: false, level: 'iniciante' })
    expect(screen.getByRole('button', { name: 'Gerar outro' })).toBeInTheDocument()
  })

  it('os atalhos de tempo e o nível valem no pedido, e o resumo acompanha as escolhas', async () => {
    const user = userEvent.setup()
    const { ultima } = abrirGerador()
    const resumo = await screen.findByText('45 min · Iniciante · Treino completo · Com aquecimento')
    expect(screen.getByRole('button', { name: '45 min' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: '30 min' }))
    expect(screen.getByRole('button', { name: '30 min' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '45 min' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('slider')).toHaveValue('30')

    await user.click(screen.getByRole('button', { name: /Avançado/ }))
    expect(screen.getByRole('button', { name: /Avançado/ })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Passe' }))
    await user.click(screen.getByRole('button', { name: 'Defesa' }))
    await user.click(screen.getByRole('checkbox', { name: /aquecimento/ }))
    expect(resumo).toHaveTextContent('30 min · Avançado · Passe, Defesa · Sem aquecimento')

    await user.click(screen.getByRole('button', { name: 'Gerar treino' }))
    await waitFor(() =>
      expect(ultima('POST', '/plans/generate')?.corpo).toEqual({ minutes: 30, focus: ['passe', 'defesa'], warmup: false, level: 'avancado' }),
    )
  })

  it('leva o plano para a sessão guiada com o título montado pelo foco', async () => {
    const user = userEvent.setup()
    abrirGerador()
    await user.click(await screen.findByRole('button', { name: 'Arremesso' }))
    await user.click(screen.getByRole('button', { name: 'Gerar treino' }))
    await user.click(await screen.findByRole('button', { name: 'Começar sessão guiada' }))

    expect(await screen.findByRole('heading', { name: 'Treino de 45 min — arremesso' })).toBeInTheDocument()
    expect(screen.getByTestId('caminho')).toHaveTextContent('/sessao')
    expect(screen.getByText(/2 exercícios · 45 min/)).toBeInTheDocument()
  })

  it('salva o plano como treino com o nome digitado e o tempo de cada bloco', async () => {
    const user = userEvent.setup()
    const { ultima } = abrirGerador({ 'POST /workouts': { id: 80, name: 'Pré-jogo', description: null, exercises: [] } })
    await user.click(await screen.findByRole('button', { name: 'Gerar treino' }))
    await user.type(await screen.findByLabelText('Nome do treino'), '  Pré-jogo ')
    await user.click(screen.getByRole('button', { name: 'Salvar como treino' }))

    expect(await screen.findByRole('status')).toHaveTextContent('"Pré-jogo" foi salvo nos seus treinos.')
    expect(ultima('POST', '/workouts')?.corpo).toEqual({
      name: 'Pré-jogo',
      exercises: [
        { exerciseId: 7, targetSeconds: 300 },
        { exerciseId: 1, targetSeconds: 2400 },
      ],
    })
  })

  it('pergunta antes de substituir um dia da rotina que já tem treinos', async () => {
    const user = userEvent.setup()
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { chamadas } = abrirGerador({
      'GET /workouts': [{ id: 3, name: 'Rotina de segunda', description: 'bp-rotina:1' }],
      'GET /workouts/3': { id: 3, name: 'Rotina de segunda', description: 'bp-rotina:1', exercises: [{ exerciseId: 9 }] },
      'PUT /workouts/3': (corpo) => ({ id: 3, ...(corpo as object) }),
    })
    await user.click(await screen.findByRole('button', { name: 'Gerar treino' }))
    const rotina = await screen.findByRole('combobox', { name: 'Definir rotina' })
    await waitFor(() => expect(rotina).toBeEnabled())
    expect(screen.getByRole('option', { name: 'Definir rotina' })).toHaveValue('')

    await user.selectOptions(rotina, 'Segunda')
    expect(confirmar).toHaveBeenCalledWith('Substituir os treinos de segunda na rotina?')
    expect(chamadas.some((c) => c.metodo === 'PUT')).toBe(false)

    confirmar.mockReturnValue(true)
    await user.selectOptions(rotina, 'Segunda')
    await waitFor(() => expect(chamadas.find((c) => c.metodo === 'PUT')?.corpo).toMatchObject({ exercises: [{ exerciseId: 7 }, { exerciseId: 1 }] }))
    expect(screen.getByRole('status')).toHaveTextContent('Plano colocado na rotina de segunda.')

    // Dia vazio não precisa de confirmação.
    confirmar.mockClear()
    await user.selectOptions(rotina, 'Terça')
    expect(confirmar).not.toHaveBeenCalled()
  })

  it('mostra o erro quando o servidor não consegue montar o treino', async () => {
    const user = userEvent.setup()
    abrirGerador({ 'POST /plans/generate': new Resposta(500) })
    await user.click(await screen.findByRole('button', { name: 'Gerar treino' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('O servidor não respondeu. Tente de novo.')
    expect(screen.getByRole('button', { name: 'Gerar treino' })).toBeEnabled()
  })
})

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { definirToken } from '../api'
import { apiFalsa, configFalsa, Resposta, usuarioFalso } from '../test/api-falsa'
import { abrirApp } from '../test/renderizar'

// O download real não existe no jsdom: o teste confere o que seria baixado.
vi.mock('../lib/arquivo', async (original) => ({ ...(await original<typeof import('../lib/arquivo')>()), baixarArquivo: vi.fn() }))
const { baixarArquivo } = await import('../lib/arquivo')

/** Servidor de preferências que guarda o que a página salvar. */
function abrirConfiguracoes(rotas: Parameters<typeof apiFalsa>[0] = {}) {
  definirToken('tk')
  const api = apiFalsa({
    'GET /auth/me': usuarioFalso(),
    'GET /settings': configFalsa,
    'PUT /settings': (corpo) => corpo,
    ...rotas,
  })
  abrirApp('/configuracoes')
  return api
}

const notificacoes = (permissao: NotificationPermission, resposta: NotificationPermission = permissao) =>
  vi.stubGlobal('Notification', Object.assign(vi.fn(), { permission: permissao, requestPermission: vi.fn(async () => resposta) }))

const arquivoJson = (conteudo: string) => new File([conteudo], 'backup.json', { type: 'application/json' })
const seletorDeArquivo = () => document.querySelector('input[type="file"]') as HTMLInputElement

describe('Configurações', () => {
  it('troca o tema na hora e salva no servidor', async () => {
    const user = userEvent.setup()
    const { ultima } = abrirConfiguracoes()
    await user.click(await screen.findByRole('radio', { name: 'Escuro' }))

    expect(screen.getByRole('radio', { name: 'Escuro' })).toBeChecked()
    expect(ultima('PUT', '/settings')?.corpo).toEqual({ ...configFalsa, theme: 'escuro' })
  })

  it('volta ao tema anterior e avisa quando o servidor recusa', async () => {
    const user = userEvent.setup()
    abrirConfiguracoes({ 'PUT /settings': new Resposta(500, { error: 'Banco fora do ar' }) })
    await user.click(await screen.findByRole('radio', { name: 'Claro' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar: Banco fora do ar')
    expect(screen.getByRole('radio', { name: 'Igual ao sistema' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Claro' })).not.toBeChecked()
  })

  it('só liga os lembretes se o navegador permitir notificações', async () => {
    const user = userEvent.setup()
    notificacoes('default', 'denied')
    const { chamadas } = abrirConfiguracoes()
    const lembrar = await screen.findByRole('checkbox', { name: 'Me lembrar de treinar' })

    await user.click(lembrar)
    expect(await screen.findByText(/notificações estão bloqueadas/)).toBeInTheDocument()
    expect(lembrar).not.toBeChecked()
    expect(chamadas.some((c) => c.metodo === 'PUT')).toBe(false)
  })

  it('liga os lembretes e troca os dias quando há permissão', async () => {
    const user = userEvent.setup()
    notificacoes('granted')
    const { ultima } = abrirConfiguracoes()

    await user.click(await screen.findByRole('checkbox', { name: 'Me lembrar de treinar' }))
    await waitFor(() => expect(ultima('PUT', '/settings')?.corpo).toMatchObject({ reminders: { enabled: true } }))

    await user.click(screen.getByRole('button', { name: 'Seg' }))
    await user.click(screen.getByRole('button', { name: 'Sáb' }))
    expect(ultima('PUT', '/settings')?.corpo).toMatchObject({ reminders: { enabled: true, days: [2, 3, 4, 5, 6] } })
    expect(screen.getByRole('button', { name: 'Seg' })).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('Backup', () => {
  it('importa o arquivo como foi baixado e mostra o resumo', async () => {
    const user = userEvent.setup()
    const backup = { format: 'basketball-practice', version: 1, sessions: [] }
    const { ultima } = abrirConfiguracoes({
      'POST /data/import': {
        created: { exercises: 1, workouts: 2, sessions: 3, goals: 0, physicalTests: 4 },
        skipped: { sessions: 2, goals: 0, physicalTests: 0 },
      },
    })
    await screen.findByRole('button', { name: 'Importar backup' })

    await user.upload(seletorDeArquivo(), arquivoJson(JSON.stringify(backup)))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Importado: 3 sessões, 1 exercícios, 2 treinos, 0 metas e 4 testes. 2 sessões já existiam.',
    )
    expect(ultima('POST', '/data/import')?.corpo).toEqual(backup)
  })

  it('depois de importar, as outras telas não mostram os dados antigos enquanto buscam os novos', async () => {
    const user = userEvent.setup()
    let metas: object[] = []
    let responderMetas: (() => void) | null = null
    definirToken('tk')
    apiFalsa({
      'GET /auth/me': usuarioFalso(),
      'GET /settings': configFalsa,
      'GET /exercises': [],
      'GET /stats/progress': { streak: { current: 0, best: 0 }, achievements: [] },
      'GET /tests/kinds': [],
      'GET /tests': [],
      // Depois da importação, a busca das metas espera o teste liberar.
      'GET /goals': () => (metas.length ? new Promise((pronto) => (responderMetas = () => pronto(metas))) : metas),
      'POST /data/import': () => {
        metas = [{ id: 1, title: 'Meta importada', kind: 'sessoes_total', target: 5, current: 0, achieved: false, exerciseId: null, exerciseName: null, deadline: null }]
        return { created: { exercises: 0, workouts: 0, sessions: 0, goals: 1, physicalTests: 0 }, skipped: { sessions: 0, goals: 0, physicalTests: 0 } }
      },
    })
    abrirApp('/metas')
    expect(await screen.findByText(/Nenhuma meta ainda/)).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Configurações' }))
    await user.upload(await waitFor(() => seletorDeArquivo()), arquivoJson('{"format":"basketball-practice","version":1}'))
    await screen.findByRole('status')

    await user.click(screen.getByRole('link', { name: /Metas/ }))
    expect(await screen.findByText('Carregando metas…')).toBeInTheDocument()
    expect(screen.queryByText(/Nenhuma meta ainda/)).toBeNull()

    await waitFor(() => expect(responderMetas).not.toBeNull())
    responderMetas!()
    expect(await screen.findByText('Meta importada')).toBeInTheDocument()
  })

  it('recusa arquivo que não é JSON sem chamar a API', async () => {
    const user = userEvent.setup()
    const { chamadas } = abrirConfiguracoes()
    await screen.findByRole('button', { name: 'Importar backup' })

    await user.upload(seletorDeArquivo(), arquivoJson('isto não é json'))

    expect(await screen.findByRole('alert')).toHaveTextContent('O arquivo não é um backup válido (JSON).')
    expect(chamadas.some((c) => c.caminho === '/data/import')).toBe(false)
    expect(screen.getByRole('button', { name: 'Importar backup' })).toBeEnabled()
  })

  it('mostra o erro da API quando o backup é recusado', async () => {
    const user = userEvent.setup()
    abrirConfiguracoes({ 'POST /data/import': new Resposta(400, { error: 'Exercício "Inventado" não encontrado' }) })
    await screen.findByRole('button', { name: 'Importar backup' })

    await user.upload(seletorDeArquivo(), arquivoJson('{"format":"basketball-practice","version":1}'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Exercício "Inventado" não encontrado')
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('baixa o CSV com todas as sessões, buscando página por página', async () => {
    const user = userEvent.setup()
    const sessao = (id: number) => ({ id, performedAt: '2026-10-20T21:00:00.000Z', durationMinutes: 30, rating: 4, notes: null, entries: [] })
    const { chamadas } = abrirConfiguracoes({
      'GET /sessions': (_corpo, url) =>
        url.searchParams.get('offset') === '0' ? Array.from({ length: 200 }, (_, i) => sessao(i + 1)) : [sessao(201)],
    })

    await user.click(await screen.findByRole('button', { name: 'Baixar sessões (CSV)' }))

    await waitFor(() => expect(baixarArquivo).toHaveBeenCalledOnce())
    const [csv, nome] = vi.mocked(baixarArquivo).mock.calls[0]
    expect(String(csv).trim().split('\r\n')).toHaveLength(1 + 201)
    expect(nome).toMatch(/^sessoes-\d{4}-\d{2}-\d{2}\.csv$/)
    expect(chamadas.filter((c) => c.caminho === '/sessions').map((c) => c.url.searchParams.get('offset'))).toEqual(['0', '200'])
  })
})

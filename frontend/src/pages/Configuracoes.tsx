import { useRef, useState, type FormEvent } from 'react'
import { api, ApiError, dataLocal, definirToken, type ResultadoImportacao } from '../api'
import { useAuth } from '../auth'
import { Carregando, ErroCarga } from '../components/Estado'
import { baixarArquivo, sessoesParaCsv } from '../lib/arquivo'
import { notificar, pedirPermissao, proximoLembrete, suportaNotificacoes } from '../lib/lembretes'
import { instalar, rodandoComoApp, usePodeInstalar } from '../lib/pwa'
import { DIAS, recarregarTudo, useConfig } from '../store'
import type { Config, DiaSemana, Tema } from '../types'

const ORDEM: DiaSemana[] = [1, 2, 3, 4, 5, 6, 0]
const TEMAS: { id: Tema; rotulo: string }[] = [
  { id: 'sistema', rotulo: 'Igual ao sistema' },
  { id: 'claro', rotulo: 'Claro' },
  { id: 'escuro', rotulo: 'Escuro' },
]

export default function Configuracoes() {
  const { config, carregado, erro, recarregar, salvar } = useConfig()
  const [erroSalvar, setErroSalvar] = useState<string | null>(null)

  const atualizar = (nova: Config) => {
    setErroSalvar(null)
    salvar(nova).catch((e: Error) => setErroSalvar(`Não foi possível salvar: ${e.message}`))
  }

  return (
    <>
      <h1>Configurações</h1>
      {erroSalvar && <p className="erro aviso" role="alert">{erroSalvar}</p>}
      {!carregado ? (
        erro ? <ErroCarga erro={erro} tentarDeNovo={recarregar} /> : <Carregando texto="Carregando preferências…" />
      ) : (
        <>
          <section className="card form form-solto">
            <h2 className="sem-margem">Aparência</h2>
            <div className="chips" role="radiogroup" aria-label="Tema">
              {TEMAS.map((t) => (
                <button
                  key={t.id}
                  role="radio"
                  aria-checked={config.tema === t.id}
                  className={`chip ${config.tema === t.id ? 'ativo' : ''}`}
                  onClick={() => atualizar({ ...config, tema: t.id })}
                >
                  {t.rotulo}
                </button>
              ))}
            </div>
          </section>

          <Lembretes config={config} atualizar={atualizar} />
        </>
      )}

      <Dados />
      {/* Na demonstração não há conta de verdade para mudar a senha ou excluir. */}
      {!__DEMO__ && <Conta />}
      <Aplicativo />
    </>
  )
}

function Lembretes({ config, atualizar }: { config: Config; atualizar: (c: Config) => void }) {
  const { lembretes } = config
  const [permissao, setPermissao] = useState(suportaNotificacoes() ? Notification.permission : 'denied')
  const proximo = proximoLembrete(lembretes)
  const mudar = (parcial: Partial<Config['lembretes']>) => atualizar({ ...config, lembretes: { ...lembretes, ...parcial } })

  async function ativar(ativo: boolean) {
    if (ativo) {
      const p = await pedirPermissao()
      setPermissao(p)
      if (p !== 'granted') return
    }
    mudar({ ativo })
  }

  return (
    <section className="card form form-solto">
      <h2 className="sem-margem">Lembretes de treino</h2>
      {!suportaNotificacoes() ? (
        <p className="muted">Este navegador não suporta notificações.</p>
      ) : (
        <>
          <label className="check">
            <input type="checkbox" checked={lembretes.ativo} onChange={(e) => void ativar(e.target.checked)} />
            Me lembrar de treinar
          </label>
          {permissao === 'denied' && (
            <p className="erro">As notificações estão bloqueadas para este site. Libere nas configurações do navegador.</p>
          )}
          <div className="linha">
            <label>
              Horário
              <input className="input" type="time" value={lembretes.horario} onChange={(e) => e.target.value && mudar({ horario: e.target.value })} />
            </label>
          </div>
          <fieldset className="fieldset">
            <legend>Dias</legend>
            <div className="chips">
              {ORDEM.map((d) => {
                const marcado = lembretes.dias.includes(d)
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={marcado}
                    className={`chip ${marcado ? 'ativo' : ''}`}
                    onClick={() => mudar({ dias: marcado ? lembretes.dias.filter((x) => x !== d) : [...lembretes.dias, d] })}
                  >
                    {DIAS[d].slice(0, 3)}
                  </button>
                )
              })}
            </div>
          </fieldset>
          <p className="meta">
            {proximo
              ? `Próximo lembrete: ${proximo.toLocaleString('pt-BR', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}.`
              : 'Nenhum lembrete agendado.'}{' '}
            O lembrete só chega com o site (ou o app instalado) aberto em alguma aba; não avisa se você já treinou no dia.
          </p>
          <button
            className="chip"
            type="button"
            disabled={permissao !== 'granted'}
            onClick={() => void notificar('Hora do treino!', 'Assim chega o lembrete.')}
          >
            Testar notificação
          </button>
        </>
      )}
    </section>
  )
}

function Dados() {
  const { sair } = useAuth()
  const arquivo = useRef<HTMLInputElement>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ResultadoImportacao | null>(null)

  async function rodar(rotulo: string, tarefa: () => Promise<void>) {
    setOcupado(rotulo)
    setErro(null)
    setResultado(null)
    try {
      await tarefa()
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setOcupado(null)
    }
  }

  const exportarJson = () =>
    rodar('json', async () => {
      const dados = await api.exportar()
      baixarArquivo(JSON.stringify(dados, null, 2), `basketball-practice-${dataLocal(new Date())}.json`, 'application/json')
    })

  const exportarCsv = () =>
    rodar('csv', async () => {
      const sessoes = await api.todasSessoes()
      baixarArquivo(sessoesParaCsv(sessoes), `sessoes-${dataLocal(new Date())}.csv`, 'text/csv;charset=utf-8')
    })

  const importar = (f: File) =>
    rodar('importar', async () => {
      let dados: unknown
      try {
        dados = JSON.parse(await f.text())
      } catch {
        throw new Error('O arquivo não é um backup válido (JSON).')
      }
      setResultado(await api.importar(dados))
      recarregarTudo()
    })

  return (
    <section className="card form form-solto">
      <h2 className="sem-margem">Seus dados</h2>
      <p className="muted">
        Baixe um backup completo (JSON) para guardar ou levar para outra conta, ou o histórico de sessões em planilha (CSV).
      </p>
      <div className="acoes">
        <button className="btn" onClick={exportarJson} disabled={!!ocupado}>{ocupado === 'json' ? 'Gerando…' : 'Baixar backup (JSON)'}</button>
        <button className="btn" onClick={exportarCsv} disabled={!!ocupado}>{ocupado === 'csv' ? 'Gerando…' : 'Baixar sessões (CSV)'}</button>
        <button className="btn" onClick={() => arquivo.current?.click()} disabled={!!ocupado}>
          {ocupado === 'importar' ? 'Importando…' : 'Importar backup'}
        </button>
        <input
          ref={arquivo}
          type="file"
          accept="application/json,.json"
          className="escondido"
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) void importar(f)
          }}
        />
      </div>
      <p className="meta">A importação soma ao que já existe e pula registros repetidos; importar o mesmo arquivo duas vezes não duplica nada.</p>
      {erro && <p className="erro" role="alert">{erro}</p>}
      {resultado && (
        <p className="sucesso" role="status">
          Importado: {resultado.created.sessions} sessões, {resultado.created.exercises} exercícios, {resultado.created.workouts} treinos,{' '}
          {resultado.created.goals} metas e {resultado.created.physicalTests} testes.
          {resultado.skipped.sessions > 0 && ` ${resultado.skipped.sessions} sessões já existiam.`}
        </p>
      )}
      <hr className="divisor" />
      <button className="btn" onClick={sair}>Sair da conta</button>
      {!__DEMO__ && <p className="meta">Sair encerra a sessão em todos os aparelhos.</p>}
    </section>
  )
}

function Conta() {
  return (
    <section className="card form form-solto">
      <h2 className="sem-margem">Sua conta</h2>
      <TrocarSenha />
      <hr className="divisor" />
      <ExcluirConta />
    </section>
  )
}

function TrocarSenha() {
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<ApiError | Error | null>(null)
  const [trocada, setTrocada] = useState(false)
  const campos = erro instanceof ApiError ? erro.details : undefined

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setTrocada(false)
    setEnviando(true)
    try {
      // O token antigo acaba de deixar de valer; sem guardar o novo, o próximo pedido deslogaria a pessoa.
      definirToken((await api.trocarSenha(atual, nova)).token)
      setAtual('')
      setNova('')
      setTrocada(true)
    } catch (falha) {
      setErro(falha as Error)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="form" onSubmit={enviar} noValidate>
      <h3 className="sem-margem">Trocar a senha</h3>
      <label>
        Senha atual
        <input className="input" type="password" autoComplete="current-password" value={atual} onChange={(e) => setAtual(e.target.value)} />
        {campos?.currentPassword && <span className="erro">{campos.currentPassword[0]}</span>}
      </label>
      <label>
        Senha nova
        <input className="input" type="password" autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} />
        {campos?.newPassword && <span className="erro">{campos.newPassword[0]}</span>}
      </label>
      {erro && !campos && <p className="erro" role="alert">{erro.message}</p>}
      {trocada && <p className="sucesso" role="status">Senha trocada. As sessões em outros aparelhos foram encerradas.</p>}
      <div className="acoes">
        <button className="btn btn-primario" type="submit" disabled={enviando || !atual || !nova}>
          {enviando ? 'Trocando…' : 'Trocar a senha'}
        </button>
      </div>
    </form>
  )
}

function ExcluirConta() {
  const { encerrarLocal } = useAuth()
  const [aberto, setAberto] = useState(false)
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<ApiError | Error | null>(null)
  const doCampo = erro instanceof ApiError ? erro.details?.password?.[0] : undefined

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      await api.excluirConta(senha)
      encerrarLocal()
    } catch (falha) {
      setErro(falha as Error)
      setEnviando(false)
    }
  }

  if (!aberto) {
    return (
      <div className="acoes">
        <button className="btn btn-perigo" type="button" onClick={() => setAberto(true)}>Excluir minha conta</button>
      </div>
    )
  }

  return (
    <form className="form" onSubmit={enviar} noValidate>
      <h3 className="sem-margem">Excluir minha conta</h3>
      <p className="muted">
        Isto apaga sua conta, sessões, treinos, metas e testes, e não pode ser desfeito. Se quiser guardar uma cópia, baixe o backup antes.
      </p>
      <label>
        Confirme com sua senha
        <input className="input" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        {doCampo && <span className="erro">{doCampo}</span>}
      </label>
      {erro && !doCampo && <p className="erro" role="alert">{erro.message}</p>}
      <div className="acoes">
        <button className="btn btn-perigo" type="submit" disabled={enviando || !senha}>
          {enviando ? 'Excluindo…' : 'Excluir definitivamente'}
        </button>
        <button className="btn" type="button" disabled={enviando} onClick={() => { setAberto(false); setSenha(''); setErro(null) }}>Cancelar</button>
      </div>
    </form>
  )
}

function Aplicativo() {
  const podeInstalar = usePodeInstalar()
  const instalado = rodandoComoApp()

  return (
    <section className="card form form-solto">
      <h2 className="sem-margem">Aplicativo</h2>
      {instalado ? (
        <p className="muted">Você está usando o app instalado. ✔</p>
      ) : podeInstalar ? (
        <>
          <p className="muted">Instale o Basketball Practice na tela inicial para abrir direto, em tela cheia, e usar as ferramentas sem internet.</p>
          <button className="btn btn-primario" onClick={() => void instalar()}>Instalar app</button>
        </>
      ) : (
        <p className="muted">
          Para instalar: no Android/Chrome, use o menu ⋮ → “Instalar app”; no iPhone/Safari, Compartilhar → “Adicionar à Tela de Início”.
          O timer, o metrônomo, as calculadoras e os vídeos funcionam mesmo sem internet.
        </p>
      )}
    </section>
  )
}

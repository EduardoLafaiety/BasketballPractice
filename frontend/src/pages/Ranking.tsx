import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Carregando, ErroCarga } from '../components/Estado'
import Icone from '../components/Icone'
import SoComServidor from '../components/SoComServidor'
import {
  apiSocial,
  linkConvite,
  METRICAS_DESAFIO,
  METRICAS_RANKING,
  useAmigos,
  useDesafiosAmigos,
  usePerfil,
  useRanking,
  type DesafioAmigo,
  type Escopo,
  type LinhaRanking,
  type MetricaDesafio,
  type MetricaRanking,
  type Perfil,
  type Periodo,
} from '../social/api'

export default function RankingPagina() {
  return (
    <>
      <h1>Ranking</h1>
      <p className="muted">Lances livres, desafio do dia, quiz, sequência e nota do cartão: compare com todo mundo ou só com os amigos, nesta semana ou desde sempre.</p>
      {__DEMO__ ? (
        <SoComServidor recurso="O ranking" porque="O ranking e os desafios entre amigos comparam várias contas." />
      ) : (
        <ConteudoRanking />
      )}
    </>
  )
}

function ConteudoRanking() {
  const { perfil, carregado, erro, recarregar } = usePerfil()
  if (!carregado) return erro ? <ErroCarga erro={erro} tentarDeNovo={recarregar} /> : <Carregando texto="Carregando o ranking…" />
  return (
    <>
      {!perfil && <CriarPerfil />}
      <Classificacao temPerfil={!!perfil} />
      {perfil && (
        <>
          <Desafios />
          <Amigos perfil={perfil} />
          <AjustesPerfil perfil={perfil} />
        </>
      )}
    </>
  )
}

/** Explica o que fica público antes de criar o perfil. */
export function CriarPerfil({ aoCriar }: { aoCriar?: () => void }) {
  const [apelido, setApelido] = useState('')
  const [publico, setPublico] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function criar(e: FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro(null)
    try {
      await apiSocial.salvarPerfil(apelido.trim(), publico)
      aoCriar?.()
    } catch (e) {
      setErro((e as Error).message)
      setSalvando(false)
    }
  }

  return (
    <form className="card form ranking-entrar" onSubmit={criar}>
      <h2 className="sem-margem">Entre no ranking</h2>
      <p className="muted">
        Escolha um apelido. No ranking aparecem só o apelido e os números de cada lista; nome, e-mail e o resto dos treinos continuam só seus.
        Saiba mais na <Link to="/privacidade" className="link">Política de Privacidade</Link>.
      </p>
      <label>
        Apelido
        <input className="input texto-literal" value={apelido} onChange={(e) => setApelido(e.target.value)} maxLength={20} placeholder="ex.: mao_de_seda" required />
      </label>
      <span className="meta">De 3 a 20 letras, números, ponto, hífen ou sublinhado.</span>
      <label className="check">
        <input type="checkbox" checked={publico} onChange={(e) => setPublico(e.target.checked)} />
        Aparecer no ranking aberto a todos (sem marcar, só os seus amigos veem)
      </label>
      {erro && <p className="erro" role="alert">{erro}</p>}
      <button className="btn btn-primario" type="submit" disabled={salvando}>{salvando ? 'Criando…' : 'Criar perfil'}</button>
    </form>
  )
}

function Chips<T extends string>({ rotulo, opcoes, valor, aoMudar }: { rotulo: string; opcoes: { id: T; rotulo: string }[]; valor: T; aoMudar: (v: T) => void }) {
  return (
    <div className="chips" role="group" aria-label={rotulo}>
      {opcoes.map((o) => (
        <button key={o.id} className={`chip ${valor === o.id ? 'ativo' : ''}`} aria-pressed={valor === o.id} onClick={() => aoMudar(o.id)}>
          {o.rotulo}
        </button>
      ))}
    </div>
  )
}

function Classificacao({ temPerfil }: { temPerfil: boolean }) {
  const [params, setParams] = useSearchParams()
  const metrica = (METRICAS_RANKING.find((m) => m.id === params.get('lista'))?.id ?? 'lances_livres') as MetricaRanking
  const periodo: Periodo = params.get('periodo') === 'geral' ? 'geral' : 'semana'
  const escopo: Escopo = params.get('escopo') === 'amigos' ? 'amigos' : 'todos'
  const mudar = (chave: string, valor: string) => setParams((p) => ({ ...Object.fromEntries(p), [chave]: valor }), { replace: true })
  const { ranking, erro, recarregar } = useRanking(metrica, periodo, escopo)
  const unidade = METRICAS_RANKING.find((m) => m.id === metrica)!.unidade(periodo)

  const podio = ranking?.linhas.filter((l) => l.posicao <= 3).slice(0, 3) ?? []
  const resto = ranking?.linhas.slice(podio.length) ?? []
  const euFora = ranking?.eu && !ranking.linhas.some((l) => l.eu) ? ranking.eu : null

  return (
    <section className="ranking" aria-labelledby="ranking-titulo">
      <h2 id="ranking-titulo">Classificação</h2>
      <div className="ranking-filtros">
        <Chips rotulo="Lista" opcoes={METRICAS_RANKING} valor={metrica} aoMudar={(v) => mudar('lista', v)} />
        <Chips rotulo="Período" opcoes={[{ id: 'semana', rotulo: 'Esta semana' }, { id: 'geral', rotulo: 'Geral' }]} valor={periodo} aoMudar={(v) => mudar('periodo', v)} />
        <Chips rotulo="Quem" opcoes={[{ id: 'todos', rotulo: 'Todos' }, { id: 'amigos', rotulo: 'Amigos' }]} valor={escopo} aoMudar={(v) => mudar('escopo', v)} />
      </div>

      {!ranking ? (
        erro ? <ErroCarga erro={erro} tentarDeNovo={recarregar} /> : <Carregando texto="Montando a classificação…" />
      ) : ranking.linhas.length === 0 ? (
        <div className="vazio">
          {escopo === 'amigos' && !temPerfil
            ? 'Crie o seu perfil e convide amigos para ver a classificação entre vocês.'
            : periodo === 'semana'
              ? 'Ninguém pontuou nesta lista ainda esta semana. Saia na frente!'
              : 'Ninguém pontuou nesta lista ainda.'}
        </div>
      ) : (
        <>
          <ol className="podio" aria-label="Pódio">
            {podio.map((l) => (
              <li key={l.apelido} className={`podio-lugar lugar-${l.posicao} ${l.eu ? 'eu' : ''}`}>
                <span className="podio-posicao">{l.posicao}º</span>
                <span className="podio-apelido texto-literal">{l.apelido}</span>
                <span className="podio-valor">{l.valor.toLocaleString('pt-BR')}</span>
                <span className="meta">{unidade}</span>
              </li>
            ))}
          </ol>
          {resto.length > 0 && (
            <ol className="ranking-lista" aria-label="Classificação">
              {resto.map((l) => <Linha key={l.apelido} linha={l} unidade={unidade} />)}
            </ol>
          )}
          {euFora && (
            <ol className="ranking-lista ranking-eu" aria-label="Sua posição">
              <Linha linha={euFora} unidade={unidade} />
            </ol>
          )}
          <p className="meta">{ranking.total} {ranking.total === 1 ? 'atleta pontuou' : 'atletas pontuaram'}. Cada sessão soma no máximo 200 cestas, e só valem os dados registrados no app.</p>
        </>
      )}
    </section>
  )
}

function Linha({ linha: l, unidade }: { linha: LinhaRanking; unidade: string }) {
  return (
    <li className={`ranking-linha ${l.eu ? 'eu' : ''}`}>
      <span className="ranking-posicao">{l.posicao}º</span>
      <span className="ranking-apelido texto-literal">{l.apelido}{l.eu && <span className="tag">você</span>}{l.amigo && <span className="tag">amigo</span>}</span>
      <span className="ranking-valor">{l.valor.toLocaleString('pt-BR')} <span className="meta">{unidade}</span></span>
    </li>
  )
}

const ROTULO_STATUS: Record<DesafioAmigo['status'], string> = {
  pendente: 'Esperando resposta',
  aceito: 'Valendo',
  recusado: 'Recusado',
  cancelado: 'Cancelado',
  encerrado: 'Encerrado',
  expirado: 'Expirou sem resposta',
}

function Desafios() {
  const { desafios, erro, recarregar } = useDesafiosAmigos()
  const { amigos } = useAmigos()
  const [amigo, setAmigo] = useState('')
  const [metrica, setMetrica] = useState<MetricaDesafio>('lances_livres')
  const [erroAcao, setErroAcao] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    if (!amigo && amigos?.length) setAmigo(String(amigos[0].id))
  }, [amigos, amigo])

  async function acao(fazer: () => Promise<unknown>) {
    setOcupado(true)
    setErroAcao(null)
    try {
      await fazer()
    } catch (e) {
      setErroAcao((e as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <section aria-labelledby="desafios-amigos-titulo">
      <h2 id="desafios-amigos-titulo">Desafios entre amigos</h2>
      <p className="muted">Quem faz mais na semana, de segunda a domingo. O amigo precisa aceitar; o placar conta tudo o que os dois registrarem na semana.</p>
      {amigos && amigos.length > 0 ? (
        <form className="card form desafio-novo" onSubmit={(e) => { e.preventDefault(); void acao(() => apiSocial.desafiar(Number(amigo), metrica)) }}>
          <div className="linha">
            <label>
              Amigo
              <select className="input select" value={amigo} onChange={(e) => setAmigo(e.target.value)}>
                {amigos.map((a) => <option key={a.id} value={a.id}>{a.apelido}</option>)}
              </select>
            </label>
            <label>
              Desafio
              <select className="input select" value={metrica} onChange={(e) => setMetrica(e.target.value as MetricaDesafio)}>
                {METRICAS_DESAFIO.map((m) => <option key={m.id} value={m.id}>{m.rotulo}</option>)}
              </select>
            </label>
          </div>
          <button className="btn btn-primario" type="submit" disabled={ocupado || !amigo}>Desafiar <Icone nome="raio" /></button>
        </form>
      ) : (
        <p className="meta">Convide um amigo pelo link abaixo para começar a desafiar.</p>
      )}
      {erroAcao && <p className="erro" role="alert">{erroAcao}</p>}

      {!desafios ? (
        erro ? <ErroCarga erro={erro} tentarDeNovo={recarregar} /> : null
      ) : desafios.length > 0 && (
        <ul className="desafios-amigos">
          {desafios.map((d) => {
            const info = METRICAS_DESAFIO.find((m) => m.id === d.metrica)!
            const total = d.placar ? Math.max(1, d.placar.eu + d.placar.amigo) : 1
            return (
              <li key={d.id} className={`desafio-amigo status-${d.status} ${d.resultado ?? ''}`}>
                <div className="desafio-amigo-topo">
                  <span className="rotulo-forte">{ROTULO_STATUS[d.status]}{d.resultado && ` · ${d.resultado === 'vitoria' ? 'você venceu' : d.resultado === 'derrota' ? 'você perdeu' : 'empate'}`}</span>
                  <span className="meta">semana de {new Date(`${d.inicio}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                </div>
                <h3>{info.rotulo} · <span className="texto-literal">{d.papel === 'desafiante' ? `você desafiou ${d.amigo.apelido}` : `${d.amigo.apelido} desafiou você`}</span></h3>
                {d.placar && (
                  <div className="placar-duelo" aria-label={`Placar: você ${d.placar.eu}, ${d.amigo.apelido} ${d.placar.amigo} ${info.unidade}`}>
                    <span><strong>{d.placar.eu}</strong> você</span>
                    <span className="placar-barra" aria-hidden><i style={{ width: `${(d.placar.eu / total) * 100}%` }} /></span>
                    <span className="texto-literal"><strong>{d.placar.amigo}</strong> {d.amigo.apelido}</span>
                  </div>
                )}
                {d.status === 'pendente' && (
                  <div className="acoes">
                    {d.papel === 'desafiado' ? (
                      <>
                        <button className="btn btn-primario" disabled={ocupado} onClick={() => acao(() => apiSocial.responder(d.id, 'accept'))}>Aceitar</button>
                        <button className="btn" disabled={ocupado} onClick={() => acao(() => apiSocial.responder(d.id, 'decline'))}>Recusar</button>
                      </>
                    ) : (
                      <button className="btn" disabled={ocupado} onClick={() => acao(() => apiSocial.responder(d.id, 'cancel'))}>Cancelar desafio</button>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function Amigos({ perfil }: { perfil: Perfil }) {
  const { amigos } = useAmigos()
  const [aviso, setAviso] = useState<string | null>(null)
  const link = linkConvite(perfil.convite)

  async function compartilhar() {
    const texto = `Bora treinar e disputar no Basketball Practice? Entre pelo meu convite: ${link}`
    try {
      if (navigator.share) await navigator.share({ text: texto })
      else {
        await navigator.clipboard.writeText(link)
        setAviso('Link copiado.')
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setAviso('Copie o link acima.')
    }
  }

  async function remover(id: number, apelido: string) {
    if (!window.confirm(`Desfazer a amizade com ${apelido}? Os desafios em aberto entre vocês serão cancelados.`)) return
    await apiSocial.desfazerAmizade(id).catch((e: Error) => setAviso(e.message))
  }

  return (
    <section aria-labelledby="amigos-titulo">
      <h2 id="amigos-titulo">Amigos</h2>
      <div className="card amigos-convite">
        <p className="muted">Quem abrir o seu link e tiver conta vira seu amigo, e vocês se veem no ranking de amigos, mesmo fora do ranking aberto.</p>
        <code className="convite-link texto-literal">{link}</code>
        <div className="acoes">
          <button className="btn btn-primario" onClick={compartilhar}>Convidar amigos</button>
          <button className="btn" onClick={() => window.confirm('Gerar um link novo? O antigo para de funcionar.') && apiSocial.novoConvite()}>Gerar link novo</button>
        </div>
        {aviso && <p className="meta" role="status">{aviso}</p>}
      </div>
      {amigos && amigos.length > 0 && (
        <ul className="lista-simples amigos-lista">
          {amigos.map((a) => (
            <li key={a.id}>
              <span className="texto-literal">{a.apelido}</span>
              <button className="remover" aria-label={`Desfazer amizade com ${a.apelido}`} onClick={() => remover(a.id, a.apelido)}>×</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function AjustesPerfil({ perfil }: { perfil: Perfil }) {
  const [apelido, setApelido] = useState(perfil.apelido)
  const [publico, setPublico] = useState(perfil.publico)
  const [aviso, setAviso] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    try {
      await apiSocial.salvarPerfil(apelido.trim(), publico)
      setAviso('Perfil atualizado.')
    } catch (e) {
      setErro((e as Error).message)
    }
  }

  async function sair() {
    if (!window.confirm('Sair do ranking? O perfil, os amigos e os desafios serão apagados. Os seus treinos continuam.')) return
    await apiSocial.sairDoRanking().catch((e: Error) => setErro(e.message))
  }

  return (
    <section aria-labelledby="perfil-ranking-titulo">
      <h2 id="perfil-ranking-titulo">Seu perfil</h2>
      <form className="card form" onSubmit={salvar}>
        <label>
          Apelido
          <input className="input texto-literal" value={apelido} onChange={(e) => setApelido(e.target.value)} maxLength={20} />
        </label>
        <label className="check">
          <input type="checkbox" checked={publico} onChange={(e) => setPublico(e.target.checked)} />
          Aparecer no ranking aberto a todos
        </label>
        {erro && <p className="erro" role="alert">{erro}</p>}
        {aviso && <p className="meta" role="status">{aviso}</p>}
        <div className="acoes">
          <button className="btn btn-primario" type="submit">Salvar</button>
          <button className="btn btn-erro" type="button" onClick={sair}>Sair do ranking</button>
        </div>
      </form>
    </section>
  )
}

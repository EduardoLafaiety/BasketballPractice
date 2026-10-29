import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../api'
import { Carregando, ErroCarga } from '../components/Estado'
import FotoJogador, { CreditoFoto } from '../components/FotoJogador'
import Icone from '../components/Icone'
import { DIAS, ROTULO_METRICA, useRotina } from '../store'
import type { DiaSemana, Estilo } from '../types'
import type { PlanoGuiado } from './SessaoGuiada'

const ORDEM_DIAS: DiaSemana[] = [1, 2, 3, 4, 5, 6, 0]

const altura = (cm: number) => `${(cm / 100).toFixed(2).replace('.', ',')} m`

export default function EstiloDetalhe() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const rotina = useRotina()
  const [estilo, setEstilo] = useState<Estilo | null>(null)
  const [erro, setErro] = useState<Error | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const carregar = useCallback(() => {
    setErro(null)
    setEstilo(null)
    api.estilo(id).then(setEstilo, setErro)
  }, [id])
  useEffect(carregar, [carregar])

  if (!estilo) {
    if (erro instanceof ApiError && erro.status === 404)
      return (
        <div className="vazio">
          Jogador não encontrado. <Link to="/jogue-como" className="link">Ver todos os jogadores</Link>
        </div>
      )
    return erro ? <ErroCarga erro={erro} tentarDeNovo={carregar} /> : <Carregando texto="Carregando jogador…" />
  }

  const titulo = `Jogue como ${estilo.nome}`
  const principal = estilo.divisao[0]?.categoria

  function iniciar() {
    const plano: PlanoGuiado = { titulo, blocos: estilo!.sessao }
    navigate('/sessao', { state: plano })
  }

  function usarNaRotina(dia: DiaSemana) {
    const substituir =
      rotina.rotina[dia].length === 0 || window.confirm(`Substituir os treinos de ${DIAS[dia].toLowerCase()} na rotina?`)
    if (!substituir) return
    rotina.alterarDia(dia, () => estilo!.sessao.map((b) => b.drillId))
    setAviso(`Treino do ${estilo!.nome} colocado na rotina de ${DIAS[dia].toLowerCase()}.`)
  }

  return (
    <>
      <Link to="/jogue-como" className="link-forte voltar">← Todos os jogadores</Link>

      <section className="estilo-topo">
        <div>
          <FotoJogador id={estilo.id} nome={estilo.nome} categoria={principal} grande />
          <CreditoFoto id={estilo.id} />
        </div>
        <div className="estilo-texto">
          <span className={`tag tag-${principal}`}>{estilo.arquetipo}</span>
          <h1>{estilo.nome}</h1>
          <dl className="estilo-ficha">
            <div><dt>Posição</dt><dd>{estilo.posicao}</dd></div>
            <div><dt>Altura</dt><dd>{altura(estilo.alturaCm)}</dd></div>
            <div><dt>Ritmo</dt><dd>{estilo.ritmo}</dd></div>
          </dl>
          <p className="estilo-resumo">{estilo.resumo}</p>
          <div className="estilo-divisao" aria-label="Divisão do treino por categoria">
            {estilo.divisao.map((f) => (
              <div key={f.categoria} className={`estilo-divisao-linha tag-${f.categoria}`}>
                <span>{f.categoria}</span>
                <span className="trilho"><span style={{ width: `${f.porcentagem}%` }} /></span>
                <span className="meta">{f.porcentagem}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="stats faixa estilo-faixa">
        <div className="stat"><strong>{estilo.movimentos.length}</strong><span>Movimentos</span></div>
        <div className="stat"><strong>{estilo.sessao.length}</strong><span>Exercícios</span></div>
        <div className="stat destaque"><strong>{estilo.minutos}</strong><span>Minutos</span></div>
      </section>

      <h2>Movimentos-assinatura</h2>
      <p className="muted">O que ele faz em quadra e como treinar sozinho.</p>
      <div className="movimentos">
        {estilo.movimentos.map((m, i) => (
          <article key={m.nome} className={`card movimento tag-${m.exercicio?.categoria ?? principal}`}>
            <span className="movimento-numero" aria-hidden>{String(i + 1).padStart(2, '0')}</span>
            <div className="movimento-corpo">
              {m.exercicio && <span className={`tag tag-${m.exercicio.categoria}`}>{m.exercicio.categoria}</span>}
              <h3>{m.nome}</h3>
              <p>{m.descricao}</p>
              <p className="movimento-dica">{m.dica}</p>
            </div>
            {m.exercicio && (
              <Link to={`/treinos/${m.exercicio.drillId}`} className="movimento-exercicio">
                <span className="meta">Exercício</span>
                <strong>{m.exercicio.nome}</strong>
                <span className="meta">{m.dose} · {m.minutos} min</span>
                <span className="meta">{ROTULO_METRICA[m.exercicio.metrica]}</span>
              </Link>
            )}
          </article>
        ))}
      </div>

      <h2>Treino do estilo</h2>
      <p className="muted">Uma sessão pronta com os movimentos acima, entre o aquecimento e o lance livre.</p>
      <div className="estilo-plano">
        <ol className="plano">
          {estilo.sessao.map((b, i) => (
            <li key={`${b.drillId}-${i}`} className="card plano-item">
              <span className={`tag tag-${b.categoria}`}>{b.categoria}</span>
              <strong>{b.nome}</strong>
              <span className="meta">{b.minutos} min · {b.dose}</span>
            </li>
          ))}
        </ol>
        <aside className="estilo-lado">
          <button className="btn btn-primario" onClick={iniciar}><Icone nome="raio" /> Começar este treino</button>
          <select
            className="input select"
            value=""
            aria-label="Usar na rotina"
            disabled={!rotina.carregado}
            onChange={(e) => e.target.value && usarNaRotina(Number(e.target.value) as DiaSemana)}
          >
            <option value="">Usar na rotina de…</option>
            {ORDEM_DIAS.map((d) => (
              <option key={d} value={d}>{DIAS[d]}</option>
            ))}
          </select>
          {aviso && <p className="sucesso" role="status">{aviso}</p>}
          {rotina.erroSalvar && <p className="erro" role="alert">Não foi possível salvar a rotina: {rotina.erroSalvar.message}</p>}
          <div className="card">
            <span className={`tag tag-${principal}`}>Mentalidade</span>
            <p className="estilo-mentalidade">{estilo.mentalidade}</p>
          </div>
        </aside>
      </div>
    </>
  )
}

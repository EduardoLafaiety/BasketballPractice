import { useState, type CSSProperties } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  COR,
  DESPENSA,
  DIA_DE_JOGO,
  EVITAR_NO_JOGO,
  MEDIDAS_CASEIRAS,
  POS_TREINO,
  POSICOES,
  PRE_TREINO,
  REFEICOES,
  type CardapioPosicao,
  type Item,
  type PosicaoDieta,
} from '../alimentacao/dados'
import IconeRefeicao from '../alimentacao/icones'
import Icone from '../components/Icone'

const ABAS = [
  { id: 'inicio', rotulo: 'Início', resumo: 'Posições e quantidades' },
  { id: 'cardapio', rotulo: 'Cardápio', resumo: 'As 4 refeições' },
  { id: 'jogo', rotulo: 'Dia de jogo', resumo: 'O que comer e quando' },
  { id: 'despensa', rotulo: 'Despensa', resumo: 'Lista de mercado' },
] as const

type Aba = (typeof ABAS)[number]['id']

function Alimentos({ lista }: { lista: (string | Item)[] }) {
  return (
    <ul className="alimentos">
      {lista.map((a) => {
        const item = typeof a === 'string' ? { nome: a } : a
        return (
          <li key={item.nome}>
            <span>{item.nome}</span>
            {item.qtd && <span className="alimento-qtd">{item.qtd}</span>}
          </li>
        )
      })}
    </ul>
  )
}

function Inicio({ escolher }: { escolher: (p: PosicaoDieta) => void }) {
  return (
    <>
      <h2>Escolha sua posição</h2>
      <div className="grade dieta-posicoes">
        {POSICOES.map((p) => (
          <button key={p.id} className="card dieta-posicao" style={{ '--c': COR[p.id] } as CSSProperties} onClick={() => escolher(p.id)}>
            <span className="dieta-numeros" aria-hidden>{p.numeros}</span>
            <span className="tag">{p.nome}</span>
            <h3>{p.titulo}</h3>
            <span className="meta">{p.subtitulo}</span>
            <span className="dieta-foco">
              {p.foco.map((f) => <span key={f}>{f}</span>)}
            </span>
            <span className="cartao-jogador-rodape">
              Ver cardápio
              <Icone nome="seta" />
            </span>
          </button>
        ))}
      </div>

      <h2>Como ler as quantidades</h2>
      <p className="muted">
        Os pesos são do alimento pronto para comer: arroz cozido, carne grelhada. São uma referência para um atleta adulto; se você é
        mais leve ou mais pesado, ajuste um pouco para menos ou para mais.
      </p>
      <div className="grade dieta-medidas">
        {MEDIDAS_CASEIRAS.map((m) => (
          <div key={m.medida} className="card">
            <strong className="dieta-peso">{m.peso}</strong>
            <span className="meta">{m.medida}</span>
          </div>
        ))}
      </div>
    </>
  )
}

function Cardapio({ posicao, descanso, mudar }: { posicao: CardapioPosicao; descanso: boolean; mudar: (p: { posicao?: PosicaoDieta; dia?: string }) => void }) {
  return (
    <div style={{ '--c': COR[posicao.id] } as CSSProperties}>
      <div className="dieta-seletores">
        <div className="chips" role="group" aria-label="Posição">
          {POSICOES.map((p) => (
            <button key={p.id} className={`chip ${p.id === posicao.id ? 'ativo' : ''}`} aria-pressed={p.id === posicao.id} onClick={() => mudar({ posicao: p.id })}>
              {p.nome}
            </button>
          ))}
        </div>
        <div className="chips" role="group" aria-label="Tipo de dia">
          <button className={`chip ${!descanso ? 'ativo' : ''}`} aria-pressed={!descanso} onClick={() => mudar({ dia: 'treino' })}>Dia de treino</button>
          <button className={`chip ${descanso ? 'ativo' : ''}`} aria-pressed={descanso} onClick={() => mudar({ dia: 'descanso' })}>Dia de descanso</button>
        </div>
      </div>

      <div className="dieta-cabecalho">
        <div>
          <span className="tag">{descanso ? 'Dia de descanso' : 'Dia de treino'}</span>
          <h2 className="dieta-nome">{posicao.nome}</h2>
          <p className="muted">{posicao.resumo}</p>
        </div>
        <dl className="dieta-porcoes">
          {posicao.porcoes.map((p) => (
            <div key={p.rotulo}>
              <dt>{p.rotulo}</dt>
              <dd>{descanso && p.descanso ? p.descanso : p.valor}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="grade dieta-refeicoes">
        {REFEICOES.map((r) => {
          const ref = posicao.refeicoes[r.id]
          return (
            <article key={r.id} className="card dieta-refeicao">
              <div className="dieta-refeicao-topo">
                <IconeRefeicao refeicao={r.id} />
                <div>
                  <h3>{r.nome}</h3>
                  <span className="meta">por volta das {r.hora}</span>
                </div>
              </div>
              {ref.opcoes.map((o, i) => (
                <div key={i} className="dieta-opcao">
                  <span className="dieta-rotulo">Opção {i + 1}</span>
                  <Alimentos lista={o} />
                </div>
              ))}
              <p className="dieta-porque">{ref.porque}</p>
            </article>
          )
        })}
      </div>

      <div className="grade dieta-extras">
        {descanso ? (
          <article className="card">
            <span className="tag">Dia de descanso</span>
            <h3>Mesma comida, um pouco menos de carboidrato</h3>
            <p className="meta sem-margem">Use as mesmas opções, com cerca de 50 g a menos de carboidrato (arroz, macarrão, batata, pão) em cada refeição. A proteína continua igual: é no descanso que o músculo se reconstrói.</p>
          </article>
        ) : (
          <>
            <article className="card">
              <span className="tag">Pré-treino · 1h antes</span>
              <h3>Leve e rápido de digerir</h3>
              <Alimentos lista={PRE_TREINO} />
            </article>
            <article className="card">
              <span className="tag">Pós-treino · até 1h depois</span>
              <h3>Repor energia e proteína</h3>
              <Alimentos lista={POS_TREINO} />
            </article>
          </>
        )}
        {posicao.ceia && (
          <article className="card">
            <span className="tag">Ceia · antes de dormir</span>
            <h3>Um reforço leve</h3>
            <Alimentos lista={posicao.ceia} />
          </article>
        )}
      </div>
    </div>
  )
}

function DiaDeJogo() {
  return (
    <>
      <p className="muted">Vale para todas as posições. Conte a partir do horário do jogo.</p>
      <ol className="dieta-linha">
        {DIA_DE_JOGO.map((p) => (
          <li key={p.quando} className="card" style={{ '--c': p.cor } as CSSProperties}>
            <div className="dieta-quando">
              {p.quando}
              <span className="meta">{p.detalhe}</span>
            </div>
            <div>
              <h3>{p.titulo}</h3>
              <p className="meta">{p.texto}</p>
              <Alimentos lista={p.alimentos} />
            </div>
          </li>
        ))}
      </ol>
      <h2>Melhor deixar para depois</h2>
      <ul className="alimentos alimentos-evitar">
        {EVITAR_NO_JOGO.map((a) => <li key={a}>{a}</li>)}
      </ul>
    </>
  )
}

function Despensa() {
  const [busca, setBusca] = useState('')
  const q = busca.trim().toLowerCase()
  return (
    <>
      <p className="muted">Os alimentos que aparecem nos cardápios, separados pelo que fazem por você em quadra.</p>
      <div className="filtros">
        <input className="input dieta-busca" type="search" placeholder="Buscar alimento" aria-label="Buscar alimento" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      <div className="grade dieta-grupos">
        {DESPENSA.map((g) => (
          <article key={g.nome} className="card" style={{ '--c': g.cor } as CSSProperties}>
            <h3 className="dieta-grupo"><span aria-hidden>{g.icone}</span>{g.nome}</h3>
            <p className="meta">{g.texto}</p>
            <ul className="alimentos">
              {g.alimentos.map((a) => (
                <li key={a} className={q && !a.toLowerCase().includes(q) ? 'apagado' : undefined}>{a}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </>
  )
}

export default function Alimentacao() {
  const [params, setParams] = useSearchParams()
  const aba = (ABAS.find((a) => a.id === params.get('aba'))?.id ?? 'inicio') as Aba
  const posicao = POSICOES.find((p) => p.id === params.get('posicao')) ?? POSICOES[1]
  const descanso = params.get('dia') === 'descanso'

  const ir = (novo: Record<string, string>) => setParams({ ...Object.fromEntries(params), ...novo }, { replace: true })

  return (
    <>
      <h1>Alimentação</h1>
      <p className="muted">
        Combinações simples de comida do dia a dia para cada refeição, ajustadas ao que a sua posição pede em quadra.
      </p>
      <p className="dieta-aviso">
        <strong>São sugestões, não uma dieta.</strong> Servem de ponto de partida para quem treina. Se você tem alergia, alguma condição
        de saúde ou objetivo específico de peso, procure um nutricionista.
      </p>

      <div className="niveis niveis-abas dieta-abas" role="tablist" aria-label="Alimentação">
        {ABAS.map((a) => (
          <button key={a.id} role="tab" aria-selected={a.id === aba} className={`nivel-opcao ${a.id === aba ? 'ativo' : ''}`} onClick={() => ir({ aba: a.id })}>
            <strong>{a.rotulo}</strong>
            <span>{a.resumo}</span>
          </button>
        ))}
      </div>

      <section role="tabpanel" aria-label={ABAS.find((a) => a.id === aba)!.rotulo}>
        {aba === 'inicio' && <Inicio escolher={(p) => { ir({ aba: 'cardapio', posicao: p }); if (!navigator.userAgent.includes('jsdom')) window.scrollTo(0, 0) }} />}
        {aba === 'cardapio' && (
          <Cardapio posicao={posicao} descanso={descanso} mudar={({ posicao: p, dia }) => ir({ ...(p && { posicao: p }), ...(dia && { dia }) })} />
        )}
        {aba === 'jogo' && <DiaDeJogo />}
        {aba === 'despensa' && <Despensa />}
      </section>
    </>
  )
}

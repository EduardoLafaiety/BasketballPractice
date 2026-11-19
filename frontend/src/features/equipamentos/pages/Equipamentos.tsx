import { useState, type CSSProperties, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { buscaTime, linkAmazon, MARCAS, TIMES, type Conferencia } from '../dados'
import Bola, { ehEscura, LADO_DO_LOGO, type Colagem } from '../Bola'
import Sprite from '../Sprite'
import { buscaRegata, CATEGORIAS, PRODUTOS, type Categoria } from '../produtos'
import { logoPequeno } from '../../nba/escudos'
import Icone from '../../../shared/ui/Icone'

const ABAS = [
  { id: 'times', rotulo: 'Bolas da NBA', resumo: `${TIMES.length} bolas nas cores de cada time` },
  { id: 'marcas', rotulo: 'Bolas de marca', resumo: 'Wilson, Spalding e Molten' },
  { id: 'regatas', rotulo: 'Regatas da NBA', resumo: `${TIMES.length} times, com o logo no peito` },
  ...CATEGORIAS,
] as const

// Branco some no cartão claro: nesse caso a faixa de cima do cartão usa a cor de destaque.
const BRANCO = '#F4F2EA'

// A faixa da marca é preta em quase todas as bolas de time.
const FAIXA_PRETA = '#141414'

type Aba = (typeof ABAS)[number]['id']

const CONFERENCIAS: { id: Conferencia | 'todas'; rotulo: string }[] = [
  { id: 'todas', rotulo: 'Todas' },
  { id: 'leste', rotulo: 'Leste' },
  { id: 'oeste', rotulo: 'Oeste' },
]

// Os logos de todos os times, espalhados pelas bolas All Team; o objeto é o mesmo a cada desenho.
const LOGOS_DOS_TIMES = TIMES.map((t) => logoPequeno(t.sigla, 60))
const colagens = new Map<NonNullable<(typeof MARCAS)[number]['colagem']>, Colagem>()
function colagemDe(c: (typeof MARCAS)[number]['colagem']): Colagem | undefined {
  if (!c) return undefined
  if (!colagens.has(c)) colagens.set(c, { ...c, logos: LOGOS_DOS_TIMES })
  return colagens.get(c)
}

function CartaoProduto(p: {
  /** A cor do cartão e o desenho do produto (a bola ou o sprite). */
  cor: string
  vitrine: ReactNode
  tag: string
  nome: string
  meta: string
  detalhes: string[]
  busca: string
  texto?: string
}) {
  return (
    <a
      className="card produto"
      style={{ '--c': p.cor } as CSSProperties}
      href={linkAmazon(p.busca)}
      target="_blank"
      rel="sponsored noopener noreferrer"
    >
      <span className="produto-vitrine">
        {p.vitrine}
      </span>
      <span className="tag">{p.tag}</span>
      <h3>{p.nome}</h3>
      <span className="meta">{p.meta}</span>
      {p.texto && <span className="produto-texto">{p.texto}</span>}
      <span className="dieta-foco">
        {p.detalhes.map((d) => <span key={d}>{d}</span>)}
      </span>
      <span className="cartao-jogador-rodape">
        Ver na Amazon
        <Icone nome="seta" />
      </span>
    </a>
  )
}


/** Os 30 times, com busca e filtro de conferência: uma bola de cada (tipo "bolas") ou uma regata de cada. */
function Times({ tipo }: { tipo: 'bolas' | 'regatas' }) {
  const [params, setParams] = useSearchParams()
  const [busca, setBusca] = useState('')
  const conf = CONFERENCIAS.find((c) => c.id === params.get('conf'))?.id ?? 'todas'
  const q = busca.trim().toLowerCase()
  const lista = TIMES.filter(
    (t) => (conf === 'todas' || t.conferencia === conf) && (!q || `${t.cidade} ${t.nome} ${t.sigla}`.toLowerCase().includes(q)),
  )

  return (
    <>
      <div className="filtros">
        <input className="input" type="search" placeholder="Buscar time" aria-label="Buscar time" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <div className="chips" role="group" aria-label="Conferência">
          {CONFERENCIAS.map((c) => (
            <button
              key={c.id}
              className={`chip ${c.id === conf ? 'ativo' : ''}`}
              aria-pressed={c.id === conf}
              onClick={() => setParams({ ...Object.fromEntries(params), conf: c.id }, { replace: true })}
            >
              {c.rotulo}
            </button>
          ))}
        </div>
      </div>
      {lista.length === 0 ? (
        <p className="muted">Nenhum time encontrado.</p>
      ) : (
        <div className="grade produtos">
          {lista.map((t) => (
            <CartaoProduto
              key={t.sigla}
              cor={t.cor}
              vitrine={
                tipo === 'bolas' ? (
                  <Bola
                    frente={t.bola?.frente ?? t.cor}
                    faixa={t.bola?.faixa ?? FAIXA_PRETA}
                    canal={t.bola?.canal ?? t.costura}
                    marca="Wilson"
                    logo={logoPequeno(t.sigla, LADO_DO_LOGO)}
                    icone={t.icone}
                    logoContorno={t.bola?.logoContorno}
                  />
                ) : (
                  <Sprite nome="regata" cor={t.cor} destaque={t.costura} logo={logoPequeno(t.sigla, LADO_DO_LOGO)[ehEscura(t.cor) ? 'escuro' : 'claro']} />
                )
              }
              tag={`${t.sigla} · ${t.conferencia === 'leste' ? 'Leste' : 'Oeste'}`}
              nome={`${t.cidade} ${t.nome}`}
              meta={tipo === 'bolas' ? 'Wilson NBA Team Tribute' : 'Regata do time'}
              detalhes={tipo === 'bolas' ? ['Tamanho 7', 'Coleção NBA'] : ['Regata', 'Coleção NBA']}
              busca={tipo === 'bolas' ? buscaTime(t) : buscaRegata(t)}
            />
          ))}
        </div>
      )}
    </>
  )
}

function Marcas() {
  return (
    <div className="grade produtos">
      {MARCAS.map((b) => (
        <CartaoProduto
          key={b.id}
          cor={b.cor}
          vitrine={<Bola frente={b.cor} faixa={b.cor} canal={b.costura} marca={b.marca} modelo={b.modelo} canalLargo={b.canalLargo} faixaClara={b.faixa} grao={b.grao} calota={b.calota} colagem={colagemDe(b.colagem)} marcaCor={b.marcaCor} marcaContorno={b.marcaContorno} marcaTamanho={b.marcaTamanho} emblema={b.emblema} />}
          tag={b.marca}
          nome={b.nome}
          meta={b.material}
          texto={b.texto}
          detalhes={[b.uso, 'Tamanho 7']}
          busca={b.busca}
        />
      ))}
    </div>
  )
}

/** Roupas, tênis e proteção, ou material de treino. */
function Produtos({ categoria }: { categoria: Categoria }) {
  return (
    <div className="grade produtos">
      {PRODUTOS.filter((p) => p.categoria === categoria).map((p) => (
        <CartaoProduto
          key={p.id}
          cor={p.cor === BRANCO ? p.destaque : p.cor}
          vitrine={<Sprite nome={p.sprite} cor={p.cor} destaque={p.destaque} />}
          tag={p.tipo}
          nome={p.nome}
          meta={p.detalhes[0]}
          texto={p.texto}
          detalhes={p.detalhes.slice(1)}
          busca={p.busca}
        />
      ))}
    </div>
  )
}

export default function Equipamentos() {
  const [params, setParams] = useSearchParams()
  const aba = (ABAS.find((a) => a.id === params.get('aba'))?.id ?? 'times') as Aba

  return (
    <>
      <h1>Equipamentos</h1>
      <p className="muted">
        Tudo para a quadra: bolas das grandes marcas e de cada time da NBA, regatas, roupas, tênis, proteção e material de treino.
      </p>
      <p className="dieta-aviso">
        <strong>Os botões abrem a Amazon.</strong> Preço, fotos e compra ficam por lá. Como Associado da Amazon, o Basketball Practice
        ganha com compras qualificadas, sem custo a mais para você.
      </p>

      <div className="niveis niveis-abas produtos-abas" role="tablist" aria-label="Equipamentos">
        {ABAS.map((a) => (
          <button key={a.id} role="tab" aria-selected={a.id === aba} className={`nivel-opcao ${a.id === aba ? 'ativo' : ''}`} onClick={() => setParams({ aba: a.id }, { replace: true })}>
            <strong>{a.rotulo}</strong>
            <span>{a.resumo}</span>
          </button>
        ))}
      </div>

      <section role="tabpanel" aria-label={ABAS.find((a) => a.id === aba)!.rotulo}>
        {aba === 'times' && <Times tipo="bolas" />}
        {aba === 'marcas' && <Marcas />}
        {aba === 'regatas' && <Times tipo="regatas" />}
        {(aba === 'roupas' || aba === 'calcados' || aba === 'treino') && <Produtos categoria={aba} />}
      </section>
    </>
  )
}

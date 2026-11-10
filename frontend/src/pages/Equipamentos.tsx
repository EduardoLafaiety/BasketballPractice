import { useState, type CSSProperties } from 'react'
import { useSearchParams } from 'react-router-dom'
import { buscaTime, linkAmazon, MARCAS, TIMES, type Conferencia } from '../equipamentos/dados'
import Bola from '../equipamentos/Bola'
import type { IconeTime } from '../equipamentos/icones-times'
import Icone from '../components/Icone'

const ABAS = [
  { id: 'times', rotulo: 'Times da NBA', resumo: `${TIMES.length} bolas nas cores de cada time` },
  { id: 'marcas', rotulo: 'Marcas', resumo: 'Wilson, Spalding e Molten' },
] as const

type Aba = (typeof ABAS)[number]['id']

const CONFERENCIAS: { id: Conferencia | 'todas'; rotulo: string }[] = [
  { id: 'todas', rotulo: 'Todas' },
  { id: 'leste', rotulo: 'Leste' },
  { id: 'oeste', rotulo: 'Oeste' },
]

function CartaoProduto(p: {
  cor: string
  costura: string
  impresso: string
  icone?: IconeTime
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
        <Bola cor={p.cor} costura={p.costura} nome={p.impresso} icone={p.icone} />
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

function Times() {
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
              costura={t.costura}
              impresso={t.nome}
              icone={t.icone}
              tag={`${t.sigla} · ${t.conferencia === 'leste' ? 'Leste' : 'Oeste'}`}
              nome={`${t.cidade} ${t.nome}`}
              meta="Bola nas cores do time"
              detalhes={['Tamanho 7', 'Coleção NBA']}
              busca={buscaTime(t)}
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
          costura={b.costura}
          impresso={b.marca}
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

export default function Equipamentos() {
  const [params, setParams] = useSearchParams()
  const aba = (ABAS.find((a) => a.id === params.get('aba'))?.id ?? 'times') as Aba

  return (
    <>
      <h1>Equipamentos</h1>
      <p className="muted">Bolas para treinar e para colecionar: as oficiais das grandes marcas e uma de cada time da NBA.</p>
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
        {aba === 'times' && <Times />}
        {aba === 'marcas' && <Marcas />}
      </section>
    </>
  )
}

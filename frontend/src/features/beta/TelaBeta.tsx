import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BolaCouro } from '../../shared/ui/fundoQuadra'
import './beta.css'

/** Cinco versões da tela de aviso do beta, no mesmo tema retrô: a escolhida vira a padrão em PortaBeta. */
export const CONTATO = { email: 'deveducontato@gmail.com', instagram: 'EALOPZ' } as const

export interface PropsBeta {
  /** Chamado quando a pessoa aperta o botão principal (seguir para criar a conta). */
  aoContinuar: () => void
}

/** Figura em pixel art: cada "#" da grade vira um quadradinho na cor do texto. */
function Pixel({ grade, className = '' }: { grade: string[]; className?: string }) {
  const caminho = grade
    .flatMap((linha, y) => [...linha].map((c, x) => (c === '#' ? `M${x} ${y}h1v1h-1z` : '')))
    .join('')
  return (
    <svg className={`pixel ${className}`} viewBox={`0 0 ${grade[0].length} ${grade.length}`} shapeRendering="crispEdges" fill="currentColor" aria-hidden>
      <path d={caminho} />
    </svg>
  )
}

const CADEADO = ['..####..', '.#....#.', '.#....#.', '########', '########', '###..###', '###..###', '########', '########']
const ESTRELA = ['....#....', '....#....', '...###...', '#########', '.#######.', '..#####..', '.###.###.', '.##...##.']
const CHECK = ['......##', '.....##.', '##..##..', '.####...', '..##....']
const CORACAO = ['.##...##.', '####.####', '#########', '#########', '.#######.', '..#####..', '...###...', '....#....']

/** Onde mandar a opinião: e-mail e Instagram. */
function Contato({ className = '' }: { className?: string }) {
  return (
    <p className={`beta-contato ${className}`}>
      <span>Mande seu feedback</span>
      <a href={`mailto:${CONTATO.email}`}>{CONTATO.email}</a>
      <a href={`https://instagram.com/${CONTATO.instagram}`} target="_blank" rel="noopener noreferrer">
        Instagram @{CONTATO.instagram}
      </a>
    </p>
  )
}

function JaTenhoConta() {
  return (
    <p className="beta-ja">
      Já tem conta? <Link to="/entrar">Entrar</Link>
    </p>
  )
}

function Moldura({ nome, children }: { nome: string; children: ReactNode }) {
  return <main className={`beta beta-${nome}`}>{children}</main>
}

/** 1. Fliperama: a tela de espera de uma máquina, com placar no topo e "aperte start" piscando. */
function Fliperama({ aoContinuar }: PropsBeta) {
  return (
    <Moldura nome="fliperama">
      <p className="beta-placar-topo" aria-hidden>
        <span>1UP <b>000000</b></span>
        <span>Hi-score <b>Beta</b></span>
        <span>2UP <b>000000</b></span>
      </p>
      <p className="beta-marca">Basketball Practice</p>
      <h1 className="beta-titulo">Versão beta</h1>
      <div className="bf-tela">
        <p>Você chegou antes de todo mundo. O site ainda está em construção e este é o melhor momento para explorar, treinar e se divertir.</p>
        <p>Funcionalidades novas ainda vão chegar. Se algo travar, confundir ou faltar, avise.</p>
      </div>
      <Contato />
      <button type="button" className="beta-btn bf-start" onClick={aoContinuar}>
        Aperte start para criar sua conta
      </button>
      <JaTenhoConta />
      <p className="bf-credito" aria-hidden>Crédito: infinito</p>
    </Moldura>
  )
}

/** 2. Cartucho: um cartucho de console com a etiqueta "beta" e as instruções ao lado. */
function Cartucho({ aoContinuar }: PropsBeta) {
  return (
    <Moldura nome="cartucho">
      <div className="bc-conjunto">
        <div className="bc-cartucho" aria-hidden>
          <div className="bc-entalhe" />
          <div className="bc-etiqueta">
            <span className="bc-selo">Beta</span>
            <BolaCouro />
            <span className="bc-nome">Basketball Practice</span>
          </div>
          <div className="bc-pinos">
            {Array.from({ length: 10 }, (_, i) => <i key={i} />)}
          </div>
        </div>
        <div className="bc-texto">
          <p className="beta-marca">Leia antes de jogar</p>
          <h1 className="beta-titulo">Este é o beta</h1>
          <ul className="bc-lista">
            <li><Pixel grade={ESTRELA} /> Explore tudo, treine e se divirta. O site é seu para testar.</li>
            <li><Pixel grade={CADEADO} /> Tem funcionalidades que ainda vão chegar.</li>
            <li><Pixel grade={CORACAO} /> Sua opinião muda o jogo: conte o que achou.</li>
          </ul>
          <Contato />
          <button type="button" className="beta-btn" onClick={aoContinuar}>Inserir cartucho e criar conta</button>
          <JaTenhoConta />
        </div>
      </div>
    </Moldura>
  )
}

/** 3. Diálogo: a bola fala numa caixa de texto de RPG, com um menu de opções. */
function Dialogo({ aoContinuar }: PropsBeta) {
  return (
    <Moldura nome="dialogo">
      <div className="bd-cena">
        <div className="bd-bola" aria-hidden><BolaCouro /><i className="bd-sombra" /></div>
        <section className="bd-caixa" aria-labelledby="bd-titulo">
          <span className="bd-nome">Técnico</span>
          <h1 id="bd-titulo" className="beta-titulo">Calma, é um beta!</h1>
          <p>Aqui você encontra treinos, rotina e evolução, mas o jogo ainda está sendo montado. Aproveite, explore cada canto e treine à vontade.</p>
          <p>Vão aparecer funcionalidades novas por aqui. O que você achar, me conta que eu ajusto.</p>
          <Contato />
          <ul className="bd-menu">
            <li><button type="button" onClick={aoContinuar}><b aria-hidden>&gt;</b> Criar minha conta e treinar</button></li>
            <li><Link to="/entrar"><b aria-hidden>&gt;</b> Já tenho conta</Link></li>
            <li><a href={`mailto:${CONTATO.email}`}><b aria-hidden>&gt;</b> Mandar feedback</a></li>
          </ul>
          <span className="bd-seta" aria-hidden />
        </section>
      </div>
    </Moldura>
  )
}

/** 4. Placar: um painel de ginásio com células de status e espaços misteriosos para as novidades. */
function Placar({ aoContinuar }: PropsBeta) {
  return (
    <Moldura nome="placar">
      <div className="bp-painel">
        <p className="bp-topo">Basketball Practice</p>
        <h1 className="beta-titulo">Beta</h1>
        <div className="bp-celulas">
          <div><span>Fase</span><strong>Testes</strong></div>
          <div><span>Tempo</span><strong>Livre</strong></div>
          <div><span>Novidades</span><strong>???</strong></div>
        </div>
        <p className="bp-texto">O site está no ar, mas ainda em evolução. Entre, explore, treine e se divirta. Funcionalidades novas vão chegar e a sua opinião decide o que vem primeiro.</p>
        <Contato />
        <button type="button" className="beta-btn" onClick={aoContinuar}>Entrar em quadra</button>
        <JaTenhoConta />
      </div>
    </Moldura>
  )
}

const FASES = [
  { nome: 'Treinos', aberta: true },
  { nome: 'Rotina', aberta: true },
  { nome: 'Evolução', aberta: true },
  { nome: '???', aberta: false },
  { nome: '???', aberta: false },
]

/** 5. Fases: um seletor de fases, com as seções já liberadas e as que ainda vão abrir. */
function Fases({ aoContinuar }: PropsBeta) {
  return (
    <Moldura nome="fases">
      <div className="bm-conjunto">
        <p className="beta-marca">Basketball Practice · Beta</p>
        <h1 className="beta-titulo">Escolha a fase</h1>
        <p className="bm-texto">Três fases já estão abertas para você treinar. As outras abrem aos poucos, durante o beta. Explore, divirta-se e conte o que achou.</p>
        <ol className="bm-fases">
          {FASES.map((f, i) => (
            <li key={i} className={f.aberta ? 'aberta' : 'fechada'}>
              <span className="bm-num">{i + 1}</span>
              <span className="bm-nome">{f.nome}</span>
              <span className="bm-estado">
                {f.aberta ? <Pixel grade={CHECK} /> : <Pixel grade={CADEADO} />}
                <b>{f.aberta ? 'Liberada' : 'Em breve'}</b>
              </span>
            </li>
          ))}
        </ol>
        <div className="bm-barra" role="img" aria-label="3 de 5 fases liberadas"><i style={{ width: '60%' }} /></div>
        <p className="bm-legenda">3 de 5 fases liberadas</p>
        <Contato />
        <button type="button" className="beta-btn" onClick={aoContinuar}>Começar a jogar</button>
        <JaTenhoConta />
      </div>
    </Moldura>
  )
}

export const VARIANTES = [
  { numero: 1, nome: 'Fliperama', tela: Fliperama },
  { numero: 2, nome: 'Cartucho', tela: Cartucho },
  { numero: 3, nome: 'Diálogo', tela: Dialogo },
  { numero: 4, nome: 'Placar', tela: Placar },
  { numero: 5, nome: 'Fases', tela: Fases },
] as const

/** A versão em uso no cadastro. Para trocar, mude este número (1 a 5). */
export const VARIANTE_PADRAO = 1

export default function TelaBeta({ variante = VARIANTE_PADRAO, aoContinuar }: PropsBeta & { variante?: number }) {
  const { tela: Tela } = VARIANTES.find((v) => v.numero === variante) ?? VARIANTES[VARIANTE_PADRAO - 1]
  return <Tela aoContinuar={aoContinuar} />
}

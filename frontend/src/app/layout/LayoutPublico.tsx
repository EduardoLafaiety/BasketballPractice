import { Suspense, useEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../features/autenticacao/model/auth'
import { LinksLegais } from '../../features/autenticacao/components/TelaAuth'
import { iniciarEfeitos } from '../../shared/lib/efeitos'
import { useAnimacoes } from '../../shared/lib/movimento'
import Icone from '../../shared/ui/Icone'
import { Carregando } from '../../shared/ui/Estado'
import LimiteDeErro from '../../shared/ui/LimiteDeErro'
import Layout from './Layout'

// Equipamentos e Artigos abrem sem conta: quem chega pelo Google (e os revisores do AdSense e da Amazon)
// lê e compra sem cadastro. Quem já entrou vê o app de sempre; o visitante, só estas páginas e o convite.
const PUBLICAS = [
  { to: '/equipamentos', rotulo: 'Equipamentos' },
  { to: '/artigos', rotulo: 'Artigos' },
]

/** O layout do app para quem tem sessão; o público para o visitante. */
export function LoginOpcional() {
  const { usuario, verificando, temToken } = useAuth()
  if (verificando) return <Carregando texto={__DEMO__ ? 'Preparando o app' : 'Conferindo sua sessão'} />
  return usuario || temToken ? <Layout /> : <LayoutPublico />
}

export default function LayoutPublico() {
  const { pathname, search } = useLocation()
  const conteudo = useRef<HTMLElement>(null)
  // Depois de entrar ou criar a conta, volta para a página que estava aberta.
  const voltar = { de: pathname + search }

  const { reduzido } = useAnimacoes()
  useEffect(() => (conteudo.current && !reduzido ? iniciarEfeitos(conteudo.current) : undefined), [reduzido])
  useEffect(() => {
    if (!navigator.userAgent.includes('jsdom')) window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="app app-publico">
      <a className="pular-conteudo" href="#conteudo">Pular para o conteúdo</a>
      <header className="topo">
        <Link to="/entrar" className="marca" aria-label="Basketball Practice, entrar">
          <Icone nome="bola" tamanho={34} />
        </Link>
        <nav className="topo-atalhos topo-atalhos-publico" aria-label="Páginas abertas">
          {PUBLICAS.map((l) => <NavLink key={l.to} to={l.to}>{l.rotulo}</NavLink>)}
        </nav>
        <Link to="/entrar" state={voltar} className="topo-menu">Entrar</Link>
        <Link to="/cadastro" state={voltar} className="topo-menu topo-cadastro">Criar conta</Link>
      </header>

      <main id="conteudo" tabIndex={-1} className="conteudo" ref={conteudo}>
        <LimiteDeErro key={pathname}><Suspense fallback={<Carregando />}>
          <Outlet />
        </Suspense></LimiteDeErro>
      </main>
      <footer className="rodape">
        <div className="rodape-principal">
          <Link to="/entrar" className="rodape-marca"><Icone nome="bola" tamanho={28} /> Basketball Practice</Link>
          <nav aria-label="Links do rodapé">
            {PUBLICAS.map((l) => <Link key={l.to} to={l.to}>{l.rotulo}</Link>)}
            <Link to="/cadastro" state={voltar}>Criar conta</Link>
          </nav>
        </div>
        <LinksLegais />
      </footer>
    </div>
  )
}

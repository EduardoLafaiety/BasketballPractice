import { lazy, type ComponentType } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RequerAdmin, RequerLogin } from './auth'
import Layout from './components/Layout'
import Entrar from './pages/Entrar'
import NaoEncontrada from './pages/NaoEncontrada'
// Páginas soltas e pequenas (chegam por link de e-mail ou do rodapé): vêm junto, sem espera.
import RecuperarSenha from './pages/RecuperarSenha'
import { ConfirmarConta, RedefinirSenha } from './pages/LinkDeConta'
import { PoliticaPrivacidade, TermosDeUso } from './pages/Legal'
import AvisoCookies from './components/AvisoCookies'

// Só a entrada e o Início vêm no primeiro arquivo: cada outra página é baixada quando é aberta. Para a
// navegação continuar instantânea, todas são buscadas em segundo plano assim que o navegador fica ocioso.
const carregadores: (() => Promise<unknown>)[] = []
function pagina<M, K extends keyof M>(carregar: () => Promise<M>, nome: K) {
  carregadores.push(carregar)
  return lazy(async () => ({ default: (await carregar())[nome] as ComponentType }))
}

/** Busca o código de todas as páginas (uma vez só), sem atrapalhar o que está na tela. */
export function precarregarPaginas() {
  for (const carregar of carregadores.splice(0)) carregar().catch(() => {})
}

// O Início é a página mais pesada (bonecos animados, artigos): fica fora do arquivo de entrada, mas começa
// a ser baixado na hora, em paralelo, para estar pronto quando a sessão for conferida.
const carregarInicio = () => import('./pages/Inicio')
const Inicio = pagina(carregarInicio, 'default')
carregarInicio().catch(() => {})
const Treinos = pagina(() => import('./pages/Treinos'), 'default')
const TreinoDetalhe = pagina(() => import('./pages/TreinoDetalhe'), 'default')
const JogueComo = pagina(() => import('./pages/JogueComo'), 'default')
const EstatisticasNba = pagina(() => import('./nba/EstatisticasNba'), 'default')
const ClassificacaoNbb = pagina(() => import('./nbb/ClassificacaoNbb'), 'default')
const EstiloDetalhe = pagina(() => import('./pages/EstiloDetalhe'), 'default')
const Rotina = pagina(() => import('./pages/Rotina'), 'default')
const Alimentacao = pagina(() => import('./pages/Alimentacao'), 'default')
const Equipamentos = pagina(() => import('./pages/Equipamentos'), 'default')
const Artigos = pagina(() => import('./pages/Artigos'), 'default')
const ArtigoDetalhe = pagina(() => import('./pages/Artigos'), 'ArtigoDetalhe')
const Desempenho = pagina(() => import('./pages/Desempenho'), 'default')
const CartaoDoAtleta = pagina(() => import('./pages/Cartao'), 'default')
const Programas = pagina(() => import('./pages/Programas'), 'default')
const ProgramaDetalhe = pagina(() => import('./pages/Programas'), 'ProgramaDetalhe')
const Jogos = pagina(() => import('./pages/Jogos'), 'default')
const RankingPagina = pagina(() => import('./pages/Ranking'), 'default')
const Convite = pagina(() => import('./pages/Convite'), 'default')
const Times = pagina(() => import('./pages/Time'), 'default')
const EntrarNoTime = pagina(() => import('./pages/Time'), 'EntrarNoTime')
const TimeDetalhe = pagina(() => import('./pages/Time'), 'TimeDetalhe')
const Conquistas = pagina(() => import('./pages/Conquistas'), 'default')
const Ferramentas = pagina(() => import('./pages/Ferramentas'), 'default')
const SessaoGuiada = pagina(() => import('./pages/SessaoGuiada'), 'default')
const Configuracoes = pagina(() => import('./pages/Configuracoes'), 'default')
const Admin = pagina(() => import('./pages/Admin'), 'default')

export default function App() {
  return (
    <>
      <Rotas />
      <AvisoCookies />
    </>
  )
}

function Rotas() {
  return (
    <Routes>
      <Route path="entrar" element={<Entrar modo="entrar" />} />
      {/* Na demonstração não há contas para criar: o login já aceita qualquer e-mail e senha. */}
      <Route path="cadastro" element={__DEMO__ ? <Navigate to="/entrar" replace /> : <Entrar modo="cadastro" />} />
      <Route path="recuperar-senha" element={__DEMO__ ? <Navigate to="/entrar" replace /> : <RecuperarSenha />} />
      <Route path="redefinir-senha" element={__DEMO__ ? <Navigate to="/entrar" replace /> : <RedefinirSenha />} />
      <Route path="confirmar-conta" element={__DEMO__ ? <Navigate to="/entrar" replace /> : <ConfirmarConta />} />
      <Route path="privacidade" element={<PoliticaPrivacidade />} />
      <Route path="termos" element={<TermosDeUso />} />
      <Route
        element={
          <RequerLogin>
            <Layout />
          </RequerLogin>
        }
      >
        <Route index element={<Inicio />} />
        <Route path="treinos" element={<Treinos />} />
        <Route path="treinos/:id" element={<TreinoDetalhe />} />
        {/* O gerador agora fica na Rotina: os endereços e links antigos continuam funcionando. */}
        <Route path="gerador" element={<Navigate to="/rotina" replace />} />
        {/* O desafio do dia e o quiz saíram do app: os links antigos levam aos artigos. */}
        <Route path="desafio" element={<Navigate to="/artigos" replace />} />
        <Route path="quiz" element={<Navigate to="/artigos" replace />} />
        <Route path="cartao" element={<CartaoDoAtleta />} />
        <Route path="programas" element={<Programas />} />
        <Route path="programas/:id" element={<ProgramaDetalhe />} />
        <Route path="jogos" element={<Jogos />} />
        <Route path="ranking" element={<RankingPagina />} />
        <Route path="convite/:codigo" element={<Convite />} />
        <Route path="time" element={<Times />} />
        <Route path="time/entrar/:codigo" element={<EntrarNoTime />} />
        <Route path="time/:id" element={<TimeDetalhe />} />
        <Route path="sessao" element={<SessaoGuiada />} />
        <Route path="jogue-como" element={<JogueComo />} />
        <Route path="jogue-como/:id" element={<EstiloDetalhe />} />
        <Route path="nba" element={<EstatisticasNba />} />
        <Route path="nbb" element={<ClassificacaoNbb />} />
        <Route path="rotina" element={<Rotina />} />
        <Route path="alimentacao" element={<Alimentacao />} />
        <Route path="equipamentos" element={<Equipamentos />} />
        <Route path="artigos" element={<Artigos />} />
        <Route path="artigos/:id" element={<ArtigoDetalhe />} />
        <Route path="desempenho" element={<Desempenho />} />
        <Route path="conquistas" element={<Conquistas />} />
        {/* A aba se chamava Metas: os links e favoritos antigos continuam funcionando. */}
        <Route path="metas" element={<Navigate to="/conquistas" replace />} />
        <Route path="ferramentas" element={<Ferramentas />} />
        <Route path="configuracoes" element={<Configuracoes />} />
        <Route path="admin" element={<RequerAdmin senao={<NaoEncontrada />}><Admin /></RequerAdmin>} />
        <Route path="*" element={<NaoEncontrada />} />
      </Route>
    </Routes>
  )
}

import { registrarPagina } from '../shared/lib/precarregamento'
import { lazy, type ComponentType } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RequerAdmin, RequerLogin, useAuth } from '../features/autenticacao/model/auth'
import Layout from './layout/Layout'
import Entrar from '../features/autenticacao/pages/Entrar'
import NaoEncontrada from '../features/navegacao/pages/NaoEncontrada'
// Páginas soltas e pequenas (chegam por link de e-mail ou do rodapé): vêm junto, sem espera.
import RecuperarSenha from '../features/autenticacao/pages/RecuperarSenha'
import { ConfirmarConta, RedefinirSenha } from '../features/autenticacao/pages/LinkDeConta'
import { PoliticaPrivacidade, TermosDeUso } from '../features/legal/pages/Legal'
import { PortaBeta, PreviaBeta } from '../features/beta/PortaBeta'
import { useIdioma } from '../shared/i18n/idioma'
import Apresentacao from '../features/apresentacao/Apresentacao'
import Assinatura, { RequerAssinatura } from '../features/assinatura/Assinatura'
import Compra from '../features/assinatura/Compra'
import Contato from '../features/apresentacao/Contato'

// Páginas baixadas quando abertas; antecipação apenas por intenção de navegação.
function pagina<M, K extends keyof M>(carregar: () => Promise<M>, nome: K, rota: string) {
  registrarPagina(rota, carregar)
  return lazy(async () => ({ default: (await carregar())[nome] as ComponentType }))
}
const Inicio = pagina(() => import('../features/inicio/pages/Inicio'), 'default', '/')
const Treinos = pagina(() => import('../features/treinos/pages/Treinos'), 'default', '/treinos')
const TreinoDetalhe = pagina(() => import('../features/treinos/pages/TreinoDetalhe'), 'default', '/treinos/:id')
const JogueComo = pagina(() => import('../features/estilos/pages/JogueComo'), 'default', '/jogue-como')
const EstatisticasNba = pagina(() => import('../features/nba/EstatisticasNba'), 'default', '/nba')
const ClassificacaoNbb = pagina(() => import('../features/nbb/ClassificacaoNbb'), 'default', '/nbb')
const EstiloDetalhe = pagina(() => import('../features/estilos/pages/EstiloDetalhe'), 'default', '/jogue-como/:id')
const Rotina = pagina(() => import('../features/rotina/pages/Rotina'), 'default', '/rotina')
const Alimentacao = pagina(() => import('../features/alimentacao/pages/Alimentacao'), 'default', '/alimentacao')
const Equipamentos = pagina(() => import('../features/equipamentos/pages/Equipamentos'), 'default', '/equipamentos')
const Artigos = pagina(() => import('../features/artigos/pages/Artigos'), 'default', '/artigos')
const ArtigoDetalhe = pagina(() => import('../features/artigos/pages/Artigos'), 'ArtigoDetalhe', '/artigos/:id')
const Conquistas = pagina(() => import('../features/evolucao/pages/Conquistas'), 'default', '/conquistas')
const Evolucao = pagina(() => import('../features/evolucao/pages/Evolucao'), 'default', '/evolucao')
const Overall = pagina(() => import('../features/evolucao/pages/Overall'), 'default', '/overall')
const Programas = pagina(() => import('../features/programas/pages/Programas'), 'default', '/programas')
const ProgramaDetalhe = pagina(() => import('../features/programas/pages/Programas'), 'ProgramaDetalhe', '/programas/:id')
const SessaoGuiada = pagina(() => import('../features/sessao/pages/SessaoGuiada'), 'default', '/sessao')
const Configuracoes = pagina(() => import('../features/conta/pages/Configuracoes'), 'default', '/configuracoes')
const Admin = pagina(() => import('../features/admin/pages/Admin'), 'default', '/admin')

export default function App() {
  useIdioma()
  return <Rotas />
}

function EntradaSite() {
  const { usuario, temToken, verificando } = useAuth()
  if (!usuario && !temToken && !verificando) return <Apresentacao />
  return <RequerLogin><Layout /></RequerLogin>
}

function Rotas() {
  return (
    <Routes>
      <Route path="/" element={<EntradaSite />}><Route element={<RequerAssinatura />}><Route index element={<Inicio />} /></Route></Route>
      <Route path="conheca" element={<Apresentacao />} />
      <Route path="assinatura" element={<Assinatura />} />
      <Route path="compra" element={<Compra />} />
      <Route path="contato" element={<Contato />} />
      <Route path="entrar" element={<Entrar modo="entrar" />} />
      {/* Na demonstração não há contas para criar: o login já aceita qualquer e-mail e senha. */}
      <Route path="cadastro" element={__DEMO__ ? <Navigate to="/entrar" replace /> : import.meta.env.DEV ? <PortaBeta><Entrar modo="cadastro" /></PortaBeta> : <Entrar modo="cadastro" />} />
      {/* Prévia das versões do aviso de beta (também na demonstração, para escolher a preferida). */}
      {import.meta.env.DEV && <Route path="beta" element={<PreviaBeta />} />}
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
        <Route element={<RequerAssinatura />}>
        <Route path="equipamentos" element={<Equipamentos />} />
        <Route path="artigos" element={<Artigos />} />
        <Route path="artigos/:id" element={<ArtigoDetalhe />} />
        <Route path="treinos" element={<Treinos />} />
        <Route path="treinos/:id" element={<TreinoDetalhe />} />
        {/* O gerador agora fica na Rotina: os endereços e links antigos continuam funcionando. */}
        <Route path="gerador" element={<Navigate to="/rotina" replace />} />
        {/* O desafio do dia e o quiz saíram do app: os links antigos levam aos artigos. */}
        <Route path="desafio" element={<Navigate to="/artigos" replace />} />
        <Route path="quiz" element={<Navigate to="/artigos" replace />} />
        <Route path="programas" element={<Programas />} />
        <Route path="programas/:id" element={<ProgramaDetalhe />} />
        <Route path="sessao" element={<SessaoGuiada />} />
        <Route path="jogue-como" element={<JogueComo />} />
        <Route path="jogue-como/:id" element={<EstiloDetalhe />} />
        <Route path="nba" element={<EstatisticasNba />} />
        <Route path="nbb" element={<ClassificacaoNbb />} />
        <Route path="rotina" element={<Rotina />} />
        <Route path="alimentacao" element={<Alimentacao />} />
        <Route path="conquistas" element={<Conquistas />} />
        <Route path="evolucao" element={<Evolucao />} />
        <Route path="overall" element={<Overall />} />
        </Route>
        <Route path="configuracoes" element={<Configuracoes />} />
        <Route path="admin" element={<RequerAdmin senao={<NaoEncontrada />}><Admin /></RequerAdmin>} />
        <Route path="*" element={<NaoEncontrada />} />
      </Route>
    </Routes>
  )
}

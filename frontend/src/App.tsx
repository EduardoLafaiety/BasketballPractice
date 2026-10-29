import { Navigate, Route, Routes } from 'react-router-dom'
import { RequerAdmin, RequerLogin } from './auth'
import Layout from './components/Layout'
import Inicio from './pages/Inicio'
import Entrar from './pages/Entrar'
import Treinos from './pages/Treinos'
import TreinoDetalhe from './pages/TreinoDetalhe'
import JogueComo from './pages/JogueComo'
import EstiloDetalhe from './pages/EstiloDetalhe'
import Rotina from './pages/Rotina'
import Desempenho from './pages/Desempenho'
import Metas from './pages/Metas'
import Ferramentas from './pages/Ferramentas'
import Gerador from './pages/Gerador'
import SessaoGuiada from './pages/SessaoGuiada'
import Configuracoes from './pages/Configuracoes'
import NaoEncontrada from './pages/NaoEncontrada'
import Admin from './pages/Admin'

export default function App() {
  return (
    <Routes>
      {/* Na demonstração não há contas: login e cadastro levam direto ao app. */}
      <Route path="entrar" element={__DEMO__ ? <Navigate to="/" replace /> : <Entrar modo="entrar" />} />
      <Route path="cadastro" element={__DEMO__ ? <Navigate to="/" replace /> : <Entrar modo="cadastro" />} />
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
        <Route path="gerador" element={<Gerador />} />
        <Route path="sessao" element={<SessaoGuiada />} />
        <Route path="jogue-como" element={<JogueComo />} />
        <Route path="jogue-como/:id" element={<EstiloDetalhe />} />
        <Route path="rotina" element={<Rotina />} />
        <Route path="desempenho" element={<Desempenho />} />
        <Route path="metas" element={<Metas />} />
        <Route path="ferramentas" element={<Ferramentas />} />
        <Route path="configuracoes" element={<Configuracoes />} />
        <Route path="admin" element={<RequerAdmin senao={<NaoEncontrada />}><Admin /></RequerAdmin>} />
        <Route path="*" element={<NaoEncontrada />} />
      </Route>
    </Routes>
  )
}

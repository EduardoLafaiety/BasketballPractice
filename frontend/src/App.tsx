import { Route, Routes } from 'react-router-dom'
import { RequerLogin } from './auth'
import Layout from './components/Layout'
import Inicio from './pages/Inicio'
import Entrar from './pages/Entrar'
import Treinos from './pages/Treinos'
import TreinoDetalhe from './pages/TreinoDetalhe'
import Rotina from './pages/Rotina'
import Desempenho from './pages/Desempenho'
import Metas from './pages/Metas'
import Ferramentas from './pages/Ferramentas'
import Gerador from './pages/Gerador'
import SessaoGuiada from './pages/SessaoGuiada'
import Configuracoes from './pages/Configuracoes'
import NaoEncontrada from './pages/NaoEncontrada'

export default function App() {
  return (
    <Routes>
      <Route path="entrar" element={<Entrar modo="entrar" />} />
      <Route path="cadastro" element={<Entrar modo="cadastro" />} />
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
        <Route path="rotina" element={<Rotina />} />
        <Route path="desempenho" element={<Desempenho />} />
        <Route path="metas" element={<Metas />} />
        <Route path="ferramentas" element={<Ferramentas />} />
        <Route path="configuracoes" element={<Configuracoes />} />
        <Route path="*" element={<NaoEncontrada />} />
      </Route>
    </Routes>
  )
}

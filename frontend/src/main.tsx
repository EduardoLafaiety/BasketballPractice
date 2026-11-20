import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './app/App'
import { AuthProvider } from './features/autenticacao/model/auth'
import { iniciarPwa } from './shared/lib/pwa'
import { aplicarMovimento } from './shared/lib/movimento'
import { aplicarTema, temaSalvo } from './shared/lib/tema'
// Fontes servidas pelo próprio site: sem depender do Google Fonts e funcionando offline no PWA.
import '@fontsource-variable/big-shoulders-display'
import '@fontsource-variable/manrope'
import '@fontsource/instrument-serif/400-italic.css'
import './styles.css'
import './styles/controles.css'
import './styles/refinamento.css'
import './styles/ajustes.css'

// Subpasta do site (VITE_BASE), ex.: /BasketballPractice no GitHub Pages; "/" no site normal.
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

// Tema da última visita, antes do primeiro render; o salvo na conta chega depois do login.
aplicarTema(temaSalvo())
aplicarMovimento()
iniciarPwa()
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={BASE}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

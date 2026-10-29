import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './auth'
import { iniciarPwa } from './lib/pwa'
import { aplicarTema, temaSalvo } from './lib/tema'
import './styles.css'

// Subpasta do site (VITE_BASE), ex.: /BasketballPractice no GitHub Pages; "/" no site normal.
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

// Tema da última visita, antes do primeiro render; o salvo na conta chega depois do login.
aplicarTema(temaSalvo())
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

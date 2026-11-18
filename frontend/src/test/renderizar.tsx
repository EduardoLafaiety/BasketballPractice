import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import App from '../app/App'
import { AuthProvider } from '../features/autenticacao/model/auth'
// No site o Início é baixado à parte, em paralelo com a entrada. Aqui ele já vem carregado, para o primeiro
// teste de cada arquivo não depender do tempo de leitura do módulo.
import '../features/inicio/pages/Inicio'

type Rota = NonNullable<ComponentProps<typeof MemoryRouter>['initialEntries']>[number]

/** Mostra o caminho atual num elemento escondido, para o teste conferir para onde o app navegou. */
function CaminhoAtual() {
  return <output data-testid="caminho" hidden>{useLocation().pathname}</output>
}

/** Monta o app inteiro (rotas + login) começando na rota indicada (texto ou { pathname, state }). */
export function abrirApp(rota: Rota = '/') {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <AuthProvider>
        <App />
        <CaminhoAtual />
      </AuthProvider>
    </MemoryRouter>,
  )
}

/** Interações com o menu seguem o mesmo caminho disponível no navegador. */
export async function abrirMenu() {
  if (document.getElementById('menu-tela')?.getAttribute('aria-hidden') === 'false') return
  await userEvent.click(await screen.findByRole('button', { name: 'Menu' }))
}

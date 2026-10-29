import { render } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import App from '../App'
import { AuthProvider } from '../auth'

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

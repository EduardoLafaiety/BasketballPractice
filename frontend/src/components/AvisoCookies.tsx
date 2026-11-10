import { Link } from 'react-router-dom'
import { definirConsentimento, fecharPreferenciasCookies, useConsentimento } from '../lib/cookies'

/** Aviso fixo no pé da tela até o visitante escolher; volta pelo link "Preferências de cookies". */
export default function AvisoCookies() {
  const { escolha, visivel } = useConsentimento()
  if (!visivel) return null

  return (
    <section className="aviso-cookies" aria-label="Aviso de cookies">
      <p>
        O site guarda no seu navegador o que precisa para funcionar, como o login e o tema. Com a sua permissão, os
        anúncios do Google também poderão usar cookies para mostrar anúncios do seu interesse. Você pode mudar a escolha
        quando quiser. <Link to="/privacidade#cookies">Saiba mais</Link>.
      </p>
      {escolha && (
        <p className="aviso-cookies-atual">
          Escolha atual: {escolha === 'aceito' ? 'anúncios personalizados permitidos' : 'anúncios personalizados recusados'}.
        </p>
      )}
      <div className="aviso-cookies-botoes">
        <button type="button" className="btn" onClick={() => definirConsentimento('recusado')}>Recusar</button>
        <button type="button" className="btn" onClick={() => definirConsentimento('aceito')}>Aceitar</button>
        {escolha && (
          <button type="button" className="btn" onClick={fecharPreferenciasCookies}>Fechar</button>
        )}
      </div>
    </section>
  )
}

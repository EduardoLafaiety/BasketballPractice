import { useEffect } from 'react'
import { carregarAdsense, idEditor } from '../lib/adsense'
import { useConsentimento } from '../lib/cookies'

// Sem VITE_ADSENSE_ID (e na demonstração) o site sai sem anúncio nenhum. Com ele, o script entra já na
// primeira visita, pedindo só anúncios não personalizados até o visitante tocar em Aceitar no aviso de cookies.
const ID = __DEMO__ ? null : idEditor(import.meta.env.VITE_ADSENSE_ID)

export default function Anuncios() {
  const personalizados = useConsentimento().escolha === 'aceito'

  // O script entra uma vez só; quando a escolha muda, só a personalização dos próximos anúncios é trocada.
  useEffect(() => {
    if (ID) carregarAdsense(ID, personalizados)
  }, [personalizados])

  return null
}

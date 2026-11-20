import LinkInicio from '../../shared/ui/LinkInicio'
import { useEffect, useState } from 'react'
import { Link } from '../../shared/i18n/links'
import LogoBola from '../../shared/ui/LogoBola'
import PreferenciasCabecalho from '../../shared/ui/PreferenciasCabecalho'
import './contato.css'

const EMAIL = 'contatobasketballpractice@gmail.com'
export default function Contato() {
  useEffect(() => { if (!navigator.userAgent.includes('jsdom')) window.scrollTo(0, 0) }, [])
  const [aviso, setAviso] = useState('')
  async function copiar() {
    try { await navigator.clipboard.writeText(EMAIL); setAviso('E-mail copiado.') }
    catch { setAviso('Não foi possível copiar automaticamente. Selecione o endereço acima e copie.') }
  }
  return <div className="contato-pagina">
    <header className="topo contato-topo"><LinkInicio className="contato-marca"><LogoBola /><span>Basketball Practice</span></LinkInicio><PreferenciasCabecalho /></header>
    <main className="contato-conteudo"><Link className="contato-voltar" to="/conheca">← Voltar ao site</Link><p className="contato-kicker">Fale com a gente</p><h1>Estamos por aqui.</h1><p className="contato-intro">Dúvidas sobre o site, sua conta ou assinatura? Escolha como falar com o Basketball Practice.</p>
      <section className="contato-card"><span className="contato-numero">01</span><h2>E-mail</h2><p>Para atendimento, pagamentos e solicitações de privacidade.</p><a className="contato-email" href={`mailto:${EMAIL}`} translate="no">{EMAIL}</a><div className="contato-acoes"><a className="btn btn-primario" href={`mailto:${EMAIL}`}>Abrir e-mail ↗</a><button className="btn" onClick={() => void copiar()}>Copiar endereço</button></div><p className="contato-dica">O botão abre seu aplicativo de e-mail. Se ele não estiver configurado, copie o endereço e use o serviço de sua preferência.</p><p role="status" aria-live="polite">{aviso}</p></section>
      <section className="contato-card"><span className="contato-numero">02</span><h2>Instagram</h2><p>Acompanhe o Basketball Practice e converse com a gente pelo perfil oficial.</p><a className="contato-instagram" href="https://www.instagram.com/basketballpratice/" target="_blank" rel="noopener noreferrer" translate="no">@basketballpratice ↗</a></section>
      <p className="contato-dica">Para proteger sua conta, não envie senhas, dados completos de cartão ou códigos de segurança.</p><footer className="contato-rodape"><Link to="/privacidade">Privacidade</Link><Link to="/termos">Termos de uso</Link></footer>
    </main>
  </div>
}

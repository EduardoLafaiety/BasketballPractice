import { useEffect, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Icone from '../components/Icone'
import { LinksLegais } from '../components/TelaAuth'

function PaginaLegal({ titulo, children }: { titulo: string; children: ReactNode }) {
  // Links como /privacidade#cookies abrem já na seção (o roteador não rola sozinho até a âncora).
  const { hash } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView()
  }, [hash])

  return (
    <div className="legal">
      <Link to="/" className="legal-marca">
        <span className="marca"><Icone nome="bola" tamanho={28} /></span>
        <span className="topo-secao">Basketball Practice</span>
      </Link>
      <main className="legal-texto">
        <h1>{titulo}</h1>
        <div className="legal-rascunho" role="note">
          <strong>Rascunho, ainda sem valor definitivo.</strong> Este texto precisa ser revisado por um advogado antes de o
          cadastro ser aberto ao público. Ele descreve como o Basketball Practice funciona hoje e não afirma que o serviço
          cumpre alguma lei ou norma. Os trechos entre colchetes ainda não foram decididos.
        </div>
        {children}
      </main>
      <LinksLegais />
    </div>
  )
}

export function PoliticaPrivacidade() {
  return (
    <PaginaLegal titulo="Política de Privacidade">
      <h2>Quem cuida dos dados</h2>
      <p>[A definir: nome ou razão social do responsável, documento e um contato para assuntos de privacidade.]</p>

      <h2>O que guardamos</h2>
      <ul>
        <li><strong>Conta:</strong> nome, e-mail e a senha em forma de hash, nunca o texto dela.</li>
        <li><strong>Treino:</strong> exercícios, treinos, sessões, arremessos por zona, notas, metas e preferências que você registra.</li>
        <li><strong>Testes físicos:</strong> os resultados que você registra, como impulsão e sprint.</li>
        <li><strong>Segurança:</strong> o endereço IP é usado para limitar tentativas de acesso. A contagem fica na memória do servidor e não é gravada no banco.</li>
        <li><strong>Pedidos de cadastro:</strong> o nome, o e-mail e o hash da senha ficam à espera da ativação por até 24 horas e são descartados quando um novo cadastro é feito depois desse prazo.</li>
      </ul>

      <h2 id="cookies">Cookies e armazenamento no navegador</h2>
      <p>Cookies e o armazenamento local são pequenos dados que um site guarda no seu navegador. O Basketball Practice usa dois tipos:</p>
      <ul>
        <li>
          <strong>Necessários, sempre ligados:</strong> a sessão de acesso, o tema claro ou escuro, a escolha de animações, o
          dia do último lembrete, a sua resposta ao aviso de cookies e uma cópia temporária das estatísticas da NBA, apagada
          ao fechar a aba. Sem eles o site não funciona como deveria. Nenhum é usado para anúncios.
        </li>
        <li>
          <strong>De anúncios personalizados, só com sua permissão:</strong> quando o site passar a exibir anúncios do Google
          AdSense, o Google e seus parceiros poderão usar cookies para escolher anúncios com base nos seus interesses. Isso só
          acontece se você tocar em Aceitar no aviso de cookies.
        </li>
      </ul>
      <p>
        Você pode mudar a escolha a qualquer momento pelo link Preferências de cookies, no rodapé de todas as páginas.
        Apagar os dados do site no navegador também apaga a escolha, e o aviso aparece de novo.
      </p>

      <h2 id="anuncios">Anúncios</h2>
      <p>
        O site é gratuito e se mantém com anúncios e links de afiliado. [A definir: a data em que os anúncios começam.]
        Os anúncios são fornecidos pelo Google, que, como fornecedor terceiro, usa cookies para exibi-los com base nas suas
        visitas a este e a outros sites. Se você recusar, o site pedirá ao Google só anúncios não personalizados. Mesmo
        esses podem usar cookies para limitar quantas vezes um anúncio aparece, contar visualizações e evitar fraudes.
      </p>
      <ul>
        <li>
          Como o Google usa os dados dos sites parceiros:{' '}
          <a className="link" href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noreferrer">
            policies.google.com/technologies/partner-sites
          </a>
          .
        </li>
        <li>
          Para desativar anúncios personalizados do Google em qualquer site:{' '}
          <a className="link" href="https://adssettings.google.com" target="_blank" rel="noreferrer">adssettings.google.com</a>.
        </li>
      </ul>

      <h2 id="afiliados">Links da Amazon</h2>
      <p>
        Como Associado da Amazon, o Basketball Practice ganha com compras qualificadas. Os botões da aba Equipamentos levam
        à Amazon com um código de afiliado no endereço. Ao abrir a Amazon, você passa a seguir a política de privacidade
        dela, que pode usar cookies para registrar que a visita veio daqui. Não enviamos seus dados à Amazon e recebemos dela
        só relatórios de cliques e vendas, sem saber quem comprou.
      </p>

      <h2>Para que usamos</h2>
      <p>Para manter sua conta, mostrar seu histórico e sua evolução, proteger o acesso e enviar os e-mails de ativação e de recuperação de senha. Não há e-mail de propaganda.</p>

      <h2>Com quem compartilhamos</h2>
      <p>[A definir: o provedor de e-mail e a empresa de hospedagem escolhidos, e o país onde os dados ficam.] O conteúdo da barra de notícias é buscado pelo servidor, sem enviar dados seus ao serviço de notícias. Os administradores do site veem nome, e-mail e um resumo de uso de cada conta. Os dados da sua conta e dos seus treinos não são enviados ao Google nem à Amazon.</p>

      <h2>Por quanto tempo</h2>
      <p>Os dados ficam enquanto a conta existir. [A definir: prazo de retenção em backups do servidor e o que fazer com contas sem uso.]</p>

      <h2>O que você pode fazer</h2>
      <ul>
        <li>Baixar seus dados e apagar sua conta a qualquer momento, em Configurações.</li>
        <li>Trocar a senha ou encerrar as sessões em todos os aparelhos ao sair.</li>
        <li>[A definir: como pedir correção de dados e outros pedidos pelo contato acima.]</li>
      </ul>

      <h2>Pontos a decidir antes de publicar</h2>
      <ul>
        <li><strong>Idade mínima:</strong> [a definir: qual a idade mínima para criar conta].</li>
        <li><strong>Menores de idade:</strong> [a definir: se podem usar, com qual autorização do responsável e como isso é verificado]. Hoje o cadastro não pergunta a idade.</li>
        <li><strong>Testes físicos:</strong> [a definir com o advogado: se esses dados têm tratamento especial, por serem ligados ao corpo e ao desempenho].</li>
        <li><strong>Base legal:</strong> [a definir com o advogado: as bases para cada uso e as obrigações aplicáveis, como as da LGPD].</li>
      </ul>
    </PaginaLegal>
  )
}

export function TermosDeUso() {
  return (
    <PaginaLegal titulo="Termos de Uso">
      <h2>O serviço</h2>
      <p>O Basketball Practice ajuda você a montar treinos de basquete, seguir uma rotina e acompanhar sua evolução. [A definir: quem oferece o serviço e se ele é gratuito.]</p>

      <h2>Sua conta</h2>
      <ul>
        <li>Use um e-mail seu: a conta só é ativada pelo link enviado a ele.</li>
        <li>Guarde sua senha. Se suspeitar que alguém a conhece, troque-a em Configurações.</li>
        <li>Você pode apagar a conta quando quiser, em Configurações. Isso remove seus dados e não pode ser desfeito.</li>
      </ul>

      <h2>Treinos e saúde</h2>
      <p>O conteúdo é informativo e não substitui a orientação de profissionais de saúde ou de educação física. Respeite seus limites. [A definir com o advogado: a redação sobre riscos e responsabilidade.]</p>

      <h2>Uso permitido</h2>
      <p>Não tente acessar dados de outras pessoas, atrapalhar o serviço ou automatizar o cadastro e o login. [A definir: o que acontece com contas que descumprirem isso.]</p>

      <h2>Jogadores e notícias</h2>
      <p>A aba Jogue como traz exercícios inspirados no estilo de jogadores, sem vínculo com eles, com seus times ou com ligas. A barra de notícias mostra manchetes de terceiros, que respondem pelo próprio conteúdo. [A definir com o advogado: se o uso de nomes de jogadores precisa de outro cuidado.]</p>

      <h2>Disponibilidade e mudanças</h2>
      <p>[A definir: o que se promete sobre disponibilidade, como os usuários são avisados de mudanças nestes termos, a lei aplicável e o foro.]</p>

      <h2>Pontos a decidir antes de publicar</h2>
      <ul>
        <li><strong>Idade mínima:</strong> [a definir: qual a idade mínima para criar conta].</li>
        <li><strong>Menores de idade:</strong> [a definir: se podem usar e com qual autorização do responsável].</li>
        <li><strong>Aceite:</strong> [a definir com o advogado: se a frase na tela de cadastro basta ou se é preciso uma caixa de aceite].</li>
      </ul>
    </PaginaLegal>
  )
}

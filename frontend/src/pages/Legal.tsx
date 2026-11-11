import { useEffect, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Icone from '../components/Icone'
import { LinksLegais } from '../components/TelaAuth'

// Quem responde pelo serviço e pelos dados. O e-mail de contato aparece nas duas páginas.
const RESPONSAVEL = 'Eduardo Lopes'
const EMAIL_CONTATO = 'deveducontato@gmail.com'
const CONTATO = <a className="link" href={`mailto:${EMAIL_CONTATO}`}>{EMAIL_CONTATO}</a>
const ATUALIZADO_EM = '10 de novembro de 2026'

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
        <p className="meta">Última atualização: {ATUALIZADO_EM}.</p>
        <div className="legal-rascunho" role="note">
          <strong>Rascunho, ainda sem valor definitivo.</strong> Este texto precisa ser revisado por um advogado antes de o
          cadastro ser aberto ao público. Ele descreve como o Basketball Practice funciona hoje e não afirma que o serviço
          cumpre alguma lei ou norma. Os trechos entre colchetes ainda precisam dessa revisão.
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
      <p>
        O Basketball Practice é mantido por {RESPONSAVEL}, pessoa física, que é o responsável pelos dados tratados no serviço.
        Para qualquer assunto de privacidade, escreva para {CONTATO}.
      </p>

      <h2>O que guardamos</h2>
      <ul>
        <li><strong>Conta:</strong> nome, e-mail e a senha em forma de hash, nunca o texto dela.</li>
        <li><strong>Treino:</strong> exercícios, treinos, sessões, arremessos por zona, notas, metas e preferências que você registra.</li>
        <li><strong>Testes físicos:</strong> os resultados que você registra, como impulsão e sprint, que também formam o cartão do atleta.</li>
        <li><strong>Desafio do dia, quiz e programas:</strong> o placar de cada desafio e de cada quiz, os programas que você começou e os dias concluídos.</li>
        <li><strong>Prancheta:</strong> as jogadas que você desenha e salva.</li>
        <li><strong>Diário de jogos:</strong> data, adversário, placar e os seus números em cada partida que você anota.</li>
        <li><strong>Notificações, se você ligar:</strong> o endereço de entrega que o navegador cria para o aparelho, as chaves dele e o fuso horário, para o lembrete chegar na hora certa. Desligar a opção apaga esses dados.</li>
        <li>
          <strong>Times, se você entrar em um:</strong> o time, o técnico e as tarefas que ele passou. O técnico do time vê o seu nome, quantos
          treinos e minutos você registrou nos últimos 7 dias, a data do último treino, a sequência de dias, a nota do cartão e as
          tarefas que você cumpriu. Ele não vê o seu e-mail, as notas das sessões nem o resto do histórico. Ao sair do time, ele deixa de ver.
        </li>
        <li><strong>Ranking, se você entrar nele:</strong> o apelido, se ele aparece no ranking aberto, o código do seu link de convite, a lista de amigos e os desafios entre amigos.</li>
        <li><strong>Segurança:</strong> o endereço IP é usado para limitar tentativas de acesso. A contagem fica na memória do servidor e não é gravada no banco.</li>
        <li><strong>Pedidos de cadastro:</strong> o nome, o e-mail e o hash da senha ficam à espera da ativação por até 24 horas e são descartados quando um novo cadastro é feito depois desse prazo.</li>
      </ul>
      <p>A aba Alimentação só mostra sugestões: ela não pede nem guarda nada sobre o que você come, seu peso ou sua saúde.</p>

      <h2 id="ranking">O que fica visível no ranking</h2>
      <p>
        O ranking é opcional: sem criar um perfil, nada seu aparece para outras pessoas. Ao criar o perfil, os outros atletas passam a
        ver o seu <strong>apelido</strong> e os seus <strong>números em cada lista</strong> (lances livres, desafio do dia, quiz,
        dias de treino e nota do cartão), além da sua posição. Nome, e-mail, notas e o restante dos treinos nunca aparecem.
      </p>
      <ul>
        <li>Com a opção de ranking aberto desmarcada, só os seus amigos veem o seu apelido e os seus números.</li>
        <li>Amigos são as pessoas que aceitaram o seu link de convite ou cujo convite você aceitou. Nos desafios entre amigos, os dois veem o placar da semana.</li>
        <li>Você pode trocar o apelido, sair do ranking aberto ou sair do ranking de vez a qualquer momento. Sair apaga o perfil, as amizades e os desafios; os treinos continuam.</li>
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
      <p>
        Na versão de demonstração (eduardolafaiety.github.io/BasketballPractice) não há servidor nem conta de verdade: tudo o que
        você registra fica só no seu navegador e some se você limpar os dados do site.
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
      <p>
        Para manter sua conta, mostrar seu histórico e sua evolução, proteger o acesso e enviar os e-mails de ativação e de
        recuperação de senha. Não há e-mail de propaganda, e os dados da sua conta e dos seus treinos não são vendidos nem
        usados para anúncios.
      </p>

      <h2>Com quem compartilhamos</h2>
      <p>Para funcionar, o serviço usa empresas que recebem só o necessário para a sua parte:</p>
      <ul>
        <li><strong>Render:</strong> o servidor que recebe os pedidos do site.</li>
        <li><strong>Neon:</strong> o banco de dados onde ficam a conta e os treinos.</li>
        <li><strong>Cloudflare:</strong> entrega as páginas do site.</li>
        <li><strong>Resend:</strong> envia os e-mails de ativação e de recuperação de senha.</li>
        <li><strong>Google AdSense:</strong> mostra os anúncios, com os cookies descritos em <a className="link" href="#anuncios">Anúncios</a>.</li>
        <li>
          <strong>Serviço de notificações do navegador</strong> (Google, Mozilla ou Apple, conforme o aparelho): entrega os lembretes e os avisos de
          desafio quando você liga as notificações com o app fechado. A mensagem vai criptografada: o serviço entrega, mas não consegue ler o texto.
        </li>
        <li>
          <strong>OpenStreetMap:</strong> na busca de quadras, o seu navegador pede direto aos servidores do OpenStreetMap os blocos
          do mapa, as quadras perto do ponto escolhido e, se você digitar um lugar, o endereço. Eles recebem a localização ou o
          texto da busca e o seu IP; o Basketball Practice não recebe nem guarda nada disso. A localização só é usada se você tocar
          em Usar minha localização e permitir no navegador.
        </li>
      </ul>
      <p>
        O servidor e o banco de dados ficam nos Estados Unidos, então seus dados são transferidos para fora do Brasil. O conteúdo
        da barra de notícias é buscado pelo servidor, sem enviar dados seus ao serviço de notícias. Os administradores do site veem
        nome, e-mail e um resumo de uso de cada conta. Os dados da sua conta e dos seus treinos não são enviados ao Google nem à
        Amazon.
      </p>

      <h2>Por quanto tempo</h2>
      <p>
        Os dados ficam enquanto a conta existir. Contas sem uso não são apagadas automaticamente: você decide quando apagar. Ao
        apagar a conta, os dados saem do banco na hora. [A confirmar: por quanto tempo as cópias de segurança do provedor do banco
        ainda guardam esses dados.]
      </p>

      <h2>O que você pode fazer</h2>
      <ul>
        <li>Baixar seus dados e apagar sua conta a qualquer momento, em Configurações.</li>
        <li>Trocar a senha ou encerrar as sessões em todos os aparelhos ao sair.</li>
        <li>Pedir a correção de dados, tirar dúvidas ou fazer outros pedidos sobre seus dados pelo contato {CONTATO}.</li>
      </ul>

      <h2>Idade mínima</h2>
      <p>
        As contas são para maiores de 18 anos. Quem tem menos de 18 pode usar a versão de demonstração, em que nada sai do
        navegador. Se soubermos que uma conta pertence a um menor de idade, ela será apagada.
      </p>

      <h2>Pontos para a revisão jurídica</h2>
      <ul>
        <li><strong>Testes físicos:</strong> [a revisar: se esses dados têm tratamento especial, por serem ligados ao corpo e ao desempenho].</li>
        <li><strong>Base legal:</strong> [a revisar: as bases para cada uso e as obrigações aplicáveis, como as da LGPD, incluindo a transferência para os Estados Unidos].</li>
      </ul>
    </PaginaLegal>
  )
}

export function TermosDeUso() {
  return (
    <PaginaLegal titulo="Termos de Uso">
      <h2>O serviço</h2>
      <p>
        O Basketball Practice ajuda você a montar treinos de basquete, seguir uma rotina, acompanhar sua evolução e ter ideias de
        alimentação para a sua posição. Ele é oferecido por {RESPONSAVEL}, pessoa física, e hoje é gratuito. Se isso mudar, quem
        tem conta será avisado antes, por e-mail e nesta página. Contato: {CONTATO}.
      </p>
      <p>
        O site se mantém com anúncios do Google e com links de afiliado da Amazon na aba Equipamentos: quando você compra por
        esses links, o Basketball Practice recebe uma comissão, sem custo a mais para você. Os preços e as condições de compra
        são da Amazon. Como isso usa cookies está na <Link to="/privacidade#anuncios" className="link">Política de Privacidade</Link>.
      </p>

      <h2>Sua conta</h2>
      <ul>
        <li>Para criar uma conta, você precisa ter 18 anos ou mais.</li>
        <li>Use um e-mail seu: a conta só é ativada pelo link enviado a ele.</li>
        <li>Guarde sua senha. Se suspeitar que alguém a conhece, troque-a em Configurações.</li>
        <li>Você pode apagar a conta quando quiser, em Configurações. Isso remove seus dados e não pode ser desfeito.</li>
      </ul>

      <h2>Treinos, alimentação e saúde</h2>
      <p>
        Os treinos e as sugestões de alimentação são informativos e não substituem a orientação de médico, nutricionista ou
        profissional de educação física. Respeite seus limites. Se você tem alguma lesão, alergia ou condição de saúde, procure um
        profissional antes de seguir o que o app sugere. [A revisar com o advogado: a redação sobre riscos e responsabilidade.]
      </p>

      <h2>Uso permitido</h2>
      <p>
        Não tente acessar dados de outras pessoas, atrapalhar o serviço ou automatizar o cadastro e o login. Contas que fizerem isso
        podem ser suspensas ou apagadas.
      </p>

      <h2>Ranking e desafios entre amigos</h2>
      <p>
        Participar do ranking é opcional. O apelido não pode ofender, enganar se passando por outra pessoa nem trazer dados pessoais
        de ninguém. Registre só treinos, testes e jogos que você fez de verdade: os números têm limites e conferências no servidor,
        e perfis com apelido impróprio ou números forjados podem ser tirados do ranking ou apagados, sem aviso. O que fica visível
        está descrito na <Link className="link" to="/privacidade#ranking">Política de Privacidade</Link>.
      </p>

      <h2>Jogadores e notícias</h2>
      <p>
        A aba Jogue como traz exercícios inspirados no estilo de jogadores, sem vínculo com eles, com seus times ou com ligas. A
        barra de notícias mostra manchetes de terceiros, que respondem pelo próprio conteúdo. [A revisar com o advogado: se o uso de
        nomes de jogadores precisa de outro cuidado.]
      </p>

      <h2>Disponibilidade e mudanças</h2>
      <p>
        O serviço é oferecido como está, sem garantia de funcionar sem interrupções: ele pode sair do ar para manutenção ou ser
        encerrado. Mudanças nestes termos aparecem nesta página, com a data da última atualização, e as mudanças importantes também
        são avisadas por e-mail a quem tem conta. Estes termos seguem as leis do Brasil. [A revisar com o advogado: o foro.]
      </p>

      <h2>Pontos para a revisão jurídica</h2>
      <ul>
        <li><strong>Aceite:</strong> [a revisar: se a frase na tela de cadastro basta ou se é preciso uma caixa de aceite e de confirmação da idade].</li>
        <li><strong>Riscos e responsabilidade:</strong> [a revisar: até onde vai a responsabilidade pelo uso dos treinos e das sugestões].</li>
      </ul>
    </PaginaLegal>
  )
}

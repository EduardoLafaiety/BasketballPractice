import { Link } from '../../../shared/i18n/links'
import { useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import LogoBola from '../../../shared/ui/LogoBola'
import PreferenciasCabecalho from '../../../shared/ui/PreferenciasCabecalho'
import { LinksLegais } from '../../autenticacao/components/TelaAuth'

const RESPONSAVEL = 'Eduardo Lopes'
const EMAIL_CONTATO = 'contatobasketballpractice@gmail.com'
const CONTATO = <a className="link" href={`mailto:${EMAIL_CONTATO}`} translate="no">{EMAIL_CONTATO}</a>
const INSTAGRAM = <p>Instagram: <a className="link" href="https://www.instagram.com/basketballpratice/" target="_blank" rel="noopener noreferrer" translate="no">@basketballpratice</a>.</p>
const ATUALIZADO_EM = '20 de novembro de 2026'
type Item = { id: string; titulo: string }
function Secao({ id, titulo, children }: Item & { children: ReactNode }) {
  return <section id={id}><h2>{titulo}</h2>{children}</section>
}
function PaginaLegal({ titulo, resumo, indice, children }: { titulo: string; resumo: string; indice: Item[]; children: ReactNode }) {
  const { hash, pathname } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView()
    else if (!navigator.userAgent.includes('jsdom')) window.scrollTo(0, 0)
  }, [hash, pathname])
  return <div className="legal legal-atualizada">
    <header className="topo legal-cabecalho">
      <Link to="/" className="legal-marca" aria-label="Basketball Practice, início"><span className="marca"><LogoBola tamanho={28} /></span><span className="auth-nome">Basketball Practice</span></Link>
      <PreferenciasCabecalho />
    </header>
    <main className="legal-texto">
      <nav className="legal-abas" aria-label="Documentos legais"><Link to="/privacidade" aria-current={pathname === '/privacidade' ? 'page' : undefined}>Privacidade</Link><Link to="/termos" aria-current={pathname === '/termos' ? 'page' : undefined}>Termos de uso</Link></nav>
      <h1>{titulo}</h1>
      <p className="legal-data">Última atualização: <time dateTime="2026-11-20">{ATUALIZADO_EM}</time>.</p>
      <p className="legal-introducao">{resumo}</p>
      <details className="legal-indice"><summary>Neste documento</summary><nav aria-label="Seções do documento">{indice.map(s => <a key={s.id} href={`#${s.id}`}>{s.titulo}</a>)}</nav></details>
      {children}
    </main>
    <footer className="legal-rodape"><LinksLegais /></footer>
  </div>
}

const PRIVACIDADE: Item[] = [
  { id: 'responsavel', titulo: '1. Responsável e abrangência' },
  { id: 'dados', titulo: '2. Dados tratados' },
  { id: 'finalidades', titulo: '3. Finalidades e bases legais' },
  { id: 'cookies', titulo: '4. Cookies e armazenamento local' },
  { id: 'afiliados', titulo: '5. Links de afiliados' },
  { id: 'compartilhamento', titulo: '6. Provedores e transferências' },
  { id: 'retencao', titulo: '7. Conservação e exclusão' },
  { id: 'direitos', titulo: '8. Direitos do titular' },
  { id: 'seguranca', titulo: '9. Segurança' },
  { id: 'idade', titulo: '10. Idade e acesso de visitante' },
  { id: 'atualizacoes', titulo: '11. Atualizações desta política' },
]
export function PoliticaPrivacidade() {
  return <PaginaLegal titulo="Política de Privacidade" resumo="Saiba quais dados o Basketball Practice utiliza, por quais motivos e quais escolhas você tem sobre suas informações." indice={PRIVACIDADE}>
    <Secao {...PRIVACIDADE[0]}>
      <p>O Basketball Practice é mantido por {RESPONSAVEL}, pessoa física responsável pelas decisões sobre o tratamento de dados pessoais na plataforma. Esta política abrange o site, a conta e os recursos de organização e acompanhamento de treinos.</p>
      <p>Para dúvidas, solicitações sobre dados pessoais ou atendimento relacionado ao serviço, escreva para {CONTATO}.</p>
      {INSTAGRAM}
      <p>O tratamento está sujeito à <a className="link" href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm" target="_blank" rel="noreferrer">Lei Geral de Proteção de Dados Pessoais, Lei nº 13.709/2018 (LGPD)</a>, e às demais normas aplicáveis. Serviços acessados por links externos possuem suas próprias políticas.</p>
    </Secao>
    <Secao {...PRIVACIDADE[1]}>
      <ul>
        <li><strong>Conta:</strong> nome, e-mail, foto de perfil opcional, data de criação, credenciais protegidas por hash e informações de autenticação, ativação e recuperação de acesso.</li>
        <li><strong>Treinos:</strong> exercícios personalizados, rotina, programas, sessões, duração, repetições, acertos, tentativas, zonas de arremesso, sequências, avaliações de esforço e cansaço e notas que você registra.</li>
        <li><strong>Preferências:</strong> tema, idioma, animações e configurações dos recursos utilizados. Algumas escolhas ficam apenas no aparelho.</li>
        <li><strong>Notificações autorizadas:</strong> endereço de entrega e chaves gerados pelo navegador, fuso horário e configurações necessárias aos recursos que estiverem habilitados.</li>
        <li><strong>Informações técnicas:</strong> dados de conexão e funcionamento necessários à entrega das páginas, segurança, prevenção de abuso e diagnóstico de falhas, inclusive os tratados pelos provedores de infraestrutura.</li>
      </ul>
      <p>Evite inserir em campos livres diagnósticos, exames, medicamentos, documentos ou dados de outras pessoas. O serviço não é um prontuário e não solicita informações de saúde para personalizar as sugestões de alimentação.</p>
    </Secao>
    <Secao {...PRIVACIDADE[2]}>
      <ul>
        <li><strong>Execução da relação contratual:</strong> criar e manter a conta, autenticar o acesso, organizar treinos e apresentar histórico, programas e evolução, inclusive os procedimentos solicitados antes da contratação.</li>
        <li><strong>Legítimo interesse ou obrigação legal, conforme o caso:</strong> proteger contas e a operação, prevenir abuso e cumprir determinações válidas, observados os direitos do titular.</li>
        <li><strong>Comunicações necessárias ao serviço:</strong> enviar ativação, recuperação de senha e informações essenciais à conta. Esses envios não equivalem à inscrição em publicidade por e-mail.</li>
        <li><strong>Consentimento, quando aplicável:</strong> habilitar recursos opcionais, como notificações. A autorização pode ser retirada sem impedir os recursos que não dependem dela.</li>
        <li><strong>Exercício regular de direitos:</strong> conservar informações estritamente necessárias à defesa em processos ou ao atendimento de exigências legais.</li>
      </ul>
      <p>Informações identificáveis da conta e dos treinos não são vendidas a anunciantes nem fornecidas à Amazon para identificar compradores. O simples uso de um campo de texto não representa autorização específica para tratar dados sensíveis.</p>
    </Secao>
    <Secao {...PRIVACIDADE[3]}>
      <p>O navegador guarda dados necessários à sessão, às preferências de aparência e idioma e aos recursos locais. O treino em andamento e as sessões aguardando sincronização podem ficar no aparelho, separados por conta. O site não utiliza cookies de publicidade.</p>
      <p>Sair explicitamente da conta limpa os registros locais de treino. Quando a sessão expira, registros pendentes podem permanecer para retomada pela mesma conta. Limpar os dados do site pode apagar informações ainda não sincronizadas.</p>
      <p>Arquivos em cache permitem carregamento mais rápido e o uso de recursos disponíveis sem conexão. Permissões de notificação podem ser revogadas nas configurações do navegador.</p>
    </Secao>
    <Secao {...PRIVACIDADE[4]}>
      <p>Como Associado da Amazon, o Basketball Practice ganha com compras qualificadas. Links de Equipamentos podem conter um identificador de afiliado. A compra ocorre no ambiente do vendedor, segundo sua própria política. A plataforma não recebe dados de pagamento ou a identidade de quem comprou por esses links.</p>
    </Secao>
    <Secao {...PRIVACIDADE[5]}>
      <p>Os fornecedores envolvidos na operação incluem Cloudflare, na entrega do site; Render, na execução da API; Neon, no banco de dados; e Resend, no envio de mensagens transacionais, conforme a infraestrutura utilizada pela versão acessada.</p>
      <p>Na contratação de assinatura, o Mercado Pago recebe os dados necessários ao pagamento e trata essas informações segundo sua própria política. O site envia o e-mail da conta, a referência da assinatura, o plano, valor e periodicidade, e mantém identificadores, estados de pagamento e período de acesso. Números completos de cartão e códigos de segurança são informados no ambiente do Mercado Pago, não nos servidores do Basketball Practice.</p>
      <p>Serviços de notificação do navegador podem participar da entrega quando o recurso estiver autorizado. A Amazon trata dados das compras realizadas em seu próprio ambiente. O acesso administrativo é restrito às finalidades de operação, suporte e segurança.</p>
      <p>Provedores podem processar informações fora do Brasil. Transferências internacionais devem observar as hipóteses e garantias dos artigos 33 a 36 da LGPD e a regulamentação da ANPD, inclusive os instrumentos contratuais aplicáveis.</p>
      <p>Dados poderão ser compartilhados para cumprir obrigação legal, ordem válida de autoridade competente ou exercício regular de direitos, dentro dos limites aplicáveis.</p>
    </Secao>
    <Secao {...PRIVACIDADE[6]}>
      <p>Dados da conta e do histórico são mantidos enquanto necessários ao serviço. Contas sem uso não são excluídas automaticamente. Links de ativação têm validade de 24 horas; cadastros pendentes expirados são removidos nas rotinas de limpeza executadas em novos pedidos. Links de recuperação de senha têm validade de 30 minutos.</p>
      <p>Você pode excluir a conta em Minha conta, mediante confirmação de identidade. A exclusão remove os registros associados na base operacional. Cópias de segurança podem persistir temporariamente até substituição ou expiração pelos mecanismos do provedor; remover a base ativa não elimina instantaneamente todas as cópias de infraestrutura.</p>
      <p>Informações necessárias por obrigação legal ou exercício de direitos poderão ser conservadas apenas para essas finalidades e pelo período pertinente. Dados efetivamente anonimizados poderão ser mantidos quando não permitirem identificar o titular.</p>
    </Secao>
    <Secao {...PRIVACIDADE[7]}>
      <p>Nos limites da LGPD, você pode solicitar confirmação de tratamento, acesso, correção, informação sobre compartilhamentos, portabilidade quando cabível, anonimização, bloqueio ou eliminação de dados tratados irregularmente, revisão de decisões automatizadas quando aplicável e revogação do consentimento.</p>
      <p>Você pode consultar registros, alterar a senha e excluir a conta em <Link className="link" to="/configuracoes">Minha conta</Link>. Para outros pedidos, envie sua solicitação a {CONTATO}, informando o e-mail da conta e o direito que deseja exercer. A verificação de identidade poderá ser necessária para impedir a entrega de informações a terceiros.</p>
      <p>Pedidos de confirmação e acesso serão atendidos de forma simplificada imediatamente ou por declaração completa em até 15 dias, conforme a modalidade prevista na LGPD. Os demais pedidos seguem os prazos e condições legais aplicáveis. O exercício desses direitos é gratuito; nunca é necessário informar sua senha ao atendimento.</p>
      <p>Você também pode apresentar petição à <a className="link" href="https://www.gov.br/anpd/pt-br" target="_blank" rel="noreferrer">Autoridade Nacional de Proteção de Dados</a>, observados os requisitos do procedimento, e recorrer aos órgãos de defesa do consumidor.</p>
    </Secao>
    <Secao {...PRIVACIDADE[8]}>
      <p>A plataforma utiliza proteção de credenciais por hash, autenticação e controles de acesso. Senhas não são guardadas em texto legível. Nenhum sistema elimina todos os riscos; suspeitas de uso indevido exigem a troca da senha e a revisão do acesso.</p>
      <p>Incidentes que possam trazer risco ou dano relevante aos titulares serão avaliados e comunicados à ANPD e aos afetados quando exigido, nos termos e prazos da regulamentação aplicável.</p>
    </Secao>
    <Secao {...PRIVACIDADE[9]}>
      <p>A criação de contas é destinada a pessoas com 18 anos ou mais. O serviço não é direcionado à coleta de dados de crianças. Se uma conta de menor de idade for identificada, o tratamento será avaliado e restringido ou encerrado segundo as circunstâncias e exigências legais.</p>
      <p>No acesso de visitante da demonstração, os registros de treino ficam no navegador e não constituem uma conta hospedada no servidor. Eles podem ser perdidos ao limpar o armazenamento. Provedores de páginas e serviços externos acessados continuam sujeitos às suas próprias operações técnicas.</p>
    </Secao>
    <Secao {...PRIVACIDADE[10]}>
      <p>Esta política pode ser atualizada para refletir mudanças no serviço ou nas obrigações aplicáveis. A versão vigente tem data no início da página. Alterações relevantes serão informadas de modo apropriado, e novas autorizações serão solicitadas quando necessárias. O original é publicado em português; traduções facilitam a leitura e não restringem direitos assegurados por lei.</p>
    </Secao>
  </PaginaLegal>
}

const TERMOS: Item[] = [
  { id: 'servico', titulo: '1. Plataforma e acesso' },
  { id: 'conta', titulo: '2. Cadastro e segurança da conta' },
  { id: 'treinos', titulo: '3. Conteúdo esportivo e cuidados pessoais' },
  { id: 'uso', titulo: '4. Uso permitido' },
  { id: 'conteudo', titulo: '5. Conteúdo e propriedade intelectual' },
  { id: 'terceiros', titulo: '6. Produtos e terceiros' },
  { id: 'disponibilidade', titulo: '7. Disponibilidade e funcionamento' },
  { id: 'encerramento', titulo: '8. Suspensão e encerramento' },
  { id: 'responsabilidade', titulo: '9. Responsabilidades e direitos' },
  { id: 'alteracoes', titulo: '10. Alterações, legislação e conflitos' },
]
export function TermosDeUso() {
  return <PaginaLegal titulo="Termos de Uso" resumo="Condições para acessar o Basketball Practice, organizar seus treinos e utilizar os recursos da plataforma." indice={TERMOS}>
    <Secao {...TERMOS[0]}>
      <p>O Basketball Practice é oferecido por {RESPONSAVEL}, pessoa física. A plataforma reúne exercícios, programas, rotina, registros de sessões, indicadores de evolução e conteúdo informativo relacionado ao basquete.</p>
      <p>O canal de atendimento para dúvidas, solicitações e questões relacionadas a estes termos é {CONTATO}.</p>
      {INSTAGRAM}
      <p>Os planos apresentados são de R$ 15,00 por mês ou R$ 150,00 a cada 12 meses, em reais, com os mesmos recursos. O anual corresponde a um pagamento por ano, não a 12 parcelas. A contratação depende da disponibilidade do checkout e da autorização expressa do usuário no Mercado Pago. A demonstração local não realiza cobranças.</p>
      <p>A assinatura é renovada automaticamente na periodicidade escolhida e autorizada no checkout. O acesso pago depende da confirmação do pagamento. Você pode cancelar as próximas cobranças em Assinatura; o período já pago permanece até o vencimento. Cancelar a renovação não executa reembolso automático. Para contestar cobrança ou solicitar estorno, procure o atendimento, sem prejuízo dos direitos previstos na legislação.</p>
      <p>Ao criar a conta, você declara que leu estes termos e a <Link className="link" to="/privacidade">Política de Privacidade</Link> e se compromete com as condições de uso. O acesso deve respeitar a legislação e os direitos de terceiros.</p>
    </Secao>
    <Secao {...TERMOS[1]}>
      <ul>
        <li>O cadastro é destinado a pessoas com 18 anos ou mais, com informações corretas e e-mail sob seu controle.</li>
        <li>A ativação depende da confirmação enviada ao endereço informado. Proteja sua senha e não compartilhe credenciais.</li>
        <li>Você responde pelos registros que inserir e deve comunicar suspeitas de acesso indevido. A plataforma mantém suas obrigações legais relativas à segurança do serviço.</li>
        <li>A conta pode ser encerrada por você em Minha conta, mediante a confirmação solicitada. Antes da exclusão, cancele a assinatura e aguarde a confirmação para evitar cobranças futuras sem vínculo com a conta. A conservação e exclusão de dados seguem a Política de Privacidade.</li>
      </ul>
    </Secao>
    <Secao {...TERMOS[2]}>
      <p>Exercícios, animações, rotinas, indicadores e sugestões de alimentação têm finalidade educativa e de organização pessoal. Não são avaliação clínica, prescrição individual, diagnóstico, tratamento ou plano alimentar personalizado.</p>
      <p>As demonstrações são ilustrativas e não garantem reprodução biomecânica perfeita de cada movimento. Considere sua condição física, técnica, ambiente e equipamento. Procure orientação profissional adequada quando necessário, especialmente em caso de lesão ou condição de saúde.</p>
      <p>Metas, conquistas e estimativas não garantem resultados esportivos, físicos ou de saúde. A plataforma não deve ser utilizada para atendimento de emergências.</p>
    </Secao>
    <Secao {...TERMOS[3]}>
      <p>O acesso é autorizado para uso pessoal, legítimo e compatível com os recursos oferecidos. Não é permitido:</p>
      <ul>
        <li>Acessar contas ou dados sem autorização, contornar controles de segurança ou explorar falhas contra o serviço.</li>
        <li>Inserir conteúdo ilícito, dados de terceiros sem fundamento ou material que viole direitos de outras pessoas.</li>
        <li>Automatizar cadastros, login ou requisições de forma abusiva, sobrecarregar a infraestrutura ou distribuir código malicioso.</li>
        <li>Revender acesso, copiar conteúdo protegido ou apresentar a plataforma como produto próprio sem a autorização necessária.</li>
      </ul>
    </Secao>
    <Secao {...TERMOS[4]}>
      <p>Você mantém os direitos sobre o conteúdo que produzir e inserir. Autoriza somente o tratamento e a reprodução técnica necessários para armazenar, organizar e apresentar esse conteúdo no serviço, respeitada a Política de Privacidade.</p>
      <p>Interface, textos, ilustrações e outros materiais pertencem aos respectivos titulares e estão sujeitos às suas licenças. A disponibilização para consulta não transfere direitos de propriedade intelectual.</p>
      <p>Imagens de jogadores e outros materiais de terceiros têm créditos e licenças próprios. O Basketball Practice não possui vínculo oficial com jogadores, equipes, NBA, NBB ou outras ligas mencionadas. Referências ao estilo de um atleta não representam endosso ou participação dele no serviço.</p>
    </Secao>
    <Secao {...TERMOS[5]}>
      <p>A plataforma pode exibir links de afiliados. Como Associado da Amazon, o Basketball Practice ganha com compras qualificadas, sem acrescentar uma cobrança própria ao usuário por utilizar o link.</p>
      <p>Preços, estoque, pagamento, entrega, garantia e devolução de produtos são definidos pelos vendedores responsáveis. Compras ocorrem fora da plataforma e seguem as condições do ambiente em que forem realizadas.</p>
      <p>Estatísticas e notícias de fontes externas podem conter atrasos ou imprecisões. Links direcionam a serviços com regras próprias. Essas informações não constituem aconselhamento para apostas ou promessa de desempenho.</p>
    </Secao>
    <Secao {...TERMOS[6]}>
      <p>O serviço pode sofrer interrupções por manutenção, falhas técnicas ou circunstâncias externas. Empregaremos esforços razoáveis para manter sua operação, sem promessa de disponibilidade ininterrupta.</p>
      <p>Recursos sem conexão dependem dos arquivos e dados disponíveis no aparelho. Sessões ainda não sincronizadas podem ser perdidas ao limpar o armazenamento ou sair da conta. Recursos que exigem confirmação do servidor dependem da conexão para conclusão.</p>
      <p>Conquistas e indicadores são calculados a partir dos registros existentes e podem mudar quando você corrige ou exclui dados. Recursos poderão evoluir ou ser descontinuados; mudanças relevantes devem ser comunicadas de modo apropriado.</p>
    </Secao>
    <Secao {...TERMOS[7]}>
      <p>Você pode deixar de usar o serviço ou excluir sua conta. Restrições, suspensão ou encerramento poderão ser adotados de forma proporcional diante de violação destes termos, fraude, risco à segurança ou determinação válida de autoridade.</p>
      <p>Sempre que possível e permitido, serão informados o motivo e os meios de solicitar reavaliação ao responsável. Medidas urgentes podem ser aplicadas antes do aviso para proteger usuários ou a operação. Obrigações de conservação continuam sujeitas à lei e à Política de Privacidade.</p>
    </Secao>
    <Secao {...TERMOS[8]}>
      <p>O usuário deve utilizar as informações com cuidado e observar as condições de seu ambiente de treino. Isso não afasta a responsabilidade da plataforma por atos ou falhas que lhe sejam atribuíveis nos termos da legislação.</p>
      <p>Nenhuma disposição elimina garantias legais, transfere indevidamente a responsabilidade do fornecedor ou exige renúncia a direitos do consumidor. Quando aplicável, prevalecem as normas obrigatórias do <a className="link" href="https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm" target="_blank" rel="noreferrer">Código de Defesa do Consumidor</a> e da legislação de proteção de dados.</p>
    </Secao>
    <Secao {...TERMOS[9]}>
      <p>A versão vigente é identificada pela data no início da página. Alterações relevantes serão comunicadas de forma apropriada. Mudanças não autorizam cobrança retroativa nem prejudicam direitos já assegurados.</p>
      <p>Estes termos são regidos pelas leis brasileiras. Conflitos poderão ser apresentados ao responsável pela plataforma e, quando necessário, aos órgãos de defesa do consumidor ou ao Poder Judiciário, respeitada a competência legal e o foro do domicílio do consumidor quando aplicável.</p>
      <p>O original é publicado em português. Traduções facilitam a leitura; em caso de divergência, o texto original será considerado sem limitar direitos obrigatórios aplicáveis ao usuário.</p>
    </Secao>
  </PaginaLegal>
}

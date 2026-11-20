# Revisão do acesso por assinatura — 20/11/2026

## Verificações no servidor publicado

- Dezessete chamadas sem login às rotas de conteúdo, conta, exportação, administração e assinatura retornaram HTTP 401.
- Três chamadas com JWT sem assinatura, contendo alegações falsas de administrador e de pagamento, retornaram HTTP 401.
- Uma notificação falsa de pagamento aprovado foi recusada com HTTP 401.
- O webhook aceitou um evento técnico assinado sem efeito financeiro; recusou assinatura expirada, identificador de requisição adulterado e divergência entre corpo e query. A aceitação não comprova uma compra ou renovação real.
- A credencial local identifica o vendedor real esperado na API oficial. O teste assinado confirmou que o segredo de webhook instalado no servidor corresponde ao local; não houve leitura dos segredos do Render.
- Os dois endereços antigos de GitHub Pages retornaram HTTP 404.

Nenhum evento financeiro real foi enviado e nenhuma cobrança foi iniciada. Uma conta comum autenticada em produção ainda não foi disponibilizada nesta execução; os cenários autenticados abaixo foram executados em bancos temporários locais e no CI, sem acessar dados reais dos usuários.

## Correção aplicada

A restauração de backup estava disponível ao titular mesmo sem assinatura e permitia gravar treinos/sessões pela rota alternativa `POST /api/data/import`. Um teste de regressão reproduziu HTTP 200 onde o acesso deveria ser recusado. A rota passou a exigir a mesma confirmação de período pago das demais operações de treino, antes de processar o arquivo.

A exportação dos próprios registros continua disponível ao titular autenticado, para acesso aos dados pessoais. Ela não exporta o catálogo público de exercícios nem concede assinatura. Preferências, dados pessoais e campos enviados pelo navegador não podem elevar o usuário a administrador ou gerar pagamento.

Todas as respostas da API passaram a usar `Cache-Control: no-store`, incluindo recusas, para impedir reutilização de respostas privadas pelo cache HTTP.

## Regressões verificadas

- Sem login: importação recusada com 401.
- Conta sem período pago: importação recusada com 402, sem alterar seus treinos.
- Pagamento fictício aprovado: importação permitida.
- Estorno confirmado: importação volta a ser recusada com 402; exportação dos próprios registros permanece disponível.
- Campos falsos de administrador e assinatura nas preferências são descartados; conteúdo e administração continuam bloqueados.
- Respostas privadas, recusas e conteúdo autorizado usam `no-store`.

Os demais cenários de assinatura incluem expiração, rejeição, pendência, valor/moeda/recebedor incompatíveis, notificações repetidas, cancelamento e isolamento de dados. Esta revisão é direcionada ao controle de acesso; não equivale a um teste de carga ou a uma certificação geral de segurança.

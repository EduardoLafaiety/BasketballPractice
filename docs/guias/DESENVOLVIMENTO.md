# Desenvolvimento e validação

## Publicação comercial e acesso

Use o build normal (`npm run build` no frontend), conectado à API real. Em `NODE_ENV=production`, a API exige assinatura independentemente de `BILLING_ENABLED`; chaves ausentes tornam o checkout indisponível e não liberam o conteúdo. Login, cadastro, assinatura, contato, privacidade e termos continuam públicos. Artigos e Equipamentos também exigem acesso pago. O workflow de publicação gratuita da demonstração no GitHub Pages foi removido; `dev:demo` é uma ferramenta local.

As credenciais e as etapas de homologação estão em [Mercado Pago](../pagamentos/MERCADO_PAGO.md). Nunca publique o conteúdo de `.env`, `.env.local`, `backend/data/` ou `artifacts/`.

Documentação do projeto: [arquitetura](../arquitetura/ARQUITETURA.md), [sistema visual atual](SISTEMA_VISUAL.md), [regras de negócio](../arquitetura/REGRAS_DE_NEGOCIO.md), [mudanças e roadmap](MUDANCAS_E_ROADMAP.md) e [plano de refatoração](../arquitetura/PLANO_DE_REFATORACAO.md).

Requisitos: Node.js 22.13 ou superior (CI e deploy usam Node 22), npm, Docker para o Postgres local e Google Chrome para os testes de ponta a ponta.

Instale as dependências em cada pacote, a partir da raiz. Após trocar ou atualizar a branch, repita `npm ci` nos pacotes cujos lockfiles mudaram: `node_modules` não acompanha o Git, e dependências antigas ou fontes ausentes podem impedir o build. Restaure primeiro o conjunto versionado antes de considerar atualizar versões.

```powershell
npm --prefix backend ci
npm --prefix frontend ci
npm --prefix e2e ci
Copy-Item backend/.env.example backend/.env
npm --prefix backend run db:up
```

Em dois terminais, execute `npm --prefix backend run dev` e `npm --prefix frontend run dev`. Abra http://localhost:5173; a API atende em http://localhost:3333/api e o Vite encaminha /api para ela. O banco local usa a porta 5433. Migrações e catálogo são aplicados ao iniciar a API. Em desenvolvimento, EMAIL_PROVIDER=console mostra no terminal os links de ativação e recuperação de conta. Não versione o .env.

### Demonstração e produção

- Demonstração: `npm --prefix frontend run dev:demo` ou `npm --prefix frontend run build:demo`. As rotas do backend rodam no navegador sobre PGlite/IndexedDB; o token de visitante não autentica na API real. A preparação de dev:demo tenta atualizar o NBB pela rede.
- Produção: `npm --prefix backend run build`, `npm --prefix backend start` e `npm --prefix frontend run build`. Configure DATABASE_URL, JWT_SECRET, CORS_ORIGIN, APP_URL e o provedor de e-mail conforme backend/.env.example. VITE_API_URL aponta para a API quando estiver em outro domínio. Configure no host do frontend o fallback das rotas para index.html.
- O arquivo render.yaml descreve a API; os comentários nele documentam os serviços externos esperados. Chaves VAPID habilitam Web Push. O agendador externo usa PUSH_CRON_SECRET.

### Treinos recuperáveis e sincronização

A sessão guiada guarda um rascunho por conta neste navegador, incluindo contadores, blocos e diário. Ao reabrir /sessao, é possível retomar com o relógio pausado ou descartar o rascunho. Os segundos transcorridos são calculados por timestamps, inclusive após suspensão de execução da aba.

Se o envio falhar por rede ou erro 5xx, a sessão fica na fila local. Com a conta autenticada, o app tenta enviar ao abrir, ao recuperar conexão, a cada 30 segundos e pelo botão Sincronizar agora. A sessão carrega uma chave UUID estável: repetir o envio retorna a mesma sessão. A fila atual mantém itens independentes e lê o formato anterior. A conclusão do dia de programa participa da mesma transação da sessão; rejeitar o dia desfaz o registro inteiro. Erros de validação e conflitos de programa exigem correção e aparecem na interface.

A fila e o rascunho são locais ao aparelho, sem backup automático. Sair explicitamente da conta limpa esses dados; sincronize antes de sair. Token expirado preserva os dados locais para retomar após entrar na mesma conta. Limpar os dados do navegador também remove os treinos ainda não enviados. O service worker guarda somente os arquivos do app: para reabrir sem conexão, visite /sessao online ao menos uma vez. O catálogo completo da API não fica disponível offline.

### Validação

```powershell
npm run check:architecture
npm run test:architecture
npm --prefix backend run typecheck
npm --prefix backend test
npm --prefix frontend test
npm --prefix frontend run build
npm --prefix frontend run build:demo
npm --prefix e2e test
```

Os testes da API usam PGlite; os testes ponta a ponta usam Postgres real, um banco exclusivo basketball_e2e (ou E2E_DATABASE_URL), a API na porta 3410 e o site na 4410. O banco de E2E é recriado: nunca aponte essa variável para dados pessoais ou produção. A integração contínua executa testes, build de produção e build da demonstração.

### Organização

Autenticação, administração e preferências seguem contrato, serviço e repositório. A ferramenta `npm --prefix backend run admin -- email [--remover]` usa a mesma trava das alterações administrativas e recusa remover o último administrador. O CI também verifica contas em PostgreSQL real (links concorrentes, ordem de travas, revogação, senha e composição administrativa). Para repetir esse grupo com `TEST_POSTGRES_URL` configurada, rode em `backend`: `npx tsx --test --test-name-pattern 'contas serializam|recuperação em conexões|ativação em conexões|troca de senha trava|últimos administradores|sair em conexões' test/postgres.test.ts`.

Além dos três cenários de backup, o CI verifica coordenação de programas em PostgreSQL real. Para repetir os dois cenários novos, com `TEST_POSTGRES_URL` configurada, rode em `backend`: `npx tsx --test --test-name-pattern 'programas serializam' test/postgres.test.ts`.

Os [contratos de treinos e backup](../arquitetura/CONTRATOS_BACKEND.md) descrevem compatibilidade, limites e restauração. O CI também executa três cenários de concorrência de backup contra PostgreSQL real. Para repeti-los localmente, configure `TEST_POSTGRES_URL` para o banco administrativo de testes e rode, em `backend`, `npx tsx --test --test-name-pattern 'mesmo backup enviado|backup mantém|trava da importação' test/postgres.test.ts`. A suíte cria e remove seu próprio banco temporário.

- backend/src/modules: endpoints, schemas, serviços e persistência por domínio; backend/src/db: conexão, migrações e catálogo.
- frontend/src/app: composição e layout; features: telas, modelos e testes por funcionalidade; shared: API, cache, tipos e componentes reutilizáveis.
- frontend/src/features/sessao/model/treino-local.ts: rascunhos e fila por conta; frontend/src/shared/lib/relogio.ts: cálculo do tempo.
- frontend/src/styles.css é a entrada única dos estilos globais e explicita a ordem da cascata. Os ajustes de navegação e evolução ficam em styles/navegacao.css; refinamento.css, ajustes.css e suave.css preservam o acabamento atual. Não existe import ativo de pixel.css. Consulte [SISTEMA_VISUAL.md](SISTEMA_VISUAL.md).

Evolução compara os últimos 7 ou 30 dias locais, incluindo hoje, com a janela imediatamente anterior. O filtro por exercício compara sessões, arremessos, repetições e segundos registrados. Os minutos aparecem somente no total: não há duração individual confiável para todos os exercícios. Overall é uma pontuação dos registros, não uma medida validada da habilidade real.


### Comandos da raiz e auditoria

A raiz oferece atalhos como `npm run check:architecture`, `npm run test:site` e `npm run test:api`, sem mudar a instalação das dependências em cada pacote. Consulte [ARQUITETURA.md](../arquitetura/ARQUITETURA.md) para as fronteiras dos módulos.

`npm --prefix e2e run audit` captura Início, Treinos, Rotina, Sessão e Evolução em dois tamanhos e nos temas claro/escuro. Capturas e contagens de recursos vão para o diretório temporário do sistema. A auditoria utiliza o banco E2E e deve rodar separada da suíte ponta a ponta.

A rotina preserva o tempo planejado de cada exercício. Aplicar a semana gerada usa uma transação no servidor atual; a compatibilidade com servidores anteriores mantém o envio por dia. A comparação em Evolução busca agregados na API; Overall e conquistas ainda consultam o histórico completo.

### Fechamento do backend: notificações e estilos

Todos os 12 módulos seguem as fronteiras descritas em [ARQUITETURA.md](../arquitetura/ARQUITETURA.md). O analisador utiliza TypeScript do backend; execute primeiro npm --prefix backend ci. Seus sete testes de regressão rodam com npm run test:architecture. Não é necessário instalar dependências na raiz.

O CI inclui dois cenários de push em PostgreSQL real, totalizando 14 cenários selecionados de backup, programas, contas e notificações. Para executar toda a suíte opcional de infraestrutura e concorrência, configure TEST_POSTGRES_URL para o banco administrativo local de testes e rode, em backend:

```powershell
$env:TEST_POSTGRES_URL='postgres://basketball:basketball@localhost:5433/postgres'
npx tsx --test test/postgres.test.ts
```

A suíte cria e remove seu próprio banco temporário e provoca quedas de conexão deliberadas. Avisos de conexão encerrada fazem parte desses cenários. O build de demonstração e os testes ponta a ponta devem rodar em sequência, pois ambos escrevem frontend/dist.

O agendador interno inicia com a API quando VAPID está configurado. O cron externo usa o mesmo serviço e a mesma coordenação por aparelho. Testes injetam um remetente falso; não enviam notificações reais. Contratos e limites de entrega estão em [CONTRATOS_BACKEND.md](../arquitetura/CONTRATOS_BACKEND.md).

### Preparar um treino offline

Com conexão, abra /sessao?hoje ou um plano recebido do gerador, confira seus exercícios e escolha “Preparar este treino offline”. A confirmação exige o service worker ativo: use a versão publicada ou o build com preview; em desenvolvimento Vite o service worker permanece desligado. Na primeira visita, pode ser necessário recarregar após a instalação.

A preparação guarda um único plano por conta, seus exercícios/instruções e arquivos estáticos. Depois da confirmação, reabrir /sessao sem conexão permite iniciá-lo. Salve ao concluir para gerar a pendência local; o servidor confirma após reconexão/autenticação. Se a API falhar com o navegador ainda conectado, a tela oferece abrir o treino preparado. Rascunhos existentes continuam tendo prioridade.

A data de preparação é exibida. Mudanças posteriores na rotina/catalogo não atualizam essa cópia automaticamente. Conteúdo animado e APIs externas não fazem parte da promessa offline. Logout explícito e limpeza dos dados do site removem os dados locais.

O aviso de dados locais permite exportar registros antes de descartar dados incompatíveis. A exportação de recuperação não é o backup do servidor nem possui importação automática. Os JSON originais são preservados até decisão explícita.

Validação direcionada: npm --prefix frontend test -- src/features/sessao src/shared/lib/service-worker.test.ts. Jornadas: npm --prefix e2e test -- treino-recuperavel.spec.ts. O teste inclui preparo antes de qualquer rascunho, reabertura offline, envio posterior e conflito entre abas. A auditoria produz 20 capturas e recursos-por-tela.json em diretório temporário; execute separada dos E2E e do build demo, que compartilham portas/banco/dist.

### Segundo ciclo de frontend: contratos, controles e experiência

Relatório: [SEGUNDO_CICLO_FRONTEND.md](../historico/SEGUNDO_CICLO_FRONTEND.md). Não foram adicionadas dependências. Campos e mensagens comuns ficam em shared/ui; DTOs declarativos em contracts; conversões em shared/api/mapeamento.ts.

Para repetir a validação direcionada, execute npm --prefix frontend test -- src/shared src/app/layout/Layout.test.tsx src/features/rotina/pages/Rotina.test.tsx. Os testes de navegação abrem o menu antes de acessar suas opções, como no navegador real. Jornadas novas: npm --prefix e2e test -- experiencia.spec.ts.

A auditoria aceita AUDIT_OUTPUT_DIR para separar as capturas de ciclos/trabalhos paralelos. E2E_DATABASE_URL pode apontar para um banco exclusivo cujo nome contenha e2e, conforme a trava do preparador. Nunca utilize dados pessoais/produção. Nesta etapa foi usado basketball_e2e_experiencia e as capturas ficaram no diretório temporário basketball-practice-audit-passos-5-8. Não executar build demo ao mesmo tempo que E2E/auditoria no mesmo checkout, pois compartilham frontend/dist.

### Terceiro ciclo: desempenho, histórico e operação

Instale com npm ci no frontend: as fontes locais estão no lock e precisam existir para a referência visual atual (Big Shoulders Display, Manrope e Instrument Serif). Node mínimo permanece 22.13. Ferramentas verificadas neste ciclo: Vite 7.3.8 e Vitest 4.1.12.

Execute npm run test:bundles e, depois de npm run build:site, npm run check:bundles. O segundo gera frontend/dist/pacotes.json e verifica entrada estática até 110.000 bytes gzip e 3D separado até 180.000. Execute antes de build:demo, que substitui dist. CI publica o JSON.

A auditoria npm run audit em e2e agora também verifica ausência de consulta de histórico/3D inicial e recuperação quando o pacote 3D falha. Use AUDIT_OUTPUT_DIR e E2E_DATABASE_URL isolados conforme acima; CI publica capturas/JSON por sete dias. Não executar auditoria, E2E e build demo simultaneamente no mesmo checkout.

Testes de operação/projeção/recuperação: backend/test/operacao-progresso.test.ts. Relatório em [TERCEIRO_CICLO_FRONTEND.md](../historico/TERCEIRO_CICLO_FRONTEND.md); runbook em [OPERACAO_E_RECUPERACAO.md](OPERACAO_E_RECUPERACAO.md).

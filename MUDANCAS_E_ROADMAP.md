# Mudanças, implementações e próximos passos

Última atualização: **18/11/2026**.

Este documento registra o trabalho realizado nesta colaboração e as propostas de evolução do Basketball Practice. Não pretende reconstruir todo o histórico anterior do projeto.

Referências para a próxima etapa: [regras de negócio](REGRAS_DE_NEGOCIO.md) e [plano de refatoração preservando a identidade retrô](PLANO_DE_REFATORACAO.md).

## Situação atual

- As seis melhorias inicialmente propostas foram implementadas e integradas à `main` pelo [PR #163](https://github.com/EduardoLafaiety/BasketballPractice/pull/163).
- Commit de integração: `16d73081a4dbfe0aee71d7478529630a723c9d99`.
- Uma correção adicional de reconexão foi incluída no mesmo PR antes do merge.
- A arquitetura e o primeiro ciclo de melhorias foram integrados pelo [PR #165](https://github.com/EduardoLafaiety/BasketballPractice/pull/165), commit `4eed541`.
- Os itens futuros abaixo são propostas, sem prazo ou execução automática agendada. Registrar uma proposta aqui não significa que ela já foi implementada.

## Resumo da entrega

| Prioridade | Mudança | Estado |
| --- | --- | --- |
| 1 | Preservar o treino e permitir envio após falha de conexão | Concluída |
| 2 | Salvar sessão e conclusão de programa de forma atômica, evitando duplicação | Concluída |
| 3 | Medir o tempo real mesmo após suspensão da aba | Concluída |
| 4 | Organizar a navegação em torno dos objetivos do usuário | Concluída |
| 5 | Comparar evolução por período e exercício | Concluída |
| 6 | Organizar estilos, documentar o ambiente e ampliar as verificações do CI | Concluída |

## 1. Recuperação de treino e sincronização

### Implementado

- Rascunho persistente da sessão guiada, separado por conta no armazenamento local do navegador.
- Preservação do plano, bloco atual, repetições, toques de acerto e erro, zona selecionada, resultados dos blocos anteriores, duração e horário de início.
- Preservação do diário: esforço, cansaço e notas.
- Tela para retomar o treino ou descartar o rascunho.
- Retomada com o cronômetro pausado, deixando o usuário decidir quando continuar.
- Atalho para retomar o treino nas outras páginas do app.
- Aviso visível quando o navegador não consegue guardar o rascunho.
- Fila local de sessões cujo envio falhou por conexão ou resposta HTTP 5xx.
- Indicador de sessões aguardando sincronização e botão de tentativa manual.
- Tentativas automáticas ao abrir o app autenticado, recuperar conexão e a cada 30 segundos enquanto houver pendências.
- Preservação de novas sessões adicionadas à fila enquanto um envio está em andamento.
- Uso da identidade da conta presente no token para localizar o rascunho e mostrar pendências durante a reabertura offline. A API continua responsável por validar a autenticação.
- Revalidação da conta ao recuperar conexão.
- Confirmação antes de sair quando existem dados locais de treino que serão apagados.
- Limpeza desses dados no logout explícito e após exclusão da conta.
- Preservação dos dados locais quando o acesso expira, para recuperação após entrar novamente na mesma conta.
- Atualização da explicação sobre armazenamento local na política de privacidade e nos comentários do service worker.

### Arquivos principais

- `frontend/src/features/sessao/model/treino-local.ts`
- `frontend/src/features/sessao/pages/SessaoGuiada.tsx`
- `frontend/src/features/sessao/components/SessoesPendentes.tsx`
- `frontend/src/features/sessao/components/Contador.tsx`
- `frontend/src/app/auth.tsx`
- `frontend/src/shared/api/backend.ts`
- `frontend/src/features/conta/pages/Configuracoes.tsx`
- `frontend/src/features/legal/pages/Legal.tsx`
- `frontend/public/sw.js`

### Limites atuais

- Rascunho e fila pertencem ao navegador e ao aparelho utilizados; ainda não há transferência de treino em andamento entre dispositivos.
- Limpar os dados do site remove os treinos ainda não enviados.
- O service worker guarda os arquivos do app, sem manter uma cópia completa dos dados da API.
- A reabertura offline depende de os arquivos necessários já terem sido carregados e armazenados pelo service worker.
- A sincronização depende de o app estar aberto e a conta autenticada; não foi implementado envio garantido com o app fechado.
- Erros de validação e conflitos de programa são exibidos. Ainda não existe um editor específico para corrigir individualmente os itens da fila.

## 2. Salvamento atômico e prevenção de duplicação

### Implementado

- Identificador UUID estável (`clientId`) para a sessão guiada, preservado entre rascunho, envio e fila local.
- Nova coluna `client_id` em `practice_sessions`, com índice único por usuário para valores preenchidos.
- Repetir um pedido com a mesma chave e a mesma conta retorna a sessão já criada.
- Serialização de criação de sessões por conta dentro da transação para tratar pedidos simultâneos.
- Criação da sessão e conclusão do dia de programa na mesma transação do banco.
- Rollback da sessão inteira quando o dia do programa não pode ser concluído.
- Reaproveitamento da regra de conclusão do programa tanto na rota existente quanto no salvamento integrado.
- Validação das referências da nova sessão usando a conexão da transação.
- Remoção da segunda chamada independente de conclusão do programa no frontend da sessão guiada.

### Arquivos principais

- `backend/src/db/migrations.ts`
- `backend/src/modules/sessions/sessions.routes.ts`
- `backend/src/modules/programs/programs.routes.ts`
- `frontend/src/shared/api/backend.ts`
- `frontend/src/shared/types.ts`
- `frontend/src/features/sessao/pages/SessaoGuiada.tsx`

### Considerações de publicação

- A migração é aplicada pela inicialização da API, seguindo o mecanismo existente do projeto.
- A API atualizada deve estar disponível antes do frontend novo para garantir a deduplicação e a conclusão integrada do programa.
- Clientes antigos que não enviam `clientId` continuam podendo registrar sessões, mas não recebem essa garantia de deduplicação por chave.
- O merge foi verificado no GitHub. Ele, por si só, não comprova a conclusão de todos os deploys externos da aplicação.

## 3. Cronômetro baseado no tempo real

### Implementado

- Cálculo de segundos transcorridos por diferença entre timestamps.
- Uso do intervalo para atualizar a tela, sem depender de uma execução por segundo para medir a duração.
- Atualização do tempo ao mudar a visibilidade da aba e ao sair da página.
- Atualização do snapshot antes de persistir a saída da página.
- Preservação das pausas e atualização do tempo antes de concluir um bloco.
- Alarme ao atravessar o limite do bloco, mesmo quando o navegador não executa uma atualização exatamente no zero.

### Arquivos principais

- `frontend/src/shared/lib/relogio.ts`
- `frontend/src/features/sessao/pages/SessaoGuiada.tsx`

### Limite atual

A medição usa o relógio do aparelho. Alterações manuais no relógio do sistema durante o treino ainda merecem uma política específica e testes adicionais.

## 4. Navegação organizada por objetivo

### Implementado

- Menu dividido em quatro grupos: **Treinar**, **Rotina**, **Evolução** e **Explorar**.
- Treinar reúne início, catálogo, programas e estilos de jogadores.
- Evolução reúne a comparação de registros, Overall e conquistas.
- Explorar reúne NBA, NBB, alimentação, equipamentos e artigos.
- Atalho de Evolução na barra inferior do celular.
- Preservação das rotas existentes e dos acessos aos conteúdos complementares.
- Ajustes de layout para os grupos do menu e a nova tela de evolução.
- Verificação da navegação móvel e de ausência de rolagem lateral nos fluxos testados.

### Arquivos principais

- `frontend/src/app/layout/Layout.tsx`
- `frontend/src/app/App.tsx`
- `frontend/src/styles/navegacao.css`
- `e2e/testes/celular.spec.ts`

## 5. Evolução por período e exercício

### Implementado

- Nova página em `/evolucao`.
- Comparação dos últimos 7 ou 30 dias, incluindo hoje, com a janela imediatamente anterior de mesma duração.
- Contagem por dias locais, sem sobreposição entre as janelas.
- Filtro por exercício registrado no histórico.
- Comparação de sessões, dias com treino, minutos totais, acertos, tentativas, aproveitamento, repetições e segundos registrados nos exercícios.
- Aproveitamento calculado pela soma de acertos e tentativas, evitando a média simples de percentuais de sessões.
- Minutos exibidos apenas na visão geral, pois o histórico não fornece uma duração individual confiável para todo exercício.
- Estados de carregamento, falha, dados desatualizados e ausência de registros.
- Acessos a Overall, conquistas e planejamento na rotina.
- Explicação de que o Overall representa atividade registrada e não uma avaliação validada da habilidade real.

### Arquivos principais

- `frontend/src/features/evolucao/pages/Evolucao.tsx`
- `frontend/src/features/evolucao/model/comparacao.ts`
- `frontend/src/features/evolucao/pages/Overall.tsx`

### Limites atuais

- Não há prescrição automática de treinos com base nas comparações.
- A página reutiliza o carregamento do histórico completo; ainda não existe um endpoint específico de comparação agregada.
- Resultados de contextos diferentes podem não ser diretamente comparáveis. O app sugere repetir exercícios em condições parecidas.

## 6. Manutenção, documentação e integração contínua

### Implementado

- Separação do antigo CSS principal em arquivos de base, conteúdo, programas, responsividade e navegação.
- Preservação da ordem histórica da cascata por imports em `frontend/src/styles.css`.
- Manutenção de `pixel.css` na posição posterior já utilizada pela aplicação.
- README ampliado com requisitos, instalação, banco, execução, contas de desenvolvimento, produção e demonstração.
- Documentação do armazenamento local, sincronização, testes e diferenças entre os ambientes.
- Build de produção e build de demonstração adicionados ao workflow de testes.
- Concorrência dos testes da API limitada a dois processos.
- Concorrência do Vitest limitada a dois workers para reduzir a disputa de memória entre ambientes jsdom e bancos WASM.
- Criação deste registro de mudanças e propostas futuras.
- Documentação das regras atuais e das decisões abertas em `REGRAS_DE_NEGOCIO.md`.
- Plano de refatoração em fases em `PLANO_DE_REFATORACAO.md`, preservando a identidade retrô por requisito do usuário.

### Arquivos principais

- `frontend/src/styles.css` e `frontend/src/styles/`
- `backend/package.json`
- `frontend/vite.config.ts`
- `.github/workflows/testes.yml`
- `README.md`
- `MUDANCAS_E_ROADMAP.md`

## Correção adicional incluída na entrega

Durante a validação final, foi identificada uma corrida na recuperação da conexão: a revalidação da conta substituía o objeto do usuário e podia encerrar o efeito responsável pela sincronização antes da remoção do item enviado da fila local.

O efeito passou a depender da identidade da conta, do estado de autenticação e do token, sem reiniciar apenas porque o objeto do usuário foi renovado. Os testes dos fluxos afetados foram executados novamente, e os checks do PR passaram antes do merge.

## Validações da entrega

Resultados registrados em 18/11/2026 para a entrega do PR #163:

| Camada | Resultado |
| --- | --- |
| API local, incluindo testes opcionais com Postgres real | 189 testes aprovados |
| Frontend | 1.059 testes aprovados na suíte completa |
| Revalidação dos fluxos de autenticação, API do frontend e sessão guiada após a correção final | 37 testes aprovados |
| Ponta a ponta com Chrome e Postgres real | 20 testes aprovados |
| Verificação adicional de reabertura totalmente offline, navegação móvel e reenvios simultâneos | 3 testes aprovados; subconjunto dos cenários ponta a ponta |
| Compilação | Typecheck da API, build de produção e build da demonstração aprovados |
| GitHub Actions do commit final do PR | API, Site e Ponta a ponta aprovados |

As contagens das verificações adicionais não devem ser somadas às suítes completas como se fossem testes distintos. Estes resultados registram a entrega; não garantem que uma execução futura terá o mesmo resultado sem nova validação.

### Cobertura nova ou ajustada

- Recuperação de contadores, bloco e diário após reabrir a sessão.
- Persistência e separação de dados locais por conta.
- Falha de armazenamento local e preservação da fila após falha de envio.
- Retorno da conexão e reenvio com a mesma chave.
- Tempo e alarme após suspensão de execução da aba.
- Salvamento integrado de sessão e dia de programa.
- Rollback quando o programa não permite concluir o dia.
- Isolamento da chave de deduplicação entre contas.
- Pedidos simultâneos com a mesma chave em Postgres real.
- Comparação de períodos, limites de datas e cálculo ponderado do aproveitamento.
- Filtro por exercício e navegação até a nova tela.

## Próximos passos propostos

Esta fila registra a ordem original. Os itens 1, 2 e 6 foram entregues no ciclo do PR #165; os itens 3 e 4 foram parcialmente atendidos (versionamento e coordenação do envio). A revisão por sessão recebe o complemento descrito ao final deste documento. As demais propostas continuam sem data prometida.

| Ordem sugerida | Proposta | Motivo | Critério de conclusão |
| --- | --- | --- | --- |
| 1 | Revisão individual de sessões pendentes | Permitir tratar conflitos e dados rejeitados sem deixar o usuário preso ao erro da fila | Listar cada pendência, explicar o erro e oferecer ações explícitas de correção, nova tentativa ou descarte, preservando os demais itens |
| 2 | Regras de duração por exercício na rotina | O treino iniciado pela rotina ainda usa uma duração padrão por exercício | Persistir a duração planejada por bloco e reutilizá-la ao abrir a sessão guiada |
| 3 | Validação mais completa dos dados locais | Tornar mudanças de formato e dados corrompidos mais recuperáveis | Versionar e validar rascunhos e fila, com migrações e recuperação que não descarte dados válidos silenciosamente |
| 4 | Coordenação entre abas | O banco evita duplicação no servidor, mas o armazenamento local ainda pode receber alterações de abas diferentes | Coordenar gravações e sincronização entre abas, com testes concorrentes e atualização de estado entre elas |
| 5 | Preparação explícita de um treino para uso offline | Reduzir a dependência de páginas e arquivos já visitados | Permitir preparar o plano e os recursos necessários, indicar quando estão disponíveis e testar a abertura sem rede |
| 6 | Comparações agregadas pela API | Evitar baixar todo o histórico para uma comparação curta | Consultar por janela e exercício no servidor, preservando fuso, regras e resultados da comparação atual |
| 7 | Próximo treino mais contextual | Transformar registros em apoio mais útil ao planejamento | Sugerir ações explicáveis a partir da frequência e dos exercícios registrados, permitindo ao usuário escolher o plano |
| 8 | Instrumentação da jornada de treino | Medir confiabilidade e encontrar os pontos de falha | Registrar falhas técnicas e medir início, conclusão e sincronização, com escopo e tratamento de dados definidos |
| 9 | Verificação contínua de desempenho e acessibilidade | Manter a experiência boa em celulares e diferentes formas de navegação | Definir referências de desempenho e verificar teclado, foco, contraste, toque e movimento reduzido nos principais fluxos |
| 10 | Política para mudanças do relógio do aparelho | Evitar durações distorcidas quando o horário do sistema muda | Definir como combinar referências de tempo e testar mudanças de relógio, pausas e suspensão do dispositivo |

## Como manter este documento

1. Antes de iniciar uma nova implementação, registrar o escopo e mover o item correspondente para uma seção de trabalho em andamento.
2. Ao concluir, registrar comportamento entregue, arquivos principais, limitações e validações realmente executadas.
3. Vincular o PR e o commit de integração quando existirem.
4. Manter propostas separadas de entregas e atualizar as prioridades quando o escopo mudar.
5. Não registrar senhas, tokens, variáveis secretas ou dados pessoais de usuários.
6. Atualizar a data deste documento a cada alteração relevante.


## Ciclo seguinte — arquitetura, otimização e limpeza

Estado: integrado pelo PR #165, commit `4eed541`. A organização está detalhada em [ARQUITETURA.md](ARQUITETURA.md).

- Frontend organizado em app, funcionalidades e recursos compartilhados; testes acompanham suas funcionalidades.
- Backend organizado por módulos, com extração de schemas, persistência de sessões, gerador e regras de programas.
- Contrato de comparação compartilhado e verificação automática das fronteiras de dependência.
- Cache com compartilhamento de requisições e proteção contra respostas antigas após invalidação ou logout.
- Antecipação de páginas por intenção de navegação, respeitando falta de conexão e economia de dados.
- Animações 2D/3D suspensas em aba oculta e fora da tela; escolha leve quando não existe preferência explícita e há movimento reduzido ou rede limitada.
- Tokens retrô extraídos; áreas de toque dos controles principais ampliadas em dispositivos de toque.
- Fila local por sessão, leitura do formato anterior, coordenação de envio entre abas quando Web Locks está disponível e preservação de edições durante o envio.
- Revisão individual das pendências, descarte explícito, correção de notas rejeitadas e opção explícita de salvar fora do programa quando sua conclusão é recusada.
- Resumo e envio da sessão separados da tela de execução.
- Duração por exercício da rotina, incluindo a duração da semana gerada e seu reaproveitamento na sessão guiada.
- Escrita da semana inteira em transação, com compatibilidade temporária para APIs anteriores; armazenamento legado preservado.
- Comparação agregada de evolução na API, com filtros, isolamento por conta e limites de dias locais. O cálculo antigo equivalente no frontend foi removido.
- Auditoria reproduzível das cinco telas, em celular/desktop e claro/escuro, com capturas e recursos em arquivos temporários.
- Logs de validação e arquivos intermediários removidos da raiz. Removidos componentes sem consumidores, armazenamento de vídeos sem uso e cálculos de ferramentas que já não existem; preservados testes úteis de realismo, dados de demonstração e redirecionamentos de compatibilidade.
- Dependência Leaflet e seus tipos removidos após confirmar ausência de uso.

Limitações mantidas: não há promessa de ganho de tempo sem medição equivalente; a referência de build antes da reorganização tinha entrada de 247,43 kB (82,20 kB gzip). A estrutura de pastas isoladamente manteve esses tamanhos. As melhorias alteram o carregamento e adicionam comportamentos; o objetivo não é declarar redução de bytes que não foi medida. Permanecem futuras a telemetria de campo, validação ampla em aparelhos reais, migração para tabelas próprias de rotina, controle de versão de edição entre dispositivos e uma máquina de estados completa da sessão.


### Validação do ciclo de arquitetura

- Verificação de dependências entre camadas e imports locais: aprovada.
- Frontend: 1.052 testes aprovados. A contagem mudou com a remoção de testes exclusivos de ferramentas sem uso e a inclusão de cobertura para cache, fila, pré-carregamento e animações.
- API: 171 testes aprovados, incluindo comparação agregada e escrita atômica da rotina.
- Fluxos críticos após os ajustes finais: 40 testes aprovados.
- Chrome com Postgres real: 22 testes aprovados, incluindo duração planejada, ausência de download do histórico completo, recuperação offline e reenvios simultâneos.
- Auditoria: cinco telas, dois tamanhos e dois temas, sem rolagem lateral nas combinações verificadas. Capturas estáticas usam a preferência explícita de animações desligadas e ficam no diretório temporário.
- Builds de produção e demonstração, além de typecheck da API, aprovados durante a implementação. O CI deverá confirmar o commit publicado.

A retirada do pré-carregamento global revelou uma transição para página não disponível ao terminar offline. A confirmação passou a permanecer na sessão e foi adicionado um limite de erro por página para preservar navegação e pendências. O fluxo offline completo foi validado novamente antes de publicar.


A limpeza do README publicada no PR #164 foi preservada. As instruções de instalação, ambiente, execução, testes e auditoria estão em [DESENVOLVIMENTO.md](DESENVOLVIMENTO.md).

## Complemento — rejeições individuais na sincronização

Estado: integrado pelo [PR #166](https://github.com/EduardoLafaiety/BasketballPractice/pull/166), commit `49f3a38`, após aprovação dos checks. Commit de implementação: `9d8697b`.

- Correção do bloqueio da fila: rejeições HTTP 400, 404, 409 e 422 são associadas à sessão correspondente; os demais registros continuam sendo enviados.
- Erro, correção de notas, nova tentativa e opção de desvincular programa aparecem no item correto. A desvinculação continua exigindo confirmação e não conclui o dia do programa.
- Uma sessão rejeitada e inalterada não é reenviada automaticamente nesta montagem da interface. A ação individual repete apenas essa rejeição; a ação geral permite tentar todas novamente. Edição do registro libera nova tentativa.
- Falhas de rede, servidor, autenticação, autorização e limite de pedidos interrompem a tentativa, preservando os itens restantes. HTTP 401/403 exige nova autenticação ou ação manual; falhas transitórias mantêm as tentativas já existentes.
- Confirmações parciais invalidam os dados de evolução mesmo se outra sessão falhar depois. A chave de deduplicação, o isolamento por conta e a preservação de edições concorrentes são mantidos.
- O estilo usa os componentes e classes retrô existentes. Não há novo serviço nem dependência.

Arquivos principais: `frontend/src/features/sessao/model/treino-local.ts` e `frontend/src/features/sessao/components/SessoesPendentes.tsx`, com testes próximos aos módulos.

Limites: os motivos das rejeições não são persistidos entre recarregamentos; a API os revalida na próxima abertura. A correção oferecida cobre notas e desvinculação de programa, sem editor completo de todos os campos.

Validações executadas: 1.061 testes do frontend aprovados em 57 arquivos; três testes de recuperação/sincronização com Chrome e PostgreSQL real aprovados; builds de produção e demonstração aprovados; fronteiras de arquitetura verificadas. O teste de Evolução passou a aguardar a opção do exercício, eliminando uma corrida observada na suíte completa. Não houve alteração no backend; a suíte ponta a ponta completa permanece para os checks da PR.

Próxima ordem sugerida após este complemento:

1. Validar integralmente os rascunhos e dados locais, tornando registros incompatíveis visíveis e recuperáveis.
2. Preparar explicitamente um treino para uso offline, com indicação dos recursos disponíveis.
3. Integrar verificações de acessibilidade e limites de recursos ao CI a partir da auditoria existente.
4. Paginar históricos e orientar o próximo treino com base nos registros disponíveis.

## Etapa atual — arquitetura do backend antes do frontend

Estado: integrado pelo [PR #167](https://github.com/EduardoLafaiety/BasketballPractice/pull/167), commit `1f5e9f8`, com todos os checks aprovados. Commit de implementação: `6fc2376`.

Direção autorizada: organizar e validar a base do backend antes de evoluir a recuperação local e a experiência offline no frontend.

- Sessões: schema de criação centralizado; casos de uso de consulta, criação, edição e exclusão extraídos para serviço; SQL concentrado no repositório.
- Criação: mantém deduplicação por conta, trava de criação e conclusão atômica do programa. Reenvio confirmado retorna o registro existente, sem sobrescrever seu conteúdo.
- Edição: propriedade e referências verificadas dentro da transação, com bloqueio do registro. Cabeçalho, entradas e zonas são substituídos juntos; a resposta é montada dentro da transação.
- Rotina: separação de schema, serviço e repositório, preservando o salvamento atômico da semana, IDs dos treinos e durações planejadas.
- Arquitetura: verificações impedem a reintrodução de SQL/transações e repositórios nas rotas migradas, dependências HTTP nas camadas inferiores e importação de serviços por repositórios.
- Cobertura: falhas injetadas no meio da gravação para verificar rollback de sessão e semana; isolamento entre contas; uso dos serviços sem objetos HTTP; edição concorrente em PostgreSQL real.

Limites: etapa concentrada em sessões e rotina, sem reorganização automática dos demais domínios. Não adiciona tabelas, endpoints, dependências, detecção de conflitos entre dispositivos ou mudanças de interface. A última edição confirmada continua prevalecendo; bloqueio não substitui controle de versão.

Validações desta etapa: 175 testes da API aprovados; 24 testes ponta a ponta com Chrome e PostgreSQL real aprovados, incluindo duas edições simultâneas; 15 testes dos adaptadores HTTP/demonstração aprovados; build do backend, build de produção do site e build da demonstração aprovados. Verificação de arquitetura aprovada; sondas temporárias confirmaram a rejeição de consulta na rota, importação direta de repositório e Express no serviço, e foram removidas após a verificação. A suíte opcional de infraestrutura PostgreSQL não foi executada; os 24 testes ponta a ponta utilizaram o banco real.

Sequência seguinte: concluir a revisão de contratos e persistência dos domínios que suportam recuperação/offline; depois validar e recuperar formatos locais no frontend; preparar treino offline; revisar disponibilidade da API; medir desempenho e acessibilidade. Mudanças de plano de hospedagem dependem da confirmação da infraestrutura real e do custo.

## Etapa atual — contratos de treinos e backup

Estado: integrado pelo [PR #168](https://github.com/EduardoLafaiety/BasketballPractice/pull/168), commit `37eef7a`, com todos os checks aprovados. Commit de implementação: `1495cd3`.

- Treinos: rotas delegam consulta, criação, edição e exclusão ao serviço; SQL e substituição ordenada de itens ficam no repositório. Validação e resposta de escrita pertencem à mesma transação; edição bloqueia o treino da conta.
- Schema de exercício de treino unificado entre API e importação. A escrita de itens é compartilhada por treinos, rotina e backup, preservando séries, metas, notas, posições e IDs legados.
- Backup: contrato v1 extraído para schema próprio, regra de identidade isolada, SQL em repositório e importação/exportação em serviço. O limite de importações por instância e a trava por conta continuam ativos, com `Retry-After` e liberação da vaga em caso de falha.
- Exportação com snapshot transacional `REPEATABLE READ READ ONLY`, incluindo preferências e extras, evitando misturar dados durante edições concorrentes.
- Schema de preferências separado do serviço para reuso nos contratos, com reexports compatíveis e leitura pela conexão da transação.
- [Contratos de treinos e backup](CONTRATOS_BACKEND.md) documentados: campos, limites, identidade, multiplicidade, remapeamento, homônimos e partes não restauradas pelo formato atual.
- Verificações de arquitetura ampliadas para treinos e backup; schemas não dependem de serviços ou repositórios. CI verifica três cenários de backup em PostgreSQL real, além das jornadas existentes.

Validações locais: 178 testes da API, três cenários de concorrência de backup em PostgreSQL real, 24 testes ponta a ponta e 15 testes dos adaptadores HTTP/demonstração aprovados. Builds do backend, do site de produção e da demonstração aprovados. Arquitetura verificada. A revalidação específica de contratos é subconjunto da suíte, sem somar contagens duplicadas.

Limites: sem mudança de versão do backup, tabela, endpoint, dependência ou interface. A exportação usa uma conexão durante sua execução; não há streaming nem paginação do arquivo. Não implementa restauração de extras, conflitos por versão ou sincronização entre backup e gravações normais da conta. Importações da mesma conta continuam serializadas entre si.

A orientação vigente é concluir o backend antes do frontend. A fila restante está no [plano de refatoração](PLANO_DE_REFATORACAO.md): exercícios/programas/planos; autenticação/administração/preferências; notificações/estilos; fechamento das verificações e documentação. Somente depois entram recuperação local e preparação offline na interface.

## Etapa atual — exercícios, programas e planos

Estado: integrado pelo [PR #169](https://github.com/EduardoLafaiety/BasketballPractice/pull/169), commit `23913ce`, com todos os checks aprovados. Commit de implementação: `cf95857`.

- Exercícios: consultas, gravações e exclusão movidas para repositório; serviço preserva visibilidade por conta, catálogo protegido e conflito de referência em uso. Edição/exclusão verificam propriedade dentro da transação e bloqueiam o registro.
- Programas: validação de parâmetros/corpo em schema; status e data local em modelo próprio; leitura e escrita de progresso em repositório; serviço concentra lista, detalhe, início, saída e conclusão.
- Início/reinício e saída passam a compartilhar a trava por conta já usada na conclusão. Reinícios concorrentes são serializados; conclusão repetida retorna conflito. Outra conta segue operando. Data de gravação é calculada após a trava; início usa um único valor na gravação e resposta. A sessão vinculada é protegida por trava de referência durante a conclusão.
- Planos: rota delega ao serviço, projeção de exercícios visíveis no repositório e algoritmo no gerador puro. Semente, duração, aquecimento, exclusões preferenciais, progressão e fallback mantidos. Gerar não persiste dados.
- Contratos dos três módulos adicionados a [CONTRATOS_BACKEND.md](CONTRATOS_BACKEND.md). Guardas de arquitetura abrangem os novos módulos e recusam SQL nos serviços migrados.
- Testes novos de rollback do reinício com vínculo de sessão, isolamento/edição de exercícios, serviço de geração sem HTTP e coordenação de programas em PostgreSQL real. Dois cenários concorrentes de programas entram no CI junto aos três cenários de backup.

Validações: 181 testes da API aprovados; dois cenários de coordenação de programas em PostgreSQL real aprovados; 24 testes ponta a ponta com Chrome/PostgreSQL e 15 testes dos adaptadores HTTP/demonstração aprovados. Build do backend, typecheck, builds de produção e demonstração aprovados; guardas de arquitetura aprovadas e verificadas com violações temporárias, removidas em seguida. A revalidação preservou a precedência de 403 para edição de catálogo mesmo com corpo inválido. Builds de demonstração e produção devem ser executados separadamente quando compartilham a pasta `frontend/dist`.

Limites: não adiciona endpoints, tabelas, dependências ou mudanças de interface. Não altera o algoritmo de geração nem prescreve o próximo treino. Leituras de progresso continuam sem snapshot único entre consultas; a trava por conta coordena escritas, sem controle otimista de versão entre dispositivos.

Depois desta entrega, permanecem no backend autenticação, administração e preferências; notificações e estilos; revisão final de contratos, dependências e validações. O frontend só entra após esse fechamento.

## Etapa atual — autenticação, administração e preferências

Estado: integrado pelo [PR #170](https://github.com/EduardoLafaiety/BasketballPractice/pull/170), commit `af2b85a`, com todos os checks aprovados. Commit de implementação: `c7a4f3e`.

- Autenticação separada em schema, serviço e repositório. Rotas preservam respostas, proteção HTTP e tarefas de e-mail disparadas após o 202; serviço recebe provedor e controle de envios por injeção, sem depender do middleware.
- Sessões públicas montadas por campos explícitos. Login revalida o hash antes de assinar a versão do token; troca e exclusão verificam a senha atual dentro da transação. Ordem de bloqueio de conta antes dos links de recuperação, consumo único e revogação preservados.
- Administração separada em contrato, serviço e repositório; papel do autor revalidado dentro da transação. Exclusão pessoal e alterações administrativas usam a mesma trava de composição para impedir perda do último administrador por ações cruzadas.
- Ferramenta `make-admin` delega ao serviço: bootstrap do primeiro administrador preservado; remover o último passa a ser recusado com erro. Consultas de versão/papel e trava compartilhada ficam em `db/account-access.ts`; middleware não executa SQL diretamente.
- Preferências ganham repositório, mantendo padrões, fallback de dados inválidos, formato e participação na transação/snapshot do backup.
- Contratos e regras atualizados, com guardas de arquitetura estendidas aos três módulos. CI passa a incluir sete cenários de conta em PostgreSQL real, além dos cinco de backup/programas.
- Cobertura nova: login durante mudança de credenciais, rollback de senha/versão ao falhar limpeza de links, revalidação de autor e proteção do último administrador na ferramenta; corridas reais de troca de senha e alterações cruzadas de papéis.

Validações locais: 184 testes da API aprovados; sete cenários de conta em PostgreSQL real aprovados, com barreiras garantindo pedidos concorrentes já autenticados; 24 testes ponta a ponta com Chrome/PostgreSQL e 15 testes dos adaptadores HTTP/demonstração aprovados. Builds de backend, produção e demonstração, typecheck e arquitetura aprovados. Guardas testadas com violações temporárias nos três módulos e sondas removidas em seguida. Os testes opcionais restantes de infraestrutura PostgreSQL não foram executados nesta etapa.

Limites: sem tabela, endpoint, dependência, provedor ou mudança de interface. E-mail continua sem fila durável; limitadores seguem por instância. Revogação não cancela automaticamente toda operação já em andamento. Escritas SQL externas que ignoram a coordenação oficial não recebem a garantia de composição administrativa.

Próximo bloco ainda no backend: notificações e estilos; depois revisão final dos contratos e fronteiras, testes e documentação dos módulos migrados. O frontend permanece posterior ao fechamento do backend.

## Etapa atual — notificações, estilos e revisão final do backend

Estado: implementação e revisão local concluídas na branch codex/fechamento-arquitetura-backend; publicação e integração acompanhadas nesta etapa.

- Notificações separadas em schema, modelo puro de elegibilidade, serviço, repositório e agendador. O adaptador Web Push fica em lib/push.ts, com dependências injetadas para testes sem envios reais.
- Limite de dez endpoints coordenado na transação por conta; atualização de endpoint existente preserva a vaga. Cron e agendador usam trava por aparelho e revalidam a elegibilidade antes do envio.
- Resposta atrasada de inscrição expirada não apaga uma inscrição transferida/renovada. Preferências inválidas não interrompem outras contas. Espera de envio limitada; encerramento aguarda o item em andamento antes de fechar o banco.
- Estilos com catálogo estático, tipos, resolução/percentuais, schema, serviço e repositório separados. Catálogo, textos, ordem, aquecimento, minutos, percentuais e cache preservados; reexport temporário mantém o teste de fotos existente compatível.
- Revisão final dos 12 módulos registrada em [REVISAO_ARQUITETURA_BACKEND.md](REVISAO_ARQUITETURA_BACKEND.md). Consultas de comparação de sessões extraídas para repositório, filtros separados do schema e filtro de exercício limitado ao int4, retornando 400 para excedentes.
- Guardas de arquitetura agora analisam sintaxe TypeScript e todos os módulos futuros, sem lista manual. Cobrem imports/reexports, contratos somente de tipos e ciclos de execução; sete testes permanentes verificam as guardas. CI inclui esses testes e mais dois cenários de push, totalizando 14 cenários selecionados de concorrência PostgreSQL.
- Contratos, regras de negócio, arquitetura, desenvolvimento e plano atualizados. Nenhum arquivo de frontend, tabela, endpoint ou dependência alterado.

Validações locais: 189 testes da API, 27 testes da suíte completa de PostgreSQL real, sete testes do analisador, 16 testes de compatibilidade HTTP/demo/fotos e 24 jornadas Chrome/PostgreSQL aprovados. Build do backend, build de demonstração e build de produção aprovados; arquitetura sem violações ou ciclos de execução detectados. Jornadas sem repetição ou instabilidade. Catálogos estáticos comparados com a versão anterior. Reexecuções direcionadas não entram novamente na contagem.

Limites: entrega de push e commit não são atômicos; falha/timeout com entrega incerta pode causar repetição posterior. O serviço limita a espera por envio a 15 segundos, mas não cancela necessariamente o transporte; durante um lembrete ocupa uma conexão/transação. Mudanças de preferências e sessões durante o envio continuam possíveis. E-mail sem fila durável, limites por instância, backup v1 sem restauração de extras e ausência de controle otimista geral permanecem documentados. Guardas estáticas não provam segurança/desempenho nem resolvem todo caminho dinâmico. Avisos existentes de fonte, dependências e chunks no build demo permanecem para a fase de medição.

O ciclo estrutural do backend encerra-se com a integração desta entrega. Próxima sequência: recuperação e validação dos formatos locais de rascunho/fila, preparação do catálogo mínimo offline e medição de desempenho/acessibilidade, preservando a identidade retrô. O frontend permanece sem alterações nesta etapa.

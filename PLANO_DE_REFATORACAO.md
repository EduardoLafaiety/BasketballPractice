# Plano de refatoração, desempenho e experiência

Atualizado em **18/11/2026**. Estado: **backend integrado até a PR #173; primeiro ciclo de frontend (passos 1 a 4) implementado e publicado na PR #175**.

Prioridade atual: validar e integrar referência visual/métricas, recuperação de dados locais, arquitetura da sessão e preparação de um treino offline, nessa ordem autorizada pelo usuário. O fechamento estrutural dos 12 módulos do backend foi integrado na PR #173.

Sequência do backend implementada:

1. Sessões, rotina, treinos e backup: transporte, casos de uso, persistência e contratos.
2. Exercícios, programas e planos: catálogo, gerador e coordenação de progresso.
3. Autenticação, administração e preferências: credenciais, revogação e permissões.
4. Notificações e estilos: camadas separadas, concorrência e falhas externas.
5. Revisão dos 12 módulos, guardas de arquitetura para módulos futuros e relatório de limites em [REVISAO_ARQUITETURA_BACKEND.md](REVISAO_ARQUITETURA_BACKEND.md).

O primeiro ciclo de frontend executa esses quatro passos. Resultados e limites: [IMPLEMENTACOES_FRONTEND.md](IMPLEMENTACOES_FRONTEND.md). Referência medida: [REFERENCIA_FRONTEND.md](REFERENCIA_FRONTEND.md). A sequência seguinte consolida contratos de dados, componentes retrô, acessibilidade e navegação; otimizações de desempenho dependem de comparação equivalente.

Não criar camadas vazias para preencher pastas; cada separação corresponde a uma operação real. Fechamento estrutural não significa concluir todas as evoluções de produto, sincronização ou operação descritas abaixo.

A estrutura entregue está em [ARQUITETURA.md](ARQUITETURA.md). Já foram aplicados cache compartilhado, antecipação seletiva de rotas, suspensão de animações invisíveis, fila local por item, revisão de pendências, duração por exercício, escrita atômica da semana e comparação agregada no servidor. As fases abaixo continuam sendo a visão de evolução; nem todos os seus itens estão concluídos. A nova auditoria automatiza capturas e contagens locais, sem substituir medições em aparelhos reais ou dados de campo.

Este plano organiza a próxima etapa do projeto. A leitura do código sustenta as oportunidades identificadas, mas ainda não foi realizada uma auditoria de desempenho em aparelhos reais. Metas abaixo são critérios propostos, não resultados medidos. A refatoração completa ainda não foi executada.

Documentos de referência: [regras de negócio](REGRAS_DE_NEGOCIO.md) e [histórico de mudanças](MUDANCAS_E_ROADMAP.md).

## Direção

Preservar React, Express, TypeScript e PostgreSQL nesta primeira etapa. A prioridade é tornar o caminho **abrir → escolher → treinar → salvar → acompanhar evolução** rápido, claro e confiável.

A refatoração deve ocorrer por fluxos completos e PRs pequenos. Cada etapa precisa manter o produto utilizável, permitir comparação com a versão anterior e ter uma forma simples de reversão. Mudanças visuais devem partir das referências retrô existentes.

## Fase 1 — Medir e proteger a experiência atual

### Entregas

- Capturar referências de Início, Treinos, Rotina, Sessão e Evolução, em celular e desktop, nos temas claro e escuro.
- Registrar tempos de carregamento, JS/CSS transferidos, tarefas longas, requisições repetidas e custo de animações nas cinco telas.
- Avaliar primeira visita, retorno ao app, conexão lenta, retomada offline e dispositivo com recursos limitados.
- Mapear os testes existentes para os IDs das regras de negócio; adicionar cobertura apenas onde houver lacunas relevantes.
- Medir quantas ações são necessárias para iniciar um treino e entender onde o usuário fica sem orientação.

### Critério de saída

Uma referência reproduzível de desempenho, comportamento e aparência, com lista priorizada dos problemas observados. Nenhum número deve ser apresentado como melhoria sem comparação equivalente.

## Fase 2 — Consolidar o sistema visual retrô

### Entregas

- Organizar tokens de cores, tipografia, espaçamento, bordas, foco, movimento e camadas a partir dos estilos atuais.
- Consolidar componentes compartilhados: botão, campo, seleção, cartão, mensagem, carregamento, estado vazio, confirmação e navegação.
- Preservar fontes características, paleta, quadra, placares e pixel art. Melhorar leitura de instruções e dados sem substituir a identidade do produto.
- Garantir foco visível, uso por teclado, rótulos, erros associados aos campos e preferência por movimento reduzido.
- Projetar controles principais da quadra com área de toque de pelo menos 44 × 44 CSS px como meta do produto.
- Verificar telas estreitas, zoom e textos longos sem cortes ou sobreposição com a barra inferior.

### Critério de saída

Os componentes aplicados primeiro em um fluxo mantêm a aparência reconhecível, passam pela comparação visual e podem ser reutilizados nas próximas telas.

## Fase 3 — Reduzir carregamento e custo das animações

### Oportunidades já identificadas

- `App.tsx` faz carregamento por rota, mas também oferece pré-carregamento de todas as páginas em segundo plano. Avaliar uma política seletiva por intenção, conexão e próximo passo provável.
- O Início é importado imediatamente. Medir o custo dessa antecipação em páginas abertas diretamente por URL.
- A demonstração usa 3D por padrão quando há WebGL, com alternativa 2D. Medir uma opção de experiência leve, com escolha clara, preservando a preferência do usuário.
- Existem imagens responsivas, fontes locais e separação do módulo 3D. Evoluir essas bases a partir das medições, sem presumir que precisam ser refeitas.

### Entregas

- Carregar recursos pesados conforme a necessidade do fluxo; definir explicitamente o que deve ser preparado para uso offline.
- Suspender renderizações e animações fora da área visível ou em aba oculta quando não forem necessárias. O cronômetro deve continuar correto pelo relógio.
- Verificar liberação de recursos WebGL e carregamento de clipes de movimento.
- Priorizar a imagem principal; adiar imagens secundárias e reservar suas dimensões para evitar deslocamentos.
- Criar um limite de regressão para tamanho dos pacotes após medir a versão atual.

### Critério de saída

Redução demonstrável de recursos ou tempo nos cenários medidos, sem prejudicar demonstrações didáticas, navegação nem retomada offline.

## Fase 4 — Refatorar o domínio de treino e a persistência local

### Entregas

- Extrair da tela os casos de uso de iniciar, pausar, concluir bloco, retomar, finalizar e sincronizar.
- Representar os estados da sessão e da fila de forma explícita, evitando combinações impossíveis de flags.
- Versionar e validar o formato dos dados locais, com migração e recuperação de dados corrompidos.
- Coordenar alterações entre abas e impedir que um envio desatualizado remova uma versão mais recente da pendência.
- Criar revisão individual da fila: motivo da rejeição, nova tentativa, correção permitida e descarte explícito.
- Preservar `clientId`, isolamento por conta e transação de conclusão de programa.
- Separar regras puras, acesso à API, persistência e componentes de interface.

### Critério de saída

Os testes cobrem recarregamento, fechamento, falta de rede, reconexão, expiração, troca de conta e repetição de pedidos. A interface diferencia claramente salvo neste aparelho, enviando, salvo no servidor e erro.

## Fase 5 — Evoluir rotina e contratos de dados

### Entregas

- Modelar a rotina explicitamente, com dia, ordem, exercício e duração planejada por bloco.
- Migrar os treinos `bp-rotina:<dia>` preservando contas e dados existentes; manter compatibilidade durante a transição.
- Definir salvamento atômico da semana e tratamento de edição concorrente.
- Extrair casos de uso do backend para que as rotas cuidem de HTTP e os serviços apliquem regras de negócio.
- Organizar contratos de entrada e saída para diminuir a duplicação entre API, frontend e demonstração.
- Definir um padrão para cache, cancelamento, pedidos em andamento e invalidação antes de escolher novas bibliotecas.

### Critério de saída

A rotina mantém o comportamento esperado, usa as durações planejadas na execução e sobrevive à migração. Demonstração e produção passam pelos mesmos contratos de negócio aplicáveis.

## Fase 6 — Otimizar histórico e tornar a evolução útil

### Entregas

- Criar consulta agregada por período e exercício para a tela de Evolução, evitando carregar todo o histórico para uma comparação curta.
- Manter os resultados e as regras de datas equivalentes aos cálculos atuais.
- Paginar as listagens; manter o carregamento completo apenas nos fluxos que precisam dele, como exportação.
- Medir planos de execução das consultas antes de criar índices adicionais.
- Melhorar a orientação para o próximo treino com ações explicáveis, baseadas no histórico disponível.
- Definir com clareza o que representam frequência, volume, aproveitamento e Overall.

### Critério de saída

Históricos maiores não exigem download integral na comparação, e o usuário consegue identificar o que treinou, como mudou e qual ação pode tomar depois.

## Fase 7 — Fechar a refatoração e sustentar a qualidade

### Entregas

- Migrar as telas complementares para os componentes e contratos consolidados.
- Remover estilos, módulos e dependências sem uso comprovado.
- Avaliar como manter conteúdo externo indisponível sem bloquear treino, rotina e evolução.
- Instrumentar erros e etapas essenciais com escopo de dados definido; não enviar notas pessoais, credenciais ou conteúdo de rascunhos para telemetria.
- Integrar verificações visuais, acessibilidade e limites de pacote ao CI conforme sua utilidade e estabilidade.
- Manter documentação, exemplos de configuração e procedimento de publicação compatíveis com a versão entregue.

### Critério de saída

Os fluxos críticos passam nos testes de negócio, ponta a ponta, aparência e desempenho. O código antigo só sai após a migração do fluxo correspondente.

## Metas propostas

| Aspecto | Critério |
| --- | --- |
| Carregamento | LCP de até 2,5 s no percentil 75 das visitas, segmentando celular e desktop |
| Resposta à interação | INP de até 200 ms no mesmo recorte |
| Estabilidade visual | CLS de até 0,1 no mesmo recorte |
| Experiência na quadra | Ações de contar, pausar e avançar acessíveis com uma mão e sem depender de hover |
| Clareza do salvamento | Mostrar onde o treino está salvo e se existe pendência |
| Identidade visual | Referências comparadas em claro/escuro e celular/desktop em cada alteração visual relevante |
| Confiabilidade | Reenvios sem duplicação e recuperação dos dados nos cenários cobertos |
| Pacotes e API | Definir limites após medir a referência; não inventar um orçamento sem o perfil atual |

As metas de LCP, INP e CLS seguem as recomendações de [Core Web Vitals](https://web.dev/articles/vitals). A área de toque de 44 × 44 é uma escolha proposta para o produto; a orientação [W3C sobre tamanho mínimo de alvo](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) explica o mínimo de 24 × 24, suas exceções e a referência ampliada de 44 × 44. Essas metas não constituem uma auditoria de conformidade já concluída.

## Primeiro ciclo autorizado — passos 1 a 4

1. Referência de cinco telas em dois tamanhos/temas, com capturas e medições locais.
2. Validação e recuperação de rascunhos/fila, preservação de dados desconhecidos, exportação por conta e aviso de conflito entre abas.
3. Separação da execução, relógio, contadores, montagem do registro, persistência e sincronização; estados explícitos e retomada pausada.
4. Preparação explícita de um plano com catálogo mínimo/instruções e confirmação do cache estático; início após reabertura offline e envio posterior com identidade estável.

Implementação concluída; integração condicionada aos testes. A referência visual permanece retrô e esta etapa não redesenha as páginas.

Cada PR deve indicar regras preservadas, mudança observável, validação e limitações. As fases anteriores contêm o histórico de oportunidades; itens já entregues não devem ser refeitos como trabalho novo. Datas e estimativas futuras serão definidas por ciclo.

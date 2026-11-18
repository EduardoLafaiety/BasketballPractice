# Frontend — contratos, componentes, acessibilidade e caminhos principais

Data: 18/11/2026. Base: PR #175 integrada, commit `53bd7ff`. Escopo: passos 5 a 8, nessa ordem, preservando a identidade retrô e integrando após os testes. Trabalho realizado em checkout isolado para preservar as alterações em andamento na página inicial. Entrega: [PR #176](https://github.com/EduardoLafaiety/BasketballPractice/pull/176).

## 5. Contratos e acesso aos dados

- DTOs já consumidos pela fachada central extraídos para `contracts/api.d.ts`; métrica, nível e zona ficam em `contracts/primitivos.d.ts`, reutilizados pelos tipos do frontend. Exercícios e schema de preferências também verificam esses contratos na compilação do backend.
- Conversões sem rede ficam em `shared/api/mapeamento.ts`. A fachada `backend.ts` mantém nomes e respostas utilizados pelas funcionalidades. Programas reutilizam o mapeamento de categoria existente.
- Transporte aceita AbortSignal nas consultas. Cache continua deduplicando pedidos por chave; cancelar um consumidor não interrompe o outro. Invalidação, logout e saída do último consumidor cancelam o pedido em andamento quando o carregador propaga o sinal.
- Catálogo, sessões/histórico, preferências, rotina, comparação, estilos e programas propagam cancelamento nas consultas abrangidas. Mutações não recebem cancelamento automático nem repetição automática nova.
- Resposta 401 atrasada só dispara expiração se o token ainda for aquele usado no pedido. Retorno de uma sessão anterior não derruba um login novo.

Os contratos são declarações, sem emissão de JavaScript ou dependência nova. Não substituem validação de respostas em runtime nem alteram contratos HTTP ou regras do backend.

## 6. Componentes retrô compartilhados

| Componente | Resultado |
| --- | --- |
| Campo | Rótulo, ajuda e erro associados ao controle nativo; preserva descrições existentes |
| Botao | Tipo padrão seguro, suporte a estado ocupado e bloqueio de nova ativação |
| Mensagem | Aviso de erro, sucesso ou informação com semântica consistente |
| EstadoVazio | Orientação e ação para sair de uma tela sem conteúdo |

Aplicados inicialmente ao formulário de exercício, resumo da sessão, rotina e estados de carregamento/erro. Classes, fontes, paleta e bordas existentes permanecem a referência. A migração de todas as telas complementares não foi realizada neste ciclo.

## 7. Celular e acessibilidade

- Menu aberto apresentado como diálogo: foco inicial, contenção de Tab/Shift+Tab, fechamento por Escape ou botão dedicado e devolução de foco ao acionador.
- Menu fechado sai da navegação assistiva; conteúdo principal fica inerte enquanto aberto. Atalho “Pular para o conteúdo” e foco no conteúdo após troca de rota ajudam a orientação.
- Campos exibem erro associado e o nome inválido recebe foco para correção. Foco visível usa os tokens existentes.
- Área mínima de 44 px aplicada à remoção e aos controles móveis abrangidos; remoção não depende de hover. Linhas da rotina acomodam os controles sem transbordar.
- Seletor “Mover” oferece alternativa ao arraste, preservando exercício, ocorrência e duração. Ambos usam a gravação da semana no servidor atual.

Cobertura de comportamento no Chrome e testes de componentes. Não foi realizada auditoria integral WCAG, medição de todo contraste ou teste em todos os leitores de tela/dispositivos.

## 8. Caminhos principais

1. Treinos oferece “Montar minha rotina”.
2. Rotina oferece “Iniciar treino de hoje” quando existe treino naquele dia, aguardando salvamentos e mantendo a conta verificada antes de navegar.
3. Aplicar uma prévia só confirma sucesso após a resposta da API. Enquanto salva, a geração fica bloqueada; falha mantém a prévia para revisão e oferece recarga da rotina.
4. Sessão sem plano usa estado vazio com ação principal para montar a rotina.

Não foram alterados algoritmos, catálogo, regras de programas, resultados ou persistência offline. O servidor atual grava a semana atomicamente; fallback de compatibilidade em servidor legado permanece sequencial e não tem a mesma garantia.

## Validação

- 1.102 testes do frontend aprovados; revalidação final direcionada de programas, transporte e comparação aprovada.
- 189 testes da API aprovados na reexecução completa. A primeira execução concorrente teve uma falha isolada na suíte de limites; essa suíte e a execução completa seguinte passaram.
- 29 jornadas Chrome/PostgreSQL aprovadas, incluindo três novas: menu/atalho por teclado, mover sem arraste/iniciar com duração preservada e correção de erro associado ao campo.
- Sete testes das guardas e verificação de arquitetura aprovados; TypeScript e builds do backend, site de produção e demonstração aprovados.
- Auditoria de cinco telas em dois tamanhos/temas: 20 capturas aprovadas sem transbordamento horizontal. Inspeção de Rotina clara e Treinos escuro no celular confirmou a identidade retrô. Artefatos em `C:/Users/agath/AppData/Local/Temp/basketball-practice-audit-passos-5-8`.

Testes antigos de menu passaram a abri-lo antes de consultar/interagir com opções, seguindo o comportamento real. Reexecuções direcionadas não aumentam a contagem da suíte completa. O CI revalida o commit publicado antes da integração.

## Limites e próximos passos

- Componentes e áreas de toque foram aplicados aos fluxos desta entrega; a padronização das demais telas permanece incremental.
- Cancelar uma consulta não desfaz processamento já iniciado no servidor. Sem carregador que propague sinal, continua valendo a proteção contra resposta antiga no cache.
- Tipos estáticos não fazem validação de payload externo em runtime. Não foi introduzido gerador de SDK, framework ou biblioteca de dados.
- Avisos existentes de fonte, dependências e chunks no build permanecem. Amostras locais não comprovam ganhos de desempenho ou conformidade de acessibilidade.
- Próximos ciclos: passo 9, carregamento e demonstrações guiados por medição; passo 10, histórico/evolução; passos 11 e 12, operação e regressões. Essas etapas não foram iniciadas aqui.

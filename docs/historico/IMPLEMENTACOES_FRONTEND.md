# Primeiro ciclo de frontend — implementação e próximos passos

Data: 18/11/2026. Escopo autorizado: passos 1 a 4, nessa ordem, preservando identidade retrô, documentação e integração após os testes. Backend estrutural integrado na PR #173. Entrega deste ciclo: [PR #175](https://github.com/EduardoLafaiety/BasketballPractice/pull/175).

## 1. Referência antes das mudanças

Auditoria das cinco telas principais em dois tamanhos e dois temas: 20 capturas, ausência de transbordamento horizontal, recursos carregados, DOM pronto, LCP observado, soma de deslocamentos, tarefas longas e tempo da automação iniciar/pausar. Método, amostras e limites em [REFERENCIA_FRONTEND.md](REFERENCIA_FRONTEND.md). Não é uma medição de visitas reais nem uma auditoria de conformidade.

## 2. Proteção e recuperação local

- Validação de estrutura, datas, plano, métricas, entradas, contagens, zonas e diário antes de retomar ou enviar dados.
- Formato antigo de rascunho continua legível e é regravado no envelope v2 ao retomar. Itens válidos da fila legada mista permanecem utilizáveis; clientId não é trocado.
- Registros corrompidos ou de versão desconhecida são preservados. Um item recente desconhecido não permite enviar silenciosamente sua cópia legada antiga.
- Painel oferece exportação dos registros de treino da conta e descarte explícito dos registros incompatíveis, mantendo dados válidos e de outras contas.
- Rascunho detectado como alterado em outra aba não é sobrescrito nem removido por um envio antigo. Também se verifica a atualização ocorrida enquanto a pessoa aguardava para retomar/descartar.
- Respostas de conta anterior não repovoam cache nem navegam a tela atual. Falha tardia não recria fila após logout/troca de conta.

## 3. Arquitetura da sessão

| Arquivo em sessao/model | Responsabilidade |
| --- | --- |
| execucao.ts | Transições puras, entrada por métrica e montagem do registro |
| usarExecucao.ts | Relógio por timestamps, efeitos, persistência e comandos da execução |
| contador.ts / usarContador.ts | Tipos/conversão de zonas e contador vivo |
| sessao.ts / validacao-local.ts | Plano, rascunho e validação estrutural local |
| treino-local.ts | Armazenamento, recuperação, exportação e detecção de conflito |
| sincronizar-sessoes.ts | Coordenação de fila por conta, Web Locks e confirmações |
| salvar-sessao.ts | Confirmação remota ou enfileiramento por falha transitória |
| treino-offline.ts / preparar-offline.ts / usarTreinoOffline.ts | Snapshot, confirmação dos arquivos e coordenação offline |

A página apresenta os estados e ações. Preparação não executa o relógio; execução roda/pausa; resumo não volta ao bloco por ação atrasada. Retomada é pausada. Duração, diário, arremessos, repetições, tempo, pular blocos e conclusão de programas mantêm suas regras. As guardas impedem dependência do modelo em páginas/componentes e transporte nos arquivos puros da sessão.

## 4. Treino preparado offline

Na preparação de uma sessão, a pessoa escolhe “Preparar este treino offline”. O app confirma os arquivos estáticos pelo service worker e guarda um snapshot versionado do plano com apenas os exercícios/instruções necessários. Existe uma cópia por conta; uma preparação nova substitui a anterior após sucesso.

Reabrir /sessao sem conexão permite iniciar sem rascunho prévio. Quando a API falha com o navegador ainda conectado, há uma ação explícita para abrir a cópia preparada. O plano aceito permanece estável durante reconexão. Durante a execução offline, instruções textuais substituem demonstrações animadas. Concluir/salvar gera pendência local; reconexão e autenticação permitem confirmar o mesmo clientId no servidor.

Cache do service worker contém HTML e arquivos públicos, sem respostas autenticadas da API. A preparação verifica o script de entrada do HTML, impedindo confirmar um HTML de outro deploy com módulos ainda não carregados. A leitura dos arquivos públicos considera a variação de cabeçalhos de origem. Atualização remove somente versões antigas do cache deste app.

## Validação e aparência

- Suíte completa do frontend aprovada localmente; revalidações direcionadas cobrem recuperação, estados, troca de conta, offline e service worker.
- 26 jornadas Chrome/PostgreSQL aprovadas, incluindo início após reabertura offline sem rascunho e conflito entre duas abas.
- Sete testes das guardas e verificação de arquitetura aprovados; build TypeScript, produção e demonstração aprovados.
- Auditoria final: 20 capturas aprovadas, sem transbordamento. Das 16 capturas das quatro telas sem alteração funcional, 15 são idênticas; a restante variou em 13 canais com delta máximo de um nível. Sessão adiciona o cartão offline usando os componentes/classes existentes. Não houve redesenho de fontes, paleta, quadra, placares ou navegação.
- Contagens finais e PR registradas no roadmap. Reexecuções direcionadas não são somadas novamente à suíte completa.

## Limites preservados

1. localStorage não oferece transação entre abas. A comparação impede sobrescrita quando a mudança é detectada, sem prometer eliminar gravações exatamente simultâneas. Web Locks coordena os envios quando disponível; deduplicação final é da API.
2. Exportação de recuperação não é o backup v1 do servidor e ainda não possui importação automática. JSON inválido não pode ser reconstruído com segurança de forma genérica; dados originais são preservados para decisão manual.
3. Preparação exige HTTPS ou localhost, suporte a service worker, armazenamento disponível e instalação ativa. Em desenvolvimento Vite o SW está desligado; use build/preview. Limpeza do navegador, logout explícito ou descarte de armazenamento pelo sistema remove dados locais. Expiração preserva os dados para a mesma conta.
4. O snapshot pode envelhecer. Alterações posteriores de exercício/rotina e disponibilidade de dia de programa são verificadas pelo servidor na sincronização e podem exigir revisão da pendência. Não há atualização automática do preparo.
5. Offline não inclui animações, catálogo completo, dados externos, confirmação de programa ou sincronização com app fechado. O preparo é específico deste aparelho/conta.
6. Avisos existentes de fonte e chunks do build permanecem. Desempenho móvel real, acessibilidade e consolidação geral dos componentes são os próximos ciclos, sem ganhos alegados a partir de uma única execução local.

## Sequência futura

Após integrar este ciclo: consolidar contratos/acesso a dados; componentes retrô e estados de tela; acessibilidade e uso no celular; simplificação de navegação; otimizações guiadas por medição; histórico/evolução e operação conforme necessidade. Consulte [PLANO_DE_REFATORACAO.md](../arquitetura/PLANO_DE_REFATORACAO.md).

## Segundo ciclo — passos 5 a 8

Contratos e consultas compartilhadas, componentes retrô, navegação por teclado/celular e caminho da rotina ao treino foram implementados no segundo ciclo. Relatório, testes e limites em [SEGUNDO_CICLO_FRONTEND.md](SEGUNDO_CICLO_FRONTEND.md). A recuperação local e a preparação offline deste primeiro ciclo permanecem preservadas.

## Passos 9 a 12 — carregamento e continuidade

Demonstração começa em 2D e mantém escolha/preferência 3D com fallback local. Registrar sessão não baixa histórico. Evolução exibe histórico paginado; Overall/conquistas usam projeção compacta, cálculos memoizados e avisos de atualização, com fórmulas intactas. Conquistas não solicita catálogo sem necessidade.

CI inclui orçamentos gzip e capturas nos temas/tamanhos existentes. Ferramentas de build/teste/imagem foram atualizadas, mantendo fontes e target de navegadores anterior. Detalhes e limites em [TERCEIRO_CICLO_FRONTEND.md](TERCEIRO_CICLO_FRONTEND.md).

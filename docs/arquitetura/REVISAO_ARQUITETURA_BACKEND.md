# Revisão final da arquitetura do backend

Data: 18/11/2026. Escopo: encerrar a separação estrutural do backend antes de iniciar a próxima refatoração do frontend. Esta revisão não certifica segurança, desempenho ou disponibilidade de produção.

## Inventário revisado

| Domínio | Responsabilidades e evidência principal |
| --- | --- |
| Autenticação | Schema, serviço e repositório; revalidação de credenciais, revogação e consumo único de links |
| Administração | Autorização revalidada, coordenação da composição administrativa e ferramenta operacional |
| Preferências | Contrato, fallback de leitura e repositório compartilhável com transações de backup |
| Exercícios | Visibilidade por conta, catálogo protegido, propriedade e conflito de referência |
| Treinos | Validação, gravação ordenada e edição transacional de itens |
| Rotina | Gravação atômica da semana, IDs e duração planejada preservados |
| Sessões | Deduplicação, edição, referências e conclusão de programa na mesma transação |
| Backup | Formato v1, identidade, limite por instância, importação atômica e exportação em snapshot |
| Programas | Modelo de status e coordenação de início, reinício, conclusão e saída por conta |
| Planos | Catálogo visível carregado pelo repositório e gerador puro, sem persistência |
| Notificações | Modelo de elegibilidade, serviço, repositório, agendador e adaptador Web Push separado |
| Estilos | Catálogo estático, resolução/percentuais puros e leitura do catálogo padrão no repositório |

Rotas tratam HTTP, serviços coordenam casos de uso/transações e repositórios executam consultas. Modelos, schemas e geradores não dependem de rotas ou serviços. A comparação de sessões também teve suas consultas movidas ao repositório; filtros SQL ficam separados do schema de entrada. IDs acima do limite int4 agora recebem 400.

## Proteções permanentes

- Análise de sintaxe TypeScript de todos os módulos, inclusive futuros, sem lista de domínios migrados.
- Verificação de imports locais, reexports, dependências calculáveis, contratos somente de tipos e ciclos de execução no backend. Ciclos apenas de tipos não são tratados como ciclos de execução.
- Proibição de consultas/transações ou repositórios nas rotas, consultas fora de repositórios e transporte HTTP nas camadas inferiores.
- Sete testes do analisador verificam violações e código válido, inclusive comentários, strings, imports de tipos e arquivos de declaração.
- CI verifica fronteiras, tipos, testes API/site, builds produção/demo, jornadas e 14 cenários selecionados de concorrência em PostgreSQL real.

`db/` continua responsável por conexão, migrações, seed e mecanismos compartilhados de acesso à conta. A consulta de saúde em `app.ts` é infraestrutura da composição. Catálogos de programas e seed permanecem em seus locais compatíveis. O reexport de `STYLES` pela rota atende um teste de fotos existente; poderá sair quando esse consumidor for atualizado na etapa de frontend.

## Validação local

- 189 testes da API aprovados, incluindo falhas de envio, preferências inválidas, limpeza de inscrição renovada e encerramento do agendador.
- 27 testes da suíte completa de PostgreSQL real aprovados, incluindo infraestrutura, limites do pool, rollback, snapshots e concorrência de contas, programas, backup e push.
- Sete testes do analisador aprovados; verificação do repositório sem violações ou ciclos de execução detectados.
- 16 testes dos adaptadores HTTP/demonstração e da compatibilidade das fotos aprovados.
- Build TypeScript do backend e build da demonstração aprovados.
- 24 jornadas com Chrome/PostgreSQL real aprovadas, sem repetição ou testes instáveis; build de produção aprovado durante essa execução.

Esses grupos são distintos; reexecuções direcionadas não aumentam as contagens. Não foram alterados arquivos do frontend, endpoints, tabelas, dependências nem o catálogo estático de estilos.

## Limites e evolução posterior

1. Push externo e confirmação no banco não formam uma transação distribuída. Corridas de rodadas são coordenadas, mas queda/timeout com entrega incerta pode repetir a notificação. Cada envio de lembrete ocupa uma conexão durante a espera limitada a 15 segundos; o transporte abstrato pode concluir depois desse prazo. Preferências e sessões podem mudar durante o envio.
2. E-mails continuam sem fila durável; limitadores de abuso/importação são por instância. Melhorias operacionais exigem decisão própria e medição.
3. Backup v1 não restaura extras nem dados locais do navegador. Gravações normais não participam da trava exclusiva de importação; não existe controle otimista geral entre aparelhos.
4. Leituras de progresso mantêm as consultas existentes, sem snapshot global. Modelagem de estados, histórico de ciclos e políticas de conflitos permanecem decisões de produto.
5. Guardas estáticas não analisam todos os caminhos dinâmicos calculados e não substituem revisão humana ou testes de domínio.
6. Build demo ainda apresenta avisos de tamanho de chunks, fonte e dependências. Desempenho em aparelhos reais, acessibilidade e disponibilização de produção precisam de medição própria.

## Próximos passos

Após integrar esta entrega, o ciclo estrutural do backend fica encerrado. A sequência de frontend começa por validação/recuperação dos formatos locais de rascunho e fila, depois preparação do catálogo mínimo offline. Desempenho, acessibilidade e componentes devem evoluir com comparações mensuráveis, preservando fontes, paleta, pixel art, temas, quadra e placares retrô. Consulte [PLANO_DE_REFATORACAO.md](PLANO_DE_REFATORACAO.md).

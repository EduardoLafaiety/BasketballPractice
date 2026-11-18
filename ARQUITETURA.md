# Arquitetura do repositório

Atualizado em 18/11/2026. A organização mantém os diretórios `frontend`, `backend` e `e2e` para preservar os comandos, os locks de dependências e a configuração de publicação existentes.

## Mapa

```text
BasketballPractice/
├── frontend/src/
│   ├── app/                   # Composição, rotas e layout do aplicativo
│   ├── features/              # Funcionalidades e testes próximos do código
│   │   ├── autenticacao/      # Provider, guardas, contexto e telas de acesso
│   │   ├── conta/             # Preferências e operações da conta
│   │   ├── treinos/           # Catálogo, formulário e hooks de exercícios
│   │   ├── sessao/            # Execução, resumo, contadores e fila local
│   │   ├── rotina/            # Planejamento, geração semanal e duração
│   │   ├── programas/         # Programas e integração com a API
│   │   ├── evolucao/          # Comparação, conquistas e Overall
│   │   ├── demonstracoes/     # Motor didático 2D/3D e captura de movimento
│   │   └── ...                # Início, estilos, artigos, NBA, NBB etc.
│   ├── shared/
│   │   ├── api/               # Transporte HTTP e adaptação dos endpoints
│   │   ├── data/              # Cache, pedidos compartilhados e invalidação
│   │   ├── lib/               # Funções e recursos de navegador reutilizáveis
│   │   ├── ui/                # Primitivas visuais, ícones e estados de tela
│   │   └── types.ts           # Modelo de dados utilizado no frontend
│   ├── styles/               # Tokens e estilos retrô por área
│   ├── assets/               # Imagens e créditos
│   ├── demo/                 # Adaptador da API para PGlite no navegador
│   └── test/                 # Infraestrutura de testes do frontend
├── backend/src/
│   ├── modules/              # Endpoints organizados por domínio
│   │   ├── sessions/         # Rotas, schema, serviço, repositório e agregação
│   │   ├── programs/         # Schema, modelo de status, serviço, repositório e rotas
│   │   ├── plans/            # Rotas, schema, serviço, consulta e gerador puro
│   │   ├── exercises/        # Catálogo visível, validação, serviço e repositório
│   │   ├── routine/          # Rotas, schema, serviço e persistência da semana
│   │   ├── workouts/         # Contrato, serviço e persistência compartilhada de treinos
│   │   ├── data/             # Contrato v1, serviço, repositório e identidade do backup
│   │   └── ...
│   ├── db/                   # Conexão, migrações, catálogo e dados iniciais
│   ├── middleware/           # Autorização, limites e tratamento de erros
│   ├── lib/                  # Infraestrutura compartilhada
│   └── app.ts                # Composição HTTP e registro das rotas
├── contracts/                # Contratos de leitura compartilhados, sem runtime
├── e2e/
│   ├── testes/               # Jornadas com Chrome e Postgres real
│   └── audits/               # Capturas de aparência e recursos por tela
└── scripts/                  # Verificação de arquitetura
```

## Regras de dependência

1. `app` compõe as funcionalidades e o layout.
2. `features` utiliza `shared` e integrações explícitas com outras funcionalidades, sem importar a composição de `app`.
3. `shared` não importa `features` ou `app`.
4. A aplicação normal consome o backend por HTTP. Somente o adaptador de demonstração importa as rotas do servidor para executá-las no navegador.
5. No backend, rotas não importam outras rotas. Validações e operações reutilizadas ficam em schemas, serviços ou repositórios.
6. Serviços, repositórios e geradores não dependem dos arquivos de rota HTTP.
7. Contratos compartilhados são declarações de tipos, sem dependências de React, Express ou PostgreSQL.

`npm run check:architecture` verifica imports locais e as fronteiras acima. Em sessões, rotina, treinos, backup, exercícios, programas e planos, impede SQL/transações e acesso direto a repositórios nas rotas e SQL direto nos serviços. Schemas, serviços e repositórios não importam Express ou módulos HTTP do Node; repositórios não importam serviços; schemas não importam serviços ou repositórios; geradores não importam infraestrutura HTTP ou PostgreSQL. A mesma verificação está no CI. O script não substitui revisão de domínio ou detecta toda possível dependência dinâmica.

## Decisões da refatoração

- Exercícios possuem serviço para visibilidade, proteção do catálogo e tradução de referência em uso para conflito. Edição e exclusão bloqueiam o exercício e validam propriedade dentro da transação; SQL fica no repositório. As validações de referências reutilizadas pelos demais módulos continuam em `exercise.repository.ts`.
- Programas possuem schema HTTP, modelo de status sem acesso ao banco, serviço e repositório. Início/reinício, conclusão e saída usam a trava de progresso por conta. O serviço de sessão continua chamando a conclusão dentro da própria transação, preservando a atomicidade.
- Planos possuem serviço para carregar exercícios elegíveis e calcular a resposta, repositório para a projeção do catálogo e gerador puro. O algoritmo e a política de fallback não foram alterados. Testes do algoritmo importam o gerador diretamente, sem depender das rotas.

- O antigo store foi dividido em infraestrutura de cache e hooks das funcionalidades. Pedidos em andamento para a mesma chave são compartilhados. Logout e invalidação impedem respostas antigas de repopular o cache.
- O transporte HTTP é separado da adaptação dos endpoints. O arquivo `shared/api/backend.ts` continua sendo a fachada de integração; não é um componente de interface.
- Rotas e testes foram atualizados para os caminhos novos, sem manter cópias dos módulos antigos.
- Sessões, rotina, treinos, backup, exercícios, programas e planos seguem `rota → serviço → repositório`. Rotas validam entradas, obtêm a conta autenticada e devolvem HTTP; serviços coordenam regras e transações; repositórios executam SQL. Na edição de exercício, o serviço verifica propriedade antes de validar o corpo para preservar a precedência histórica de 403/404. Sessões mantêm a agregação de comparação em módulo próprio. Os demais módulos aprofundam essa separação por fluxo, sem criar camadas vazias.
- O schema de item de treino é reutilizado pelo contrato de backup. Edição, rotina e importação usam a mesma gravação de itens, com ordem, metas e notas preservadas. O contrato está em [CONTRATOS_BACKEND.md](CONTRATOS_BACKEND.md).
- O serviço de backup controla o limite de importações por instância, liberando vagas em `finally`. Importação, preferências e trava por conta ficam na mesma transação. A exportação usa `REPEATABLE READ READ ONLY` para obter um retrato consistente; as consultas dessa conexão são sequenciais.
- O schema de preferências fica separado do serviço para permitir reuso nos contratos sem depender de persistência. Reexports existentes do serviço permanecem compatíveis.
- A criação da sessão mantém validação, deduplicação e conclusão do programa na mesma transação. A edição bloqueia a sessão da conta e valida referências dentro da transação antes de substituir cabeçalho, entradas e zonas. O resultado é montado antes do commit; reenvios com chave estável não substituem o conteúdo confirmado.
- A rotina possui schema, serviço e repositório próprios; o serviço confirma a semana inteira em uma transação, mantendo IDs e representação legados. Não há nova tabela nem controle otimista de versão nesta etapa.
- A rotina ganhou um contrato de escrita de semana inteira. A persistência continua usando os treinos existentes para preservar backups, IDs e referências de sessões. A migração para tabelas exclusivas é uma decisão futura, não uma migração já realizada.
- A comparação de evolução é calculada no servidor; a página não baixa todas as sessões. Conquistas e Overall ainda utilizam seu histórico completo.
- A fila local guarda cada sessão em uma chave independente, em formato versionado. Lê a fila antiga e só remove o item confirmado. Quando disponível, Web Locks coordena envios entre abas; a deduplicação no servidor continua sendo a garantia final.
- A sessão possui modelo próprio e resumo de envio separado da execução. A extração de uma máquina de estados completa permanece uma evolução posterior.
- A conclusão offline permanece na tela já carregada. Um limite de erro por página preserva o layout e a fila quando uma rota ainda não disponível não pode ser baixada.
- Tokens de aparência foram extraídos preservando a cascata. Fontes, paleta, pixel art, temas, quadra e placares permanecem a referência visual.

## Operação

Os scripts da raiz encaminham os comandos para os pacotes, sem introduzir outro gerenciador de dependências:

```powershell
npm run dev:site
npm run dev:api
npm run check:architecture
npm run test:site
npm run test:api
npm run test:e2e
npm run build:site
npm run build:demo
```

As dependências continuam sendo instaladas em cada pacote conforme [DESENVOLVIMENTO.md](DESENVOLVIMENTO.md). `npm --prefix e2e run audit` registra as cinco telas principais em dois tamanhos e dois temas, com screenshots e contagem de recursos em diretório temporário do sistema. A auditoria usa o banco exclusivo dos testes E2E; não deve rodar simultaneamente com outra suíte que recrie esse mesmo banco.

Os logs temporários da refatoração foram removidos da raiz e não devem ser recriados nela. Resultados permanentes e limitações devem ser descritos no roadmap; dados brutos e capturas de validação ficam fora da árvore de código ou nos diretórios de teste ignorados.

## Referências

- [Regras de negócio](REGRAS_DE_NEGOCIO.md)
- [Histórico e roadmap](MUDANCAS_E_ROADMAP.md)
- [Plano de refatoração](PLANO_DE_REFATORACAO.md)

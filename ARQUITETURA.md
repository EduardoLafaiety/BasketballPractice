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
│   │   ├── sessions/         # Rotas, schema, repositório e agregação
│   │   ├── programs/         # Rotas e serviço de progressão
│   │   ├── plans/            # Rotas, schema e gerador
│   │   ├── routine/          # Salvamento atômico da semana
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

`npm run check:architecture` verifica imports locais e as fronteiras acima. A mesma verificação está no CI. O script não substitui revisão de domínio ou detecta toda possível dependência dinâmica.

## Decisões da refatoração

- O antigo store foi dividido em infraestrutura de cache e hooks das funcionalidades. Pedidos em andamento para a mesma chave são compartilhados. Logout e invalidação impedem respostas antigas de repopular o cache.
- O transporte HTTP é separado da adaptação dos endpoints. O arquivo `shared/api/backend.ts` continua sendo a fachada de integração; não é um componente de interface.
- Rotas e testes foram atualizados para os caminhos novos, sem manter cópias dos módulos antigos.
- Schemas e persistência de sessões e regras de programas foram extraídos das rotas. Os demais módulos podem aprofundar essa separação quando houver mudança concreta, sem criar camadas vazias.
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

As dependências continuam sendo instaladas em cada pacote conforme o README. `npm --prefix e2e run audit` registra as cinco telas principais em dois tamanhos e dois temas, com screenshots e contagem de recursos em diretório temporário do sistema. A auditoria usa o banco exclusivo dos testes E2E; não deve rodar simultaneamente com outra suíte que recrie esse mesmo banco.

Os logs temporários da refatoração foram removidos da raiz e não devem ser recriados nela. Resultados permanentes e limitações devem ser descritos no roadmap; dados brutos e capturas de validação ficam fora da árvore de código ou nos diretórios de teste ignorados.

## Referências

- [Regras de negócio](REGRAS_DE_NEGOCIO.md)
- [Histórico e roadmap](MUDANCAS_E_ROADMAP.md)
- [Plano de refatoração](PLANO_DE_REFATORACAO.md)

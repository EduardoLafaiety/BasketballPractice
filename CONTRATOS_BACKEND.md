# Contratos dos domínios de treino

Atualizado em 18/11/2026. Referências executáveis: `backend/src/modules/workouts/workout.schema.ts` e `backend/src/modules/data/backup.schema.ts`.

Exercícios, programas e planos utilizam seus próprios arquivos `exercise.schema.ts`, `program.schema.ts` e `plan.schema.ts` nos módulos correspondentes. A interface permanece compatível com os contratos existentes.

Os endpoints abaixo exigem autenticação. A conta vem do token validado pelo servidor, nunca de um `userId` enviado pelo cliente. A reorganização preserva os caminhos e os formatos existentes.

## Treinos — `/api/workouts`

| Operação | Resultado |
| --- | --- |
| GET `/` | Lista os treinos da conta, com `exerciseCount`, ordenados por atualização e ID decrescentes |
| GET `/:id` | Retorna treino e exercícios na ordem planejada; 404 se não pertencer à conta ou não existir |
| POST `/` | Cria o treino e seus itens juntos; retorna 201 com o registro |
| PUT `/:id` | Substitui cabeçalho e itens juntos; retorna 200 com a versão gravada |
| DELETE `/:id` | Remove o treino da conta; retorna 204, mantendo sessões históricas sem o vínculo |

Entrada de criação/edição:

```json
{
  "name": "Treino de controle",
  "description": "Prática individual",
  "exercises": [
    { "exerciseId": 1, "sets": 2, "targetSeconds": 300, "notes": "Manter controle" }
  ]
}
```

O ID do exemplo é ilustrativo: deve referenciar um exercício visível à conta.

| Campo | Regra |
| --- | --- |
| `name` | Texto sem espaços nas extremidades, entre 2 e 100 caracteres |
| `description` | Opcional/nulo, até 1.000 caracteres |
| `exercises` | Até 50 itens, preservando a ordem; ausente equivale a lista vazia |
| `exerciseId` | Inteiro positivo válido do banco; catálogo ou exercício próprio |
| `sets` | Opcional/nulo, inteiro de 1 a 100 |
| `targetReps` | Opcional/nulo, inteiro de 1 a 10.000 |
| `targetSeconds` | Opcional/nulo, inteiro de 1 a 86.400 |
| `notes` do item | Opcional/nulo, até 500 caracteres |

Criar e editar validam referências dentro da transação. A edição bloqueia o treino da conta antes de substituir seus itens e monta a resposta antes do commit. A última edição confirmada prevalece; não há controle otimista de versão. A rotina preserva a descrição legada `bp-rotina:<dia>`.

## Backup — `/api/data`

GET `/export` retorna JSON com `Content-Disposition: attachment` e nome `basketball-practice-AAAA-MM-DD.json`. Todas as leituras usam uma transação somente de leitura com isolamento `REPEATABLE READ`, incluindo preferências e extras. Assim, uma edição concorrente não mistura versões dentro do arquivo.

POST `/import` aceita o formato abaixo. Não houve mudança de versão:

```json
{
  "format": "basketball-practice",
  "version": 1,
  "exercises": [],
  "workouts": [],
  "sessions": []
}
```

| Parte | Contrato |
| --- | --- |
| `format` / `version` | Exatamente `basketball-practice` e `1`; formatos desconhecidos retornam 400 |
| `exercises` | Até 500 exercícios pessoais; IDs do arquivo são remapeados para a conta de destino |
| `workouts` | Até 500 treinos; cada um usa os mesmos limites de metas e notas do contrato de treinos |
| Referência de exercício | `exerciseName` obrigatório; `exerciseId` opcional/nulo aponta para exercícios incluídos no arquivo, não para IDs arbitrários da conta de destino |
| `sessions` | Até 20.000 sessões, cada uma com até 100 entradas; conteúdo validado pelas regras de sessão após remapeamento |
| `settings` | Opcional; validado pelo contrato de preferências e gravado na mesma transação |
| `exportedAt` | Informativo na exportação; não define identidade nem ordem de importação |
| `extras` | Exporta desafios diários, quiz e progresso de programas; a importação atual não restaura essa seção |

Listas principais ausentes recebem `[]`. Um treino no arquivo precisa informar sua lista `exercises`. A API limita o corpo de importação a 10 MB e também valida o total de itens e caracteres inválidos.

### Reaproveitamento e atomicidade

- Exercícios são resolvidos pelo ID remapeado do arquivo ou pelo nome, sem diferenciar maiúsculas. Catálogo tem precedência no índice por nome, conforme o comportamento legado.
- Treino com mesmo nome e descrição é reaproveitado na conta; seus itens são substituídos, mantendo o ID e os vínculos históricos. Homônimos com descrições diferentes permanecem distintos.
- O vínculo de uma sessão com treino é resolvido por `workoutName` entre os treinos importados. Sem correspondência, o vínculo fica nulo. Se houver nomes iguais com descrições diferentes no arquivo, prevalece o último nome mapeado: é um limite do formato v1.
- A deduplicação de sessões compara instante, duração, esforço, cansaço, notas, entradas e zonas. Mantém ordem e multiplicidade: duas sessões idênticas no arquivo podem representar duas sessões distintas; reimportar o mesmo conjunto não cria uma terceira.
- Cabeçalho, exercícios, treinos, sessões e preferências são confirmados juntos ou integralmente desfeitos. Dados existentes fora dos registros reaproveitados permanecem preservados.
- A trava de importação é por conta, inclusive entre instâncias. O limite de importações em andamento é por instância, com padrão 2. Quando cheio, responde 503 com `Retry-After: 30`; a vaga é liberada mesmo se houver falha.

Resposta de importação:

```json
{
  "created": { "exercises": 0, "workouts": 0, "sessions": 0 },
  "skipped": { "sessions": 0 }
}
```

O backup v1 não é uma cópia integral restaurável do banco: não restaura extras, credenciais, rascunhos/fila do navegador ou chaves de deduplicação de envio. A ausência de extras restaurados não significa que foram apagados na conta de destino. Mudanças dessas regras exigem evolução explícita do contrato e migração.

## Exercícios — `/api/exercises`

| Operação | Contrato |
| --- | --- |
| GET `/` | Catálogo padrão e exercícios próprios, ordenados por categoria e nome; filtros opcionais `category` e `level` |
| GET `/:id` | Retorna exercício visível; 404 para ausente ou pertencente a outra conta |
| POST `/` | Cria exercício próprio; 201 com o registro |
| PUT `/:id` | Edita exercício próprio; 200 com o registro; catálogo protegido com 403 |
| DELETE `/:id` | Remove exercício próprio; 204; catálogo retorna 403, exercício referenciado por treino ou sessão retorna 409 |

Entrada: `name` com 2–100 caracteres após trim, `category`, `metric` e `description` opcional/nula com até 1.000 caracteres. Categorias: `arremesso`, `drible`, `passe`, `finalizacao`, `defesa`, `condicionamento`. Métricas: `acertos`, `repeticoes`, `tempo`.

A resposta inclui `id`, nome, categoria, métrica, descrição, `level`, `warmup`, `position` e `custom`, sem expor `ownerId`. Nível, aquecimento e posição do catálogo não são campos editáveis por este contrato. O filtro `level` faz correspondência exata; exercícios próprios sem nível não aparecem quando esse filtro está preenchido.

Edição e exclusão verificam propriedade dentro da transação, com bloqueio do registro. As FKs continuam sendo a garantia final contra excluir um exercício referenciado. Exercícios de outra conta retornam 404, sem revelar seu conteúdo.

## Programas — `/api/programs`

| Operação | Contrato |
| --- | --- |
| GET `/` | Programas definidos pelo produto, com resumo e status da conta |
| GET `/:id` | Resumo, status e dias com título, estado, conclusão e blocos do catálogo padrão |
| POST `/:id/start` | Inicia ou reinicia; 201 com progresso zerado; reiniciar remove as conclusões anteriores |
| POST `/:id/days/:day/complete` | Conclui o próximo dia; 201 com status; corpo opcional `{ "sessionId": 1 }` vincula uma sessão da própria conta |
| DELETE `/:id` | Remove o progresso da conta; 204; ausência de progresso retorna 404 |

ID de programa: texto de até 60 caracteres; dia: inteiro de 1 a 366, limitado na prática à sequência definida pelo programa. Programas atuais têm 28 ou 30 dias. Consultas e operações de início/conclusão aceitam `tzOffset` na query, entre -840 e 840 minutos, padrão 0, no formato `Date.getTimezoneOffset()`.

Sem início, o status contém `started: false`, `total` e `done: 0`. Após início, inclui `startedOn`, `finished`, `nextDay` e `availableToday`. Estados dos dias: `done`, `available`, `tomorrow` e `locked`. O programa detalhado resolve exercícios apenas pelo catálogo padrão; homônimos pessoais não substituem seus blocos.

A conclusão exige início, próximo dia da sequência e disponibilidade na data local; violações retornam 409. Sessão inexistente ou de outra conta retorna 404. Uma data permite no máximo uma conclusão em cada programa, não um limite global para todos os programas.

Início/reinício, conclusão e saída usam a mesma trava transacional por conta. Uma conta não bloqueia a progressão de outra. A data local de uma gravação é calculada depois de adquirir essa trava; o início usa a mesma data na gravação e na resposta. Falha ao reiniciar preserva o progresso e os vínculos anteriores. A conclusão integrada ao registro de sessão continua na transação dessa sessão.

Excluir uma sessão vinculada não reabre o dia concluído. Reiniciar ou sair do programa não apaga sessões históricas.

## Planos — `/api/plans/generate`

POST com entrada:

| Campo | Regra |
| --- | --- |
| `minutes` | Inteiro de 10 a 180 |
| `focus` | Até seis categorias válidas; padrão `[]`, que considera todas |
| `level` | Opcional: `iniciante`, `intermediario` ou `avancado` |
| `warmup` | Booleano, padrão `true` |
| `seed` | Inteiro opcional para reprodução do sorteio |
| `exclude` | Até 500 inteiros; padrão `[]`; evita repetição quando há alternativas |

Resposta 200: `{ "minutes": 30, "blocks": [...] }`; cada bloco contém `exerciseId`, `name`, `category`, `metric` e `minutes`. A lista vem somente do catálogo e dos exercícios próprios da conta, ordenada por ID antes do gerador. Mesma lista e mesmas opções com a mesma semente produzem o mesmo plano.

O algoritmo permanece o existente: aquecimento precede a parte principal, respeita as opções disponíveis e a progressão do catálogo; exercícios próprios sem nível servem aos níveis solicitados. Ausência de opções no foco pode ampliar a seleção conforme o fallback legado. `exclude` é uma preferência, não uma proibição absoluta. Sem nenhum exercício visível, retorna 400. Gerar um plano não persiste treino ou sessão.

## Autenticação — `/api/auth`

Schemas em `auth.schema.ts`; casos de uso em `auth.service.ts`; persistência em `auth.repository.ts`.

| Operação | Entrada e resultado |
| --- | --- |
| POST `/register` | `name`, `email`, `password`; 202 com mensagem genérica, sem autenticar; e-mail de ativação preparado após a resposta |
| POST `/confirm` | `token`, `password` escolhida no cadastro; 201 com sessão após consumir o link |
| POST `/login` | `email`, `password`; 200 com sessão ou 401 com mensagem genérica de credenciais incorretas |
| POST `/forgot-password` | `email`; 202 com mensagem genérica, independentemente de existir conta |
| POST `/reset-password` | `token`, `password` nova; 200 com sessão, consumindo o link e revogando acessos anteriores |
| GET `/me` | Autenticado; 200 com usuário público |
| POST `/logout` | Autenticado; 204, revogando a versão atual da conta em todos os aparelhos |
| PUT `/password` | Autenticado; `currentPassword`, `newPassword`; 200 com sessão renovada |
| DELETE `/me` | Autenticado; `password` atual; 204, excluindo a conta e seus dados; único administrador retorna 409 |

Nome de cadastro: 2–80 caracteres após trim. E-mail é normalizado por trim e minúsculas. Senhas novas possuem 8–128 caracteres e seguem a política existente contra senhas óbvias. Login mantém compatibilidade com senhas antigas fracas. A senha atual informada na confirmação, troca ou exclusão aceita até 1.024 caracteres; senha incorreta nesses fluxos retorna 403, preservando o tratamento de sessão expirada reservado ao 401.

Uma sessão contém `{ "token": "...", "user": { ... } }`. O usuário público possui somente `id`, `name`, `email`, `isAdmin` e `createdAt`; hash de senha e `tokenVersion` não são expostos nesse objeto. O JWT carrega a versão usada pela validação de revogação.

Ativação vale por 24 horas e exige a senha escolhida no cadastro. Recuperação vale por 30 minutos. Tokens de link são guardados como hash; consumo único e atualização de conta são transacionais. A conta é bloqueada antes de consumir links de recuperação, seguindo a mesma ordem da troca de senha. Falha na gravação desfaz senha e versão de acesso juntas.

O login verifica novamente, sob bloqueio, se o hash ainda é o mesmo que foi autenticado. Se a senha mudou durante a verificação, não assina um token da versão nova usando a credencial antiga. A troca e a exclusão verificam a senha atual dentro da transação; duas trocas simultâneas não podem usar novamente a senha anterior.

Os limitadores de IP, conta, senha atual e envio de e-mail continuam em memória por instância. O serviço recebe uma função para controlar envio e um rastreador opcional de tarefas; não depende de Express ou do middleware de rate limit. A resposta 202 não garante entrega de e-mail: indisponibilidade do provedor ou encerramento do processo pode impedir o envio.

## Administração — `/api/admin/users`

Todas as operações exigem autenticação e papel administrativo no servidor.

| Operação | Resultado |
| --- | --- |
| GET `/` | Usuários com identidade pública, quantidades de treinos/sessões e data da última sessão |
| PATCH `/:id` | Corpo `{ "isAdmin": true }` ou `false`; 200 com resumo atualizado; alvo inexistente retorna 404 |
| DELETE `/:id` | Remove a conta e seus dados em transação; 204 ou 404 para alvo inexistente |

Alterar o próprio papel ou excluir a própria conta pelo painel retorna 400. Operações de escrita obtêm uma trava comum de composição administrativa e revalidam o papel do autor dentro da transação: um pedido que perdeu a permissão enquanto aguardava retorna 403. A exclusão pessoal usa a mesma trava, impedindo que remoções cruzadas deixem o sistema sem administrador.

A ferramenta operacional `npm run admin -- email [--remover]` usa a mesma coordenação. Pode criar o primeiro administrador, mas recusa remover o papel do último, com erro e código de saída não zero. Ela continua exigindo acesso direto à configuração do servidor/banco, sem novo endpoint público. Escritas SQL externas que ignoram esse protocolo não recebem essa garantia.

## Preferências — `/api/settings`

GET `/` retorna preferências da conta; PUT `/` valida e substitui o objeto, respondendo 200 com os valores aplicados. Campos omitidos no PUT recebem padrões, não os valores anteriores. A conta é sempre obtida do token.

| Campo | Regra e padrão |
| --- | --- |
| `theme` | `sistema`, `claro` ou `escuro`; padrão `sistema` |
| `reminders.enabled` | Booleano, padrão `false` |
| `reminders.time` | Horário `HH:MM`, padrão `18:00` |
| `reminders.days` | Até sete inteiros de 0 a 6; padrão segunda a sexta `[1,2,3,4,5]` |
| `metronomeBpm` | Inteiro de 30 a 240, padrão 90 |

Leitura de um objeto persistido inválido retorna o conjunto de padrões. Schema, serviço e repositório são independentes do transporte; a escrita aceita a conexão da transação, preservando a atomicidade da importação de backup e a leitura do snapshot de exportação.

## Notificações — `/api/push`

As quatro operações abaixo exigem autenticação, inclusive a configuração.

| Operação | Entrada e resultado |
| --- | --- |
| GET `/config` | 200 com `{ enabled, publicKey }`; chave nula quando desabilitado |
| POST `/subscriptions` | `{ endpoint, keys: { p256dh, auth }, tzOffset? }`; 201 com `{ subscribed: true }` |
| DELETE `/subscriptions` | `{ endpoint }`; remove somente inscrição da conta; 204 ou 404 |
| POST `/test` | 200 com `{ sent }`; 404 se nenhum envio foi confirmado; 503 se desabilitado |

Endpoint de inscrição: URL HTTPS de até 1.000 caracteres. Chaves: base64url de até 200 caracteres. `tzOffset`: inteiro entre -840 e 840, padrão zero, no formato `Date.getTimezoneOffset()`. Inscrição desabilitada retorna 503 antes de validar o corpo. A exclusão exige texto de endpoint de até 1.000 caracteres.

Limite de dez endpoints por conta, com contagem e upsert na mesma transação sob trava por conta. Atualizar endpoint existente não consome vaga. Endpoint é único globalmente: reinscrição pode transferi-lo de conta. Falha de um provedor/aparelho não impede o processamento dos seguintes. Uma resposta 404/410 do provedor remove somente a versão da inscrição usada no envio.

POST `/api/push/run` é separado da autenticação de usuário e exige `x-cron-secret` igual a `PUSH_CRON_SECRET`. Segredo ausente/incorreto ou envio desabilitado retorna 404; sucesso retorna `{ due, sent }`. `due` conta candidatos iniciais, não entregas garantidas. Cron e agendador interno usam o mesmo serviço, com trava transacional não bloqueante por aparelho e nova verificação de elegibilidade. Contas diferentes continuam independentes.

Elegibilidade: lembretes habilitados, dia selecionado e janela de 30 minutos após o horário local, sem sessão naquela data e sem confirmação anterior do aparelho na data. Configuração persistida inválida é ignorada. Sucesso confirma a data; falha preserva nova tentativa. Preferências e sessões podem mudar depois da verificação, durante o envio externo; não há bloqueio global dessas operações.

Espera do serviço limitada a 15 segundos por envio; adaptador Web Push com dez segundos de inatividade de socket e TTL de seis horas. O timeout do serviço não cancela necessariamente o transporte injetado. O banco mantém uma conexão/transação durante o envio do lembrete. Uma queda entre envio externo e commit, ou timeout com entrega incerta, pode produzir repetição posterior; não há garantia de entrega única. Encerramento aguarda o item atual e preserva os restantes.

## Estilos de jogo — `/api/styles`

Ambas as consultas exigem autenticação e usam `Cache-Control: private, max-age=300` em respostas de sucesso.

| Operação | Resultado |
| --- | --- |
| GET `/` | Lista de `id`, `name`, `group`, `archetype`, `moveCount`, `minutes` e `mix` |
| GET `/:id` | Estilo completo com altura, ritmo, resumo, mentalidade, movimentos resolvidos, sessão, minutos e percentuais |

ID: uma a 60 letras minúsculas/hífens; formato inválido retorna 400, estilo inexistente retorna 404. Grupos: `guard`, `forward`, `center`. Catálogo estático preservado integralmente; exercícios resolvidos apenas entre registros padrão, ordenados por ID. Movimento sem referência tem `exercise: null`; não entra nos blocos de sessão. Minutos e percentuais consideram somente os blocos resolvidos, incluindo aquecimento e desaquecimento quando disponíveis. O cálculo de percentuais e a ordem histórica permanecem iguais. Consultar não cria treino ou sessão.

## Ajuste final de comparação de sessões

O filtro `exerciseId` de GET `/api/sessions/comparison` aceita inteiro positivo até 2.147.483.647, compatível com a chave PostgreSQL. Valores superiores retornam 400 antes de executar SQL. As janelas de sete/30 dias e o formato da resposta permanecem iguais.

## Tipos compartilhados de leitura — frontend 5 a 8

Os DTOs já consumidos pela fachada central estão em contracts/api.d.ts; métrica, nível e zona ficam em contracts/primitivos.d.ts. O frontend importa declarações e mantém suas conversões em shared/api/mapeamento.ts. Exercícios e preferências também verificam o contrato na compilação do backend. São tipos estáticos, sem biblioteca de runtime ou alteração das respostas HTTP.

AbortSignal é uma opção do transporte do cliente para consultas. Não modifica endpoints, transações, idempotência ou política de repetição no servidor. A rotina continua usando PUT /api/routine e o fallback legado descrito neste documento. Movimentar um exercício usa a mesma escrita da semana e preserva seus minutos.

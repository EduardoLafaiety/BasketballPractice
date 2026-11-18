# Contratos de treinos e backup

Atualizado em 18/11/2026. Referências executáveis: `backend/src/modules/workouts/workout.schema.ts` e `backend/src/modules/data/backup.schema.ts`.

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

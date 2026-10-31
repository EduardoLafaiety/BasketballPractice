# Basketball Practice — Backend

API REST do Basketball Practice: Node.js 22.13+ (testado no 24), TypeScript, Express 5, PostgreSQL (`pg`) e Zod.

## Como rodar

```bash
npm install
cp .env.example .env   # ajuste JWT_SECRET
npm run db:up          # sobe o Postgres no Docker (porta 5433)
npm run dev            # http://localhost:3333/api
```

Em produção (`NODE_ENV=production`), a API não sobe se `JWT_SECRET` estiver vazio, tiver menos de 32 caracteres ou for o valor de `.env.example`. Gere um com `openssl rand -hex 32`.

Ao iniciar, a API aplica as migrações pendentes e popula o catálogo padrão de exercícios. Para usar outro Postgres, mude `DATABASE_URL` no `.env`.

| Script | O que faz |
| --- | --- |
| `npm run dev` | Servidor com reload automático |
| `npm test` | Testes de integração (Postgres em memória via PGlite, sem Docker) |
| `TEST_POSTGRES_URL=postgres://basketball:basketball@localhost:5433/postgres npm test` | Inclui `test/postgres.test.ts`, que cria e apaga um banco próprio para testar o que o PGlite não reproduz: queda de conexão, travas e códigos de erro reais |
| `npm run db:up` / `db:down` | Sobe / para o container do Postgres (os dados ficam no volume `postgres-data`) |
| `npm run db:psql` | Abre o `psql` no banco de desenvolvimento |
| `npm run build` / `npm start` | Compila para `dist/` e roda a versão compilada |

O frontend (Vite) já faz proxy de `/api` para `http://localhost:3333`.

## Autenticação

`POST /api/auth/register` ou `POST /api/auth/login` retornam `{ token, user }`. Envie o token nas demais rotas:

```
Authorization: Bearer <token>
```

## Rotas

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/api/health` | Status da API |
| POST | `/api/auth/register` | `{ name, email, password }` |
| POST | `/api/auth/login` | `{ email, password }` |
| GET | `/api/auth/me` | Usuário logado |
| GET | `/api/exercises?category=` | Catálogo padrão + exercícios do usuário |
| GET/PUT/DELETE | `/api/exercises/:id` | Só exercícios próprios podem ser alterados |
| POST | `/api/exercises` | `{ name, category, metric, description? }` |
| GET/POST | `/api/workouts` | Modelos de treino |
| GET/PUT/DELETE | `/api/workouts/:id` | PUT substitui a lista de exercícios |
| GET | `/api/sessions?from=&to=&tzOffset=&limit=&offset=` | Treinos realizados, já com `notes`, `entries` (como no detalhe) e os totais `entryCount`, `makes`, `attempts` |
| POST | `/api/sessions` | Registra um treino realizado |
| GET/PUT/DELETE | `/api/sessions/:id` | |
| GET | `/api/stats/summary?from=&to=&tzOffset=` | Totais, aproveitamento de arremesso, por exercício e por semana |

**Período e fuso:** `from` e `to` (inclusivos) aceitam `AAAA-MM-DD` ou um ISO com horário (vale o instante exato).
`tzOffset` é a diferença do fuso do cliente em minutos, como `Date.getTimezoneOffset()` (Brasília = `180`, de -840 a 840):
com ele, `AAAA-MM-DD` é o dia local e as semanas de `byWeek` começam na segunda-feira local. Sem ele, vale UTC.

**Categorias:** `arremesso`, `drible`, `passe`, `finalizacao`, `defesa`, `condicionamento`
**Métricas:** `acertos` (makes/attempts), `repeticoes` (reps), `tempo` (seconds)

### Exemplos de corpo

Treino (`POST /api/workouts`):

```json
{
  "name": "Arremesso de segunda",
  "description": "Foco em lance livre",
  "exercises": [
    { "exerciseId": 1, "sets": 5, "targetReps": 10 },
    { "exerciseId": 7, "targetSeconds": 120 }
  ]
}
```

Treino realizado (`POST /api/sessions`):

```json
{
  "workoutId": 1,
  "performedAt": "2026-10-23",
  "durationMinutes": 60,
  "rating": 4,
  "notes": "Mão fraca melhorando",
  "entries": [
    { "exerciseId": 1, "attempts": 50, "makes": 41 },
    { "exerciseId": 7, "seconds": 120 }
  ]
}
```

`GET /api/health` responde 503 quando o banco está fora do ar.

Erros seguem o formato `{ "error": "mensagem", "details": { ... } }`. Consulta longa demais, pool cheio ou conexão caída respondem 503 com `Retry-After`.

Limites (ajustáveis no `.env`, por instância da API):

| Variável | Padrão | O que limita |
| --- | --- | --- |
| `AUTH_ATTEMPTS` | 10 | Tentativas erradas de login e cadastro por IP, a cada 15 minutos |
| `ACCOUNT_ATTEMPTS` | 20 | Senhas erradas por conta, de qualquer IP, a cada 15 minutos |
| `REGISTRATIONS_PER_HOUR` | 30 | Contas criadas por IP, a cada hora |
| `MAX_IMPORTS` | 2 | Importações de backup ao mesmo tempo; as demais recebem 503 com `Retry-After` |

## Estrutura

```
src/
  app.ts            montagem do Express e das rotas
  server.ts         ponto de entrada
  config.ts         variáveis de ambiente
  db/               pool do Postgres, migrações (tabela schema_migrations) e seed
  lib/              senha (scrypt), JWT, validação, erros HTTP
  middleware/       autenticação e tratamento de erros
  routes/           auth, exercises, workouts, sessions, stats
test/               testes de integração com node:test + PGlite (e Postgres real, com TEST_POSTGRES_URL)
```

Para mudar o schema, adicione uma nova entrada no fim do array em `src/db/migrations.ts`. Não edite as migrações que já existem.

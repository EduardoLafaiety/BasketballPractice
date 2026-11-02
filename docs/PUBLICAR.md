# Publicar o Basketball Practice

Como colocar o app de verdade no ar, com contas, API e banco. A demonstração do GitHub Pages continua como está: ela roda tudo no navegador e não guarda nada em servidor.

## Onde cada parte fica

| Parte | Serviço | Plano | Custo |
|---|---|---|---|
| Site (React) | [Cloudflare Pages](https://pages.cloudflare.com) | Free | R$ 0 |
| API (Express) | [Render](https://render.com) | Free | R$ 0 |
| Banco (Postgres) | [Neon](https://neon.com) | Free (0,5 GB) | R$ 0 |
| E-mails de ativação e de senha | [Resend](https://resend.com) | Free | R$ 0 |
| Domínio | [Registro.br](https://registro.br) (`.com.br`) ou outro | — | cerca de R$ 40 por ano |

Por que esses:

- **Cloudflare Pages** permite uso comercial no plano grátis. O GitHub Pages não deve ser usado para um negócio ou SaaS, e o plano grátis da Vercel é só para projetos pessoais.
- **Render Free** dorme depois de 15 minutos sem visitas, e a primeira visita depois disso espera cerca de 1 minuto. Para um beta isso basta. Com usuários de verdade, troque para o plano **Starter** (cerca de US$ 7 por mês), que não dorme.
- **Neon** guarda o banco de graça e sem prazo. O Postgres grátis do Render apaga o banco depois de 30 dias.

> Antes de contratar, confira os preços nos sites: eles mudam com frequência.

## Antes de começar

- Uma conta no GitHub com acesso a este repositório.
- O domínio comprado, de preferência. Sem ele o site funciona nos endereços `*.pages.dev` e `*.onrender.com`, mas o Resend só envia e-mail para você mesmo, e ninguém mais consegue ativar a conta.

## 1. Banco no Neon

1. Crie a conta e um projeto. Escolha **Postgres 17** e a região **AWS US East 1 (N. Virginia)**, a mesma da API.
2. Em **Connect**, desligue a opção **Connection pooling** e copie a connection string. Ela começa com `postgresql://` e **não** tem `-pooler` no endereço.
   A API configura o fuso horário (UTC) ao abrir cada conexão, e o pooler do Neon não aceita essa configuração.
   Se a string tiver `sslmode=require`, troque por `sslmode=verify-full`. A proteção é a mesma (é o que o driver já faz), e some um aviso no log.
3. Guarde essa string: ela é a senha do banco. Nunca a coloque no git.

As tabelas são criadas sozinhas quando a API sobe pela primeira vez.

## 2. API no Render

1. Crie a conta entrando com o GitHub.
2. Clique em **New → Blueprint** e escolha este repositório. O Render lê o [render.yaml](../render.yaml) e cria o serviço `basketball-practice-api`.
3. Ele vai pedir os valores que ficam fora do git:

| Variável | O que colocar |
|---|---|
| `DATABASE_URL` | A string do Neon (passo 1) |
| `CORS_ORIGIN` | O endereço do site, sem barra no fim. Ex.: `https://basketballpractice.com.br` ou `https://basketball-practice.pages.dev` |
| `APP_URL` | O mesmo endereço do site. Ele vai nos links dos e-mails |
| `EMAIL_FROM` | Quem envia. Ex.: `Basketball Practice <nao-responda@basketballpractice.com.br>` |
| `RESEND_API_KEY` | A chave do Resend (passo 4). Se ainda não tiver, ponha `pendente` e troque depois |
| `GNEWS_API_KEY` | Opcional. Vazia, a barra de notícias mostra só as manchetes do admin |

O `JWT_SECRET` é gerado pelo próprio Render; não precisa digitar.

4. Espere o deploy terminar e abra `https://<endereço-da-api>.onrender.com/api/health`. Deve aparecer `"status":"ok"`.

Daqui em diante, cada merge na `main` publica a API sozinho.

## 3. Site no Cloudflare Pages

1. Crie a conta. Em **Workers & Pages → Create → Pages → Connect to Git**, escolha este repositório.
2. Configure o build assim:

| Campo | Valor |
|---|---|
| Production branch | `main` |
| Framework preset | None |
| Build command | `npm ci --prefix backend && npm ci --prefix frontend && npm run build --prefix frontend` |
| Build output directory | `frontend/dist` |
| Root directory | deixe vazio |

O build do site também instala o `backend`: o catálogo de exercícios fica lá, e o site o importa.

3. Em **Environment variables**, adicione:

| Variável | Valor |
|---|---|
| `VITE_API_URL` | O endereço da API terminado em `/api`. Ex.: `https://basketball-practice-api.onrender.com/api` |
| `NODE_VERSION` | `22` |

4. Salve e espere o deploy. Se o endereço final do site for diferente do que você pôs em `CORS_ORIGIN` e `APP_URL` no Render, corrija lá. O Render republica sozinho ao salvar.

O Cloudflare entende o site como app de página única: links diretos como `/metas` abrem normalmente.

## 4. E-mails no Resend

1. Crie a conta. Em **Domains → Add domain**, adicione o seu domínio.
2. O Resend mostra alguns registros DNS (SPF, DKIM). Copie cada um para o painel onde o domínio está (Registro.br, Cloudflare etc.) e espere a verificação.
3. Em **API Keys**, crie uma chave com permissão só de envio.
4. No Render, troque `RESEND_API_KEY` pela chave e confira se o `EMAIL_FROM` usa o domínio verificado.

Sem esse passo, ninguém consegue ativar conta nova.

## 5. Domínio próprio (opcional, mas recomendado)

- **Site:** no Cloudflare Pages, em **Custom domains**, adicione `basketballpractice.com.br`.
- **API:** no Render, em **Settings → Custom Domains**, adicione `api.basketballpractice.com.br`.
- Depois, atualize os endereços:
  - no Cloudflare: `VITE_API_URL` = `https://api.basketballpractice.com.br/api` (faça um novo deploy para valer);
  - no Render: `CORS_ORIGIN` e `APP_URL` = `https://basketballpractice.com.br`.

## 6. Primeira conta e admin

1. Abra o site, crie a sua conta e ative pelo e-mail.
2. No seu computador, dentro da pasta `backend`, rode no PowerShell, usando a string do Neon:

```powershell
$env:DATABASE_URL="postgresql://..."; npm run admin -- seu@email.com
```

No plano grátis o Render não tem terminal, por isso o comando roda na sua máquina, apontando para o banco do Neon.

## Conferência final

- [ ] `/api/health` responde `"status":"ok"`.
- [ ] O site abre, e um link direto (ex.: `/treinos`) também abre.
- [ ] Cadastro: o e-mail de ativação chega, e o link ativa a conta.
- [ ] "Esqueci a senha" envia o e-mail, e a nova senha funciona.
- [ ] A sua conta entra em `/admin`.

## Quando crescer

- **A API demora para acordar:** troque o plano no Render para Starter.
- **O banco passou de 0,5 GB**, ou a API passou a ficar acordada o tempo todo: veja os planos pagos do Neon. O plano grátis tem um limite de horas de processamento por mês, e o banco só "dorme" quando a API dorme.
- **Backup:** o plano grátis do Neon guarda pouco histórico para restauração. Antes de ter usuários pagantes, passe para um plano pago ou agende um `pg_dump` periódico.

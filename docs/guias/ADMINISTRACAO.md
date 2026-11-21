# Gestão de usuários

O painel fica em `/admin`. O login é o mesmo `/entrar` usado pelo site. Administradores têm acesso ao conteúdo sem assinatura; contas comuns continuam sujeitas ao período pago confirmado pelo servidor.

Em produção, o papel `is_admin` só é efetivo para as contas responsáveis definidas em `backend/src/lib/admin-owners.ts`. Ter o e-mail na lista não concede o papel: as contas precisam de provisionamento no servidor. Cadastro público, preferências, campos de pagamento ou alteração de nome não concedem administração. O painel não oferece promoção de outras contas.

## Preparar as contas no servidor

Execute a ferramenta operacional com acesso ao banco correto. Ela recebe por entrada padrão um JSON que associa os dois e-mails às respectivas senhas (20 a 128 caracteres). Não coloque senhas nos argumentos do terminal, no frontend ou em arquivos versionados.

Desenvolvimento, a partir de `backend/`, no PowerShell:

```powershell
Get-Content -Raw data/admin-credentials.json | npm run admin:owners
```

Servidor com build já gerado:

```text
node dist/scripts/provision-admins.js
```

Forneça o JSON pela entrada padrão de um canal privado do servidor. A ferramenta cria as duas contas em uma transação e armazena somente hashes scrypt. Executá-la novamente com as mesmas senhas não revoga sessões. Se uma conta já existir com senha diferente, ela recusa a mudança e desfaz toda a transação; `--reset-existing` autoriza explicitamente substituir a senha e revoga os tokens anteriores e links de recuperação dessa conta. O resultado não imprime senhas.

O arquivo privado local `backend/data/acessos-administradores.md` contém as credenciais geradas. `backend/data/` é ignorado pelo Git. Elas não estão automaticamente instaladas em produção.

## Operações

- Buscar contas por nome/e-mail, filtrar administradores, assinantes, contas sem assinatura ou bloqueadas e consultar detalhes.
- Editar o nome sem mudar o e-mail ou as credenciais da pessoa.
- Bloquear/desbloquear acesso, revogando os tokens existentes. Bloqueio impede login e acesso à API; recuperação de senha não remove o bloqueio.
- Encerrar todas as sessões exige um novo login. O produto usa tokens revogáveis por versão, sem contagem individual de dispositivos; o painel não inventa um número de sessões ativas.
- Excluir conta após confirmação explícita na interface. O servidor impede excluir contas com cobrança ainda aberta. O registro administrativo da exclusão permanece com referência ao alvo anulada, sem copiar dados pessoais.
- Consultar até 20 alterações administrativas recentes por conta, com responsável e data.

Bloquear uma conta não cancela cobranças nem altera pagamentos. As contas responsáveis são protegidas contra bloqueio, edição por outro administrador, encerramento de sessões e exclusão pelo painel. Na configuração de produção, também são protegidas contra exclusão pessoal.

## Prévia local

Com as credenciais locais preparadas, rode em `backend/`:

```text
npx tsx test/preview-admin.ts
```

A prévia usa PGlite em memória e somente as duas contas responsáveis. Não cria atletas, treinos, sessões ou pagamentos de exemplo. A lista de usuários comuns inicia vazia; as contas responsáveis aparecem no filtro Administradores. A API escuta somente em `127.0.0.1:3340`. Configure `API_PROXY=http://127.0.0.1:3340` no processo Vite e entre pelo login normal. Não acessa dados nem inicia cobranças em produção. Fechar o processo descarta o banco local. Não use essa prévia como servidor publicado.

`ADMIN_OWNERS_ONLY=true` reproduz a restrição de responsáveis em desenvolvimento. Em produção a restrição é obrigatória mesmo se essa variável estiver ausente ou desligada. Testes existentes de papéis genéricos continuam disponíveis no ambiente isolado de desenvolvimento.

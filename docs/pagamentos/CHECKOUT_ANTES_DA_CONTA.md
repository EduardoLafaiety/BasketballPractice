# Pagamento antes do cadastro

O novo cliente segue: landing → plano e e-mail de acesso → Mercado Pago → confirmação do pagamento → criar conta ou entrar → plataforma. O checkout não cria usuários, senhas ou sessões de autenticação.

## Identidade e confirmação

- `POST /api/billing/purchase` é público, limitado por IP, e aceita somente plano, modo de pagamento, e-mail e uma chave aleatória de 256 bits. O preço e a duração continuam definidos no servidor: R$ 15 por mês ou R$ 150 por ano.
- A assinatura é persistida antes de chamar o provedor, inicialmente sem `user_id`. O banco armazena apenas o hash da chave de consulta. A referência não é enviada em query strings, links públicos ou no retorno do Mercado Pago; fica na sessão do navegador.
- O Mercado Pago recebe a assinatura `pending`, o `payer_email`, o valor, a frequência e o retorno `/compra`, conforme a [documentação oficial de assinaturas com pagamento pendente](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/integration-configuration/subscription-no-associated-plan/pending-payments).
- O retorno e parâmetros como `paid=true` não concedem acesso. A confirmação consulta os pagamentos no provedor e valida assinatura, recebedor, valor, moeda, ambiente, competência e estorno, como no fluxo autenticado existente.
- Somente depois de existir período pago aprovado, a tela oferece cadastro e login como próximo passo. O formulário recebe o e-mail da compra como sugestão; isso não autentica ninguém.
- Após confirmação do e-mail/cadastro ou login de uma conta já confirmada, o servidor vincula compras pagas pendentes desse mesmo e-mail à conta. O navegador não informa o ID do usuário nem escolhe o titular do pagamento. Outra conta não recebe o acesso mesmo conhecendo a chave de consulta da compra.
- Perder a sessão do navegador não perde o pagamento: a vinculação continua possível após autenticação e confirmação do mesmo e-mail. O pagamento permanece no banco até ser associado.

## Assinantes existentes

Login, administração, troca de senha, consulta e cancelamento da própria assinatura continuam disponíveis. Uma pessoa que já tem conta pode retomar o checkout iniciado com o mesmo e-mail sem criar outra assinatura. Conta comum sem pagamento continua sem acesso aos treinos, mesmo que tenha conseguido cadastrar-se por um link direto ou antigo.

Repetir a mesma compra reutiliza sua referência e checkout. Mudança de e-mail é recusada. Para trocar o plano de uma assinatura pendente, o servidor confirma o cancelamento da tentativa original antes de criar outra; cobranças já em processamento exigem conciliação. Criação com resposta ambígua aguarda conciliação/webhook, impedindo duplicar cobranças por retry. Assinaturas canceladas, falhas do provedor e estornos não são tratados como pagamento aprovado.

As tabelas existentes e os pagamentos de clientes atuais são preservados; a migração apenas permite uma assinatura ainda sem conta e acrescenta os identificadores do checkout anônimo. As rotas privadas continuam autenticadas e a API continua com `Cache-Control: no-store`.

## Validação local

Os testes cobrem pagamento sem usuário, aprovação antes do cadastro, confirmação obrigatória do e-mail, acesso de conta existente, isolamento entre contas, chave de consulta sem privilégio de login, falsificação de parâmetros, repetição da compra, resposta perdida, estorno e redirecionamento malicioso. Nenhuma cobrança real é iniciada.

`backend/test/preview-checkout.ts` usa banco em memória, provedor simulado e e-mails capturados localmente. Escuta apenas em `127.0.0.1:3341`. Para o Vite local, configure `API_PROXY=http://127.0.0.1:3341` e `VITE_CHECKOUT_PREVIEW=true`, na porta 5181. O desvio para simular a aprovação existe somente sob `import.meta.env.DEV`; é eliminado no build publicado. A tela identifica claramente a simulação. A caixa de e-mails simulados está em `http://127.0.0.1:3341/dev/emails`.

Esta prévia é separada da prévia de administração. Seus pedidos de exemplo não alimentam o banco do painel nem os dados de produção.
## Pagamentos disponíveis

Mensal: R$ 15,00 por 1 mês. Anual: R$ 150,00 por 12 meses. O valor e a duração são definidos no servidor.

- **Pagar pelo período** usa Checkout Pro (`/checkout/preferences`), sem excluir meios de pagamento e sem exigir conta Mercado Pago. Permite Pix, boleto, crédito e débito conforme disponibilidade do recebedor e da bandeira. Não há renovação automática.
- **Assinatura automática** mantém a integração `/preapproval` para cobranças recorrentes no cartão. Cancelar interrompe cobranças futuras e preserva o período pago.
- Na consulta autenticada de 20/11/2026, `/v1/payment_methods` retornou Pix, boleto Bradesco, Elo Débito e crédito Visa/Mastercard/Elo/Amex como `active`. Esse retorno não substitui validar o checkout real; Pix também depende de chave cadastrada no Mercado Pago.
- O plano anual permanece selecionável mesmo com tentativa mensal pendente. Trocar uma assinatura ainda não autorizada exige cancelamento confirmado no provedor, sem faturas antes/depois da operação. Cobrança em processamento, assinatura autorizada e compras avulsas já iniciadas não são substituídas automaticamente, para evitar cobranças duplicadas.
- Pix gerado, boleto emitido, redirecionamento e status de assinatura `authorized` não liberam acesso. Acesso exige pagamento `approved`, sem estorno, com recebedor, valor, moeda, ambiente, referência e pedido comercial conferidos na API do provedor.
- No pagamento por período, a validade começa na aprovação e dura 1 ou 12 meses de calendário. Webhooks `payment` sincronizam aprovações e reembolsos. O endpoint de webhook já configurado também deve permanecer inscrito em eventos de pagamentos.
- A conciliação verifica o pedido comercial e seu `preference_id`. Falha de criação ambígua não cria outra preferência; um webhook válido permite recuperar a referência.
- Prévia em 5181 e testes usam provedor simulado. Não foram executadas transações financeiras reais. Antes da publicação, revisar os dois modos localmente; após deploy, validar uma compra no checkout real e a chegada do webhook.

Referências oficiais:
- https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/additional-settings/payment-methods
- https://www.mercadopago.com.br/developers/pt/docs/sales-processing/payment-methods
- https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-pro-preferences/create-preference/post

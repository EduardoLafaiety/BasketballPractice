# Assinaturas Mercado Pago

Integração local implementada para R$ 15,00/mês e R$ 150,00 a cada 12 meses, em BRL. A aplicação e as notificações foram configuradas no Mercado Pago. Não houve publicação nem cobrança real.

## Situação da configuração em 20/11/2026

- Aplicação **Basketball Practice**, integração **Assinaturas**, número `7877233257539865`.
- Credenciais de produção ativas no painel. Access Token, segredo das notificações e identificação do vendedor salvos apenas em `backend/.env`, ignorado pelo Git.
- Notificações de **Planos e assinaturas** e **Pagamentos (legacy)** salvas para `https://basketball-practice-api.onrender.com/api/billing/webhook`.
- Site informado ao Mercado Pago: `https://basketballpractice.com.br/`.
- `BILLING_ENABLED=false` mantém o desenvolvimento local sem cobrança. Em `NODE_ENV=production`, o bloqueio por assinatura é sempre obrigatório, mesmo se a flag estiver ausente ou falsa. As credenciais reais guardadas não devem ser usadas em simulações.
- A nova rota ainda precisa ser publicada. As chaves locais não são enviadas pelo Git nem instaladas automaticamente no Render. Na publicação, configurá-las no ambiente privado do servidor e definir `APP_URL=https://basketballpractice.com.br`.
- Mensal e anual foram pagos com contas/cartão fictícios, confirmados pela API e liberados na prévia local. As renovações dos dois testes foram canceladas, preservando os períodos pagos. Detalhes e limites em [MERCADO_PAGO_HOMOLOGACAO.md](MERCADO_PAGO_HOMOLOGACAO.md).
- Ainda falta validar a entrega das notificações ao servidor publicado. Na publicação comercial, as credenciais devem estar prontas: não há modo de produção que libere os treinos gratuitamente por falta de configuração.

## Configuração do servidor

1. Criar e validar a conta Mercado Pago e sua aplicação em **Suas integrações**. A disponibilidade do produto depende da conta e das validações do provedor.
2. Configurar no ambiente privado do **backend**: `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` e `MP_COLLECTOR_ID` (ID numérico do vendedor correspondente ao token). Nunca colocar esses dados no frontend, no Git ou em mensagens públicas.
3. Definir `APP_URL` com o endereço HTTPS público do site. O retorno vai para `/assinatura?retorno=1`. O endereço vem da configuração do servidor, nunca de parâmetros do navegador.
4. No painel de Webhooks do Mercado Pago, cadastrar `https://DOMINIO-DA-API/api/billing/webhook` e habilitar `subscription_preapproval`, `subscription_authorized_payment` e `payment`. O segredo desse painel é `MP_WEBHOOK_SECRET`. A criação usa uma assinatura independente, sem precisar de IDs de planos cadastrados no painel.
5. Usar primeiro contas/cartões de teste do Mercado Pago. Confirmar a tag `test_user` do vendedor em `/users/me` e o ID do recebedor antes de iniciar. Definir `MP_LIVE_MODE` conforme o campo `live_mode` efetivamente retornado pela API: na homologação de Assinaturas destas contas fictícias, o retorno foi `true`. Esse campo sozinho não comprova se a conta é real ou de teste. Não usar cartão real em teste.
6. Aplicar as migrações pelo início normal do backend e configurar `BILLING_ENABLED=true` no ambiente de teste para validar o bloqueio de acesso. Sem credenciais completas, o checkout responde 503 e não libera acesso.
7. Publicar o site e a API comerciais após homologação e configuração do ambiente real. **Produção sempre exige pagamento confirmado**, independentemente de `BILLING_ENABLED`. Sem credenciais completas, o checkout fica indisponível e o conteúdo permanece bloqueado. A demonstração sem backend é exclusiva de desenvolvimento local e não possui mais workflow de publicação gratuita.

## Fluxo

Os botões da landing levam a `/assinatura?plano=mensal` ou `anual`. O usuário precisa de conta confirmada e login na versão real. A escolha do plano é uma preferência local, nunca uma autorização de acesso. Na demonstração do navegador, o pagamento fica indisponível e não há chamada ao Mercado Pago.

O servidor cria `/preapproval` em estado `pending`, com preço e periodicidade fixos. O comprador informa cartão e autoriza a recorrência no checkout hospedado do Mercado Pago. O site não armazena cartões. Apenas criar a assinatura, receber `authorized` ou visitar a URL de retorno **não** libera o treino.

As notificações são validadas por HMAC-SHA256, com `data.id`, `x-request-id`, `x-signature` e tolerância de cinco minutos. O corpo não pode contradizer o ID assinado. O servidor consulta a assinatura, fatura e pagamento na API do Mercado Pago; confere vínculo, valor, BRL, recebedor e ambiente. Apenas pagamento aprovado, sem valor estornado, gera período de acesso.

Cada pagamento tem uma chave única. Repetir um evento não soma meses. A data final é calculada a partir da competência da fatura, usando meses de calendário UTC e respeitando meses curtos. Estorno/chargeback remove a aprovação daquele pagamento. Um evento de pagamento atrasado continua consultando o estado atual do provedor.

As rotas de exercícios, treinos, rotina, sessões, programas, planos e estilos exigem assinatura quando a cobrança está ativa. Conta, segurança, contato e operações de dados pessoais continuam disponíveis. Administradores não precisam pagar. A API confere acesso em cada pedido; dados enviados pelo navegador não concedem acesso.

## Cancelamento e exclusão

`POST /api/billing/cancel` só cancela a assinatura da conta autenticada. Confirma `cancelled` no provedor antes de registrar o cancelamento local. O período efetivamente pago continua até o vencimento, sem novas cobranças. Não há troca automática de plano com assinatura em andamento: primeiro cancela-se o checkout anterior. Um período pago ainda ativo impede assinar de novo para evitar sobreposição.

A exclusão de conta, inclusive administrativa, fica impedida enquanto existir assinatura não cancelada ou criação pendente. Isso evita apagar o vínculo e deixar cobranças recorrentes órfãs. O usuário pode cancelar pela página de assinatura antes de excluir. Estornos e direitos legais são tratados pelo atendimento; cancelamento de renovação não executa automaticamente um reembolso.

## Falhas e conciliação

O checkout é reservado no banco antes da chamada externa. Em caso de timeout/resposta perdida, não se inicia outra assinatura automaticamente, porque o provedor pode já ter criado a primeira. Uma notificação válida recupera o vínculo pelo `external_reference`. Se não houver notificação, o atendimento deve consultar o Mercado Pago usando essa referência (UUID persistido em `billing_subscriptions`), conferir vendedor/valor/periodicidade e conciliar ou cancelar a assinatura externa antes de encerrar a tentativa local. Não apagar tentativas pendentes para simplesmente tentar de novo.

`POST /api/billing/refresh` permite recuperar uma confirmação que ainda não chegou. O retorno do checkout faz consultas limitadas; depois o usuário pode verificar manualmente. Webhooks só recebem HTTP 200 depois de persistir a atualização; em falha, o Mercado Pago deve tentar novamente. Não usar endpoints simulados em produção. A entrega externa de notificações ainda precisa ser homologada com o servidor publicado.

## Verificação antes da ativação

- Mensal e anual: aprovação, recusa e pendência; conferir recebedor e valor.
- Reenvio de webhook, assinatura inválida, chamada simultânea ao checkout e resposta perdida.
- Renovação, expiração, cancelamento antes/depois de pagar, estorno integral e parcial e chargeback.
- Tentar acessar a API sem pagar, pela conta de outro usuário e depois de vencer.
- Cancelar e só depois excluir a conta. Conferir as mensagens e os links de contato.

Os testes automatizados usam Mercado Pago simulado, HTTP local e PGlite. Eles não comprovam a habilitação da conta comercial, a entrega externa dos webhooks ou uma transação real.

## Referências oficiais

- [Criar assinatura](https://www.mercadopago.com.br/developers/pt/reference/online-payments/subscriptions/create-preapproval/post)
- [Faturas de assinatura](https://www.mercadopago.com.br/developers/pt/reference/online-payments/subscriptions/authorized-payment-search/get)
- [Notificações e assinatura HMAC](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/additional-content/your-integrations/notifications/webhooks)

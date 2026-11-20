# Validação local de assinaturas — 20/11/2026

Nenhuma publicação ou cobrança real. A prévia usa a API do Mercado Pago com vendedor e comprador fictícios, cartão fictício e banco PGlite temporário. O desenvolvimento local permanece com `BILLING_ENABLED=false` no arquivo `backend/.env`; na API comercial, `NODE_ENV=production` exige assinatura sempre.

## Resultados observados com as contas de teste

| Cenário | Resultado |
| --- | --- |
| Identidade do vendedor | API `/users/me` confirmou a tag `test_user` e o recebedor configurado. |
| Checkout mensal pelo site local | R$ 15; pagamento fictício aprovado; API confirmou fatura e pagamento. |
| Liberação mensal | Acesso até 20/12/2026. A API de exercícios respondeu 200 após a confirmação. |
| Cancelamento mensal pelo site local | Confirmado pelo provedor. Renovação cancelada e acesso pago preservado. |
| Checkout anual pelo site local | R$ 150 a cada 12 meses; pagamento fictício aprovado. |
| Liberação anual | Acesso até 20/11/2027, confirmado na prévia local. |
| Cancelamento anual pelo site local | Confirmado pelo provedor; período pago preservado. Ambos os testes ficaram sem renovação ativa. |
| Notificação assinada entregue localmente | HTTP 200; consulta a fatura/pagamento reais das contas fictícias. |
| Reenvio da mesma notificação | HTTP 200; permaneceu um único registro de pagamento, com a mesma validade. |
| Assinatura de notificação adulterada | HTTP 401. |
| Layout | Prévia em larguras reais de 319 px e 1280 px, sem transbordamento horizontal na página de assinatura. |
| Checkout mensal sem login no Mercado Pago | Sessão do comprador fictício encerrada pelo menu do checkout; opção “Sem conta Mercado Pago” → “Cartão Crédito”; cartão fictício aprovado por R$ 15 sem nova autenticação. |
| Liberação do pagamento como convidado | API oficial confirmou `approved`, BRL 15 e o vendedor fictício esperado. Prévia local liberou acesso até 20/12/2026; API protegida de exercícios respondeu 200. |
| Cancelamento do teste como convidado | Renovação cancelada pelo site local e confirmada na API oficial. O período pago permaneceu disponível. |

Depois da compra fictícia, a suíte completa passou com 210 testes de backend e 1.153 de interface. Na continuação, foram adicionados oito cenários de backend e dois de interface: a execução focada final passou com 23 testes de pagamento e 44 testes de interface, autenticação, landing e cache offline. O build de produção também passou.

A cobertura adicional confirma pagamentos pendentes/em análise/autorizados/recusados sem acesso, renovação recusada preservando somente o período anterior, chargeback, estorno parcial, pagamento futuro, cancelamento com resposta inconclusiva, timeout/HTTP 500/JSON inválido sem expor credenciais, chave de idempotência e redirecionamentos inválidos. Esses cenários automatizados usam respostas simuladas; não representam compras adicionais no Mercado Pago.

## Correção encontrada pela homologação

A consulta `/authorized_payments/search` recusou `limit=100` com HTTP 400. O cliente agora usa o limite padrão do endpoint, preservando os filtros de assinatura/pagamento e a ordenação. Um teste de regressão cobre a restrição observada.

O endpoint de pagamentos devolveu `live_mode=true` para estas contas fictícias. A configuração de homologação foi ajustada ao retorno observado, mantendo a confirmação obrigatória da tag `test_user`, credencial separada e ID de vendedor fictício antes de iniciar. As verificações do serviço de produção não foram relaxadas.

A primeira tentativa com um e-mail local genérico foi recusada pelo Mercado Pago, que exige comprador e vendedor ambos reais ou ambos fictícios. A conta local foi vinculada ao e-mail efetivo do comprador de teste antes das aprovações. Nenhuma assinatura foi criada naquela tentativa recusada.

## Prévia e reprodução

- Site local: `http://127.0.0.1:5175/assinatura`; a landing e as demais páginas estão na mesma origem.
- API de homologação: `http://127.0.0.1:3334`, vinculada somente à interface local do computador.
- O processo de homologação lê exclusivamente `backend/.env.local`, confirma o vendedor fictício na API oficial e usa um banco temporário. As credenciais e os relatórios operacionais em `backend/data/` são ignorados pelo Git.
- Iniciar em `backend`: `npm exec -- tsx scripts/homologacao-mp.ts`. Para uma execução anual independente: acrescentar `--anual`. Para retomar uma assinatura de teste registrada no relatório daquele cenário: acrescentar `--resume`.
- Iniciar o frontend com `API_PROXY=http://127.0.0.1:3334` e `npm run dev -- --host 127.0.0.1 --port 5175 --strictPort`.
- A conta local usa o e-mail fictício do comprador registrado em `.env.local`. A senha exclusiva deste banco descartável é `Homologacao-Local-2026!`; não é a senha do Mercado Pago.
- O retorno do Mercado Pago usa o domínio HTTPS do site, exigido pelo provedor. Na homologação, a volta a `/assinatura?retorno=1` na origem local foi manual. Nenhum túnel público foi criado.

## Validações ainda necessárias para publicar a cobrança

- Instalar os segredos no ambiente privado do servidor; os arquivos locais não são transferidos pelo Git.
- Publicar a rota e comprovar a entrega externa de notificações HTTPS pelo Mercado Pago. O teste de assinatura local não comprova a conectividade entre o provedor e o servidor público.
- Conferir o retorno HTTPS na versão publicada, os limites operacionais do provedor e a configuração real. Produção mantém o conteúdo bloqueado sem pagamento e não pode liberar acesso por uma flag ausente ou falsa.
- Renovação futura automática, estornos/contestações externos e recusas/pendências com cartões no checkout não foram executados manualmente nesta sessão. As regras correspondentes têm cobertura automatizada, mas a aprovação dos dois planos não substitui esses testes externos.

Referências: [busca de faturas](https://www.mercadopago.com.br/developers/pt/reference/online-payments/subscriptions/authorized-payment-search/get), [contas fictícias](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/test/accounts).

## Pagamento como convidado — execução de 20/11/2026

O teste começou pelo botão de pagamento da página local, com uma conta do Basketball Practice sem período pago. O checkout inicialmente reconheceu a sessão fictícia de uma execução anterior; ela foi encerrada usando “Encerrar sessão”. A tela passou a mostrar separadamente “Com sua conta Mercado Pago” e “Sem conta Mercado Pago”. Selecionar cartão no segundo grupo abriu os campos de pagamento sem solicitar senha, código ou criação de conta Mercado Pago.

Foi usado o cartão Visa fictício disponibilizado pelo provedor, titular `APRO` e documento fictício. A tela final informou “Você pagou R$ 15”. A consulta posterior à API oficial confirmou o pagamento aprovado, o valor, a moeda e o recebedor esperado; a API local confirmou o acesso e a renovação foi cancelada para encerrar o teste.

Este resultado valida o caminho **sem login no Mercado Pago**. O e-mail usado é o do comprador fictício exigido por este ambiente de testes; não foi criada uma identidade real sem cadastro no provedor. Uma compra real com um cliente sem conta, o redirecionamento HTTPS publicado e a entrega externa do webhook continuam sendo validações de produção, não simuladas como concluídas aqui.

Para reproduzir separadamente dos cenários mensal e anual, iniciar o servidor manual com `--convidado`. Ele continua exigindo a identificação do vendedor fictício antes de abrir a API e salva o relatório em `backend/data/homologacao-convidado.json`, ignorado pelo Git. Acrescentar `--resume` recupera a assinatura daquele relatório em um novo banco temporário. A evidência sanitizada da consulta final fica em `artifacts/validacao-mercado-pago-convidado.json`, também ignorada pelo Git.

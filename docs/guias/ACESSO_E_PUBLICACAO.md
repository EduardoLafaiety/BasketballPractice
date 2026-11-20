# Acesso pago e publicação

## Rotas e permissões

| Área | Regra |
| --- | --- |
| Landing, login, cadastro, ativação e recuperação de senha, contato, privacidade e termos | Públicas, para contratação, acesso e atendimento. |
| Assinatura | Exige login; permite escolher plano, verificar pagamento e cancelar renovação. |
| Início do usuário, treinos/detalhes, rotina, sessão, programas/detalhes, estilos de jogadores, NBA, NBB, alimentação, conquistas, evolução e overall | Conta autenticada e assinatura paga vigente. |
| Artigos/detalhes e Equipamentos | Conta autenticada e assinatura paga vigente; deixaram de ser páginas públicas. |
| Configurações, segurança, saída da conta e dados pessoais | Titular autenticado, inclusive sem assinatura, para gerenciamento e exercício de seus direitos. |
| Administração | Somente administradores confirmados pela API. A isenção é interna, não um plano gratuito oferecido ao cliente. |

A API verifica cada pedido de exercícios, treinos, rotina, sessões, planos, programas, estilos e notificações. Sem sessão responde 401; conta sem acesso pago recebe 402. Informar a URL diretamente, escolher um plano ou retornar do checkout não concede acesso.

O frontend exige confirmação de acesso da API. Dados de assinatura ausentes, validade ausente/inválida ou período vencido não liberam conteúdo. Um temporizador e a retomada da aba verificam o vencimento com a página aberta. A decisão do servidor continua sendo obrigatória em cada chamada protegida.

## Produção sem acesso gratuito acidental

- `NODE_ENV=production` exige assinatura independentemente de `BILLING_ENABLED`. Sem chaves válidas o checkout fica indisponível, e o conteúdo continua bloqueado.
- A demonstração sem API continua sendo ferramenta local. Seu workflow de publicação no GitHub Pages foi removido. O Vite recusa gerar demonstração em CI/hospedagem.
- O build comercial é `npm run build` no frontend, conectado à API real. Não configurar a hospedagem para `build:demo` nem `VITE_DEMO=true`.
- Google AdSense, scripts automáticos, `ads.txt`, ID do editor e consentimento específico de publicidade foram removidos. Os documentos de privacidade refletem o armazenamento essencial e os links de afiliados existentes.
- As prévias históricas foram retiradas da pasta pública. Os arquivos recuperáveis e logs estão em `artifacts/arquivo-2026-11-20/`, fora do Git e do build. Não copiar essa pasta para hospedagem.

Nada nesta revisão altera o site que já está no ar. A aplicação destas regras depende de publicar o novo frontend e a nova API com as configurações privadas corretas. Confira o [guia de pagamentos](../pagamentos/MERCADO_PAGO.md) e a [homologação local](../pagamentos/MERCADO_PAGO_HOMOLOGACAO.md).

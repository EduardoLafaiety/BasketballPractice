<div align="center">

<img src="frontend/public/icon.svg" alt="" width="96" height="96" />

# Basketball Practice

</div>

Site por assinatura para planejar, executar e registrar treinos individuais de basquete. Inclui catálogo por nível, rotina semanal, programas, sessão guiada com demonstrações 2D/3D, histórico, evolução e conquistas.

Em produção, a área de conteúdo exige conta e pagamento confirmado na API. Landing, autenticação, assinatura, contato, privacidade e termos ficam disponíveis para contratação e atendimento. Configurações da conta e acesso aos próprios dados continuam disponíveis ao titular.

O treino pode ser preparado para uso offline. Rascunhos e sessões aguardando envio ficam neste aparelho, separados por conta, até a sincronização com a API.

## Executar localmente

Requisitos: Node.js 22.13 ou superior, npm e Docker com o serviço em execução para o PostgreSQL local. CI e publicação usam Node 22.

Na raiz do repositório:

```powershell
npm --prefix backend ci
npm --prefix frontend ci
npm --prefix e2e ci
Copy-Item backend/.env.example backend/.env
npm --prefix backend run db:up
```

Execute `npm run dev:api` e `npm run dev:site` em terminais separados. O site abre em `http://localhost:5173` e a API em `http://localhost:3333/api`. Para testar sem API ou Docker, use `npm --prefix frontend run dev:demo`; a demonstração guarda os dados somente no navegador.

Após atualizar a branch, execute `npm ci` nos pacotes cujos `package-lock.json` mudaram. Dependências antigas em `node_modules` podem causar falhas de build mesmo com o código atualizado. A instalação em cada pacote usa o lockfile versionado.

## Validação

```powershell
npm run check:architecture
npm run test:architecture
npm run test:bundles
npm run test:api
npm run test:site
npm run build:api
npm run build:site
npm run check:bundles
npm run build:demo
```

Para as jornadas com Chrome e PostgreSQL, execute `npm run test:e2e`. Esse comando recria um banco exclusivo de testes. Execute E2E, auditoria e build de demonstração em sequência: eles compartilham `frontend/dist`. Consulte as variáveis e os cuidados em [Desenvolvimento](docs/guias/DESENVOLVIMENTO.md).

## Documentação

| Documento | Conteúdo |
| --- | --- |
| [Desenvolvimento](docs/guias/DESENVOLVIMENTO.md) | Ambiente, comandos, testes e publicação |
| [Arquitetura](docs/arquitetura/ARQUITETURA.md) | Módulos e fronteiras entre camadas |
| [Sistema visual](docs/guias/SISTEMA_VISUAL.md) | Aparência atual, fontes e ordem dos estilos |
| [Regras de negócio](docs/arquitetura/REGRAS_DE_NEGOCIO.md) | Comportamentos que as mudanças devem preservar |
| [Contratos do backend](docs/arquitetura/CONTRATOS_BACKEND.md) | API, limites e compatibilidade |
| [Operação e recuperação](docs/guias/OPERACAO_E_RECUPERACAO.md) | Saúde, observabilidade e restauração |
| [Mudanças e roadmap](docs/guias/MUDANCAS_E_ROADMAP.md) | Entregas e limitações conhecidas |
| [Plano de refatoração](docs/arquitetura/PLANO_DE_REFATORACAO.md) | Histórico dos ciclos e oportunidades futuras |
| [Mercado Pago](docs/pagamentos/MERCADO_PAGO.md) | Configuração privada e fluxo da assinatura |
| [Acesso e publicação](docs/guias/ACESSO_E_PUBLICACAO.md) | Rotas pagas, páginas públicas e proteção em produção |
| [Homologação de pagamentos](docs/pagamentos/MERCADO_PAGO_HOMOLOGACAO.md) | Cenários executados e validações de publicação |

As análises antigas de interface ficam em `docs/historico/`. Logs e resultados temporários ficam em `artifacts/`, ignorados pelo Git. A demonstração sem backend serve ao desenvolvimento local; o workflow que a publicava gratuitamente foi removido.

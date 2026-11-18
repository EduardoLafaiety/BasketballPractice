# Carregamento, histórico, operação e regressões — passos 9 a 12

Data: 18/11/2026. Base: PR #176 integrado (`33ab79c`). Implementação na branch `codex/otimizacao-operacao`, em checkout isolado para preservar alterações locais existentes.

## 9. Carregamento e demonstrações

- Novos visitantes abrem a demonstração 2D. A escolha explícita de 3D e a preferência salva continuam funcionando. Não se cria um contexto WebGL apenas para abrir a cena 2D.
- O pacote 3D permanece sob demanda; falha de importação/renderização é contida na demonstração, com cena 2D e aviso, preservando contadores e formulário da página.
- Salvar uma sessão usa `registrarSessao`, sem montar um hook de leitura do histórico. Mantém confirmação remota, proteção contra resposta de autenticação anterior e invalidação dos resumos, metas e progresso.
- O hook antigo sem consumidores foi removido. Fontes, paleta, bordas, sprites e fórmulas foram preservados.

### Medição reproduzível

Chrome local, build de produção, conta nova, exercício Lance livre, sem preferência de demonstração e com movimento habilitado. A sonda salva `carregamento.json` no diretório da auditoria. Os valores abaixo somam `PerformanceResourceTiming.encodedBodySize`; não são medição de usuários reais nem simulação de rede móvel.

| Indicador na abertura | Base | Depois do passo 9 |
| --- | ---: | ---: |
| GET do histórico | 1 | 0 |
| Pacotes 3D solicitados | 1 | 0 |
| Bytes do pacote 3D solicitado | 594.440 | 0 |
| Bytes de JavaScript registrados na sonda | 731.569 | 137.445 |

A instalação local anterior não continha Press Start 2P, embora manifest e lock já a declarassem. As referências válidas foram repetidas com `npm ci`, preservando a fonte arcade verdadeira. A atualização posterior das ferramentas pode mudar os tamanhos; o relatório final do build fica em `frontend/dist/pacotes.json`.

## 10. Histórico e evolução

- Evolução mostra o histórico em páginas de 20 sessões. Solicita 21 para determinar se há próxima página, sem uma consulta de contagem. A ordenação continua data decrescente e ID decrescente.
- Overall e conquistas recebem a projeção autenticada `/api/sessions/progress`, em páginas de até 200. O SQL limita as sessões antes de agregar entradas e zonas; não envia notas, nomes de exercícios, esforço ou demais campos que não participam das fórmulas.
- IDs repetidos de exercícios, duração, datas completas, soma dos acertos, maior sequência e zonas são preservados. `calculos.ts` não foi alterado. Testes comparam as fórmulas sobre sessões completas e compactas.
- Exportação CSV continua usando histórico completo. Uma API antiga sem a nova rota usa fallback 404 para o contrato anterior, recomeçando a leitura completa.
- Cálculos são memoizados; conquistas deixa de buscar catálogo desnecessário. Overall combina falhas de catálogo e histórico e permite nova tentativa. Falha de atualização mostra aviso junto aos dados já carregados.

Limite: paginação por offset não fornece snapshot entre pedidos. Inserções/exclusões concorrentes podem deslocar itens; atualizar a tela refaz a leitura. O cálculo vitalício continua proporcional ao histórico, com payload menor. Não houve mudança de índices ou de critérios de pontuação sem evidência de necessidade.

## 11. Operação do backend

- `/api/live` verifica se o processo atende sem consultar banco. `/api/health` mantém readiness dependente do banco e retorna 503 durante indisponibilidade. Ambos usam `Cache-Control: no-store`.
- Respostas recebem `X-Request-Id` gerado pelo servidor. Em produção, cada resposta concluída gera evento JSON com identificador, método, domínio conhecido, status e duração. O coletor é injetável e sua falha não interrompe a API.
- Logs de falhas HTTP e conexões PostgreSQL passam a registrar categoria/código sanitizados. Não registram exceção completa, SQL, parâmetros, corpo, query string ou token. Não há integração ou envio para provedor externo.
- Teste de recuperação exporta uma conta, importa em outra, confere referências remapeadas e reimporta sem duplicar sessões. Procedimento operacional em [OPERACAO_E_RECUPERACAO.md](OPERACAO_E_RECUPERACAO.md).

Limites: logs locais não substituem coleta, retenção ou alerta externos; o middleware registra respostas concluídas, não garante registrar conexões interrompidas. O backup v1 não restaura integralmente extras, credenciais ou infraestrutura. Não foi criada fila durável de e-mail/push nem prometido envio exatamente uma vez.

## 12. Proteção contínua

- Manifesto de build e verificador sem dependência adicional: entrada JavaScript até 110.000 bytes gzip, somando seu grafo de imports estáticos uma vez; pacote 3D até 180.000 bytes gzip e obrigatoriamente separado. Imports dinâmicos não entram no orçamento inicial.
- O verificador recusa os módulos conhecidos de banco/demo no manifesto de produção e produz JSON. Não mede fontes/CSS/imagens, tempo de CPU nem Core Web Vitals de campo.
- CI mantém testes unitários, contratos, concorrência PostgreSQL e jornadas; passa a executar a auditoria de 20 capturas em dois tamanhos e dois temas, fonte arcade, ausência de overflow, carregamento inicial e recuperação de falha 3D. Capturas/JSON ficam como artefatos temporários, fora do Git.
- Não há baseline PNG aprovado multiplataforma: as capturas ajudam a revisão visual; assertivas determinísticas cobrem estrutura e carregamento. Não é certificação integral de acessibilidade.
- Ferramentas atualizadas de forma explícita, sem `audit fix --force`: Vite 7.3.8, Vitest 4.1.12, plugin React 5.2.0 e sharp 0.35.5. Target de navegadores do build anterior explicitado para evitar mudança silenciosa ao atualizar Vite. Referências: [migração Vite 7](https://v7.vite.dev/guide/migration), [migração Vitest 4](https://v4.vitest.dev/guide/migration).
- Auditoria npm do frontend passou de sete alertas a zero após a atualização; backend também retornou zero no momento da consulta. CI verifica alertas moderados ou superiores no frontend. Isso não é garantia permanente de ausência de vulnerabilidades.

## Validação e próximos trabalhos

Validação local concluída: 1.110 testes do frontend (67 arquivos), 193 testes da API, 27 testes de PostgreSQL real, 29 jornadas Chrome/PostgreSQL, sete testes de arquitetura e um teste do verificador de pacotes aprovados. Auditoria consolidada: três cenários aprovados, incluindo 20 capturas nos cinco destinos × dois tamanhos × dois temas. Builds de backend, produção e demonstração aprovados; arquitetura e diff sem violações. Não somar reexecuções direcionadas a essas contagens.

Último build de produção: entrada estática 87.042 bytes gzip (limite 110.000), pacote 3D 156.798 (limite 180.000). Auditoria final com service worker bloqueado nas sondas de rede: zero GET de histórico, zero pacote 3D inicial, 138.031 bytes de JavaScript registrados. O bloqueio permite simular falha real do download sem o service worker atender por outro caminho; as jornadas PWA continuam com service worker ativo. Capturas permanecem fora do Git.

Durante a validação, o teste de teclado foi sincronizado com a conclusão da navegação antes do primeiro Tab. A primeira abertura da rota offline no teste unitário aguarda até cinco segundos pelo estado esperado, sem pausa arbitrária. O teste de falha de módulo foi isolado do service worker; a primeira interceptação não havia afetado o download atendido por ele. As reexecuções completas correspondentes passaram.

A demonstração continua contendo banco/servidor no navegador e emite aviso de pacote acima de 700 kB, sem impedir o build; o orçamento deste ciclo aplica-se à produção. Nenhuma promessa de redução do bundle PGlite da demonstração foi acrescentada.

Integração autorizada pelo usuário, condicionada aos checks do GitHub do commit final.

Backlog, sem execução automática neste ciclo:

1. Coletar métricas reais de navegação e falhas com política explícita de privacidade e retenção; definir alertas no provedor escolhido.
2. Ensaiar restauração integral do PostgreSQL em ambiente separado, registrar RPO/RTO observados e política de retenção conforme o plano contratado.
3. Medir histórico grande antes de escolher paginação por cursor ou agregados persistidos, preservando equivalência das fórmulas.
4. Adotar baseline visual aprovado por navegador/ambiente quando houver necessidade de bloquear diferenças de pixels.
5. Avaliar fila durável de e-mail/notificações apenas quando os requisitos de entrega e operação justificarem a infraestrutura.

Entrega publicada no [PR #177](https://github.com/EduardoLafaiety/BasketballPractice/pull/177), branch codex/otimizacao-operacao. A integração permanece condicionada aos checks aprovados do commit final.

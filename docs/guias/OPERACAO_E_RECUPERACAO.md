# Operação e recuperação

## Saúde e falhas

- Liveness: `GET /api/live`, 200 sem acesso ao banco. Use para verificar o processo.
- Readiness: `GET /api/health`, 200 com banco acessível; 503 sem disponibilidade. Falha só de readiness não justifica reiniciar repetidamente o processo: confira banco, pool e rede.
- Os limites existentes de pool (5 s para conexão, 30 s para consulta e 60 s para transação ociosa) permanecem. Não há prazo global menor prometido para readiness.
- Em produção (`NODE_ENV=production`), stdout recebe eventos JSON de respostas concluídas: `evento`, `requestId`, `metodo`, `recurso`, `status`, `duracaoMs`. O identificador está no cabeçalho `X-Request-Id` e permite correlacionar falhas sem conteúdo pessoal.
- Falhas inesperadas HTTP e de conexão PostgreSQL registram evento/código sanitizados em stderr. Não adicionar corpo, URL completa, query, e-mail, credenciais, stack ou SQL aos eventos.
- No provedor, acompanhar taxa de 5xx, readiness indisponível, duração de respostas e reinícios. Limiares e retenção devem ser definidos com tráfego real; este ciclo não configura serviços pagos nem cria alertas externos.

## Backup de dados de uma conta

1. Autenticado, exporte o backup pela interface de Configurações (`GET /api/data/export`). Guarde o JSON em armazenamento privado com data e origem. Não o inclua em issues, logs, artefatos públicos ou Git.
2. Confira `format: basketball-practice` e `version: 1`; mantenha o arquivo original. Exportação de recuperação local de treinos é outro formato e não deve ser enviada à importação v1.
3. Em conta de teste separada, importe pela interface (`POST /api/data/import`). Confira exercícios personalizados, rotina, vínculos dos treinos, datas, duração, notas, métricas, zonas e preferências.
4. Exporte a conta restaurada e compare conteúdo sem exigir mesmos IDs: referências são remapeadas. Reimporte para verificar a deduplicação das sessões e os contadores `created`/`skipped`.
5. Registre data do ensaio e resultado fora do repositório público. Não apague a origem como parte do ensaio.

O teste `backend/test/operacao-progresso.test.ts` executa o percurso exportar → outra conta → conferir referências → reimportar, sem dados de produção. Os testes de contratos/corridas do backup continuam protegendo rollback e importações concorrentes.

O formato v1 restaura exercícios, treinos, sessões e preferências. Extras exportados não são importados integralmente; programas/desafios/quiz, contas, senhas e permissões não são um plano de recuperação completo do serviço.

## Recuperação integral do serviço

O backup do PostgreSQL deve ser configurado e verificado no provedor escolhido, segundo a retenção, criptografia e capacidade de restauração contratadas. O repositório não presume snapshots automáticos disponíveis nem declara RPO/RTO sem ensaio.

Procedimento de ensaio: restaurar um snapshot em **outro banco/instância**, configurar credenciais separadas, iniciar a versão compatível da API, conferir migrações e readiness, validar contas e amostras de vínculos sem enviar e-mails/push reais, executar as jornadas e registrar o tempo e a perda máxima observados. Aprovar o destino antes de qualquer troca de conexão de produção. Nunca executar o preparador E2E contra esse banco: ele recria dados.

Em falha após implantação, confira readiness e `requestId`, identifique se a causa é código ou infraestrutura e use rollback do deploy no provedor quando apropriado. Uma reversão de código não desfaz migrações destrutivas; este ciclo não introduz migração. Preserve o snapshot antes de qualquer recuperação real.

## Entregas assíncronas

O encerramento existente aguarda a tarefa de notificação em andamento antes de fechar o banco. Agendamento e travas de push preservam as garantias documentadas; e-mails continuam sem fila durável e limitadores continuam por instância. Não prometer entrega garantida/exatamente uma vez. Para requisitos mais fortes, projetar outbox/fila, tentativas idempotentes e observação das falhas em etapa própria.

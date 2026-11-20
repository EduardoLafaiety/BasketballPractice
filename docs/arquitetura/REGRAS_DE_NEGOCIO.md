# Regras de negócio — Basketball Practice

Atualizado em **20/11/2026**. Inclui os ciclos de arquitetura e frontend descritos abaixo; a diretriz visual foi alinhada às mudanças dos PRs #201–#203.

Este documento descreve as regras observadas na implementação e os contratos que precisam ser preservados durante a refatoração. Regras identificadas como propostas ainda não representam comportamento implementado. Em caso de divergência, investigar código, testes e intenção do produto antes de alterar qualquer comportamento.

Documentos relacionados: [mudanças e roadmap](../guias/MUDANCAS_E_ROADMAP.md) e [plano de refatoração](PLANO_DE_REFATORACAO.md).

## 1. Objetivo e vocabulário

O produto ajuda o atleta a planejar, executar e registrar treinos individuais de basquete, acompanhando os resultados ao longo do tempo.

| Conceito | Significado |
| --- | --- |
| Exercício | Movimento do catálogo ou criado pelo usuário; possui categoria e métrica |
| Treino | Conjunto ordenado de exercícios planejados |
| Rotina | Organização dos exercícios pelos sete dias da semana |
| Plano guiado | Blocos com exercícios e duração, usados na execução de uma sessão |
| Sessão | Registro do que foi efetivamente realizado |
| Programa | Sequência de dias de treino com progresso próprio |
| Entrada da sessão | Resultado de um exercício dentro da sessão |
| Rascunho | Estado local de uma sessão ainda em andamento ou não finalizada no servidor |
| Pendência | Sessão finalizada cujo envio precisa ser repetido |
| Overall | Pontuação derivada dos registros, sem equivalência garantida com habilidade real |

## 2. Acesso, conta e permissões

- **RN-AC-01 — Autenticação:** no ambiente normal, as funcionalidades de treino exigem autenticação. Entrada, cadastro, recuperação de senha, confirmação de conta e documentos legais possuem rotas públicas.
- **RN-AC-02 — Ativação:** cadastrar não autentica nem cria imediatamente uma conta ativa. O fluxo usa link de e-mail e confirmação com a senha informada no cadastro.
- **RN-AC-03 — Não revelar contas:** cadastro e recuperação respondem de forma genérica para evitar expor se o e-mail já possui conta.
- **RN-AC-04 — Senhas novas:** possuem de 8 a 128 caracteres e são rejeitadas quando consideradas óbvias pela política existente. A senha nova deve ser diferente da atual na troca de senha.
- **RN-AC-05 — Links:** ativação e recuperação utilizam tokens de uso único. A configuração atual define 24 horas para confirmação e 30 minutos para recuperação.
- **RN-AC-06 — Revogação:** logout revoga os tokens da versão atual da conta. Trocar a senha invalida os acessos anteriores e devolve um novo acesso para o aparelho que fez a troca.
- **RN-AC-07 — Falha de rede:** uma falha passageira ao verificar a conta não equivale a credencial inválida. A aplicação tenta verificar novamente; resposta 401 encerra o acesso local.
- **RN-AC-08 — Isolamento:** sessões, treinos, configurações e exercícios pessoais pertencem ao usuário autenticado. Uma conta não pode operar os dados pessoais de outra.
- **RN-AC-09 — Administração:** operações administrativas exigem permissão no servidor. Esconder o menu não substitui essa validação.
- **RN-AC-10 — Administração da própria conta:** pelo painel administrativo, o administrador não altera o próprio papel nem exclui a própria conta. A exclusão pela área pessoal é recusada se a conta for a única administradora.
- **RN-AC-11 — Exclusão pessoal:** exige senha atual e remove os dados da conta conforme as relações e o procedimento de exclusão do banco.
- **RN-AC-12 — Concorrência de credenciais:** login revalida o hash autenticado antes de assinar a sessão; não usa credencial anterior para assinar a versão nova após uma troca concorrente. Troca e exclusão verificam a senha atual sob bloqueio da conta dentro da transação.
- **RN-AC-13 — Composição administrativa:** alterações de papel, exclusões administrativas, exclusão pessoal e ferramenta operacional oficial compartilham uma trava. Escritas administrativas revalidam o papel do autor após adquirir a trava. A ferramenta pode criar o primeiro administrador, mas não remover o último.

Fontes: `backend/src/modules/auth/auth.routes.ts`, `admin.ts`, `backend/src/middleware/auth.ts`, `frontend/src/app/auth.tsx` e `frontend/src/app/App.tsx`.

## 3. Exercícios e treinos

- **RN-EX-01 — Visibilidade:** cada atleta acessa o catálogo padrão e os exercícios criados por ele.
- **RN-EX-02 — Catálogo protegido:** o usuário não pode editar ou excluir exercícios do catálogo padrão.
- **RN-EX-03 — Exercícios próprios:** somente o proprietário pode editar e excluir. A exclusão é recusada quando o exercício está referenciado por treinos ou registros.
- **RN-EX-04 — Categorias:** arremesso, drible, passe, finalização, defesa e condicionamento.
- **RN-EX-05 — Métricas:** acertos e tentativas, repetições ou tempo.
- **RN-EX-06 — Níveis:** o catálogo utiliza iniciante, intermediário e avançado. Exercícios próprios não recebem nível no cadastro atual e podem ser usados pelo gerador em qualquer nível.
- **RN-EX-07 — Aquecimento:** exercícios do catálogo podem ser marcados como aquecimento e possuir posição na progressão.
- **RN-EX-08 — Alterações protegidas:** edição e exclusão verificam propriedade e bloqueiam o registro na mesma transação da alteração. Referências do banco impedem excluir exercícios em uso; esse bloqueio retorna conflito 409.
- **RN-TR-01 — Composição:** um treino contém até 50 itens ordenados, referenciando apenas exercícios visíveis para a conta.
- **RN-TR-02 — Metas dos itens:** a API aceita séries, alvo de repetições, alvo de segundos e notas. Nem toda informação disponível na API é utilizada por todos os fluxos do frontend.
- **RN-TR-03 — Edição atômica:** criação e edição validam exercícios dentro da transação. A edição bloqueia o treino da conta antes de substituir cabeçalho e itens, preservando a ordem. Falhas preservam a versão anterior inteira; a última edição confirmada prevalece.

Fontes: `backend/src/modules/exercises/exercises.routes.ts`, `workouts.ts` e `backend/src/db/catalog.ts`.

## 4. Gerador e rotina semanal

- **RN-GE-01 — Duração:** o gerador aceita entre 10 e 180 minutos inteiros.
- **RN-GE-02 — Foco:** aceita categorias selecionadas; sem seleção, considera todas as categorias.
- **RN-GE-03 — Reprodutibilidade:** a mesma semente, aplicada à mesma lista de exercícios e às mesmas opções, produz a mesma seleção.
- **RN-GE-04 — Aquecimento solicitado:** a inclusão do aquecimento depende de duração de pelo menos 20 minutos e de opções disponíveis. A configuração atual distribui 3 minutos por bloco de aquecimento escolhido.
- **RN-GE-05 — Blocos principais:** o tempo restante é dividido em blocos próximos de 10 minutos.
- **RN-GE-06 — Variedade:** exercícios já usados são evitados quando existem alternativas; a exclusão não é uma proibição absoluta de repetição.
- **RN-GE-07 — Progressão:** o resultado coloca aquecimento antes da parte principal e ordena os grupos pela posição de catálogo.
- **RN-RO-01 — Semana:** os dias usam os valores de 0 a 6, de domingo a sábado.
- **RN-RO-02 — Representação atual:** a rotina é persistida por meio de treinos cuja descrição tem o formato `bp-rotina:<dia>`. Esse formato é um contrato de compatibilidade, não uma entidade específica de rotina no banco.
- **RN-RO-03 — Salvamento:** alterações da rotina são enfileiradas no frontend. Aplicar a semana gerada usa PUT /routine, com transação única. Existe fallback temporário para APIs anteriores, que salva os dias separadamente.
- **RN-RO-04 — Treino de hoje:** a sessão aberta pela rotina usa os exercícios do dia local e, a duração planejada por exercício; sem duração anterior, mantém o padrão de 10 minutos.
- **RN-RO-05 — Dia vazio:** sem exercícios na rotina do dia, a interface oferece configurar a rotina ou escolher outro treino.

Fontes: `backend/src/modules/plans/plans.routes.ts`, `frontend/src/shared/api/backend.ts`, `store.ts`, `pages/Rotina.tsx` e `pages/SessaoGuiada.tsx`.

**Ponto a decidir:** quando não houver exercícios elegíveis no foco ou nível solicitado, o fallback atual do gerador pode ampliar a seleção. A política desejada — avisar, recusar ou ampliar — precisa ser explicitada antes de modificar o algoritmo.

## 5. Execução e registro da sessão

- **RN-SE-01 — Estados:** a execução possui preparação, bloco ativo, pausa e resumo final. O envio pode terminar em sessão salva, pendência de sincronização ou erro que exige intervenção.
- **RN-SE-02 — Realizado e planejado:** concluir um bloco registra sua entrada. Pular avança sem registrar a entrada daquele bloco.
- **RN-SE-03 — Dados ausentes:** um bloco concluído pode gerar uma entrada sem contagens preenchidas. A API também aceita sessões sem entradas. Ausência de registro não deve ser reinterpretada automaticamente como zero.
- **RN-SE-04 — Tempo:** o relógio mede diferenças entre timestamps e respeita pausas. Ao esgotar um bloco, avisa e continua contando o excedente; a passagem ao próximo exercício depende do usuário.
- **RN-SE-05 — Duração final:** a sessão guiada converte os segundos totais em minutos arredondados, com mínimo de um minuto. O total inclui o tempo de execução transcorrido também em blocos pulados.
- **RN-SE-06 — Diário:** esforço e cansaço, quando informados, variam de 1 a 5. Notas da sessão têm limite de 2.000 caracteres na API.
- **RN-SE-07 — Validação:** acertos não podem superar tentativas quando ambos estão preenchidos. A melhor sequência não pode superar os acertos quando ambos estão preenchidos.
- **RN-SE-08 — Zonas:** o registro aceita 12 zonas: garrafão, lance livre, cinco de média distância e cinco de três pontos. Uma zona não pode aparecer repetida no mesmo pedido, e seus acertos não podem superar tentativas.
- **RN-SE-09 — Limites da API:** até 100 entradas por sessão; duração opcional de 1 a 1.440 minutos; contagens opcionais de 0 a 100.000.
- **RN-SE-10 — Propriedade das referências:** treino vinculado deve pertencer à conta; exercícios referenciados devem ser visíveis para ela.
- **RN-SE-11 — Edição atômica:** a edição bloqueia a sessão pertencente à conta e verifica suas referências dentro da mesma transação. Cabeçalho, entradas e zonas são confirmados juntos ou integralmente desfeitos. Edições concorrentes não mesclam os campos das duas versões; a última gravação confirmada prevalece, sem detecção de conflito por versão.

Fontes: `frontend/src/features/sessao/pages/SessaoGuiada.tsx`, `components/Contador.tsx` e `backend/src/modules/sessions/sessions.routes.ts`.

## 6. Recuperação, sincronização e duplicação

- **RN-SI-01 — Rascunho:** progresso, contadores e diário são armazenados localmente por conta. A retomada exige ação do usuário e inicia pausada.
- **RN-SI-02 — Recuperação offline:** depende dos arquivos necessários já disponíveis no navegador. O catálogo completo da API não é mantido offline.
- **RN-SI-03 — Pendência:** falha de rede ou HTTP 5xx durante o envio da sessão guiada permite guardar a sessão em fila local. Falha de armazenamento deve ser informada; não pode ser apresentada como salvamento bem-sucedido.
- **RN-SI-04 — Reenvio:** ocorre com o app aberto, conta autenticada e conexão, ao iniciar, recuperar rede, solicitar manualmente ou pelo intervalo de 30 segundos.
- **RN-SI-05 — Chave estável:** o mesmo `clientId`, na mesma conta, identifica o mesmo registro. Reenviar retorna a sessão existente; não atualiza seu conteúdo.
- **RN-SI-06 — Escopo:** a mesma chave em outra conta não dá acesso à sessão anterior. Clientes sem chave continuam aceitos, sem garantia de deduplicação por esse mecanismo.
- **RN-SI-07 — Confirmação:** o item sai da fila depois de envio confirmado. Trocar de conta ou perder a autenticação impede continuar o envio pela identidade anterior.
- **RN-SI-08 — Saída:** logout explícito pede confirmação se houver dados de treino locais e os limpa ao prosseguir. Expiração preserva os dados para nova entrada. Exclusão da conta limpa os dados locais neste navegador.
- **RN-SI-09 — Limites:** rascunho não acompanha o atleta entre aparelhos; limpar os dados do site remove os itens não enviados; não há sincronização garantida com o app fechado.
- **RN-SI-10 — Rejeição individual:** respostas 400, 404, 409 e 422 pertencem ao registro rejeitado e não bloqueiam o envio dos demais. A mensagem e as ações de correção aparecem somente nesse registro. Uma rejeição inalterada aguarda edição ou tentativa manual nesta montagem da interface.
- **RN-SI-11 — Interrupção do envio:** falhas de rede, servidor, autenticação, autorização e limite de pedidos interrompem a tentativa e preservam os itens restantes. Rejeições de acesso 401/403 bloqueiam novas tentativas automáticas até mudança de identidade ou ação manual.

Fontes: `frontend/src/features/sessao/model/treino-local.ts`, `components/SessoesPendentes.tsx`, `auth.tsx`, `api.ts`, `backend/src/modules/sessions/sessions.routes.ts` e `backend/src/db/migrations.ts`.

## 7. Programas

- **RN-PR-01 — Duração do programa:** o número de dias vem da definição do programa. Existem programas de 28 e de 30 dias; não assumir que todos possuem 30.
- **RN-PR-02 — Início:** é preciso começar o programa antes de concluir dias. Recomeçar remove o progresso anterior daquele programa.
- **RN-PR-03 — Ordem:** somente o próximo dia da sequência pode ser concluído.
- **RN-PR-04 — Limite diário:** em cada programa, após uma conclusão na data local, o próximo dia fica indisponível até a data seguinte. A regra atual não é um limite global compartilhado entre programas diferentes.
- **RN-PR-05 — Conclusão:** o programa termina ao completar todos os dias definidos.
- **RN-PR-06 — Atomicidade:** ao salvar uma sessão guiada vinculada a programa, registro e conclusão do dia pertencem à mesma transação. Uma rejeição desfaz ambos.
- **RN-PR-07 — Exclusão de sessão:** apagar a sessão vinculada deixa a referência nula, mas mantém o dia concluído. Esse comportamento difere do recálculo de conquistas e Overall.
- **RN-PR-08 — Concorrência:** iniciar/reiniciar, concluir e sair de programas usam a mesma trava por conta. Reinício que falha desfaz a remoção do progresso anterior. A data local de escrita é calculada após obter a trava, com a mesma data no registro de início e na resposta.

Fontes: `backend/src/modules/programs/programs.routes.ts`, `sessions.ts`, `backend/src/db/programs.ts` e `migrations.ts`.

## 8. Evolução, conquistas e Overall

- **RN-EV-01 — Comparação:** janelas de 7 ou 30 dias locais; a atual inclui hoje e a anterior tem a mesma duração, sem sobreposição.
- **RN-EV-02 — Aproveitamento:** soma dos acertos dividida pela soma das tentativas. Sem tentativas, mostrar ausência de percentual.
- **RN-EV-03 — Filtro:** ao selecionar exercício, considerar suas entradas e as sessões que o contêm. Minutos totais não são atribuídos artificialmente ao exercício.
- **RN-EV-04 — Recalcular:** conquistas e Overall derivam do histórico. Apagar uma sessão pode reduzir a pontuação e retirar conquistas.
- **RN-EV-05 — Conquistas atuais:** critérios incluem número de sessões, dias consecutivos, minutos acumulados, cestas e sequência de acertos. As metas e os pontos devem ser preservados ao reorganizar o código.
- **RN-EV-06 — Atributos:** arremesso de três, condicionamento, defesa, drible e passe. Todos começam em 40 e têm teto 99.
- **RN-EV-07 — Pontuação:** para três pontos, cada tentativa e acerto em zona de três contribui com um terço de ponto. Nos demais atributos, cada entrada da categoria contribui com 4 pontos mais a duração da sessão dividida pelo número de entradas.
- **RN-EV-08 — Conversão:** `nota = min(99, round(40 + 59 × (1 - exp(-max(0, pontos) / 300))))`. Overall é a média arredondada dos atributos.
- **RN-EV-09 — Significado:** essa pontuação representa o histórico registrado, sem comprovar a habilidade real do atleta.

Fontes: `frontend/src/features/evolucao/model/calculos.ts`, `comparacao.ts`, `usarSessoes.ts`, `pages/Overall.tsx` e `pages/Evolucao.tsx`.

## 9. Preferências, lembretes e dados

- **RN-DA-01 — Tema:** sistema, claro ou escuro; a identidade visual atual permanece nos três modos, conforme [SISTEMA_VISUAL.md](../guias/SISTEMA_VISUAL.md).
- **RN-DA-02 — Lembretes:** dependem da escolha do usuário, horário e dias configurados. O app evita lembrete de treino quando identifica sessão registrada naquela data.
- **RN-DA-03 — Push:** exige suporte, permissão do navegador, inscrição e configuração de envio no servidor. Receber push não equivale a sincronizar sessões em segundo plano.
- **RN-DA-04 — Demonstração:** utiliza visitante e banco no navegador; não oferece conta real nem equivale ao ambiente autenticado de produção.
- **RN-DA-05 — Exportação/importação:** o backup atual usa formato `basketball-practice`, versão 1. Exercícios do catálogo são referenciados por nome na importação; os IDs não devem ser tratados como universais entre bancos.
- **RN-DA-06 — Serviços externos:** conteúdo de NBA/NBB e notícias pode ficar indisponível ou desatualizado. Essa falha não deve impedir o fluxo principal de treino.
- **RN-DA-07 — Exportação consistente:** exercícios, treinos, sessões, extras e preferências são lidos no mesmo snapshot transacional, sem misturar versões produzidas por uma edição concorrente.
- **RN-DA-08 — Importação atômica:** exercícios, treinos, sessões e preferências são importados em uma única transação. A falha em qualquer registro desfaz todos os efeitos da importação.
- **RN-DA-09 — Identidade do backup:** exercícios são remapeados por IDs do arquivo ou nome; treinos com mesmo nome e descrição são reaproveitados e têm seus itens substituídos. Sessões são comparadas pelo conteúdo preservando ordem e multiplicidade, sem depender da chave de envio do navegador.
- **RN-DA-10 — Limite da importação:** por padrão, até duas importações em andamento por instância. Ao atingir o limite, responder 503 com `Retry-After: 30`; falhas liberam a vaga. A trava por conta no banco serializa importações da mesma conta.
- **RN-DA-11 — Alcance da restauração:** a importação v1 não restaura extras, credenciais ou dados locais do navegador. O progresso de programas exportado em extras é informativo. Limites e referências estão em [CONTRATOS_BACKEND.md](CONTRATOS_BACKEND.md).
- **RN-DA-12 — Inscrições concorrentes:** cada conta admite até dez endpoints de push. Contagem e gravação são coordenadas na mesma transação; renovar um endpoint existente não ocupa outra vaga. A inscrição de um endpoint em outra conta transfere sua propriedade, como no comportamento anterior.
- **RN-DA-13 — Elegibilidade do lembrete:** preferências válidas e habilitadas, dia selecionado, horário local na janela de 30 minutos, ausência de sessão naquela data e nenhum lembrete já confirmado naquele aparelho na data local. Preferências inválidas são ignoradas pelo agendador, sem interromper outras contas.
- **RN-DA-14 — Concorrência de envio:** cron externo e agendador interno compartilham uma trava por aparelho e revalidam elegibilidade/propriedade antes de enviar. Sucesso confirma a data; falha permite tentar novamente na janela. Uma resposta de inscrição expirada só remove a inscrição se conta, endpoint e chaves ainda correspondem ao envio.
- **RN-DA-15 — Limites da entrega:** o serviço aguarda o provedor por até 15 segundos; o adaptador aplica timeout de inatividade de socket de dez segundos. Encerramento do agendador impede o próximo envio e aguarda o atual. Entrega externa e commit do banco não são atômicos: queda ou timeout com entrega incerta podem causar repetição posterior. Não existe garantia de entrega única ou de recebimento pelo usuário.
- **RN-DA-16 — Estilos de jogo:** textos, movimentos, ordem e duração permanecem os existentes. Exercícios são resolvidos pelo catálogo padrão; homônimos pessoais não o substituem. Referência ausente fica nula no movimento e não entra na sessão. Aquecimento/desaquecimento entram quando encontrados; percentuais por categoria distribuem 100 pelo método de maior resto, ou retornam objeto vazio sem minutos.

Fontes: módulos `settings`, `data`, `workouts`, `push` e `styles` em `backend/src/modules`, adaptador `backend/src/lib/push.ts`, `frontend/src/demo/servidor.ts` e módulos NBA/NBB.

## 10. Diretriz visual obrigatória para a refatoração

Referência atual: **preservar a aparência publicada após os PRs #201–#203**, descrita em [SISTEMA_VISUAL.md](../guias/SISTEMA_VISUAL.md). As referências retrô dos relatórios anteriores registram outra fase do projeto.

- Manter a paleta característica, os temas, a bola e os elementos reconhecíveis da marca, com fundo liso e acabamento suave nas áreas já atualizadas.
- Usar as fontes e os estilos atuais como referência: Big Shoulders Display nos títulos e Manrope no texto e controles. Instrument Serif também é carregada pela aplicação. Preservar os cantos e as sombras definidos pela cascata atual.
- Melhorar legibilidade, hierarquia, contraste, espaçamento e área de toque sem descaracterizar a interface.
- Preservar recursos didáticos 2D/3D, permitindo controlar seu custo conforme o contexto de uso.
- Comparar referências visuais antes e depois das alterações, nos temas claro e escuro e em telas móveis e desktop.
- Tratar tipografia muito pequena, animação excessiva e interação dependente de hover como pontos a avaliar, sem removê-los ou alterá-los indiscriminadamente.

## 11. Decisões abertas antes de alterar regras

1. Qual política aplicar quando o gerador não possui exercícios elegíveis no foco ou nível solicitado?
2. Como diferenciar sessão concluída sem resultados, sessão incompleta e sessão descartada?
3. Excluir uma sessão deve manter ou reabrir o dia do programa? Hoje mantém.
4. Recomeçar programa deve continuar apagando o progresso ou guardar ciclos anteriores?
5. Como corrigir pendências rejeitadas e tratar conflito entre abas ou aparelhos?
6. A rotina terá duração, metas e descanso por bloco? Como migrar o formato atual sem perder dados?
7. Os critérios atuais de conquistas e Overall continuarão iguais? Mudanças de fórmula exigem decisão de produto, versionamento e explicação ao usuário.

## 12. Critério para preservar uma regra

Cada migração de módulo deve citar as regras afetadas, manter ou adicionar os testes de comportamento relevantes e comparar as entradas e saídas com o fluxo existente. Alterações intencionais precisam ser registradas neste documento e no roadmap. Mover arquivos, trocar componentes ou otimizar consultas não autoriza mudar silenciosamente as regras acima.


## Atualizações do ciclo de arquitetura

- RN-RO: a duração planejada é persistida como alvo de segundos do item de treino, sem alterar o significado dos segundos efetivamente realizados na sessão.
- RN-RO: a escrita da semana preserva os IDs dos treinos existentes e os vínculos com sessões. Ainda não há tabelas exclusivas de rotina nem controle de edição entre aparelhos.
- RN-SI: novos itens da fila são versionados e guardados individualmente. O formato anterior continua legível. Um item editado enquanto é enviado não é retirado localmente como se essa versão nova tivesse sido confirmada.
- RN-SI: erros HTTP 4xx suspendem a repetição automática até intervenção; a interface permite revisar, corrigir notas e tentar novamente ou descartar explicitamente. Um conflito de programa permite escolher salvar o treino sem concluir seu dia, mantendo as demais pendências.
- RN-EV: a página de comparação solicita agregados pela API, sem baixar o histórico completo. Overall e conquistas mantêm suas regras anteriores e ainda utilizam o histórico.
- RN-VIS: antecipação seletiva, pausa de animações invisíveis e escolha inicial leve não removem a demonstração didática nem alteram o relógio do treino.

## Primeiro ciclo de frontend — proteção e disponibilidade

- **RN-SI-10 — Recuperação local:** registros desconhecidos, incompatíveis ou corrompidos não são apagados automaticamente. Itens válidos de uma fila legada mista continuam disponíveis. Um item recente inválido impede enviar silenciosamente sua versão antiga. A interface oferece exportação por conta e descarte explícito dos registros com problema.
- **RN-SI-11 — Conflito entre abas:** ao detectar um rascunho diferente do lido, a aba não o sobrescreve nem o remove ao confirmar um envio antigo. A pessoa deve reabrir para conferir a versão mais recente. localStorage não oferece transação entre abas; a detecção não garante ausência de toda corrida simultânea.
- **RN-SI-12 — Estados da execução:** preparação não roda o relógio; execução pode rodar ou pausar; resumo não reabre um bloco por ação atrasada. Retomada de rascunho inicia pausada. Regras de métricas, duração, diário, pular bloco e conclusão de programa permanecem iguais.
- **RN-SI-13 — Preparação offline:** a pessoa escolhe um plano e confirma sua preparação com conexão. Apenas esse snapshot e seus exercícios/instruções são guardados por conta, substituindo o preparo anterior. A preparação só é anunciada após confirmação dos arquivos estáticos e gravação local bem-sucedida. O navegador pode remover armazenamento; não há promessa de permanência ilimitada.
- **RN-SI-14 — Alcance offline:** permite iniciar o plano preparado sem rascunho anterior, contar, pausar, concluir e guardar o registro. Animações, busca completa e conteúdo externo precisam de conexão nesta etapa. O plano preparado pode estar desatualizado; data e origem são mostradas. Confirmação do dia de programa depende da API na sincronização.
- **RN-SI-15 — Conta e confirmação:** dados preparados também são removidos no logout explícito. Expiração mantém os dados para retorno à mesma conta. Respostas de envio anteriores não alteram a tela/cache de outra conta; falha tardia não recria fila após sair. O local continua separado da confirmação no servidor, com clientId estável.
- **RN-SI-16 — Exportação de recuperação:** o arquivo local contém somente registros de treino da conta selecionada, sem token. Não é o backup v1 do servidor e não possui importação automática nesta etapa. Serve para preservar o conteúdo antes de uma correção manual ou descarte.

## Experiência, contratos e navegação — passos 5 a 8

- **RN-UX-01 — Identidade:** campos, botões, avisos e estados vazios reutilizam fontes, paleta, temas, tokens e acabamento atual do produto; padronização não autoriza alterar fórmulas, catálogo ou regras de treino.
- **RN-UX-02 — Consultas compartilhadas:** componentes que usam a mesma chave compartilham o pedido. Saída de um consumidor não cancela os demais; saída do último, invalidação ou logout cancela consultas que propagam o sinal. Cancelamento não equivale a desfazer uma operação já recebida pelo servidor.
- **RN-UX-03 — Sessão atual:** um 401 atrasado só encerra a sessão se o token atual ainda for o token daquele pedido. Resposta antiga de outra sessão não deve derrubar um login novo.
- **RN-UX-04 — Formulários:** rótulo, ajuda e erro são associados ao campo. Erro local de nome recebe foco para correção. Botão ocupado impede ativação durante envio e informa o estado; a mensagem de erro oferece contexto para nova tentativa.
- **RN-UX-05 — Navegação por teclado:** menu aberto contém Tab/Shift+Tab e fecha com Escape, devolvendo foco ao acionador. Menu fechado não oferece links ocultos à tecnologia assistiva. Atalho de conteúdo e foco de navegação mantêm orientação entre telas.
- **RN-UX-06 — Movimento na rotina:** seletor e arraste preservam o exercício, sua posição de origem e duração, inclusive quando há IDs repetidos. A gravação usa a semana inteira no servidor atual; servidor legado sem esse contrato usa fallback sequencial, sem a mesma garantia atômica.
- **RN-UX-07 — Confirmação:** aplicar uma prévia só mostra sucesso após confirmação da API. Falha mantém a prévia para revisão e oferece recarga. O atalho Iniciar treino de hoje aguarda salvamentos e só navega na mesma sessão; não anuncia gravação otimista como confirmação remota.

Controles de remoção e os controles móveis abrangidos por este ciclo têm área mínima de 44 px onde aplicada. Isso é uma meta de interação do produto, não uma declaração de auditoria integral de acessibilidade.

## Desempenho e operação — passos 9 a 12

- **RN-UX-08 — Demonstração:** nova preferência começa em 2D. Escolha 3D salva é respeitada quando suportada; falha local retorna à demonstração 2D sem apagar contadores/notas. O relógio não depende da visualização.
- **RN-EV-02 — Histórico e pontuação:** paginação da lista não limita o histórico usado em Overall/conquistas. A projeção compacta preserva datas, duração, soma dos acertos, maior sequência, todas as entradas (inclusive repetidas) e zonas. Fórmulas, faixas e critérios de conquistas permanecem os mesmos.
- **RN-EV-03 — Atualização:** criação de sessão invalida comparação, histórico e progresso na autenticação atual. Dados disponíveis podem permanecer visíveis durante falha de atualização, acompanhados de aviso. Paginação por offset pode se deslocar durante escritas concorrentes.
- **RN-OP-01 — Privacidade operacional:** identificadores de pedidos são gerados pelo servidor. Eventos HTTP contêm domínio conhecido, método, status e duração; falhas usam categoria/código sanitizados. Não registrar corpo, query, token, e-mail, notas, SQL ou exceção completa neste fluxo.
- **RN-OP-02 — Recuperação:** importação v1 continua remapeando referências e deduplicando sessões conforme os contratos existentes. Exportação local de recuperação não se torna backup v1. Extras e credenciais não recebem garantia nova de restauração; ensaios usam conta/banco separado.

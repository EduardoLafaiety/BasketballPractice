# Referência do primeiro ciclo de frontend

Data: 18/11/2026. Base: backend integrado no commit `fabba79`, antes dos passos de proteção local, arquitetura da sessão e preparação offline.

Foram capturadas Início, Treinos, Rotina, Sessão e Evolução em 390 × 844 e 1440 × 1000, nos temas claro/escuro: 20 imagens. Chrome local, API e PostgreSQL de testes, movimento reduzido e animações do app desligadas. Todos os cenários passaram na verificação de ausência de transbordamento horizontal.

| Tela | JS carregados | LCP observado (ms), mínimo–máximo |
| --- | --- | --- |
| Início | 11 | 656–1.064 |
| Treinos | 5 | 248–540 |
| Rotina | 7 | 256–908 |
| Sessão | 7 | 252–600 |
| Evolução | 2 | 336–476 |

Iniciar e pausar a sessão pela automação levou de 211 a 466 ms. Esse intervalo inclui a automação e duas ações; não é INP. A soma dos deslocamentos observados foi maior em Início/Treinos/Rotina, ponto a investigar na etapa posterior de desempenho. Essa soma não implementa as janelas de CLS. LCP é uma amostra até a captura, não o percentil de visitas reais.

O primeiro acesso de Início transferiu aproximadamente 211 KB de recursos; as navegações seguintes reutilizaram cache do navegador/service worker. Não comparar esses bytes como se todas as páginas fossem visitas frias. A auditoria registra DOM pronto, recursos, LCP observado, soma de deslocamentos e duração de tarefas longas. Ela não simula aparelho de baixo custo nem rede móvel.

Capturas e JSON iniciais preservados em `C:/Users/agath/AppData/Local/Temp/basketball-practice-referencia-20261118-145750`. Artefatos brutos ficam fora do Git; este documento preserva método e resultados. Comando reproduzível: `npm --prefix e2e run audit`. A mesma auditoria será repetida após a implementação. Diferenças de tempo em uma execução não serão apresentadas como ganho de desempenho.

Identidade a preservar: fontes, paleta, pixel art, temas, quadra, placares e classes de componentes atuais. Aviso existente de resolução de uma fonte permanece registrado; não houve alteração de CSS nesta referência.

## Comparação após os quatro passos

A auditoria foi repetida com os mesmos 20 cenários e aprovou a ausência de transbordamento horizontal. Das 16 capturas de Início, Treinos, Rotina e Evolução, 15 mantiveram exatamente os mesmos pixels; Início desktop escuro variou em apenas 13 canais de cor, com diferença máxima de um nível entre 0 e 255. Nas quatro capturas de Sessão, a alteração observável é o cartão de preparação offline abaixo de Começar. A inspeção da sessão em celular confirmou a preservação de tipografia, paleta, fundo de quadra, botão e navegação retrô.

| Tela | JS antes/depois | LCP observado depois (ms), mínimo–máximo |
| --- | --- | --- |
| Início | 11 / 11 | 340–560 |
| Treinos | 5 / 5 | 128–216 |
| Rotina | 7 / 7 | 216–292 |
| Sessão | 7 / 7 | 232–244 |
| Evolução | 2 / 2 | 184–212 |

Iniciar e pausar pela automação levou 119–263 ms nesta repetição. As execuções ocorreram em condições diferentes de aquecimento/carga local; os tempos menores não demonstram ganho de desempenho. O objetivo deste ciclo foi proteger dados e disponibilidade, sem orçamento de performance novo ou alegação de Core Web Vitals de campo. Capturas finais: `C:/Users/agath/AppData/Local/Temp/basketball-practice-audit`.

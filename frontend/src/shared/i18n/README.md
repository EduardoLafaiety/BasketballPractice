# Português e inglês

O conteúdo original continua em português. `en.json` é o catálogo estático de
tradução; `revisao-en.json` e `exercicios-en.json` têm precedência para revisões
editoriais e terminologia de basquete. A aplicação baixa o catálogo inglês apenas
quando necessário. Não há tradução remota durante o uso do produto.

O runtime JSX local traduz texto e atributos acessíveis na renderização do React.
Cada elemento assina a preferência de idioma sem remontar a árvore. Assim,
cronômetros, animações, valores de campos, refs e estado dos filtros permanecem.
IDs, URLs, categorias e valores enviados à API não são traduzidos. Use
`translate="no"` em conteúdo pessoal; a marcação se propaga aos descendentes.
`Link` e `NavLink` locais fazem a mesma adaptação nos links do roteador.

`idioma.ts` guarda a escolha neste navegador e atualiza `html.lang`. O tema usa
as preferências existentes da conta; “Sistema” remove a escolha explícita para
o CSS acompanhar `prefers-color-scheme`.

Após alterar conteúdo fixo:

1. `npm run i18n:extract` atualiza o inventário (inclui catálogo, programas,
   artigos e orientações das demonstrações).
2. Atualize os catálogos ingleses. O gerador editorial opcional
   `node scripts/i18n/translate.cjs` usa uma tradução automática inicial,
   com glossário de basquete. Envia apenas os textos fixos do inventário;
   nunca execute com conteúdo de contas ou registros pessoais.
3. Revise termos, nomes e instruções. O serviço de geração é externo e não
   faz parte da aplicação nem do build.
4. `npm run i18n:check` verifica cobertura e parâmetros de frases.

As notícias recebidas de veículos externos e páginas abertas fora do aplicativo
preservam o texto da fonte; o catálogo contém o conteúdo editorial do produto.

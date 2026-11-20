# Sistema visual atual

Referência conferida em 20/11/2026, após as mudanças de aparência dos PRs #201–#203. Os relatórios dos ciclos anteriores descrevem a interface retrô daquela época; suas menções a Pixelify Sans, Jersey 10 e `pixel.css` não definem a aparência atual.

## Identidade

- Big Shoulders Display Variable em títulos e números grandes; Manrope Variable no texto e nos controles. Instrument Serif em itálico também é carregada por `main.tsx`.
- Fontes locais, instaladas pelos pacotes `@fontsource`, sem dependência do Google Fonts.
- Paleta neutra com destaque laranja, cores por fundamento e temas claro, escuro e do sistema.
- Cartões com cantos arredondados e acabamento suave nas áreas abrangidas pelos estilos finais. Não impor bordas retas ou pixel art como regra geral.
- Fundo liso no aplicativo, conforme `ajustes.css`; quadra e bola continuam presentes nos recursos didáticos e elementos de marca.
- Títulos e números mantêm seus tratamentos próprios. Textos de navegação e avisos usam a capitalização definida pelos estilos atuais.

Os valores reutilizáveis de cor e tipografia começam em `frontend/src/styles/tokens.css`. Há ajustes posteriores na cascata: o valor inicial de um token ou uma regra de `base.css` isolada não representa necessariamente a aparência final.

## Entrada e ordem dos estilos

`frontend/src/main.tsx` carrega as fontes e uma única entrada de estilos, `frontend/src/styles.css`. Esse arquivo explicita a ordem das folhas globais. `refinamento.css`, `ajustes.css` e `suave.css` ficam no final para conservar as decisões visuais já publicadas.

Ordem: `tokens` → `base` → `conteudo` → `programas` → `responsivo` → `navegacao` → `inicio` → `controles` → `refinamento` → `ajustes` → `suave`. `controles.css` fica depois de `inicio.css`, reproduzindo a posição efetiva do antigo import direto em `main.tsx`.

O CSS de funcionalidades, como o aviso de beta, continua próximo do respectivo componente. A centralização dos estilos globais não exige mover essas folhas.

Ao reorganizar regras, preservar a ordem efetiva, a especificidade, os temas e os breakpoints. Não remover uma regra apenas por ela compartilhar o seletor com outra: uma folha posterior pode completar ou substituir propriedades da anterior. A consolidação das regras internas será incremental, por componente.

## Verificação de mudanças

Compare Início, Treinos, Rotina, Sessão e Evolução em celular e desktop, nos temas claro e escuro. A auditoria existente (`npm --prefix e2e run audit`) registra esses destinos e verifica fontes carregadas e ausência de transbordamento horizontal; depende de Chrome e PostgreSQL de testes.

Foco visível, navegação por teclado, rótulos associados e controles móveis permanecem parte da experiência. A preferência de animações é configurável no aplicativo. Mudanças visuais não devem alterar contadores, duração, dados offline ou regras de treino.

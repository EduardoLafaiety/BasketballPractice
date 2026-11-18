// Coreografias das demonstrações: uma por exercício do catálogo padrão, pelo nome (backend/src/db/seed.ts).
// Cada quadro é uma pose-chave; os ângulos estão explicados em motor.ts. Na vista de lado o boneco olha
// para a cesta (direita); na vista de frente, "F" é a perna da direita da tela e "P" o braço da direita.
import type { Coreografia, Quadro } from './motor'
import { AQUECIMENTOS } from './figuras-aquecimento'
import { FIGURAS_AVANCADO } from './figuras-avancado'
import { FIGURAS_INICIANTE } from './figuras-iniciante'
import { FIGURAS_INTERMEDIARIO } from './figuras-intermediario'
import {
  ARMAR, arremesso, ATERRISSA, BASE, CARGA, correr, CORRE_A, CORRE_B, deslizar, DRIBLE, EM_PE, F_BASE, F_PE, FINAL,
  mao, NA_REDE, NO_CHAO, PEITO, PRONTO, SALTO, SOLTAR, SOLTOS, voo,
} from './pecas'

const IDA = deslizar(200, 7, 1, [1, 2])
const VOLTA = deslizar(IDA.fim, 7, -1, [3, 3])

const ARREMESSO_TEXTO = {
  subida: { titulo: 'Subida', texto: 'Empurre o chão com as duas pernas e leve a bola ao ponto de arremesso, acima da testa.' },
  soltura: { titulo: 'Soltura', texto: 'Estenda o braço, quebre o punho e segure a mão apontando para o aro.' },
}

export const COREOGRAFIAS: Record<string, Coreografia> = {
  ...AQUECIMENTOS,
  ...FIGURAS_INICIANTE,
  ...FIGURAS_INTERMEDIARIO,
  ...FIGURAS_AVANCADO,

  'Lance livre': {
    cena: { cesta: 'lado', linhas: [300] },
    fases: [
      { titulo: 'Rotina', texto: 'Os mesmos quiques de sempre antes de cada tentativa, respirando fundo.' },
      { titulo: 'Base e mira', texto: 'Pés na largura dos ombros, joelhos flexionados, bola no bolso e olho no aro.' },
      { titulo: 'Extensão', texto: 'Estenda as pernas e leve a bola para cima num movimento só, sem pular.' },
      ARREMESSO_TEXTO.soltura,
    ],
    quadros: [
      { d: 0, fase: 0, x: 300, pe: 'M', t: 10, cF: 20, kF: 0, cT: -5, kT: -15, ...DRIBLE, bola: mao(0) },
      { d: 350, fase: 0, x: 300, pe: 'M', bola: mao(1) },
      { d: 350, fase: 0, x: 300, pe: 'M', bola: mao(0) },
      { d: 350, fase: 0, x: 300, pe: 'M', bola: mao(1) },
      { d: 350, fase: 0, x: 300, pe: 'M', bola: mao(0) },
      { d: 500, fase: 1, x: 300, pe: 'M', t: 12, cF: 40, kF: -8, cT: 12, kT: -30, ...PEITO, bola: { m: 'peito' }, hl: ['pF', 'pT'] },
      { d: 380, fase: 2, x: 300, pe: 'M', t: 3, cF: 10, kF: 0, cT: -4, kT: -8, ar: 3, ...ARMAR, bola: { m: 'cima' }, hl: ['pF', 'pT'] },
      { d: 150, fase: 3, x: 300, pe: 'M', ar: 5, ...SOLTAR, bola: { m: 'cima' }, hl: ['bP'] },
      { d: 350, fase: 3, x: 300, pe: 'M', ar: 0, ...FINAL, bola: voo(0.6), hl: ['bP'] },
      { d: 400, fase: 3, x: 300, pe: 'M', bola: NA_REDE },
      { d: 900, fase: 3, x: 300, pe: 'M', ...SOLTOS, bola: NO_CHAO },
    ],
  },

  'Arremesso de média distância': {
    cena: { cesta: 'lado' },
    fases: [
      { titulo: 'Mãos prontas', texto: 'Receba com as mãos à frente do peito e os pés já virados para a cesta.' },
      { titulo: 'Base', texto: 'Flexione os joelhos com o peso na ponta dos pés, bola no bolso.' },
      ARREMESSO_TEXTO.subida,
      ARREMESSO_TEXTO.soltura,
    ],
    quadros: [
      { d: 0, fase: 0, x: 330, pe: 'M', ...EM_PE, t: 8, ...PRONTO, bola: { m: 'em', x: 30, y: 190 } },
      { d: 550, fase: 0, chave: true, x: 330, pe: 'M', bola: { m: 'voo', para: 'mao', p: 1, alt: 15 } },
      { d: 350, fase: 1, x: 330, pe: 'M', ...CARGA, ...PEITO, bola: { m: 'peito' }, hl: ['pF', 'pT'] },
      ...arremesso(330, 2),
    ],
  },

  'Arremesso de três': {
    cena: { cesta: 'lado', linhas: [125] },
    fases: [
      { titulo: 'Chegada', texto: 'Chegue na linha de três com as mãos prontas para receber.' },
      { titulo: 'Passo 1-2', texto: 'Receba no primeiro passo e feche a base no segundo, já de frente para o aro.' },
      ARREMESSO_TEXTO.subida,
      ARREMESSO_TEXTO.soltura,
    ],
    quadros: [
      { d: 0, fase: 0, x: 56, ...CORRE_A, ...PRONTO, bola: { m: 'em', x: 610, y: 230 } },
      { d: 260, fase: 0, x: 68, ...CORRE_B, ...PRONTO, bola: { m: 'voo', para: 'mao', p: 0.5, alt: 30 } },
      { d: 260, fase: 1, x: 85, t: 10, cF: 30, kF: 5, cT: -25, kT: -55, ...PEITO, bola: { m: 'voo', para: 'mao', p: 1, alt: 30 }, hl: ['pF'] },
      { d: 240, fase: 1, x: 98, ...CARGA, ...PEITO, bola: { m: 'peito' }, hl: ['pF', 'pT'] },
      ...arremesso(100, 2),
    ],
  },

  'Arremesso após drible': {
    cena: { cesta: 'lado' },
    fases: [
      { titulo: 'Ataque no drible', texto: 'Um ou dois dribles fortes para a frente, bola baixa e protegida.' },
      { titulo: 'Parada', texto: 'Recolha a bola e pare em dois tempos, freando o corpo com a base larga.' },
      ARREMESSO_TEXTO.subida,
      ARREMESSO_TEXTO.soltura,
    ],
    quadros: [
      { d: 0, fase: 0, x: 150, ...BASE, ...DRIBLE, bola: mao(0) },
      ...correr([185, 220, 255], 0),
      { d: 240, fase: 1, x: 285, ...CARGA, t: 12, ...PEITO, bola: { m: 'peito' }, hl: ['pF', 'pT'] },
      ...arremesso(288, 2),
    ],
  },

  'Mikan drill': {
    vista: 'frente',
    cena: { cesta: 'frente' },
    fases: [
      { titulo: 'Bandeja pela direita', texto: 'Impulsione com a perna de fora, suba o joelho de dentro e solte com a mão do lado.' },
      { titulo: 'Recupere no alto', texto: 'Pegue a bola antes de ela cair, mantendo-a acima da cabeça.' },
      { titulo: 'Bandeja pela esquerda', texto: 'Um passo para o outro lado e a mesma bandeja com a outra mão.' },
      { titulo: 'Recupere e repita', texto: 'Pegue de novo no alto e volte para o primeiro lado sem parar.' },
    ],
    quadros: [
      { d: 0, fase: 0, x: 372, ...F_PE, bP: 160, aP: 175, bL: -165, aL: -175, bola: { m: 'cima' } },
      { d: 300, fase: 0, chave: true, x: 368, ar: 30, cT: -4, kT: 0, cF: 15, kF: -5, eF: 0.4, bP: 172, aP: 176, bL: -150, aL: -160, bola: { m: 'cima' }, hl: ['pT', 'bP'] },
      { d: 240, fase: 0, x: 366, ar: 34, bola: { m: 'voo', para: 'aro', p: 1, alt: 25 }, hl: ['bP'] },
      { d: 320, fase: 1, x: 358, ar: 0, ...F_BASE, bP: 165, aP: 178, bL: -165, aL: -178, bola: { m: 'voo', para: 'maoCima', p: 1 } },
      { d: 360, fase: 2, x: 308, ...F_PE, bP: 165, aP: 175, bL: -160, aL: -175, bola: { m: 'cima', lado: 'L' } },
      { d: 300, fase: 2, chave: true, x: 312, ar: 30, cF: 4, kF: 0, cT: -15, kT: 5, eT: 0.4, bL: -172, aL: -176, bP: 150, aP: 160, bola: { m: 'cima', lado: 'L' }, hl: ['pF', 'bL'] },
      { d: 240, fase: 2, x: 314, ar: 34, bola: { m: 'voo', para: 'aro', p: 1, alt: 25 }, hl: ['bL'] },
      { d: 320, fase: 3, x: 322, ar: 0, ...F_BASE, bP: 165, aP: 178, bL: -165, aL: -178, bola: { m: 'voo', para: 'maoCima', p: 1 } },
      { d: 360, fase: 3, x: 372, ...F_PE, bP: 160, aP: 175, bL: -165, aL: -175, bola: { m: 'cima' } },
    ],
  },

  'Bandeja com a mão fraca': {
    cena: { cesta: 'lado', linhas: [125] },
    fases: [
      { titulo: 'Ataque no drible', texto: 'Saia da linha de três driblando com a mão fraca.' },
      { titulo: 'Primeiro passo', texto: 'Recolha a bola com as duas mãos no primeiro passo.' },
      { titulo: 'Segundo passo', texto: 'O segundo passo é curto e serve de impulsão para subir.' },
      { titulo: 'Bandeja', texto: 'Suba o joelho de fora e solte a bola com a mão fraca, mirando o quadrado da tabela.' },
    ],
    quadros: [
      { d: 0, fase: 0, x: 140, ...BASE, ...DRIBLE, bola: mao(0) },
      ...correr([185, 230, 275, 320, 365, 410], 0),
      { d: 220, fase: 1, x: 460, t: 12, cF: 30, kF: 5, cT: -30, kT: -70, ...PEITO, bola: { m: 'peito' }, hl: ['pF'] },
      { d: 220, fase: 2, x: 510, t: 8, cT: 30, kT: 5, cF: -30, kF: -70, ...PEITO, bola: { m: 'peito' }, hl: ['pT'] },
      { d: 260, fase: 3, x: 560, ar: 38, t: 0, cT: -10, kT: -15, cF: 95, kF: 5, bP: 165, aP: 160, bL: 60, aL: 100, bola: { m: 'cima' }, hl: ['pT', 'bP'] },
      { d: 180, fase: 3, x: 582, ar: 42, bola: voo(0.5, 30), hl: ['bP'] },
      { d: 220, fase: 3, x: 596, ar: 26, bola: voo(1, 30) },
      { d: 320, fase: 3, x: 604, ar: 0, ...ATERRISSA, ...SOLTOS, bola: voo(1.4, 30) },
      { d: 700, fase: 3, x: 604, bola: voo(1.94, 30) },
    ],
  },

  'Drible estacionário': {
    vista: 'frente',
    cena: {},
    fases: [
      { titulo: 'Drible baixo', texto: 'Base larga, bola abaixo do joelho e quiques rápidos com a ponta dos dedos.' },
      { titulo: 'Drible alto', texto: 'Bola na altura da cintura, empurrando forte contra o chão.' },
      { titulo: 'Cruzado', texto: 'Troque de mão com um quique baixo pelo meio, na frente do corpo.' },
      { titulo: 'Entre as pernas', texto: 'Abra mais a base e passe a bola por baixo do corpo, de uma mão para a outra.' },
    ],
    quadros: [
      { d: 0, fase: 0, x: 340, pe: 'M', ...F_BASE, eF: 0.75, eT: 0.75, bP: 20, aP: 0, bL: -45, aL: -100, bola: mao(0) },
      { d: 220, fase: 0, x: 340, pe: 'M', bola: mao(1) },
      { d: 220, fase: 0, x: 340, pe: 'M', bola: mao(0) },
      { d: 220, fase: 0, x: 340, pe: 'M', bola: mao(1) },
      { d: 220, fase: 0, x: 340, pe: 'M', bola: mao(0) },
      { d: 300, fase: 1, x: 340, pe: 'M', cF: 14, kF: -3, cT: -14, kT: 3, eF: 0.95, eT: 0.95, bP: 25, aP: 115, bola: mao(0) },
      { d: 380, fase: 1, x: 340, pe: 'M', bola: mao(1) },
      { d: 380, fase: 1, x: 340, pe: 'M', bola: mao(0) },
      { d: 300, fase: 2, x: 340, pe: 'M', ...F_BASE, bP: 30, aP: 10, bL: -45, aL: -100, bola: mao(0) },
      { d: 220, fase: 2, x: 340, pe: 'M', bP: 20, aP: -10, bL: -30, aL: 10, bola: { m: 'em', x: 340, y: 293 } },
      { d: 220, fase: 2, x: 340, pe: 'M', bP: 45, aP: 100, bL: -30, aL: -10, bola: mao(0, 'L') },
      { d: 260, fase: 2, x: 340, pe: 'M', bola: mao(1, 'L') },
      { d: 260, fase: 2, x: 340, pe: 'M', bola: mao(0, 'L') },
      { d: 300, fase: 3, x: 340, pe: 'M', cF: 32, kF: -10, cT: -32, kT: 10, eF: 0.8, eT: 0.8, bL: -15, aL: 10, bola: mao(0, 'L') },
      { d: 220, fase: 3, x: 340, pe: 'M', bP: 15, aP: -10, bola: { m: 'em', x: 340, y: 293 } },
      { d: 220, fase: 3, x: 340, pe: 'M', bP: 30, aP: 10, bL: -45, aL: -100, bola: mao(0) },
      { d: 300, fase: 3, x: 340, pe: 'M', ...F_BASE, bola: mao(0) },
    ],
  },

  'Drible com duas bolas': {
    vista: 'frente',
    cena: {},
    fases: [
      { titulo: 'Simultâneo', texto: 'As duas bolas sobem e descem juntas, no mesmo ritmo.' },
      { titulo: 'Alternado', texto: 'Uma bola sobe enquanto a outra desce, como pedalar.' },
    ],
    quadros: [
      { d: 0, fase: 0, x: 340, pe: 'M', ...F_BASE, bP: 30, aP: 10, bL: -30, aL: -10, bola: mao(0), bola2: mao(0, 'L') },
      ...[1, 0, 1, 0, 1, 0].map((d): Quadro => ({ d: 240, fase: 0, x: 340, pe: 'M', bola: mao(d), bola2: mao(d, 'L') })),
      ...[1, 0, 1, 0, 1, 0, 1, 0].map((d): Quadro => ({ d: 240, fase: 1, x: 340, pe: 'M', bola: mao(d), bola2: mao(1 - d, 'L') })),
      { d: 240, fase: 1, x: 340, pe: 'M', bola: mao(0), bola2: mao(0, 'L') },
    ],
  },

  'Zigue-zague com mudança de direção': {
    cena: { cones: [{ x: 200, prof: -1 }, { x: 330, prof: 1 }, { x: 460, prof: -1 }] },
    fases: [
      { titulo: 'Drible até o cone', texto: 'Ataque o cone em diagonal, com a bola na mão de fora.' },
      { titulo: 'Plante e cruze', texto: 'Finque o pé de fora ao lado do cone e cruze a bola baixa para a outra mão.' },
      { titulo: 'Saída explosiva', texto: 'Empurre com a perna de apoio e saia para o próximo cone com a nova mão.' },
    ],
    quadros: [
      { d: 0, fase: 0, x: 70, prof: 0, ...BASE, ...DRIBLE, bola: mao(0) },
      ...correr([105, 140, 172], 0, 'drible', (i) => ({ prof: -0.3 * (i + 1) })),
      { d: 220, fase: 1, x: 196, prof: -1, t: 22, cF: 40, kF: -5, cT: -30, kT: -50, bP: 20, aP: -5, bL: 35, aL: 60, bola: { m: 'em', x: 205, y: 293 }, hl: ['pF'] },
      ...correr([232, 266, 300], 2, 'drible-L', (i) => ({ prof: -0.6 + 0.5 * i, ...(i === 0 ? { hl: ['pT'] } : {}) })),
      { d: 220, fase: 1, x: 326, prof: 1, t: 22, cF: 40, kF: -5, cT: -30, kT: -50, bP: 35, aP: 60, bL: 20, aL: -5, bola: { m: 'em', x: 335, y: 293 }, hl: ['pF'] },
      ...correr([362, 396, 430], 2, 'drible', (i) => ({ prof: 0.6 - 0.5 * i, ...(i === 0 ? { hl: ['pT'] } : {}) })),
      { d: 220, fase: 1, x: 456, prof: -1, t: 22, cF: 40, kF: -5, cT: -30, kT: -50, bP: 20, aP: -5, bL: 35, aL: 60, bola: { m: 'em', x: 465, y: 293 }, hl: ['pF'] },
      ...correr([492, 526, 560], 2, 'drible-L', (i) => ({ prof: -0.6 + 0.3 * i })),
      { d: 600, fase: 2, x: 580, ...BASE, bL: 30, aL: 75, bP: 40, aP: 100, bola: mao(0, 'L') },
    ],
  },

  'Passe na parede': {
    cena: { parede: 590 },
    fases: [
      { titulo: 'Passe de peito', texto: 'Dê um passo à frente e estenda os braços, girando os polegares para baixo.' },
      { titulo: 'Passe picado', texto: 'Quique a bola a uns dois terços do caminho, para ela subir na altura da cintura.' },
      { titulo: 'Por cima da cabeça', texto: 'Bola acima da testa, cotovelos para a frente e passe com um estalo dos punhos.' },
    ],
    quadros: [
      { d: 0, fase: 0, x: 420, pe: 'M', t: 10, cF: 25, kF: 0, cT: -10, kT: -25, ...PEITO, bola: { m: 'peito' } },
      { d: 300, chave: true, fase: 0, x: 432, pe: 'M', cF: 40, kF: 10, bP: 85, aP: 90, bL: 85, aL: 92, bola: { m: 'voo', para: { x: 583, y: 205 }, p: 1 }, hl: ['bP', 'bL'] },
      { d: 380, fase: 0, x: 420, pe: 'M', cF: 25, kF: 0, ...PRONTO, bola: { m: 'voo', para: 'mao', p: 1 } },
      { d: 300, fase: 1, x: 420, pe: 'M', ...PEITO, bola: { m: 'peito' } },
      { d: 240, chave: true, fase: 1, x: 432, pe: 'M', cF: 40, kF: 10, bP: 60, aP: 70, bL: 60, aL: 72, bola: { m: 'voo', para: { x: 510, y: 293 }, p: 1 }, hl: ['bP', 'bL'] },
      { d: 200, fase: 1, x: 432, pe: 'M', bola: { m: 'voo', para: { x: 583, y: 232 }, p: 1 } },
      { d: 380, fase: 1, x: 420, pe: 'M', cF: 25, kF: 0, ...PRONTO, bola: { m: 'voo', para: 'mao', p: 1 } },
      { d: 350, fase: 2, x: 420, pe: 'M', bP: 175, aP: 205, bL: 170, aL: 200, bola: { m: 'cima' } },
      { d: 260, chave: true, fase: 2, x: 432, pe: 'M', cF: 40, kF: 10, bP: 120, aP: 110, bL: 118, aL: 108, bola: { m: 'voo', para: { x: 583, y: 160 }, p: 1 }, hl: ['bP', 'bL'] },
      { d: 400, fase: 2, x: 420, pe: 'M', cF: 25, kF: 0, ...PRONTO, bola: { m: 'voo', para: 'mao', p: 1 } },
      { d: 300, fase: 2, x: 420, pe: 'M', ...PEITO, bola: { m: 'peito' } },
    ],
  },

  'Deslizamento defensivo': {
    vista: 'frente',
    cena: { linhas: [170, Math.round(IDA.fim + 30)] },
    fases: [
      { titulo: 'Base baixa', texto: 'Pés afastados, quadril baixo, costas retas e braços abertos.' },
      { titulo: 'Passo de abertura', texto: 'Empurre com a perna de trás e abra o pé que lidera para o lado.' },
      { titulo: 'Recolha sem cruzar', texto: 'Traga o outro pé sem bater os calcanhares e sem subir o quadril.' },
      { titulo: 'Troque de lado', texto: 'Na linha, plante e volte deslizando para o outro lado.' },
    ],
    quadros: [
      { d: 0, fase: 0, x: 200, pe: 'M', t: 0, cF: 35, kF: -5, cT: -35, kT: 5, eF: 0.8, eT: 0.8, bP: 75, aP: 140, bL: -75, aL: -140 },
      { d: 400, fase: 0, x: 200, pe: 'M' },
      ...IDA.quadros,
      ...VOLTA.quadros,
    ],
  },

  Closeout: {
    cena: { parceiro: { dir: 1, x: 200, pose: { t: 3, ...SALTO, ...ARMAR } } },
    fases: [
      { titulo: 'Saída em velocidade', texto: 'Do garrafão, corra em direção ao arremessador nos primeiros dois terços.' },
      { titulo: 'Passos curtos', texto: 'Freie com passos curtos e rápidos, baixando o quadril.' },
      { titulo: 'Mão alta e base', texto: 'Chegue equilibrado a um braço de distância, com a mão alta no rosto da bola.' },
    ],
    quadros: [
      { d: 0, fase: 0, x: 560, dir: -1, ...BASE, ...SOLTOS, bola2: { m: 'em', x: 215, y: 130 } },
      ...correr([522, 480, 438, 396], 0, 'sem'),
      ...[372, 352, 336, 322].map((x, i): Quadro => ({ d: 150, fase: 1, x, t: 20, cF: i % 2 ? 35 : 25, kF: -10, cT: i % 2 ? -10 : -20, kT: -40, bP: 60, aP: 120, bL: 40, aL: 90, hl: ['pF', 'pT'] })),
      { d: 260, fase: 2, x: 300, ...BASE, t: 10, bP: 170, aP: 175, bL: 40, aL: 90, hl: ['bP'] },
      { d: 900, fase: 2, x: 300 },
    ],
  },

  Suicídio: {
    cena: { linhas: [80, 260, 440] },
    fases: [
      { titulo: 'Sprint', texto: 'Saia da linha de fundo em velocidade máxima até a primeira linha.' },
      { titulo: 'Toque a linha', texto: 'Abaixe o quadril e toque a linha com a mão, sem só passar por ela.' },
      { titulo: 'Vire e volte', texto: 'Gire o corpo, empurre com a perna de fora e volte até a linha de fundo.' },
      { titulo: 'Próxima linha', texto: 'Toque a linha de fundo e siga para a linha seguinte, cada vez mais longe.' },
    ],
    quadros: [
      { d: 0, fase: 0, x: 90, ...BASE, t: 30, ...SOLTOS },
      ...correr([122, 158, 194, 228], 0, 'sem'),
      { d: 220, fase: 1, x: 250, t: 70, cF: 85, kF: -15, cT: -20, kT: -90, bP: 0, aP: -5, bL: -20, aL: 0, hl: ['pF', 'pT'] },
      { d: 200, fase: 2, x: 250, dir: -1, ...BASE, t: 25, ...SOLTOS },
      ...correr([218, 182, 146, 112], 2, 'sem'),
      { d: 220, fase: 3, x: 90, t: 70, cF: 85, kF: -15, cT: -20, kT: -90, bP: 0, aP: -5, bL: -20, aL: 0, hl: ['pF', 'pT'] },
      { d: 200, fase: 3, x: 92, dir: 1, ...BASE, t: 25, ...SOLTOS },
      ...correr([126, 166, 206, 246, 286, 326, 366, 404], 3, 'sem'),
      { d: 220, fase: 3, x: 430, t: 70, cF: 85, kF: -15, cT: -20, kT: -90, bP: 0, aP: -5, bL: -20, aL: 0, hl: ['pF', 'pT'] },
      { d: 600, fase: 3, x: 430, ...BASE, ...SOLTOS },
    ],
  },

  'Saltos na caixa': {
    cena: { caixa: { x: 330, w: 80, h: 45 } },
    fases: [
      { titulo: 'Carregue', texto: 'Agache rápido levando os braços para trás, peso nos calcanhares e no meio do pé.' },
      { titulo: 'Salto explosivo', texto: 'Jogue os braços para cima e estenda quadril, joelhos e tornozelos de uma vez.' },
      { titulo: 'Aterrisse macio', texto: 'Caia com os dois pés na caixa, joelhos flexionados e alinhados com os pés.' },
      { titulo: 'Desça com controle', texto: 'Fique em pé na caixa e desça com cuidado antes da próxima repetição.' },
    ],
    quadros: [
      { d: 0, fase: 0, x: 280, pe: 'M', ...EM_PE, ...SOLTOS },
      { d: 420, fase: 0, chave: true, x: 280, pe: 'M', t: 35, cF: 70, kF: -15, cT: 60, kT: -22, bP: -60, aP: -40, bL: -55, aL: -35, hl: ['pF', 'pT'] },
      { d: 260, fase: 1, x: 318, ar: 50, ...SALTO, bP: 160, aP: 170, bL: 155, aL: 165, hl: ['pF', 'pT'] },
      { d: 220, fase: 1, x: 360, solo: 45, ar: 18, t: 10, cF: 50, kF: -10, cT: 40, kT: -20, bP: 120, aP: 120, bL: 115, aL: 115 },
      { d: 220, fase: 2, x: 368, solo: 45, ar: 0, t: 30, cF: 60, kF: -15, cT: 50, kT: -25, bP: 70, aP: 80, bL: 70, aL: 80, hl: ['pF', 'pT'] },
      { d: 450, fase: 2, x: 368, solo: 45, ...EM_PE, ...SOLTOS },
      { d: 420, fase: 3, x: 450, solo: 0, ...ATERRISSA, bP: 30, aP: 40, bL: 25, aL: 40 },
      { d: 700, fase: 3, x: 450, ...EM_PE, ...SOLTOS },
    ],
  },

  'Corta-luz com cadeira': {
    cena: { cesta: 'lado', cadeira: 330 },
    fases: [
      { titulo: 'Prepare o bloqueio', texto: 'Desacelere antes da cadeira para o defensor imaginário chegar perto.' },
      { titulo: 'Raspe na cadeira', texto: 'Passe colado na cadeira, ombro com ombro, sem deixar espaço.' },
      { titulo: 'Leia', texto: 'Saindo do bloqueio, recolha a bola e decida: arremesso, bandeja ou passe.' },
      ARREMESSO_TEXTO.soltura,
    ],
    quadros: [
      { d: 0, fase: 0, x: 150, ...BASE, ...DRIBLE, bola: mao(0) },
      { d: 320, fase: 0, x: 166, t: 5, cF: 20, kF: 0, cT: -10, kT: -20, bP: 25, aP: 100, bola: mao(1) },
      { d: 320, fase: 0, x: 176, bola: mao(0) },
      ...correr([215, 255, 295, 335, 375, 410], 1, 'drible', (i) => ({ prof: [0.2, 0.4, 0.6, 0.6, 0.3, 0][i], chave: i === 3 })),
      { d: 240, fase: 2, x: 435, ...CARGA, ...PEITO, bola: { m: 'peito' }, hl: ['pF', 'pT'] },
      ...arremesso(438, 2),
    ],
  },

  'Step-back de três': {
    cena: { cesta: 'lado', linhas: [150], parceiro: { dir: -1, x: 340, pose: { t: 15, cF: 30, kF: -5, cT: -5, kT: -25, bP: 160, aP: 175, bL: 60, aL: 100 } } },
    fases: [
      { titulo: 'Posição de ataque', texto: 'Drible baixo, joelhos flexionados, olhar na cesta.' },
      { titulo: 'Venda a infiltração', texto: 'Passo agressivo com o pé da frente, como se fosse atacar a cesta.' },
      { titulo: 'Freio', texto: 'Finque o pé da frente e trave o corpo. O defensor recua.' },
      { titulo: 'Empurrão para trás', texto: 'Empurre o chão com o pé da frente e salte para trás, já com a bola nas mãos.' },
      { titulo: 'Aterrissagem', texto: 'Caia com os dois pés juntos, atrás da linha, equilibrado e de frente para a cesta.' },
      { titulo: 'Subida', texto: 'Flexione as pernas, leve a bola ao ponto de arremesso e suba.' },
      { titulo: 'Arremesso', texto: 'Solte a bola no alto e segure o braço estendido.' },
    ],
    quadros: [
      { d: 0, fase: 0, x: 182, ...BASE, ...DRIBLE, bola: mao(0), px: 340 },
      { d: 300, fase: 0, x: 182, bola: mao(1) },
      { d: 300, fase: 0, x: 182, bola: mao(0) },
      { d: 450, fase: 1, x: 212, t: 25, cF: 50, kF: 18, cT: -40, kT: -55, bP: 35, aP: 60, bola: mao(1), hl: ['pF'], px: 335 },
      { d: 300, fase: 2, x: 220, t: 20, cF: 60, kF: -1, cT: -50, kT: -65, bP: 30, aP: 80, bL: 30, aL: 70, bola: mao(0), hl: ['pF'], px: 358 },
      { d: 280, fase: 3, x: 206, t: 0, cF: 50, kF: 25, cT: 30, kT: -50, ...PEITO, bola: { m: 'peito' }, hl: ['pF'] },
      { d: 220, fase: 3, x: 170, ar: 12, t: 0, cF: 25, kF: -5, cT: 0, kT: -20, bola: { m: 'peito' } },
      { d: 220, fase: 4, x: 128, pe: 'M', ar: 0, ...ATERRISSA, bola: { m: 'peito' }, hl: ['pF', 'pT'] },
      { d: 260, fase: 5, x: 128, pe: 'M', ...CARGA, bola: { m: 'peito' }, hl: ['pF', 'pT'] },
      ...arremesso(124, 5),
    ],
  },

  'Hesitação em linha reta': {
    cena: {},
    fases: [
      { titulo: 'Drible em velocidade', texto: 'Ataque em linha reta, bola baixa e à frente do corpo.' },
      { titulo: 'Hesitação', texto: 'Desacelere e erga o tronco por um instante, como se fosse parar ou arremessar.' },
      { titulo: 'Explosão', texto: 'Abaixe de novo e empurre forte com a perna de trás num primeiro passo longo.' },
    ],
    quadros: [
      { d: 0, fase: 0, x: 60, ...BASE, ...DRIBLE, bola: mao(0) },
      ...correr([100, 140, 180, 220], 0),
      { d: 360, fase: 1, x: 245, t: 2, cF: 20, kF: 0, cT: -10, kT: -20, bP: 20, aP: 100, bL: 30, aL: 80, bola: mao(1) },
      { d: 380, fase: 1, chave: true, x: 252, bola: mao(0) },
      { d: 220, fase: 2, x: 300, t: 30, cF: 50, kF: 10, cT: -45, kT: -60, bP: 35, aP: 55, bola: mao(1), hl: ['pT'] },
      ...correr([352, 404, 456, 508], 2, 'drible', (i) => ({ d: 180, t: 25 - i * 3 })),
      { d: 600, fase: 2, x: 540, ...BASE, ...DRIBLE, bola: mao(0) },
    ],
  },

  'Fadeaway do cotovelo': {
    cena: { cesta: 'lado' },
    fases: [
      { titulo: 'De costas para a cesta', texto: 'Base larga no cotovelo do garrafão, bola protegida embaixo do queixo.' },
      { titulo: 'Giro no pé de apoio', texto: 'Gire sobre o pé de apoio para ficar de frente para a cesta.' },
      { titulo: 'Arremesso caindo para trás', texto: 'Salte inclinando o corpo para trás e solte a bola alta, acima do defensor.' },
    ],
    quadros: [
      { d: 0, fase: 0, x: 470, pe: 'M', dir: -1, ...BASE, t: 20, cT: -15, kT: -35, ...PEITO, bola: { m: 'peito' } },
      { d: 300, fase: 0, x: 470, pe: 'M', bola: mao(1) },
      { d: 300, fase: 0, x: 470, pe: 'M', bola: { m: 'peito' } },
      { d: 300, fase: 1, x: 470, pe: 'M', dir: 1, ...BASE, ...PEITO, bola: { m: 'peito' }, hl: ['pF'] },
      { d: 260, fase: 2, x: 470, pe: 'M', ...CARGA, bola: { m: 'peito' }, hl: ['pF', 'pT'] },
      { d: 300, fase: 2, chave: true, x: 452, ar: 24, t: -12, cF: 35, kF: 20, cT: -8, kT: -10, ...ARMAR, bola: { m: 'cima' }, hl: ['pT'] },
      { d: 140, fase: 2, x: 444, ar: 26, t: -15, ...SOLTAR, bola: { m: 'cima' }, hl: ['bP'] },
      { d: 330, fase: 2, x: 436, ar: 14, ...FINAL, bola: voo(0.6, 80), hl: ['bP'] },
      { d: 360, fase: 2, x: 430, ar: 0, ...ATERRISSA, bola: voo(1, 80) },
      { d: 900, fase: 2, x: 430, ...SOLTOS, bola: voo(1.94, 80) },
    ],
  },

  'Floater em uma perna': {
    cena: { cesta: 'lado' },
    fases: [
      { titulo: 'Ataque no drible', texto: 'Ataque o garrafão em velocidade, com a bola protegida.' },
      { titulo: 'Salto em um pé', texto: 'A dois passos do aro, salte com um pé só, sem ir até debaixo da cesta.' },
      { titulo: 'Bola alta', texto: 'Solte cedo, com a ponta dos dedos, numa parábola alta por cima do pivô.' },
    ],
    quadros: [
      { d: 0, fase: 0, x: 300, ...BASE, ...DRIBLE, bola: mao(0) },
      ...correr([340, 380, 420], 0),
      { d: 220, fase: 1, x: 455, t: 12, cF: 30, kF: 5, cT: -30, kT: -70, ...PEITO, bola: { m: 'peito' }, hl: ['pF'] },
      { d: 260, fase: 1, chave: true, x: 488, ar: 26, t: 2, cF: -5, kF: -10, cT: 90, kT: 0, bP: 140, aP: 175, bL: 70, aL: 100, bola: { m: 'cima' }, hl: ['pF'] },
      { d: 160, fase: 2, x: 500, ar: 32, bP: 155, aP: 150, bola: { m: 'cima' }, hl: ['bP'] },
      { d: 420, fase: 2, x: 510, ar: 14, bola: voo(0.6, 140), hl: ['bP'] },
      { d: 380, fase: 2, x: 515, ar: 0, ...ATERRISSA, bola: voo(1, 140) },
      { d: 900, fase: 2, x: 515, ...SOLTOS, bola: voo(1.94, 140) },
    ],
  },

  'Bandeja com contato': {
    cena: { cesta: 'lado', parceiro: { dir: -1, x: 560, pose: { t: 20, cF: 35, kF: 0, cT: -5, kT: -30, bP: 80, aP: 80, bL: 80, aL: 85 } } },
    fases: [
      { titulo: 'Ataque', texto: 'Ataque a cesta em velocidade, driblando com a mão de fora.' },
      { titulo: 'Recolha com as duas mãos', texto: 'Pare em dois tempos com a bola firme no peito e os cotovelos abertos.' },
      { titulo: 'Absorva o contato', texto: 'Suba com as duas pernas e o ombro à frente, aceitando o choque sem soltar a bola.' },
      { titulo: 'Finalize', texto: 'Depois do contato, estenda o braço e termine na tabela.' },
    ],
    quadros: [
      { d: 0, fase: 0, x: 300, ...BASE, ...DRIBLE, bola: mao(0), px: 560 },
      ...correr([340, 380, 420], 0),
      { d: 220, fase: 1, x: 456, t: 15, cF: 30, kF: 5, cT: -30, kT: -70, ...PEITO, bola: { m: 'peito' } },
      { d: 220, fase: 1, x: 490, ...CARGA, ...PEITO, bola: { m: 'peito' }, hl: ['pF', 'pT'] },
      { d: 240, fase: 2, x: 505, ar: 20, ...SALTO, t: 8, ...PEITO, bola: { m: 'peito' }, hl: ['pF', 'pT'], px: 552 },
      { d: 260, fase: 3, x: 508, ar: 30, bP: 165, aP: 170, bL: 60, aL: 100, bola: { m: 'cima' }, hl: ['bP'], px: 568 },
      { d: 200, fase: 3, x: 512, ar: 32, bola: voo(0.5, 30), hl: ['bP'] },
      { d: 240, fase: 3, x: 514, ar: 12, bola: voo(1, 30) },
      { d: 300, fase: 3, x: 514, ar: 0, ...ATERRISSA, ...SOLTOS, bola: voo(1.4, 30), px: 575 },
      { d: 700, fase: 3, x: 514, bola: voo(1.94, 30) },
    ],
  },

  'Eurostep entre cones': {
    cena: { cesta: 'lado', cones: [{ x: 440, prof: 0 }] },
    fases: [
      { titulo: 'Ataque', texto: 'Ataque em linha reta na direção do cone, como se fosse passar por cima dele.' },
      { titulo: 'Primeiro passo', texto: 'Recolha a bola e dê um passo longo para um lado, levando o "defensor".' },
      { titulo: 'Segundo passo', texto: 'Cruze para o outro lado com o segundo passo, passando a bola de lado.' },
      { titulo: 'Bandeja longe do defensor', texto: 'Suba com o joelho de dentro e finalize protegendo a bola com o corpo.' },
    ],
    quadros: [
      { d: 0, fase: 0, x: 250, prof: 0, ...BASE, ...DRIBLE, bola: mao(0) },
      ...correr([290, 330, 370], 0),
      { d: 240, fase: 1, x: 415, prof: -1, t: 15, cF: 35, kF: 5, cT: -30, kT: -70, ...PEITO, bola: { m: 'peito' }, hl: ['pF'] },
      { d: 260, fase: 2, x: 470, prof: 1, t: 12, cT: 35, kT: 5, cF: -30, kF: -70, ...PEITO, bola: { m: 'peito' }, hl: ['pT'] },
      { d: 260, fase: 3, x: 520, ar: 36, t: 0, cT: -10, kT: -15, cF: 95, kF: 5, bP: 165, aP: 160, bL: 60, aL: 100, bola: { m: 'cima' }, hl: ['pT', 'bP'] },
      { d: 180, fase: 3, x: 540, ar: 40, bola: voo(0.5, 40), hl: ['bP'] },
      { d: 220, fase: 3, x: 552, ar: 22, bola: voo(1, 40) },
      { d: 300, fase: 3, x: 560, ar: 0, ...ATERRISSA, ...SOLTOS, bola: voo(1.4, 40) },
      { d: 700, fase: 3, x: 560, bola: voo(1.94, 40) },
    ],
  },

  'Trabalho de pés no poste baixo': {
    cena: { cesta: 'lado' },
    fases: [
      { titulo: 'Posição de costas', texto: 'De costas para a cesta, base larga e bola protegida embaixo do queixo.' },
      { titulo: 'Drop step', texto: 'Leve o pé de trás para perto da cesta, prendendo o defensor nas costas.' },
      { titulo: 'Meia-volta', texto: 'Gire sobre esse pé, ficando de frente para o aro com a bola protegida.' },
      { titulo: 'Finalize', texto: 'Suba com as duas pernas e termine com bandeja ou gancho.' },
    ],
    quadros: [
      { d: 0, fase: 0, x: 540, pe: 'M', dir: -1, ...BASE, t: 20, cF: 35, kF: -5, cT: -15, kT: -35, ...PEITO, bola: { m: 'peito' } },
      { d: 320, fase: 0, x: 540, pe: 'M', bola: mao(1) },
      { d: 320, fase: 0, x: 540, pe: 'M', bola: { m: 'peito' } },
      { d: 320, fase: 1, x: 560, t: 15, cT: -45, kT: -40, bola: { m: 'peito' }, hl: ['pT'] },
      { d: 280, fase: 2, x: 572, dir: 1, ...CARGA, ...PEITO, bola: { m: 'peito' }, hl: ['pF', 'pT'] },
      { d: 280, fase: 3, x: 585, ar: 30, ...SALTO, bP: 165, aP: 170, bL: 60, aL: 100, bola: { m: 'cima' }, hl: ['pF', 'pT', 'bP'] },
      { d: 200, fase: 3, x: 592, ar: 34, bola: voo(0.5, 25), hl: ['bP'] },
      { d: 220, fase: 3, x: 595, ar: 16, bola: voo(1, 25) },
      { d: 300, fase: 3, x: 595, ar: 0, ...ATERRISSA, ...SOLTOS, bola: voo(1.4, 25) },
      { d: 700, fase: 3, x: 595, bola: voo(1.94, 25) },
    ],
  },

  'Corre e arremessa': {
    cena: { cesta: 'lado', linhas: [125], cones: [{ x: 52 }, { x: 112 }] },
    fases: [
      { titulo: 'Corra até a linha', texto: 'Sprint do cone de trás até o cone na linha de três.' },
      { titulo: 'Pare e receba', texto: 'Freie em base equilibrada, de frente para a cesta, com as mãos prontas.' },
      { titulo: 'Arremesso de três', texto: 'Suba direto da recepção, sem driblar.' },
      { titulo: 'Volte ao outro cone', texto: 'Depois de soltar, corra de volta ao cone de trás e repita.' },
    ],
    quadros: [
      { d: 0, fase: 0, x: 58, ...CORRE_A, bP: -35, aP: 10, bL: 40, aL: 110 },
      ...correr([72, 86], 0, 'sem'),
      { d: 220, fase: 1, x: 98, ...CARGA, ...PRONTO, bola: { m: 'em', x: 610, y: 230 } },
      { d: 480, fase: 1, chave: true, x: 98, bola: { m: 'voo', para: 'mao', p: 1, alt: 40 } },
      { d: 200, fase: 1, x: 98, ...PEITO, bola: { m: 'peito' }, hl: ['pF', 'pT'] },
      ...arremesso(98, 2, 110, {}, 2).slice(0, 4),
      { d: 220, fase: 3, x: 96, dir: -1, ...BASE, ...SOLTOS, bola: voo(1.4) },
      ...correr([82, 68], 3, 'sem', () => ({ bola: NO_CHAO })),
      { d: 400, fase: 3, x: 58, dir: -1, ...BASE, ...SOLTOS, bola: NO_CHAO },
    ],
  },
}

/** Coreografia do exercício, se for um exercício do catálogo padrão. */
export function coreografiaDe(nome: string, personalizado: boolean) {
  return personalizado ? undefined : COREOGRAFIAS[nome]
}

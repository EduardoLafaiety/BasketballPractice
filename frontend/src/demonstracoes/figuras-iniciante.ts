// Figuras do nível iniciante: controle de bola e a forma certa de arremessar.
import type { Coreografia } from './motor'
import {
  AGACHA, ANDA_A, armar, ARMAR, arremessoParado, ATERRISSA, BASE, CARGA, carga, ciclo, DEFESA, em, emVolta, EM_PE, ex, F_BASE, F_DEFESA, F_PE, F_SOLTOS,
  FINAL, mao, MAO_LIVRE, passadas, passe, passoDois, passoUm, PEITO, PERNAS, PRONTO, quiques, receber, SALTO, SOLTAR, SOLTOS, soltura, subidaBandeja, trecho, trocar, voo,
} from './pecas'

const SENTADO = { t: 8, cF: 95, kF: 85, cT: 92, kT: 82 }
const SENTADO_CADEIRA = { t: 3, cF: 88, kF: 3, cT: 85, kT: 0 }
const AJOELHADO = { t: 8, cF: 75, kF: 5, cT: -5, kT: -92 }

export const FIGURAS_INICIANTE: Record<string, Coreografia> = {
  'Toques na ponta dos dedos': ex('frente', {}, [
    ['Braços à frente', 'Braços quase estendidos, com a bola na altura do peito.', [{ x: 340, pe: 'M', ...F_BASE, bP: 70, aP: 80, bL: -70, aL: -80, bola: em(340, 190) }]],
    ['Toque de um lado', 'Empurre a bola só com os dedos para a outra mão, sem ela encostar na palma.', ciclo([
      { x: 340, pe: 'M', bP: 62, aP: 68, bL: -78, aL: -92, bola: em(372, 190) },
      { x: 340, pe: 'M', bP: 78, aP: 92, bL: -62, aL: -68, bola: em(308, 190) },
    ], 4, 180)],
    ['Suba e desça', 'Mantendo os toques, suba a bola acima da cabeça e volte para a cintura.', [
      { d: 300, bP: 130, aP: 145, bL: -150, aL: -165, bola: em(362, 130) }, { d: 300, bP: 150, aP: 165, bL: -130, aL: -145, bola: em(318, 130) },
      { d: 400, bP: 35, aP: 60, bL: -50, aL: -80, bola: em(362, 235) }, { d: 300, bP: 50, aP: 80, bL: -35, aL: -60, bola: em(318, 235) },
    ]],
  ]),
  'Bola ao redor da cintura': ex('frente', {}, [
    ['Postura', 'Em pé, joelhos levemente flexionados e olhar para a frente.', [{ x: 340, pe: 'M', ...F_PE, cF: 12, cT: -12, bP: 25, aP: -40, bL: -25, aL: 40, bola: em(340, 228) }]],
    ['Em volta', 'Passe a bola de uma mão para a outra pelas costas, sem deixar cair.', emVolta(228, 30)],
    ['Inverta', 'Depois de algumas voltas, gire no sentido contrário e acelere aos poucos.', emVolta(228, 30, { d: 180 })],
  ]),
  'Bola ao redor da cabeça': ex('frente', {}, [
    ['Bola no alto', 'Leve a bola acima da testa, com as duas mãos.', [{ x: 340, pe: 'M', ...F_PE, cF: 12, cT: -12, bP: 170, aP: 200, bL: -170, aL: -200, bola: em(340, 142) }]],
    ['Em volta da cabeça', 'Passe a bola por trás da nuca, de uma mão para a outra, com o queixo reto.', emVolta(150, 28, { alto: true, d: 280 })],
    ['Inverta', 'Troque o sentido, sem abaixar a cabeça.', emVolta(150, 28, { alto: true, d: 220 })],
  ]),
  'Bola ao redor dos joelhos': ex('frente', {}, [
    ['Abaixe', 'Flexione os joelhos, com o tronco inclinado e as costas retas.', [{ x: 340, pe: 'M', t: 0, cF: 25, kF: -15, cT: -25, kT: 15, eF: 0.75, eT: 0.75, bP: 10, aP: -10, bL: -10, aL: 10, bola: em(340, 262) }]],
    ['Em volta das pernas', 'Passe a bola pela frente e por trás dos joelhos, sem levantar o quadril.', emVolta(262, 26, { baixo: true, d: 260 })],
  ]),
  'Oito entre as pernas': ex('frente', {}, [
    ['Base larga', 'Abra bem as pernas, abaixe o quadril e segure a bola com uma mão.', [{ x: 340, pe: 'M', t: 0, cF: 34, kF: -14, cT: -34, kT: 14, eF: 0.8, eT: 0.8, bP: 20, aP: 0, bL: -20, aL: 0, bola: em(368, 265) }]],
    ['Passe por dentro', 'Leve a bola por entre as pernas, de trás para a frente, para a outra mão.', ciclo([
      { x: 340, pe: 'M', bP: 8, aP: -15, bL: -8, aL: 15, bola: em(340, 268) },
      { x: 340, pe: 'M', bP: 8, aP: 0, bL: -28, aL: -10, bola: em(310, 265) },
      { x: 340, pe: 'M', bP: 8, aP: -15, bL: -8, aL: 15, bola: em(340, 268) },
      { x: 340, pe: 'M', bP: 28, aP: 10, bL: -8, aL: 0, bola: em(370, 265) },
    ], 3, 260)],
  ]),
  'Drible parado com a mão direita': ex('frente', {}, [
    ['Base', 'Pés afastados, joelhos flexionados e a outra mão à frente.', [{ x: 340, pe: 'M', ...F_BASE, bP: 20, aP: 0, bL: -45, aL: -100, bola: mao(0) }]],
    ['Dedos, não palma', 'Empurre a bola com a ponta dos dedos, sem bater nela.', quiques('P', 4, { d: 300 })],
    ['Abaixe', 'Desça o quadril e deixe o quique mais curto e mais rápido.', quiques('P', 5, { d: 190 })],
  ]),
  'Drible parado com a mão esquerda': ex('frente', {}, [
    ['Base', 'A mesma base, agora com a bola na outra mão.', [{ x: 340, pe: 'M', ...F_BASE, bL: -20, aL: 0, bP: 45, aP: 100, bola: mao(0, 'L') }]],
    ['Sem pressa', 'Devagar no começo: o que importa é não olhar para a bola.', quiques('L', 4, { d: 320 })],
    ['Mais rápido', 'Acelere só quando a mão já estiver segura.', quiques('L', 5, { d: 210 })],
  ]),
  'Drible ajoelhado': ex('lado', {}, [
    ['Um joelho no chão', 'Apoie um joelho e mantenha as costas retas.', [{ x: 340, pe: 'F', ...AJOELHADO, bP: 15, aP: 45, bL: 50, aL: 100, bola: mao(0) }]],
    ['Quiques curtos', 'A bola quase não sobe: mantenha o quique bem perto do chão.', ciclo([{ bola: mao(1) }, { bola: mao(0) }], 6, 170)],
    ['Passe por baixo', 'Leve a bola por baixo da perna para a outra mão e continue.', [{ d: 280, bola: em(320, 290), hl: ['bP'] }, { d: 280, bola: mao(0) }, ...ciclo([{ bola: mao(1) }, { bola: mao(0) }], 3, 170)]],
  ]),
  'Drible sentado': ex('lado', {}, [
    ['Sente', 'Sente no chão com as pernas à frente e as costas retas.', [{ x: 300, ...SENTADO, bP: 20, aP: 30, bL: 60, aL: 80, bola: mao(0) }]],
    ['Ao lado do quadril', 'Dribles curtos e rápidos, só com a ponta dos dedos.', ciclo([{ bola: mao(1) }, { bola: mao(0) }], 7, 160)],
  ]),
  'Drible de proteção': ex('lado', { parceiro: { dir: -1, x: 400, pose: { t: 18, cF: 42, kF: -6, cT: -8, kT: -40, bP: 70, aP: 90, bL: 50, aL: 90 } } }, [
    ['Coloque o corpo na frente', 'Fique de lado para o defensor, com a bola do lado de longe.', [{ x: 340, dir: -1, ...BASE, t: 18, cF: 42, kF: -6, cT: -18, kT: -40, bP: -12, aP: 30, bL: 65, aL: 80, bola: mao(0) }]],
    ['Braço de escudo', 'O braço livre fica à frente, sem empurrar, afastando a mão do defensor.', ciclo([{ bola: mao(1) }, { bola: mao(0) }], 4, 200)],
    ['Recue no drible', 'Se ele avançar, recue sem deixar de proteger a bola.', [{ d: 320, x: 310, bola: mao(1), px: 370 }, { d: 240, bola: mao(0) }, { d: 320, x: 280, bola: mao(1), px: 340 }, { d: 240, bola: mao(0) }]],
  ]),
  'Cruzado parado': ex('frente', {}, [
    ['Drible de um lado', 'Dois quiques baixos com a mão direita, com a base larga.', [{ x: 340, pe: 'M', ...F_BASE }, ...quiques('P', 2)]],
    ['Quique no meio', 'Empurre a bola em V, baixa, pela frente do corpo.', trocar('L')],
    ['Receba do outro lado', 'Pegue com a outra mão, sem subir o tronco, e repita voltando.', [...quiques('L', 2), ...trocar('P'), ...quiques('P', 2), ...trocar('L')]],
  ]),
  'Drible caminhando com a mão forte': ex('lado', { linhas: [70, 620] }, [
    ['Comece', 'Bola na mão dominante, à frente do pé e um pouco para o lado.', [{ x: 80, ...ANDA_A, bP: 30, aP: 75, bL: 40, aL: 110, bola: mao(0) }]],
    ['Caminhe', 'Um quique a cada passo, sem olhar para baixo.', passadas(trecho(80, 610, 14), { andar: true })],
  ]),
  'Drible caminhando com a mão fraca': ex('lado', { linhas: [70, 620] }, [
    ['Troque de mão', 'Agora na mão fraca: comece bem mais devagar.', [{ x: 80, ...ANDA_A, bL: 30, aL: 75, bP: 35, aP: 100, bola: mao(0, 'L') }]],
    ['Paciência', 'Mesmo ritmo do começo ao fim, mesmo que pareça lento.', passadas(trecho(80, 610, 14), { andar: true, bola: 'L', d: 340 })],
  ]),
  'Drible em linha reta': ex('lado', { linhas: [60, 630] }, [
    ['Bola à frente', 'Empurre a bola um pouco à frente do corpo para poder correr.', [{ x: 70, ...BASE, bP: 30, aP: 75, bL: 40, aL: 110, bola: mao(0) }]],
    ['Trote', 'Quique na altura da cintura, olhando para o outro lado da quadra.', passadas(trecho(70, 620, 13), { d: 230 })],
  ]),
  'Parada em dois tempos': ex('lado', {}, [
    ['Drible em trote', 'Venha driblando em ritmo tranquilo.', [{ x: 150, ...BASE, bP: 30, aP: 75, bL: 40, aL: 110, bola: mao(0) }, ...passadas(trecho(150, 320, 5), { d: 230 })]],
    ['Tempo um', 'Pegue a bola com as duas mãos e plante o primeiro pé.', [{ d: 260, x: 360, t: 14, cF: 35, kF: 5, cT: -30, kT: -70, ...PEITO, bola: { m: 'peito' }, hl: ['pF'] }]],
    ['Tempo dois', 'Traga o outro pé e pare equilibrado, com os joelhos flexionados e sem andar.', [{ d: 300, x: 395, pe: 'M', ...CARGA, ...PEITO, hl: PERNAS }, { d: 800 }]],
  ]),
  'Troca de mão entre cones': ex('lado', { cones: [{ x: 200 }, { x: 340 }, { x: 480 }] }, [
    ['Caminhe até o cone', 'Drible com a mão de fora, olhando para a frente.', [{ x: 90, ...ANDA_A, bP: 30, aP: 75, bL: 40, aL: 110, bola: mao(0) }, ...passadas(trecho(90, 175, 3), { andar: true })]],
    ['Troque no cone', 'Ao chegar no cone, passe a bola baixa para a outra mão.', [{ d: 260, x: 200, ...ANDA_A, bola: em(210, 292) }, ...passadas(trecho(200, 315, 3), { andar: true, bola: 'L' })]],
    ['Siga trocando', 'Repita em cada cone, sempre com a bola longe do cone.', [{ d: 260, x: 340, ...ANDA_A, bola: em(350, 292) }, ...passadas(trecho(340, 455, 3), { andar: true }), { d: 260, x: 480, ...ANDA_A, bola: em(490, 292) }, ...passadas(trecho(480, 595, 3), { andar: true, bola: 'L' })]],
  ]),
  'Mecânica do arremesso sem bola': ex('lado', {}, [
    ['Pés e joelhos', 'Pés na largura dos ombros, um pouco à frente o do lado da mão de arremesso.', [{ x: 340, pe: 'M', ...EM_PE, bP: 30, aP: 120, bL: 35, aL: 115 }, { d: 500, x: 340, pe: 'M', ...CARGA, hl: PERNAS }]],
    ['Cotovelo alinhado', 'Suba com o cotovelo apontado para a cesta, formando um L com o braço.', [{ d: 550, x: 340, pe: 'M', t: 3, cF: 15, kF: 0, cT: -4, kT: -8, bP: 120, aP: 210, bL: 110, aL: 180, hl: ['bP'] }]],
    ['Extensão e punho', 'Estenda o braço e quebre o punho, como se pegasse um biscoito do pote.', [{ d: 300, x: 340, pe: 'M', ...SALTO, ...SOLTAR, hl: ['bP'] }, { d: 300, ...FINAL, hl: ['bP'] }, { d: 900 }, { d: 500, x: 340, pe: 'M', ...EM_PE, bP: 30, aP: 120, bL: 35, aL: 115 }]],
  ]),
  'Arremesso deitado para o alto': ex('lado', {}, [
    ['Deite de costas', 'Deite com o cotovelo apoiado no chão, formando um L com o braço.', [{ x: 300, t: -88, cF: 80, kF: -30, cT: 80, kT: -30, bP: 110, aP: 200, bL: -80, aL: -80, bola: { m: 'cima' } }]],
    ['Empurre para cima', 'Estenda o braço e solte a bola com o punho, sem usar a outra mão.', [{ d: 320, bP: 175, aP: 180, bola: { m: 'cima' }, hl: ['bP'] }, { d: 500, bola: em(258, 110) }]],
    ['Pegue de volta', 'A bola deve voltar reta para a sua mão: se fugir para o lado, ajuste o punho.', [{ d: 500, bola: { m: 'cima' } }, { d: 500, bP: 110, aP: 200 }]],
  ]),
  'Arremesso sentado na cadeira': ex('lado', { cesta: 'lado', cadeira: 502 }, [
    ['Sente', 'Sente com as costas retas e os pés no chão: as pernas não ajudam aqui.', [{ x: 500, ...SENTADO_CADEIRA, ...PEITO, bola: { m: 'peito' } }]],
    ['Só braço', 'Leve a bola acima da testa, com o cotovelo apontado para a frente.', [{ d: 520, ...ARMAR, bola: { m: 'cima' }, hl: ['bP'] }]],
    ['Punho no final', 'Solte com um estalo do punho e segure a mão apontando para o aro.', [{ d: 180, ...SOLTAR, hl: ['bP'] }, { d: 400, ...FINAL, bola: voo(0.6, 55), hl: ['bP'] }, { d: 400, bola: voo(1, 55) }, { d: 800, ...SOLTOS, bola: voo(1.94, 55) }]],
  ]),
  'Arremesso de uma mão': arremessoParado(575, [
    ['Só uma mão', 'Bola apoiada na mão de arremesso, com a outra longe da bola.'],
    ['Cotovelo reto', 'Suba com o cotovelo sob a bola, sem abri-lo para o lado.'],
    ['Punho quebrado', 'Solte pela ponta dos dedos e segure a mão no alto até a bola cair.'],
  ], { ar: 0, extra: MAO_LIVRE }),
  'Arremesso com a mão de apoio': arremessoParado(570, [
    ['Mão de apoio', 'A outra mão vai ao lado da bola, só para equilibrar.'],
    ['Subida junta', 'As duas mãos sobem juntas até acima da testa.'],
    ['Apoio não empurra', 'Na soltura, a mão de apoio sai sem girar a bola.'],
  ], { ar: 0 }),
  'Arremesso a um metro': arremessoParado(545, [
    ['Bola no bolso', 'Bola na altura da cintura, do lado da mão de arremesso.'],
    ['Movimento único', 'Pernas e braço sobem juntos, sem parar no meio.'],
    ['Olhe o aro', 'Mantenha o olhar no aro até a bola entrar.'],
  ], { ar: 4 }),
  'Arremesso a dois metros': arremessoParado(490, [
    ['Mais longe', 'Afaste-se sem mudar nada no movimento.'],
    ['Pernas dão a força', 'Flexione mais os joelhos em vez de forçar o braço.'],
    ['Arco alto', 'A bola deve subir bem: um arco baixo bate no aro e sai.'],
  ], { ar: 10 }),
  'Arremesso na tabela': arremessoParado(520, [
    ['Em diagonal', 'Fique em 45° com a cesta, onde a tabela ajuda.'],
    ['Mire no quadrado', 'Olhe para o canto de cima do quadrado da tabela, não para o aro.'],
    ['Toque suave', 'Solte com menos força: a bola bate na tabela e cai.'],
  ], { ar: 6 }),
  'Passo e arremesso': ex('lado', { cesta: 'lado' }, [
    ['Comece atrás', 'Fique um passo atrás do ponto de arremesso, com a bola no peito.', [{ x: 450, ...EM_PE, ...PEITO, bola: { m: 'peito' } }]],
    ['Passo curto', 'Pise à frente com o pé do lado da mão de arremesso e traga o outro pé.', [{ d: 300, x: 475, ...ANDA_A, bola: { m: 'peito' }, hl: ['pF'] }, carga(495)]],
    ['Suba no ritmo', 'Aproveite o embalo do passo para subir sem pausa.', [armar(495, 10)]],
    ['Solte', 'Estenda o braço e segure a mão apontando para o aro.', soltura(495, 12)],
  ]),
  'Passadas da bandeja sem bola': ex('lado', { cesta: 'lado' }, [
    ['Passo da direita', 'O primeiro passo é longo, como se recolhesse a bola.', [{ x: 400, ...EM_PE, ...PRONTO }, { d: 340, x: 450, t: 12, cF: 30, kF: 5, cT: -30, kT: -70, ...PRONTO, hl: ['pF'] }]],
    ['Passo da esquerda', 'O segundo passo é curto e serve para subir.', [{ d: 340, x: 490, t: 8, cT: 30, kT: 5, cF: -30, kF: -70, hl: ['pT'] }]],
    ['Suba o joelho', 'Suba o joelho de fora e estenda o braço para cima.', [{ d: 300, x: 525, ar: 34, t: 0, cT: -10, kT: -15, cF: 95, kF: 5, bP: 165, aP: 160, bL: 60, aL: 100, hl: ['pT', 'bP'] }, { d: 300, x: 545, ar: 0, ...ATERRISSA, ...SOLTOS }, { d: 700 }]],
  ]),
  'Bandeja de um passo': ex('lado', { cesta: 'lado' }, [
    ['Bem perto', 'Comece a um passo da cesta, com a bola segura nas duas mãos.', [{ x: 520, ...EM_PE, ...PEITO, bola: { m: 'peito' } }]],
    ['Um passo', 'Dê um único passo e use-o para subir.', [{ ...passoDois(555), d: 320 }]],
    ['Solte na tabela', 'Mire no canto do quadrado, com a mão por baixo da bola.', subidaBandeja(578, { ar: 26, alt: 22 })],
  ]),
  'Bandeja com a mão forte': ex('lado', { cesta: 'lado' }, [
    ['Dois dribles', 'Saia com dois dribles fortes na direção da cesta.', [{ x: 360, ...BASE, bP: 30, aP: 75, bL: 40, aL: 110, bola: mao(0) }, ...passadas(trecho(360, 450, 3), { d: 240 })]],
    ['Recolha', 'Pegue a bola com as duas mãos no primeiro passo.', [{ ...passoUm(495), d: 260 }]],
    ['Impulsão', 'O segundo passo é curto e empurra o corpo para cima.', [{ ...passoDois(540), d: 260 }]],
    ['Finalize', 'Suba o joelho e solte a bola com a mão dominante na tabela.', subidaBandeja(570)],
  ]),
  'Bandeja com dois pés': ex('lado', { cesta: 'lado' }, [
    ['Drible curto', 'Venha com um drible forte até perto da cesta.', [{ x: 450, ...BASE, bP: 30, aP: 75, bL: 40, aL: 110, bola: mao(0) }, ...passadas([490, 525], { d: 240 })]],
    ['Pare com os dois pés', 'Caia com os dois pés juntos, bola firme nas mãos.', [{ d: 280, x: 555, pe: 'M', ...CARGA, ...PEITO, bola: { m: 'peito' }, hl: PERNAS }]],
    ['Suba com tudo', 'Empurre com as duas pernas e solte a bola no alto.', [{ d: 280, x: 570, ar: 34, ...SALTO, bP: 165, aP: 170, bL: 60, aL: 100, bola: { m: 'cima' }, hl: PERNAS }, { d: 200, x: 576, ar: 36, bola: voo(0.5, 22), hl: ['bP'] }, { d: 240, ar: 16, bola: voo(1, 22) }, { d: 320, ar: 0, ...ATERRISSA, ...SOLTOS, bola: voo(1.4, 22) }, { d: 700, bola: voo(1.94, 22) }]],
  ]),
  'Joga na tabela e finaliza': ex('lado', { cesta: 'lado' }, [
    ['Jogue na tabela', 'De perto, jogue a bola alta na tabela com as duas mãos.', [{ x: 560, ...EM_PE, ...PEITO, bola: { m: 'peito' } }, { d: 320, ...ARMAR, bola: { m: 'voo', para: { x: 650, y: 50 }, p: 1, alt: 30 }, hl: ['bP', 'bL'] }]],
    ['Pegue no alto', 'Salte e pegue a bola acima da cabeça, antes de ela cair.', [{ d: 360, ar: 34, ...SALTO, ...ARMAR, bola: { m: 'voo', para: 'maoCima', p: 1 }, hl: PERNAS }]],
    ['Devolva sem descer', 'Ainda no ar ou logo ao tocar o chão, solte de novo na tabela.', [{ d: 220, ar: 30, ...SOLTAR, bola: voo(0.5, 22), hl: ['bP'] }, { d: 240, ar: 14, bola: voo(1, 22) }, { d: 320, ar: 0, ...ATERRISSA, ...SOLTOS, bola: voo(1.4, 22) }, { d: 700, bola: voo(1.94, 22) }]],
  ]),
  'Tripla ameaça': ex('lado', { cesta: 'lado' }, [
    ['Receba', 'Mãos prontas e pés já virados para a cesta.', receber(340)],
    ['Bola no bolso', 'Traga a bola para o quadril do lado forte, com os joelhos flexionados.', [{ d: 320, x: 340, pe: 'M', ...CARGA, bP: -5, aP: 70, bL: 15, aL: 90, bola: { m: 'peito' }, hl: PERNAS }]],
    ['Três opções', 'Dali você mostra o arremesso, o drible e o passe, sem mover o pé de apoio.', [
      { d: 340, ...ARMAR, bola: { m: 'cima' }, hl: ['bP'] }, { d: 300, bP: -5, aP: 70, bL: 15, aL: 90, bola: { m: 'peito' } },
      { d: 300, bP: 30, aP: 40, bola: mao(1) }, { d: 240, bP: -5, aP: 70, bola: { m: 'peito' } },
      { d: 340, bP: 85, aP: 90, bL: 85, aL: 92, bola: { m: 'peito' } }, { d: 300, bP: -5, aP: 70, bL: 15, aL: 90, bola: { m: 'peito' } },
    ]],
  ]),
  'Pivô de frente': ex('lado', {}, [
    ['Pé de apoio', 'Escolha o pé de apoio e pare com a bola protegida no peito.', [{ x: 340, pe: 'T', ...BASE, ...PEITO, bola: { m: 'peito' } }]],
    ['Gire para a frente', 'Passe o peito sobre o pé de apoio, levantando só o calcanhar.', [{ d: 380, x: 340, pe: 'T', dir: -1, hl: ['pT'] }, { d: 380, x: 340, pe: 'T', dir: 1, hl: ['pT'] }]],
    ['Sem arrastar', 'O pé de apoio não sai do lugar: é ele que marca o giro.', [{ d: 380, x: 340, pe: 'T', dir: -1, t: 22, hl: ['pT'] }, { d: 380, x: 340, pe: 'T', dir: 1, t: 15, hl: ['pT'] }, { d: 500 }]],
  ]),
  'Pivô de costas': ex('lado', { parceiro: { dir: -1, x: 410, pose: { t: 18, cF: 42, kF: -6, cT: -8, kT: -40, bP: 110, aP: 150, bL: 60, aL: 100 } } }, [
    ['Pressão à frente', 'O defensor chega perto: proteja a bola com os cotovelos abertos.', [{ x: 340, pe: 'T', ...BASE, ...PEITO, bola: { m: 'peito' } }]],
    ['Gire de costas', 'Leve as costas na direção dele, girando sobre o pé de apoio.', [{ d: 420, x: 340, pe: 'T', dir: -1, t: 20, hl: ['pT'] }]],
    ['Bola longe', 'Agora o corpo está entre ele e a bola: procure o passe.', [{ d: 800 }, { d: 420, x: 340, pe: 'T', dir: 1, t: 15, hl: ['pT'] }, { d: 300 }]],
  ]),
  'Passe de peito no alvo': ex('lado', { parede: 590 }, [
    ['Mãos em W', 'Polegares atrás da bola, à frente do peito.', [{ x: 400, pe: 'M', t: 10, cF: 25, kF: 0, cT: -10, kT: -25, ...PEITO, bola: { m: 'peito' } }]],
    ['Passo e extensão', 'Dê um passo, estenda os braços e gire os polegares para baixo.', passe(400, { x: 583, y: 205 })],
    ['Acerte o alvo', 'Mire um ponto na parede na altura do peito e repita sem errar o ponto.', passe(400, { x: 583, y: 205 })],
  ]),
  'Passe picado no alvo': ex('lado', { parede: 590 }, [
    ['Olhe o alvo', 'Olhe onde quer que a bola chegue, não para o chão.', [{ x: 400, pe: 'M', t: 10, cF: 25, kF: 0, cT: -10, kT: -25, ...PEITO, bola: { m: 'peito' } }]],
    ['Dois terços', 'Quique a dois terços do caminho, para a bola subir até a cintura.', passe(400, { x: 583, y: 232 }, 'picado')],
    ['Sem força demais', 'Se a bola subir acima do peito, solte com menos força.', passe(400, { x: 583, y: 232 }, 'picado')],
  ]),
  'Passe por cima no alvo': ex('lado', { parede: 590 }, [
    ['Bola acima da testa', 'Cotovelos para a frente e bola sobre a cabeça, nunca atrás dela.', [{ x: 400, pe: 'M', t: 10, cF: 25, kF: 0, cT: -10, kT: -25, ...PEITO, bola: { m: 'peito' } }]],
    ['Estalo de punhos', 'Dê um passo e solte só com os punhos e os antebraços.', passe(400, { x: 583, y: 205 }, 'cima')],
    ['Na altura do queixo', 'Mire alto: esse passe chega no queixo de quem recebe.', passe(400, { x: 583, y: 205 }, 'cima')],
  ]),
  'Passa e recebe com parceiro': ex('lado', { parceiro: { dir: -1, x: 540, pose: { t: 8, cF: 15, kF: 0, cT: -8, kT: -12, bP: 50, aP: 95, bL: 55, aL: 95 } } }, [
    ['Mãos prontas', 'Mostre as mãos antes de a bola chegar, um alvo para quem passa.', [{ x: 300, pe: 'M', t: 8, cF: 25, kF: 0, cT: -10, kT: -25, ...PEITO, bola: { m: 'peito' } }]],
    ['Passe', 'Passe de peito, com um passo curto à frente.', passe(300, { x: 525, y: 205 })],
    ['Receba e repita', 'Receba com as duas mãos, traga para o peito e repita com passe picado.', passe(300, { x: 525, y: 225 }, 'picado')],
  ]),
  'Base defensiva': ex('frente', {}, [
    ['Abra os pés', 'Pés mais abertos que os ombros, com o peso no meio do pé.', [{ x: 340, pe: 'M', ...F_PE, ...F_SOLTOS }, { d: 500, x: 340, pe: 'M', ...F_BASE }]],
    ['Desça o quadril', 'Sente em uma cadeira imaginária, com as costas retas e a cabeça alta.', [{ d: 500, x: 340, pe: 'M', ...F_DEFESA, hl: PERNAS }]],
    ['Segure', 'Fique baixo, com as mãos abertas: se doer a coxa, a base está certa.', [{ d: 1500, x: 340, pe: 'M', hl: PERNAS }, { d: 500, x: 340, pe: 'M', ...F_PE, ...F_SOLTOS }]],
  ]),
  'Mãos ativas': ex('frente', {}, [
    ['Base baixa', 'Comece na base defensiva, com as mãos abertas.', [{ x: 340, pe: 'M', ...F_DEFESA }]],
    ['Uma alta, uma baixa', 'Uma mão no alto, tapando o arremesso, e a outra baixa, na linha do passe.', ciclo([
      { x: 340, pe: 'M', bP: 165, aP: 175, bL: -55, aL: -90, hl: ['bP'] },
      { x: 340, pe: 'M', bP: 55, aP: 90, bL: -165, aL: -175, hl: ['bL'] },
    ], 5, 300)],
  ]),
  'Recuo defensivo': ex('lado', {}, [
    ['Base', 'Na base baixa, de frente para o ataque e de costas para a sua cesta.', [{ x: 500, ...DEFESA, bP: 65, aP: 110, bL: 40, aL: 90 }]],
    ['Corra de costas', 'Dê passos rápidos para trás, sem levantar o tronco.', [...[470, 440, 410, 380, 350, 320].map((x, i) => ({ d: 200, x, ...(i % 2 ? { t: 18, cF: 40, kF: -8, cT: -22, kT: -55 } : { t: 18, cF: 22, kF: -30, cT: -5, kT: -30 }) }))]],
    ['Pare equilibrado', 'Freie com o pé de trás e volte à base, pronto para deslizar.', [{ d: 300, x: 300, ...DEFESA, hl: PERNAS }, { d: 700 }]],
  ]),
  'Bloqueio de rebote parado': ex('lado', { parceiro: { dir: 1, x: 270, pose: { t: 10, cF: 20, kF: 0, cT: -8, kT: -18, bP: 150, aP: 170, bL: 145, aL: 165 } }, cesta: 'lado' }, [
    ['Olhe o adversário', 'Quando a bola subir, procure primeiro quem você está marcando.', [{ x: 300, dir: -1, ...BASE, bP: 60, aP: 100, bL: 60, aL: 100 }]],
    ['Gire e encoste', 'Gire sobre um pé e encoste as costas no corpo dele.', [{ d: 420, x: 310, dir: 1, ...DEFESA, bP: 75, aP: 95, bL: 70, aL: 100, hl: PERNAS }]],
    ['Empurre com o quadril', 'Base larga, braços abertos e quadril empurrando para trás.', [{ d: 500, x: 322, px: 262, hl: PERNAS }, { d: 500 }]],
    ['Agora pule', 'Só depois de segurar, suba e pegue a bola com as duas mãos.', [{ d: 300, x: 330, ar: 30, ...SALTO, ...ARMAR, bola: { m: 'voo', para: 'maoCima', p: 1 }, hl: PERNAS }, { d: 320, ar: 0, ...ATERRISSA, bP: 30, aP: 120, bL: 35, aL: 115, bola: { m: 'peito' } }, { d: 600 }]],
  ]),
  'Agachamento livre': ex('lado', {}, [
    ['Em pé', 'Pés na largura dos ombros, com os braços à frente para equilibrar.', [{ x: 340, pe: 'M', ...EM_PE, bP: 85, aP: 85, bL: 85, aL: 85 }]],
    ['Desça', 'Leve o quadril para trás, com os joelhos alinhados com os pés.', [{ d: 700, x: 340, pe: 'M', ...AGACHA, hl: PERNAS }]],
    ['Suba', 'Empurre o chão com o pé inteiro até ficar em pé.', [{ d: 600, x: 340, pe: 'M', ...EM_PE }, { d: 700, x: 340, pe: 'M', ...AGACHA, hl: PERNAS }, { d: 600, x: 340, pe: 'M', ...EM_PE }]],
  ]),
  'Prancha frontal': ex('lado', {}, [
    ['Apoie os antebraços', 'Cotovelos embaixo dos ombros, com os pés afastados.', [{ x: 340, t: 88, cF: -68, kF: -68, cT: -70, kT: -66, bP: 0, aP: 88, bL: 0, aL: 88, hl: ['bP'] }]],
    ['Corpo em linha', 'Contraia o abdômen e o glúteo: o quadril não sobe nem desce.', [{ d: 2400, hl: ['bP', 'bL'] }]],
  ]),
  'Pular corda': ex('frente', {}, [
    ['Punhos ao lado', 'Cotovelos colados no corpo: quem gira a corda são os punhos.', [{ x: 340, pe: 'M', ...F_PE, bP: 20, aP: 80, bL: -20, aL: -80 }]],
    ['Saltos curtos', 'Salte pouco, na ponta dos pés, sem dobrar muito os joelhos.', ciclo([{ x: 340, pe: 'M', ar: 12, bP: 25, aP: 95, bL: -25, aL: -95, hl: PERNAS }, { x: 340, pe: 'M', ar: 0, bP: 20, aP: 70, bL: -20, aL: -70 }], 7, 190)],
  ]),
  'Corrida entre as linhas': ex('lado', { linhas: [190, 480] }, [
    ['Corra', 'Saia em trote até a outra linha.', passadas(trecho(200, 445, 6), { bola: null, d: 220 })],
    ['Toque a linha', 'Abaixe o quadril e toque a linha com a mão.', [{ d: 240, x: 470, t: 65, cF: 80, kF: -15, cT: -20, kT: -85, bP: 0, aP: -5, bL: -20, aL: 0, hl: PERNAS }]],
    ['Volte', 'Gire e volte no mesmo ritmo, até a primeira linha.', [{ d: 220, dir: -1, ...BASE, ...SOLTOS }, ...passadas(trecho(450, 225, 6), { bola: null, d: 220 }), { d: 240, x: 205, t: 65, cF: 80, kF: -15, cT: -20, kT: -85, bP: 0, aP: -5, bL: -20, aL: 0, hl: PERNAS }]],
  ]),
}


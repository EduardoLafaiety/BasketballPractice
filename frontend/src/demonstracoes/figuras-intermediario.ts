// Figuras do nível intermediário: mudanças de direção, arremesso em movimento e leitura de jogo.
import type { Coreografia, Quadro } from './motor'
import {
  AFUNDO, armar, ARMAR, ATERRISSA, BASE, CARGA, carga, ciclo, CORRE_A, CORRE_B, DEFESA, deslizar, DRIBLE, em, EM_PE, ex, F_DEFESA, F_PE,
  mao, passadas, passe, passoDois, passoUm, PEITO, PERNAS, PRONTO, receber, SALTO, SOLTAR, SOLTOS, soltura, subidaBandeja, trecho, voo,
} from './pecas'

const ATAQUE = { ...BASE, ...DRIBLE, bola: mao(0) }
const CRUZA = (x: number, para: 'P' | 'L' = 'L'): Q[] => [
  { d: 220, x, t: 22, cF: 40, kF: -5, cT: -30, kT: -50, bP: 20, aP: -5, bL: 25, aL: 10, bola: em(x + 10, 293), hl: ['pF'] },
  { d: 200, x: x + 22, t: 25, cF: 50, kF: 10, cT: -45, kT: -60, ...(para === 'L' ? { bL: 30, aL: 75, bP: 35, aP: 90 } : { bP: 30, aP: 75, bL: 35, aL: 90 }), bola: mao(0, para), hl: ['pT'] },
]
const DEFENSOR = { t: 15, cF: 30, kF: -5, cT: -5, kT: -25, bP: 160, aP: 175, bL: 60, aL: 100 }
type Q = Partial<Quadro>
const POSTE = { ...BASE, t: 20, cF: 35, kF: -5, cT: -15, kT: -35, ...PEITO, bola: { m: 'peito' as const } }
const REVERSA = (x: number): Q[] => [
  { d: 260, x, ar: 36, t: -5, cT: -10, kT: -15, cF: 90, kF: 5, bP: 170, aP: 175, bL: 60, aL: 100, bola: { m: 'cima' }, hl: ['pT', 'bP'] },
  { d: 220, x: x + 16, dir: -1, ar: 40, bP: 165, aP: 150, bola: voo(0.5, 25), hl: ['bP'] },
  { d: 220, x: x + 24, ar: 20, bola: voo(1, 25) },
  { d: 320, x: x + 28, ar: 0, ...ATERRISSA, ...SOLTOS, bola: voo(1.4, 25) },
  { d: 700, bola: voo(1.94, 25) },
]
const ZIGUE = deslizar(170, 3, 1, [0, 0])
const ZAGUE = deslizar(ZIGUE.fim, 3, -1, [2, 2])

export const FIGURAS_INTERMEDIARIO: Record<string, Coreografia> = {
  'Mudança de ritmo': ex('lado', {}, [
    ['Trote', 'Comece em trote, com o drible alto e o tronco ereto.', [{ x: 60, ...ATAQUE }, ...passadas(trecho(60, 200, 5), { d: 260 })]],
    ['Sprint', 'De repente, baixe o quadril e empurre a bola à frente.', passadas(trecho(200, 400, 4), { d: 160 })],
    ['Trote de novo', 'Volte a erguer o tronco e freie o drible, sem parar.', passadas(trecho(400, 500, 3), { d: 280 })],
    ['Sprint final', 'Explosão de novo: a mudança é o que engana o defensor.', passadas(trecho(500, 620, 3), { d: 160 })],
  ]),
  'Cruzado em movimento': ex('lado', { cones: [{ x: 300 }] }, [
    ['Ataque', 'Saia driblando na direção do cone, com a mão de fora.', [{ x: 80, ...ATAQUE }, ...passadas(trecho(80, 270, 5))]],
    ['Plante e cruze', 'Finque o pé de fora e cruze baixo, abaixo do joelho.', CRUZA(295)],
    ['Saia baixo', 'Empurre com a perna de apoio e saia já com a outra mão.', passadas(trecho(320, 580, 6), { bola: 'L' })],
  ]),
  'Entre as pernas em movimento': ex('lado', {}, [
    ['Passada longa', 'Dribles em velocidade média, chegando com o pé da frente bem à frente.', [{ x: 80, ...ATAQUE }, ...passadas(trecho(80, 260, 5))]],
    ['Bola por baixo', 'Na passada longa, passe a bola entre as pernas para a outra mão.', [{ d: 240, x: 290, t: 25, cF: 50, kF: 5, cT: -40, kT: -60, bP: 10, aP: -10, bL: 15, aL: 0, bola: em(288, 280), hl: ['pF'] }, { d: 220, x: 320, ...CORRE_B, bL: 30, aL: 75, bP: 35, aP: 100, bola: mao(0, 'L') }]],
    ['Continue atacando', 'Sem parar o pé, siga com a nova mão e olhe a cesta.', passadas(trecho(320, 580, 6), { bola: 'L' })],
  ]),
  'Por trás das costas em movimento': ex('lado', {}, [
    ['Ataque', 'Drible forte com a mão de fora, ao lado do corpo.', [{ x: 80, ...ATAQUE }, ...passadas(trecho(80, 260, 5))]],
    ['Bola por trás', 'Empurre a bola por trás do quadril, com o punho, para a outra mão.', [{ d: 240, x: 290, t: 20, cF: 40, kF: 5, cT: -30, kT: -60, bP: -40, aP: -20, bL: -20, aL: 10, bola: em(262, 268), hl: ['bP'] }, { d: 220, x: 320, ...CORRE_B, bL: 30, aL: 75, bP: 35, aP: 100, bola: mao(0, 'L') }]],
    ['Saída', 'Saia no mesmo ritmo, com a bola já à frente na nova mão.', passadas(trecho(320, 580, 6), { bola: 'L' })],
  ]),
  'Drible de recuo': ex('lado', {}, [
    ['Ataque', 'Avance forte até o defensor imaginário fechar o caminho.', [{ x: 160, ...ATAQUE }, ...passadas(trecho(160, 340, 4))]],
    ['Recue dois passos', 'Sem virar o corpo, empurre com o pé da frente e dê dois passos para trás.', [{ d: 240, x: 310, ...BASE, t: 8, bP: 30, aP: 75, bola: mao(1), hl: ['pF'] }, { d: 240, x: 280, cF: 20, kF: -25, bola: mao(0) }, { d: 240, x: 250, ...BASE, t: 8, bola: mao(1) }, { d: 200, x: 250, bola: mao(0) }]],
    ['Ataque de novo', 'Com o espaço aberto, volte a atacar em velocidade.', passadas(trecho(250, 500, 6))],
  ]),
  'Finta de dentro para fora': ex('lado', { cones: [{ x: 300 }] }, [
    ['Ataque', 'Drible com a mão de fora, em velocidade média.', [{ x: 80, ...ATAQUE }, ...passadas(trecho(80, 260, 5))]],
    ['Finja o cruzado', 'Leve a bola para dentro e incline o ombro, como se fosse cruzar.', [{ d: 260, x: 290, t: 22, cF: 40, kF: -5, cT: -30, kT: -50, bP: 45, aP: 40, bola: em(310, 276), hl: ['pF'] }]],
    ['Traga de volta', 'Sem trocar de mão, empurre a bola para fora e passe pelo defensor.', [{ d: 220, x: 320, t: 25, cF: 50, kF: 10, cT: -45, kT: -60, bP: 30, aP: 70, bola: mao(0), hl: ['pT'] }, ...passadas(trecho(320, 580, 6))]],
  ]),
  'Giro com a bola': ex('lado', { cones: [{ x: 320 }] }, [
    ['Ataque', 'Saia na direção do cone, com a bola do lado de fora.', [{ x: 80, ...ATAQUE }, ...passadas(trecho(80, 280, 5))]],
    ['Plante', 'Finque o pé da frente ao lado do cone, com a bola perto do quadril.', [{ d: 220, x: 305, t: 22, cF: 40, kF: -5, cT: -30, kT: -50, bP: 15, aP: 60, bola: mao(0), hl: ['pF'] }]],
    ['Gire de costas', 'Gire sobre esse pé, trazendo a bola junto do corpo.', [{ d: 260, x: 322, dir: -1, t: 15, cF: 35, kF: -5, cT: -20, kT: -40, bP: 25, aP: 95, bL: 30, aL: 110, hl: ['pF'] }, { d: 220, x: 342, dir: 1, ...CORRE_A, bL: 30, aL: 75, bP: 35, aP: 100, bola: mao(0, 'L') }]],
    ['Saia na outra mão', 'Termine de frente para a cesta, driblando com a outra mão.', passadas(trecho(342, 590, 6), { bola: 'L' })],
  ]),
  'Receber e arremessar': ex('lado', { cesta: 'lado' }, [
    ['Pés prontos', 'Esteja de frente para a cesta antes de a bola chegar, com as mãos à frente.', receber(300)],
    ['Base', 'Receba já com os joelhos flexionados, sem baixar a bola.', [carga(300)]],
    ['Direto para cima', 'Suba direto, sem driblar e sem parar a bola.', [armar(300)]],
    ['Soltura', 'Estenda o braço e segure a mão apontando para o aro.', soltura(300)],
  ]),
  'Parada em um tempo e arremesso': ex('lado', { cesta: 'lado' }, [
    ['Corra com a bola', 'Dois dribles fortes em direção ao seu ponto.', [{ x: 170, ...ATAQUE }, ...passadas(trecho(170, 300, 3))]],
    ['Dois pés juntos', 'Salte baixo e caia com os dois pés ao mesmo tempo, já virado para a cesta.', [{ d: 230, x: 330, ar: 14, ...SALTO, ...PEITO, bola: { m: 'peito' } }, carga(350)]],
    ['Subida', 'Use a própria freada para subir, sem pausa.', [armar(350)]],
    ['Soltura', 'Solte no ponto mais alto, com o corpo reto.', soltura(350)],
  ]),
  'Finta de arremesso e um drible': ex('lado', { cesta: 'lado' }, [
    ['Tripla ameaça', 'Pare com a bola no bolso, de frente para a cesta.', [{ x: 240, ...CARGA, ...PEITO, bola: { m: 'peito' } }]],
    ['Mostre a bola', 'Leve a bola até a testa sem subir as pernas: é só a bola que sobe.', [{ d: 340, ...ARMAR, bola: { m: 'cima' }, hl: ['bP'] }, { d: 240, ...PEITO, bola: { m: 'peito' } }]],
    ['Um drible forte', 'Passe o defensor com um drible só, longo e baixo.', [{ d: 220, x: 290, t: 28, cF: 50, kF: 10, cT: -45, kT: -60, bP: 35, aP: 55, bola: mao(1), hl: ['pT'] }, { d: 220, x: 340, bola: mao(0) }]],
    ['Pare e suba', 'Recolha, pare equilibrado e arremesse.', [carga(370), armar(370), ...soltura(370)]],
  ]),
  'Arremesso saindo do bloqueio': ex('lado', { cesta: 'lado', cones: [{ x: 300 }] }, [
    ['Espere o bloqueio', 'Comece parado, com o corpo baixo, perto do cone.', [{ x: 170, ...BASE, ...PRONTO }, { d: 300 }]],
    ['Raspe o cone', 'Saia correndo colado no cone, ombro com ombro.', passadas(trecho(170, 320, 4), { bola: null })],
    ['Mãos prontas', 'Na saída, vire o peito para a cesta e mostre as mãos.', [{ d: 240, x: 350, ...CARGA, ...PRONTO, bola: em(640, 240), hl: PERNAS }, { d: 460, bola: { m: 'voo', para: 'mao', p: 1, alt: 18 } }]],
    ['Arremesse', 'Suba da recepção, sem driblar.', [armar(352), ...soltura(352)]],
  ]),
  'Volta ao mundo': ex('lado', { cesta: 'lado', linhas: [480, 330, 180] }, [
    ['Primeiro ponto', 'Comece perto da cesta e arremesse parado.', [{ x: 480, ...EM_PE, ...PEITO, bola: { m: 'peito' } }, carga(480), armar(480, 12), ...soltura(480, 14)]],
    ['Ande sem bola', 'Busque a próxima bola e chegue já virado para a cesta.', [{ d: 900, x: 330, ...EM_PE, ...PEITO, bola: { m: 'peito' } }, carga(330), armar(330), ...soltura(330)]],
    ['Último ponto', 'A cada ponto, mais longe: mesma mecânica, mais pernas.', [{ d: 900, x: 180, ...EM_PE, ...PEITO, bola: { m: 'peito' } }, carga(180), armar(180), ...soltura(180)]],
  ]),
  'Lance livre cansado': ex('lado', { cesta: 'lado', linhas: [80, 320] }, [
    ['Corrida curta', 'Corra até a linha de fundo e volte, para acelerar o coração.', passadas(trecho(320, 90, 6), { bola: null })],
    ['Respire', 'Volte para a linha e faça a sua rotina completa, sem pressa.', [{ d: 240, dir: 1, ...BASE, ...SOLTOS }, ...passadas(trecho(100, 280, 5), { bola: null }), { d: 300, x: 320, pe: 'M', t: 10, cF: 20, kF: 0, cT: -5, kT: -15, ...DRIBLE, bola: mao(0) }, { d: 340, x: 320, pe: 'M', bola: mao(1) }, { d: 340, x: 320, pe: 'M', bola: mao(0) }]],
    ['Mesma mecânica', 'Cansado, a tendência é usar só o braço: não abandone as pernas.', [{ d: 400, x: 320, pe: 'M', ...CARGA, ...PEITO, bola: { m: 'peito' }, hl: PERNAS }, { d: 340, x: 320, pe: 'M', ...SALTO, ar: 3, ...ARMAR, bola: { m: 'cima' }, hl: PERNAS }, ...soltura(320, 5).map((q) => ({ ...q, pe: 'M' as const }))]],
  ]),
  'Bandeja em velocidade': ex('lado', { cesta: 'lado', linhas: [60] }, [
    ['Saia rápido', 'Do meio da quadra, drible longo e forte, com poucos quiques.', [{ x: 70, ...ATAQUE }, ...passadas(trecho(70, 420, 6), { d: 170 })]],
    ['Recolha em velocidade', 'Pegue a bola sem frear e sem encurtar a passada.', [{ ...passoUm(470), d: 190 }, { ...passoDois(525), d: 190 }]],
    ['Suba para a frente', 'Sua velocidade vira salto: solte alto na tabela.', subidaBandeja(562, { ar: 42 })],
  ]),
  'Bandeja reversa': ex('lado', { cesta: 'lado' }, [
    ['Ataque pela linha de fundo', 'Vá reto, quase embaixo do aro.', [{ x: 300, ...ATAQUE }, ...passadas(trecho(300, 470, 4))]],
    ['Dois passos', 'Recolha e dê os dois passos, passando por baixo do aro.', [{ ...passoUm(520), d: 220 }, { ...passoDois(565), d: 220 }]],
    ['Solte do outro lado', 'Passe para o outro lado do aro e solte de costas, usando a tabela.', REVERSA(610)],
  ]),
  'Subida com força': ex('lado', { cesta: 'lado' }, [
    ['Um drible forte', 'Ombro à frente e um drible só, baixo e potente.', [{ x: 460, ...BASE, t: 25, ...DRIBLE, bola: mao(0) }, { d: 240, x: 510, t: 30, cF: 50, kF: 10, cT: -45, kT: -60, bola: mao(1), hl: ['pT'] }]],
    ['Pare com os dois pés', 'Plante os dois pés e leve a bola para o queixo, bem protegida.', [{ d: 240, x: 550, ...CARGA, t: 22, ...PEITO, bola: { m: 'peito' }, hl: PERNAS }]],
    ['Suba de dois pés', 'Empurre o chão com as duas pernas e solte com a mão alta.', [{ d: 280, x: 565, ar: 32, ...SALTO, bP: 165, aP: 170, bL: 110, aL: 150, bola: { m: 'cima' }, hl: PERNAS }, { d: 200, x: 570, ar: 34, bola: voo(0.5, 22), hl: ['bP'] }, { d: 240, ar: 14, bola: voo(1, 22) }, { d: 320, ar: 0, ...ATERRISSA, ...SOLTOS, bola: voo(1.4, 22) }, { d: 700, bola: voo(1.94, 22) }]],
  ]),
  'Gancho curto': ex('lado', { cesta: 'lado' }, [
    ['De lado para a cesta', 'Ombro apontado para a cesta, com a bola protegida embaixo do queixo.', [{ x: 530, pe: 'M', dir: -1, ...POSTE }]],
    ['Passo para o meio', 'Dê um passo cruzando para o meio do garrafão.', [{ d: 300, x: 550, t: 12, cF: 30, kF: 5, cT: -30, kT: -60, hl: ['pF'] }]],
    ['Braço estendido', 'Suba o joelho de dentro e leve a bola por cima, com o braço reto.', [{ d: 320, x: 565, ar: 30, t: -8, cF: 80, kF: 10, cT: -8, kT: -15, bP: 180, aP: 180, bL: 60, aL: 100, bola: { m: 'cima' }, hl: ['bP', 'pT'] }]],
    ['Solte no alto', 'Só o punho empurra a bola, por cima do defensor.', [{ d: 240, ar: 32, bP: 170, aP: 165, bola: voo(0.5, 50), hl: ['bP'] }, { d: 280, ar: 12, bola: voo(1, 50) }, { d: 320, ar: 0, ...ATERRISSA, ...SOLTOS, bola: voo(1.4, 50) }, { d: 700, bola: voo(1.94, 50) }]],
  ]),
  'Finta e passo por baixo': ex('lado', { cesta: 'lado', parceiro: { dir: -1, x: 600, pose: DEFENSOR } }, [
    ['Finta no alto', 'De frente para a cesta, mostre a bola para o defensor subir.', [{ x: 520, ...CARGA, ...PEITO, bola: { m: 'peito' } }, { d: 340, ...ARMAR, t: 5, bola: { m: 'cima' }, hl: ['bP'], px: 594 }]],
    ['Cruze por baixo', 'Traga a bola para baixo e cruze a perna de trás por baixo do braço dele.', [{ d: 300, x: 550, t: 30, cF: 50, kF: 10, cT: -45, kT: -60, ...PEITO, bola: { m: 'peito' }, hl: ['pT'] }]],
    ['Finalize', 'Suba do outro lado do defensor e termine com a bola na tabela.', subidaBandeja(578, { ar: 28, alt: 22 })],
  ]),
  'Mikan reverso': ex('frente', { cesta: 'frente' }, [
    ['De costas para a tabela', 'Bola no alto, debaixo do aro, de costas para a tabela.', [{ x: 372, pe: 'M', ...F_PE, bP: 160, aP: 175, bL: -165, aL: -175, bola: { m: 'cima' } }]],
    ['Reversa de um lado', 'Salte com a perna de fora e solte por trás da cabeça, com o punho.', [{ d: 300, x: 368, ar: 30, cT: -4, kT: 0, cF: 15, kF: -5, eF: 0.4, bP: 172, aP: 196, bL: -150, aL: -160, bola: { m: 'cima' }, hl: ['pT', 'bP'] }, { d: 240, x: 366, ar: 34, bola: { m: 'voo', para: 'aro', p: 1, alt: 25 }, hl: ['bP'] }, { d: 320, x: 358, ar: 0, cF: 6, kF: 0, cT: -6, kT: 0, eF: 1, eT: 1, bP: 165, aP: 178, bL: -165, aL: -178, bola: { m: 'voo', para: 'maoCima', p: 1 } }]],
    ['Reversa do outro lado', 'Um passo para o outro lado e o mesmo movimento com a outra mão.', [{ d: 360, x: 308, ...F_PE, bP: 165, aP: 175, bL: -160, aL: -175, bola: { m: 'cima', lado: 'L' } }, { d: 300, x: 312, ar: 30, cF: 4, kF: 0, cT: -15, kT: 5, eT: 0.4, bL: -172, aL: -196, bP: 150, aP: 160, bola: { m: 'cima', lado: 'L' }, hl: ['pF', 'bL'] }, { d: 240, x: 314, ar: 34, bola: { m: 'voo', para: 'aro', p: 1, alt: 25 }, hl: ['bL'] }, { d: 340, x: 322, ar: 0, ...F_PE, bP: 165, aP: 178, bL: -165, aL: -178, bola: { m: 'voo', para: 'maoCima', p: 1 } }]],
  ]),
  'Passe de peito em movimento': ex('lado', { parceiro: { dir: -1, x: 600, pose: { t: 8, cF: 15, kF: 0, cT: -8, kT: -12, bP: 50, aP: 95, bL: 55, aL: 95 } } }, [
    ['Ande e receba', 'Ande para a frente com as mãos prontas, olhando quem passa.', [{ x: 200, ...EM_PE, ...PEITO, bola: { m: 'peito' } }, ...passadas([225, 250], { bola: null, andar: true })]],
    ['Solte sem parar', 'Passe no ritmo dos pés, sem fincar o pé no chão.', [{ d: 300, x: 275, ...BASE, bP: 85, aP: 90, bL: 85, aL: 92, bola: { m: 'voo', para: { x: 585, y: 205 }, p: 1 }, hl: ['bP', 'bL'] }, { d: 300, x: 300, ...BASE, ...PRONTO }]],
    ['Receba de novo', 'Receba mais à frente e repita, ganhando terreno.', [{ d: 420, x: 325, bola: { m: 'voo', para: 'mao', p: 1 } }, { d: 300, x: 350, ...BASE, bP: 85, aP: 90, bL: 85, aL: 92, bola: { m: 'voo', para: { x: 585, y: 205 }, p: 1 }, hl: ['bP', 'bL'] }, { d: 300, x: 375, ...BASE, ...PRONTO }, { d: 420, x: 400, bola: { m: 'voo', para: 'mao', p: 1 } }]],
  ]),
  'Passe picado com uma mão': ex('lado', { parceiro: { dir: -1, x: 560, pose: { t: 8, cF: 15, kF: 0, cT: -8, kT: -12, bP: 50, aP: 95, bL: 55, aL: 95 } } }, [
    ['Passo para o lado', 'Com a bola no bolso, dê um passo largo para fora do defensor.', [{ x: 300, ...CARGA, bP: -5, aP: 70, bL: 15, aL: 90, bola: { m: 'peito' } }, { d: 300, x: 330, t: 25, cF: 55, kF: 10, cT: -40, kT: -60, bP: 10, aP: 45, bL: 40, aL: 80, hl: ['pF'] }]],
    ['Solte com o punho', 'Uma mão só, soltando abaixo da cintura, a dois terços do caminho.', [{ d: 240, bP: 45, aP: 50, bola: { m: 'voo', para: { x: 470, y: 293 }, p: 1 }, hl: ['bP'] }, { d: 240, bola: { m: 'voo', para: { x: 545, y: 225 }, p: 1 } }]],
    ['Recomponha', 'Volte à base, pronto para receber de novo.', [{ d: 420, x: 300, ...CARGA, ...PRONTO, bola: { m: 'voo', para: 'mao', p: 1 } }, { d: 400, bP: -5, aP: 70, bL: 15, aL: 90, bola: { m: 'peito' } }]],
  ]),
  'Passe de beisebol': ex('lado', { parceiro: { dir: -1, x: 640, pose: { t: 8, cF: 15, kF: 0, cT: -8, kT: -12, bP: 50, aP: 95, bL: 55, aL: 95 } } }, [
    ['Leve atrás da orelha', 'Pé da frente apontando para o alvo, bola na mão, atrás da orelha.', [{ x: 150, ...BASE, ...PEITO, bola: { m: 'peito' } }, { d: 360, x: 150, t: -5, cF: 35, kF: 5, cT: -15, kT: -30, bP: 150, aP: 245, bL: 80, aL: 100, bola: { m: 'cima' }, hl: ['bP'] }]],
    ['Dê o passo', 'Passo longo à frente, passando o peso para o pé da frente.', [{ d: 240, x: 190, t: 15, cF: 55, kF: 15, cT: -30, kT: -40, bP: 110, aP: 100, bola: { m: 'voo', para: { x: 625, y: 200 }, p: 1, alt: 70 }, hl: ['bP', 'pF'] }]],
    ['Acompanhe a bola', 'Termine com a mão apontando para quem vai receber.', [{ d: 700, bP: 80, aP: 80 }, { d: 500, x: 180, ...BASE, ...SOLTOS }]],
  ]),
  'Finta de passe': ex('lado', { parede: 590 }, [
    ['Mostre o passe', 'Mostre o passe por cima, com o olhar acompanhando.', [{ x: 400, pe: 'M', t: 10, cF: 25, kF: 0, cT: -10, kT: -25, ...PEITO, bola: { m: 'peito' } }, { d: 320, x: 400, pe: 'M', bP: 175, aP: 205, bL: 170, aL: 200, bola: { m: 'cima' }, hl: ['bP', 'bL'] }]],
    ['Baixe rápido', 'Antes de soltar, traga a bola de volta ao peito.', [{ d: 240, x: 400, pe: 'M', ...PEITO, bola: { m: 'peito' } }]],
    ['Passe de verdade', 'Agora passe picado, por onde o defensor saiu.', passe(400, { x: 583, y: 232 }, 'picado')],
  ]),
  'Passe após o drible': ex('lado', { parede: 620 }, [
    ['Dois dribles', 'Ataque com dois dribles rápidos, olhando para o alvo.', [{ x: 170, ...ATAQUE }, ...passadas(trecho(170, 300, 3))]],
    ['Recolha andando', 'Pegue a bola no ritmo da passada, sem parar os pés.', [{ ...passoUm(350), d: 220 }]],
    ['Solte', 'Passe de peito certeiro, ainda em movimento.', [{ d: 280, x: 390, t: 10, cF: 40, kF: 10, cT: -20, kT: -40, bP: 85, aP: 90, bL: 85, aL: 92, bola: { m: 'voo', para: { x: 613, y: 205 }, p: 1 }, hl: ['bP', 'bL'] }, { d: 500, x: 400, ...BASE, ...SOLTOS }]],
  ]),
  'Passa e corta': ex('lado', { cesta: 'lado', parceiro: { dir: -1, x: 300, pose: { t: 8, cF: 15, kF: 0, cT: -8, kT: -12, bP: 50, aP: 95, bL: 55, aL: 95 } } }, [
    ['Passe', 'Do lado esquerdo da cena, solte o passe para o parceiro à frente.', [{ x: 150, ...BASE, ...PEITO, bola: { m: 'peito' } }, { d: 280, x: 165, bP: 85, aP: 90, bL: 85, aL: 92, bola: { m: 'voo', para: { x: 285, y: 200 }, p: 1 }, hl: ['bP', 'bL'] }]],
    ['Corte para a cesta', 'Saia em velocidade, passando por ele em direção ao aro.', passadas(trecho(165, 420, 6), { bola: null })],
    ['Receba de volta', 'Mãos prontas: a bola volta bem à sua frente.', [{ d: 400, x: 470, ...passoUm(470), ...PRONTO, bola: { m: 'voo', para: 'mao', p: 1, alt: 30 } }]],
    ['Termine', 'Sem parar para driblar, finalize a bandeja.', [{ ...passoDois(520), d: 220 }, ...subidaBandeja(560)]],
  ]),
  'Corta o caminho do drible': ex('frente', { linhas: [140, 560] }, [
    ['Base na bola', 'Peito de frente para a bola, um braço de distância.', [{ x: 340, pe: 'M', ...F_DEFESA }]],
    ['Deslize antes', 'Deslize para o lado antes do atacante chegar.', deslizar(340, 3, 1, [1, 1]).quadros],
    ['Chegue na frente', 'Pare com os pés firmes e o peito na frente, sem fazer falta.', [{ d: 800, hl: PERNAS }]],
  ]),
  'Zigue-zague defensivo': ex('frente', { cones: [{ x: 170 }, { x: 470 }] }, [
    ['Deslize em diagonal', 'Base baixa, empurrando o atacante para o lado.', [{ x: 170, pe: 'M', ...F_DEFESA }, ...ZIGUE.quadros]],
    ['Vire o quadril', 'No cone, gire o quadril e aponte o pé para a nova direção.', [{ d: 300, x: ZIGUE.fim, pe: 'M', t: 8, hl: PERNAS }, { d: 300, x: ZIGUE.fim, pe: 'M', t: 0 }]],
    ['Deslize de volta', 'Mesma base do outro lado, sem levantar o quadril.', ZAGUE.quadros],
  ]),
  'Contestar o arremesso': ex('lado', { parceiro: { dir: 1, x: 240, pose: { t: 3, cF: 8, kF: 0, cT: -5, kT: -10, bP: 150, aP: 180, bL: 140, aL: 170 } } }, [
    ['Chegue equilibrado', 'Um braço de distância, com os pés curtos.', [{ x: 320, dir: -1, ...DEFESA, bP: 65, aP: 110, bL: 40, aL: 90 }]],
    ['Suba reto', 'Salte para cima, nunca para a frente, com o braço estendido.', [{ d: 300, ar: 30, ...SALTO, bP: 178, aP: 180, bL: 40, aL: 90, hl: ['bP', 'pF', 'pT'] }]],
    ['Mão na bola', 'Mão aberta no rosto da bola: atrapalhe a visão, sem tocar no braço.', [{ d: 500, ar: 8 }, { d: 300, ar: 0, ...ATERRISSA, bP: 65, aP: 110, bL: 40, aL: 90 }]],
    ['Vire e bloqueie', 'Ao cair, gire e procure o rebote.', [{ d: 400, dir: 1, ...DEFESA, bP: 70, aP: 100, bL: 70, aL: 100, hl: PERNAS }, { d: 600 }]],
  ]),
  'Negar a linha de passe': ex('lado', { parceiro: { dir: 1, x: 230, pose: { t: 8, cF: 15, kF: 0, cT: -8, kT: -12, bP: 50, aP: 95, bL: 55, aL: 95 } } }, [
    ['Entre ele e a bola', 'Um pé e uma mão na linha do passe, olhando por cima do ombro.', [{ x: 300, dir: -1, ...DEFESA, bP: 95, aP: 95, bL: 30, aL: 60 }]],
    ['Acompanhe', 'Quando ele se mexer, deslize junto, sem perder a linha.', [{ d: 360, x: 340, px: 270, hl: PERNAS }, { d: 300 }, { d: 360, x: 380, px: 310, hl: PERNAS }]],
    ['Toque na bola', 'Se o passe vier, salte a linha e desvie com a mão.', [{ d: 300, x: 360, ar: 18, bP: 120, aP: 120, hl: ['bP'], bola: em(355, 180) }, { d: 500, ar: 0, ...DEFESA, bola: em(420, 293) }]],
  ]),
  'Ajuda e recuperação': ex('lado', { cesta: 'lado', linhas: [170, 500] }, [
    ['Feche o garrafão', 'Corra dois passos para a bola, com o peito de frente para o drible.', [{ x: 330, ...DEFESA, bP: 65, aP: 110, bL: 40, aL: 90 }, { d: 260, x: 400, ...DEFESA, ...PRONTO, hl: PERNAS }, { d: 260, x: 460, bP: 175, aP: 175, bL: 40, aL: 90, hl: ['bP'] }]],
    ['Volte', 'Assim que a bola sair, vire e corra de volta ao seu atacante.', [{ d: 220, dir: -1, ...BASE, ...SOLTOS }, ...passadas(trecho(440, 240, 5), { bola: null })]],
    ['Feche com passos curtos', 'Chegue freando, com a mão alta.', [{ d: 240, x: 205, t: 20, cF: 30, kF: -10, cT: -15, kT: -40, bP: 175, aP: 175, bL: 40, aL: 90, hl: PERNAS }, { d: 600 }]],
  ]),
  'Bloqueio de rebote com parceiro': ex('lado', { cesta: 'lado', parceiro: { dir: 1, x: 390, pose: { t: 15, cF: 25, kF: 0, cT: -8, kT: -22, bP: 150, aP: 170, bL: 145, aL: 165 } } }, [
    ['Encontre o corpo', 'Ao subir o arremesso, vire e procure o parceiro com as costas.', [{ x: 460, dir: -1, ...BASE, ...PRONTO }, { d: 320, x: 435, dir: 1, ...DEFESA, bP: 75, aP: 95, bL: 70, aL: 100, hl: PERNAS }]],
    ['Empurre para fora', 'Quadril baixo, braços abertos, empurrando-o para longe do aro.', [{ d: 420, x: 448, px: 400, hl: PERNAS }, { d: 420, x: 462, px: 412, hl: PERNAS }]],
    ['Vá na bola', 'Com ele preso, suba e pegue a bola com as duas mãos, no ponto mais alto.', [{ d: 320, x: 478, ar: 32, ...SALTO, ...ARMAR, bola: { m: 'cima' }, hl: PERNAS }, { d: 300, ar: 0, ...ATERRISSA, ...PEITO, bola: { m: 'peito' } }, { d: 600 }]],
  ]),
  'Rebote ofensivo': ex('lado', { cesta: 'lado', parceiro: { dir: 1, x: 500, pose: { t: 15, cF: 35, kF: 0, cT: -8, kT: -25, bP: 70, aP: 100, bL: 65, aL: 100 } } }, [
    ['Saia do bloqueio', 'Quando o defensor encostar, dê um passo para o lado e passe por ele.', [{ x: 440, ...BASE, ...PRONTO }, { d: 280, x: 470, prof: -1, t: 22, cF: 45, kF: 8, cT: -35, kT: -60, hl: ['pF'] }, { d: 240, x: 530, prof: 0, t: 12, cF: 30, kF: 5, cT: -30, kT: -70, hl: ['pT'] }]],
    ['Suba cedo', 'Salte antes dele, com as duas mãos altas.', [{ d: 280, x: 560, ar: 36, ...SALTO, ...ARMAR, bola: em(590, 90), hl: PERNAS }, { d: 200, ar: 40, bola: { m: 'cima' } }]],
    ['Devolva no ar', 'Sem descer, empurre a bola de volta para a cesta.', [{ d: 180, ar: 40, ...SOLTAR, bola: voo(0.5, 18), hl: ['bP'] }, { d: 220, ar: 16, bola: voo(1, 18) }, { d: 320, ar: 0, ...ATERRISSA, ...SOLTOS, bola: voo(1.4, 18) }, { d: 700, bola: voo(1.94, 18) }]],
  ]),
  'Afundo caminhando': ex('lado', {}, [
    ['Passo longo', 'Dê um passo longo à frente, com o tronco reto.', [{ x: 130, ...EM_PE, bP: 40, aP: -40, bL: 40, aL: -40 }, { d: 520, x: 190, ...AFUNDO, hl: PERNAS }]],
    ['Desça', 'O joelho de trás quase toca o chão e o da frente não passa muito do pé.', [{ d: 500, x: 190, t: 3, cF: 80, kF: -5, cT: -30, kT: -95, hl: PERNAS }]],
    ['Suba e avance', 'Empurre com o calcanhar da frente, passe o outro pé e repita.', [{ d: 480, x: 245, ...EM_PE }, { d: 520, x: 305, ...AFUNDO, hl: PERNAS }, { d: 480, x: 360, ...EM_PE }, { d: 520, x: 420, ...AFUNDO, hl: PERNAS }, { d: 480, x: 475, ...EM_PE }]],
  ]),
  Burpee: ex('lado', {}, [
    ['Agache', 'Desça até as mãos tocarem o chão, à frente dos pés.', [{ x: 300, pe: 'M', ...EM_PE, ...SOLTOS }, { d: 340, x: 300, pe: 'M', t: 55, cF: 85, kF: -30, cT: 80, kT: -30, bP: 25, aP: 15, bL: 25, aL: 15, hl: PERNAS }]],
    ['Pernas para trás', 'Jogue as pernas para trás e fique em posição de flexão.', [{ d: 320, x: 300, t: 70, cF: -60, kF: -60, cT: -62, kT: -58, bP: 0, aP: 0, bL: 0, aL: 0, hl: ['bP', 'bL'] }]],
    ['Volte', 'Traga os pés de volta, com o abdômen firme.', [{ d: 320, x: 300, pe: 'M', t: 55, cF: 85, kF: -30, cT: 80, kT: -30, bP: 25, aP: 15, bL: 25, aL: 15, hl: PERNAS }]],
    ['Salte', 'Suba em um salto, com os braços acima da cabeça.', [{ d: 280, x: 300, pe: 'M', ar: 34, ...SALTO, bP: 170, aP: 175, bL: 165, aL: 170, hl: PERNAS }, { d: 300, x: 300, pe: 'M', ar: 0, ...ATERRISSA, ...SOLTOS }, { d: 500 }]],
  ]),
  'Saltos laterais': ex('frente', { linhas: [340] }, [
    ['Pés juntos', 'Fique ao lado da linha, com os pés juntos e os joelhos flexionados.', [{ x: 300, pe: 'M', ...F_PE, cF: 10, cT: -10, kF: -4, kT: 4, eF: 0.9, eT: 0.9, bP: 25, aP: 90, bL: -25, aL: -90 }]],
    ['Salte por cima', 'Salte para o outro lado, caindo macio, e volte sem pausa.', ciclo([
      { x: 340, pe: 'M', ar: 22, hl: PERNAS }, { x: 380, pe: 'M', ar: 0 },
      { x: 340, pe: 'M', ar: 22, hl: PERNAS }, { x: 300, pe: 'M', ar: 0 },
    ], 3, 200)],
  ]),
  'Escada de agilidade': ex('lado', { linhas: [140, 200, 260, 320, 380, 440, 500] }, [
    ['Pés rápidos', 'Um pé em cada espaço, na ponta dos pés e com o olhar à frente.', [...[140, 170, 200, 230, 260, 290, 320, 350].map((x, i) => ({ d: 150, x, ...(i % 2 ? { t: 10, cF: 30, kF: -15, cT: -8, kT: -35 } : { t: 10, cF: -8, kF: -35, cT: 30, kT: -15 }), ...(i % 2 ? { bP: 40, aP: 100, bL: -20, aL: 30 } : { bP: -20, aP: 30, bL: 40, aL: 100 }), hl: PERNAS }))]],
    ['Mantenha o ritmo', 'Os braços acompanham: quanto mais rápidos, mais rápidos os pés.', [...[380, 410, 440, 470, 500, 530].map((x, i) => ({ d: 150, x, ...(i % 2 ? { t: 10, cF: 30, kF: -15, cT: -8, kT: -35 } : { t: 10, cF: -8, kF: -35, cT: 30, kT: -15 }), ...(i % 2 ? { bP: 40, aP: 100, bL: -20, aL: 30 } : { bP: -20, aP: 30, bL: 40, aL: 100 }), hl: PERNAS }))]],
    ['Saia em sprint', 'No fim da escada, acelere por mais alguns passos.', passadas(trecho(530, 615, 3), { bola: null, d: 170 })],
  ]),
  'Corrida de 17 linhas': ex('lado', { linhas: [100, 560] }, [
    ['Largura da quadra', 'Corra de uma lateral à outra em ritmo forte.', passadas(trecho(110, 530, 8), { bola: null, d: 170 })],
    ['Vire rápido', 'Toque a linha com o pé e gire sem frear demais.', [{ d: 200, x: 548, t: 30, cF: 55, kF: 5, cT: -25, kT: -70, hl: ['pF'] }, { d: 180, dir: -1, ...BASE, t: 20 }]],
    ['Repita', 'Mantenha o mesmo ritmo até completar as 17 travessias.', passadas(trecho(530, 120, 8), { bola: null, d: 170 })],
  ]),
  'Prancha lateral': ex('frente', {}, [
    ['Apoie o antebraço', 'Deite de lado, com o cotovelo embaixo do ombro e os pés empilhados.', [{ x: 320, t: 72, cF: -62, kF: -62, cT: -62, kT: -62, eF: 1, eT: 1, bP: 0, aP: 88, bL: 120, aL: 180 }]],
    ['Suba o quadril', 'Forme uma linha reta, dos pés à cabeça, sem deixar o quadril cair.', [{ d: 700, t: 78, hl: ['bP'] }, { d: 2000, hl: ['bP'] }]],
  ]),
}

// Figuras do nível avançado: combinações, arremesso em velocidade, contato e explosão.
import type { Coreografia, Quadro } from './motor'
import {
  AGACHA, ANDA_A, armar, ARMAR, ATERRISSA, BASE, CARGA, carga, ciclo, CORRE_A, CORRE_B, DEFESA, deslizar, DRIBLE, em, EM_PE, ex, F_BASE, F_DEFESA, FINAL,
  JOELHO_A, JOELHO_B, mao, passadas, passoDois, passoUm, PEITO, PERNAS, PRONTO, quiques, SALTO, SOLTAR, SOLTOS, soltura, subidaBandeja, trecho, trocar, voo,
} from './pecas'

type Q = Partial<Quadro>
const ATAQUE = { ...BASE, ...DRIBLE, bola: mao(0) }
const CRUZA = (x: number, para: 'P' | 'L' = 'L'): Q[] => [
  { d: 190, x, t: 26, cF: 42, kF: -5, cT: -32, kT: -50, bP: 20, aP: -5, bL: 25, aL: 10, bola: em(x + 10, 293), hl: ['pF'] },
  { d: 170, x: x + 24, t: 28, cF: 50, kF: 10, cT: -45, kT: -60, ...(para === 'L' ? { bL: 30, aL: 75, bP: 35, aP: 90 } : { bP: 30, aP: 75, bL: 35, aL: 90 }), bola: mao(0, para), hl: ['pT'] },
]
const DEFENSOR = { t: 15, cF: 30, kF: -5, cT: -5, kT: -25, bP: 160, aP: 175, bL: 60, aL: 100 }
const PARCEIRO = { t: 8, cF: 15, kF: 0, cT: -8, kT: -12, bP: 50, aP: 95, bL: 55, aL: 95 }
const VIRA_DESLIZE = deslizar(180, 3, 1, [1, 1])
const NA_POSE = { ...CARGA, ...PEITO, bola: { m: 'peito' as const } }
const CAIXA = { x: 250, w: 70, h: 45 }

/** Fim de bandeja em que a bola sai em voo curto. */
const fimVoo = (x: number, ar: number, alt = 24): Q[] => [
  { d: 200, x: x + 8, ar: ar + 2, bola: voo(0.5, alt), hl: ['bP'] },
  { d: 240, x: x + 16, ar: Math.round(ar * 0.45), bola: voo(1, alt) },
  { d: 320, x: x + 20, ar: 0, ...ATERRISSA, ...SOLTOS, bola: voo(1.4, alt) },
  { d: 700, bola: voo(1.94, alt) },
]

export const FIGURAS_AVANCADO: Record<string, Coreografia> = {
  'Cruzado rápido duplo': ex('lado', {}, [
    ['Ataque', 'Saia baixo, com a bola abaixo do joelho.', [{ x: 80, ...ATAQUE }, ...passadas(trecho(80, 240, 4), { d: 170 })]],
    ['Primeiro cruzado', 'Cruze curto, levando o defensor para um lado.', CRUZA(265)],
    ['Segundo cruzado', 'Sem levantar, cruze de volta logo em seguida.', CRUZA(310, 'P')],
    ['Explosão', 'Saia pelo lado aberto, com o primeiro passo longo.', passadas(trecho(340, 610, 6), { d: 160 })],
  ]),
  'Hesitação com cruzado': ex('lado', { parceiro: { dir: -1, x: 400, pose: DEFENSOR } }, [
    ['Ataque', 'Venha em velocidade, com a bola do lado de fora.', [{ x: 80, ...ATAQUE }, ...passadas(trecho(80, 280, 5), { d: 170 })]],
    ['Erga o tronco', 'Finja que vai parar: o defensor relaxa.', [{ d: 340, x: 315, t: 2, cF: 20, kF: 0, cT: -10, kT: -20, bP: 20, aP: 100, bL: 30, aL: 80, bola: mao(1), px: 408 }]],
    ['Cruze', 'Na hora em que ele levantar, cruze baixo.', CRUZA(335)],
    ['Passe por ele', 'Ombro abaixo do quadril dele, atacando a cesta.', passadas(trecho(365, 620, 6), { bola: 'L', d: 160 })],
  ]),
  'Sequência de três trocas': ex('frente', {}, [
    ['Cruzado', 'Base larga, drible baixo e troca pela frente.', [{ x: 340, pe: 'M', ...F_BASE }, ...quiques('P', 1, { d: 180 }), ...trocar('L')]],
    ['Entre as pernas', 'Abra mais a base e passe por baixo.', [{ d: 200, x: 340, pe: 'M', cF: 32, kF: -10, cT: -32, kT: 10, eF: 0.8, eT: 0.8, bL: -15, aL: 10, bola: mao(0, 'L') }, { d: 190, x: 340, pe: 'M', bP: 15, aP: -10, bola: em(340, 280) }, { d: 190, x: 340, pe: 'M', bP: 20, aP: 0, bL: -45, aL: -100, bola: mao(0) }]],
    ['Por trás', 'Leve a bola por trás das costas para a outra mão.', [{ d: 200, x: 340, pe: 'M', bP: -20, aP: -30, bL: -20, aL: 20, bola: em(340, 240) }, { d: 200, x: 340, pe: 'M', bL: -20, aL: 0, bP: 45, aP: 100, bola: mao(0, 'L') }]],
    ['Repita sem olhar', 'Faça a sequência toda sem baixar os olhos e cada vez mais rápido.', [...quiques('L', 1, { d: 170 }), ...trocar('P'), ...quiques('P', 1, { d: 170 }), ...trocar('L')]],
  ]),
  'Recuo e cruzado': ex('lado', { parceiro: { dir: -1, x: 400, pose: DEFENSOR } }, [
    ['Ataque', 'Vá forte para aproximar o defensor.', [{ x: 170, ...ATAQUE }, ...passadas(trecho(170, 330, 4), { d: 170 })]],
    ['Recue', 'Dois dribles para trás, de frente para ele.', [{ d: 220, x: 300, ...BASE, t: 10, bola: mao(1), hl: ['pF'] }, { d: 220, x: 270, bola: mao(0), px: 370 }, { d: 200, x: 245, bola: mao(1) }]],
    ['Cruze ao sair', 'Quando ele vier junto, cruze e ataque do outro lado.', [...CRUZA(240), ...passadas(trecho(270, 540, 6), { bola: 'L', d: 160 })]],
  ]),
  'Drible Shammgod': ex('lado', { parceiro: { dir: -1, x: 340, pose: DEFENSOR } }, [
    ['Ataque', 'Saia com a mão forte, em direção ao defensor.', [{ x: 100, ...ATAQUE }, ...passadas(trecho(100, 240, 4), { d: 180 })]],
    ['Empurre a bola', 'Leve a bola longe, à frente do corpo, com a mão forte.', [{ d: 260, x: 270, t: 30, cF: 55, kF: 5, cT: -40, kT: -70, bP: 85, aP: 85, bL: -10, aL: 10, bola: em(330, 270), hl: ['bP'] }]],
    ['Puxe com a outra', 'Antes de quicar duas vezes, puxe de volta com a outra mão.', [{ d: 220, x: 280, bP: 20, aP: 40, bL: 75, aL: 70, bola: em(322, 280), hl: ['bL'] }, { d: 220, x: 305, bL: 20, aL: 50, bola: mao(0, 'L') }]],
    ['Passe colado', 'Passe por ele do outro lado, com o corpo baixo.', passadas(trecho(325, 580, 6), { bola: 'L', d: 160 })],
  ]),
  'Duas bolas em movimento': ex('lado', { linhas: [60, 630] }, [
    ['Mesmo ritmo', 'As duas bolas descem juntas, no ritmo da passada.', [{ x: 70, ...BASE, bP: 30, aP: 70, bL: 30, aL: 70, bola: mao(0), bola2: mao(0, 'L') }, ...trecho(70, 340, 7).map((x, i): Q => ({ d: 220, x, ...(i % 2 ? CORRE_B : CORRE_A), bP: 30, aP: 70, bL: 30, aL: 70, bola: mao(i % 2 ? 0 : 1), bola2: mao(i % 2 ? 0 : 1, 'L') }))]],
    ['Agora alternado', 'Uma sobe enquanto a outra desce, sem diminuir a corrida.', trecho(340, 620, 7).map((x, i): Q => ({ d: 220, x, ...(i % 2 ? CORRE_B : CORRE_A), bola: mao(i % 2 ? 0 : 1), bola2: mao(i % 2 ? 1 : 0, 'L') }))],
  ]),
  'Duas bolas com cruzado': ex('frente', {}, [
    ['Juntas', 'Quiques simultâneos, baixos, com uma bola em cada mão.', [{ x: 340, pe: 'M', ...F_BASE, bP: 30, aP: 10, bL: -30, aL: -10, bola: mao(0), bola2: mao(0, 'L') }, ...[1, 0, 1, 0].map((d): Q => ({ d: 210, bola: mao(d), bola2: mao(d, 'L') }))]],
    ['Cruze as duas', 'No mesmo quique, cada bola passa para a mão oposta, pela frente do corpo.', [{ d: 220, bP: 20, aP: -15, bL: -20, aL: 15, bola: em(352, 290), bola2: em(328, 278) }, { d: 220, bP: 30, aP: 10, bL: -30, aL: -10, bola: mao(0, 'L'), bola2: mao(0) }]],
    ['Continue', 'Siga no mesmo ritmo e cruze de novo.', [...[1, 0, 1, 0].map((d): Q => ({ d: 210, bola: mao(d, 'L'), bola2: mao(d) })), { d: 220, bP: 20, aP: -15, bL: -20, aL: 15, bola: em(328, 290), bola2: em(352, 278) }, { d: 220, bP: 30, aP: 10, bL: -30, aL: -10, bola: mao(0), bola2: mao(0, 'L') }]],
  ]),
  'Drible e toque na bolinha': ex('frente', {}, [
    ['Drible firme', 'Uma mão dribla a bola sem você olhar para baixo.', [{ x: 340, pe: 'M', ...F_BASE, bP: 20, aP: 0, bL: -50, aL: -120, bola: mao(0), bola2: mao(0, 'L') }, ...quiques('P', 2, { d: 200 }).map((q) => ({ ...q, bL: -50, aL: -120, bP: 20, aP: 0 }))]],
    ['Jogue a bolinha', 'Com a outra mão, jogue uma bolinha para cima e pegue de volta.', [{ d: 240, bL: -80, aL: -160, bola: mao(1), bola2: em(285, 120), hl: ['bL'] }, { d: 240, bola: mao(0), bola2: em(285, 90) }, { d: 240, bola: mao(1), bola2: em(285, 130) }, { d: 240, bL: -50, aL: -120, bola: mao(0), bola2: mao(0, 'L') }]],
    ['Troque as mãos', 'Mantenha os olhos na bolinha, com o drible no automático.', [{ d: 240, bL: -80, aL: -160, bola: mao(1), bola2: em(285, 120), hl: ['bL'] }, { d: 240, bola: mao(0), bola2: em(285, 90) }, { d: 240, bola: mao(1), bola2: em(285, 130) }, { d: 240, bL: -50, aL: -120, bola: mao(0), bola2: mao(0, 'L') }]],
  ]),
  'Pull-up de três': ex('lado', { cesta: 'lado', linhas: [160] }, [
    ['Ataque', 'Comece atrás da linha, em drible rápido.', [{ x: 40, ...ATAQUE }, ...passadas(trecho(40, 110, 3), { d: 170 })]],
    ['Freie atrás da linha', 'O último drible é forte e o corpo freia sem passar da linha.', [{ d: 220, x: 135, ...NA_POSE, hl: PERNAS }]],
    ['Suba sem hesitar', 'Da freada direto para o alto: não há pausa.', [armar(135, 26)]],
    ['Solte', 'No topo do salto, com os ombros de frente para o aro.', soltura(135, 30)],
  ]),
  'Passo lateral de três': ex('frente', { cesta: 'frente', linhas: [200] }, [
    ['Mostre o ataque', 'Drible forte para o lado, levando o defensor junto.', [{ x: 300, pe: 'M', ...F_BASE }, ...quiques('P', 2, { d: 190, x: 300 })]],
    ['Passo para o lado', 'Salte de lado, juntando os dois pés fora do alcance dele.', [{ d: 260, x: 255, pe: 'M', ar: 14, cF: 35, kF: -5, cT: -15, kT: 5, bP: 30, aP: 110, bL: -30, aL: -110, bola: { m: 'peito' } }, { d: 240, x: 220, pe: 'M', ar: 0, cF: 22, kF: -6, cT: -22, kT: 6, bola: { m: 'peito' }, hl: PERNAS }]],
    ['Arremesse', 'Com os pés já firmes, suba de frente para o aro.', [{ d: 280, x: 220, pe: 'M', ar: 22, cF: 6, kF: 0, cT: -6, kT: 0, eF: 1, eT: 1, bP: 165, aP: 180, bL: -150, aL: -170, bola: { m: 'cima' }, hl: PERNAS }, { d: 200, x: 220, pe: 'M', ar: 26, bola: voo(0.5, 100), hl: ['bP'] }, { d: 320, x: 220, pe: 'M', ar: 8, bola: voo(1, 100) }, { d: 360, x: 220, pe: 'M', ar: 0, ...F_BASE, bola: voo(1.4, 100) }, { d: 700, bola: voo(1.94, 100) }]],
  ]),
  'Três em transição': ex('lado', { cesta: 'lado', linhas: [125] }, [
    ['Corra', 'Saia em sprint, sem bola, olhando para o passe.', [{ x: 62, ...CORRE_A, bP: -35, aP: 10, bL: 40, aL: 110 }, ...passadas([72, 82], { bola: null, d: 170 })]],
    ['Freie na linha', 'Baixe o quadril em dois tempos para não invadir a linha.', [{ d: 220, x: 92, t: 18, cF: 38, kF: 5, cT: -25, kT: -55, ...PRONTO, bola: em(640, 240), hl: ['pF'] }, { d: 200, x: 102, ...CARGA, bola: { m: 'voo', para: 'mao', p: 0.6, alt: 22 }, hl: PERNAS }]],
    ['Receba em equilíbrio', 'A bola chega quando o corpo já parou de ir para a frente.', [{ d: 260, bola: { m: 'voo', para: 'mao', p: 1, alt: 22 } }, { d: 180, ...PEITO, bola: { m: 'peito' } }]],
    ['Arremesse', 'Suba reto, sem deixar a corrida levar você para a frente.', [armar(104, 24), ...soltura(104, 28)]],
  ]),
  'Fadeaway em uma perna': ex('lado', { cesta: 'lado' }, [
    ['Ataque curto', 'Dois dribles até o cotovelo, com o corpo de lado.', [{ x: 340, ...ATAQUE }, ...passadas(trecho(340, 420, 2), { d: 200 })]],
    ['Gire para trás', 'Plante o pé de dentro e gire o corpo para fora.', [{ d: 240, x: 440, pe: 'T', ...NA_POSE, hl: ['pT'] }]],
    ['Suba em um pé', 'Salte de uma perna, com o joelho da outra apontando para o defensor.', [{ d: 300, x: 418, ar: 26, t: -14, cF: 60, kF: 20, cT: -6, kT: -8, ...ARMAR, bola: { m: 'cima' }, hl: ['pT'] }]],
    ['Solte caindo', 'Solte alto, caindo para longe da cesta, com a mão apontando para o aro.', [{ d: 140, x: 408, ar: 28, t: -16, ...SOLTAR, bola: { m: 'cima' }, hl: ['bP'] }, { d: 320, x: 396, ar: 12, ...FINAL, bola: voo(0.6, 90), hl: ['bP'] }, { d: 360, x: 388, ar: 0, ...ATERRISSA, bola: voo(1, 90) }, { d: 800, ...SOLTOS, bola: voo(1.94, 90) }]],
  ]),
  'Meia-volta do poste': ex('lado', { cesta: 'lado', parceiro: { dir: 1, x: 410, pose: DEFENSOR } }, [
    ['Sinta o defensor', 'De costas para a cesta, com o antebraço sentindo de que lado ele está.', [{ x: 480, pe: 'M', dir: -1, ...BASE, t: 20, cT: -15, kT: -35, ...PEITO, bola: { m: 'peito' } }, { d: 320, bola: mao(1) }, { d: 320, bola: { m: 'peito' } }]],
    ['Meia-volta', 'Gire sobre o pé de apoio, ficando de frente para a cesta.', [{ d: 320, x: 490, pe: 'M', dir: 1, ...NA_POSE, hl: PERNAS }]],
    ['Suba reto', 'Sem fadeaway: suba reto, usando o espaço ganho no giro.', [armar(490, 24), ...soltura(490, 28)]],
  ]),
  'Arremesso contestado': ex('lado', { cesta: 'lado', parceiro: { dir: -1, x: 380, pose: { t: 8, cF: 15, kF: 0, cT: -5, kT: -12, bP: 175, aP: 180, bL: 60, aL: 100 } } }, [
    ['Mão no rosto', 'Um parceiro chega com a mão alta, bem perto de você.', [{ x: 320, ...EM_PE, ...PEITO, bola: { m: 'peito' } }, carga(320)]],
    ['Mesmo movimento', 'Não baixe a bola nem abra o cotovelo por causa dele.', [armar(320, 26)]],
    ['Arco mais alto', 'Solte um pouco mais alto, por cima da mão.', [{ d: 140, x: 320, ...SALTO, ar: 30, ...SOLTAR, bola: { m: 'cima' }, hl: ['bP'] }, { d: 340, ar: 18, ...FINAL, bola: voo(0.6, 130), hl: ['bP'] }, { d: 400, ar: 0, ...ATERRISSA, bola: voo(1, 130) }, { d: 800, ...SOLTOS, bola: voo(1.94, 130) }]],
  ]),
  'Arremesso saindo em curva': ex('lado', { cesta: 'lado', cones: [{ x: 250 }] }, [
    ['Curva no cone', 'Corra em volta do cone, inclinando o corpo para dentro.', [{ x: 90, prof: -1, ...CORRE_A, bP: -35, aP: 10, bL: 40, aL: 110 }, ...passadas(trecho(90, 230, 3), { bola: null, d: 170 }).map((q, i) => ({ ...q, prof: -0.6 + 0.6 * i })), { d: 180, x: 265, prof: 1, ...CORRE_A, t: 20, bP: -35, aP: 10, bL: 40, aL: 110 }]],
    ['Receba girando', 'Peito já virado para a cesta quando a bola chegar.', [{ d: 220, x: 310, prof: 0, ...CARGA, ...PRONTO, bola: em(640, 240), hl: PERNAS }, { d: 420, bola: { m: 'voo', para: 'mao', p: 1, alt: 18 } }]],
    ['Suba', 'Termine o giro no ar, com os ombros de frente para o aro.', [armar(318, 24), ...soltura(318, 28)]],
  ]),
  'Arremesso com finta e passo lateral': ex('frente', { cesta: 'frente', parceiro: { dir: -1, x: 410, pose: { t: 0, cF: 15, kF: 0, cT: -15, kT: 0, bP: 170, aP: 180, bL: -170, aL: -180 } } }, [
    ['Finta alta', 'Mostre a bola no alto: o defensor sobe.', [{ x: 340, pe: 'M', ...F_BASE, bP: 30, aP: 120, bL: -30, aL: -120, bola: { m: 'peito' } }, { d: 320, bP: 165, aP: 180, bL: -165, aL: -180, bola: { m: 'cima' }, hl: ['bP', 'bL'] }, { d: 240, bP: 30, aP: 120, bL: -30, aL: -120, bola: { m: 'peito' } }]],
    ['Passo para o lado', 'Um drible curto e um passo largo para longe dele.', [{ d: 240, x: 300, pe: 'M', bP: 15, aP: 0, bola: mao(1) }, { d: 240, x: 260, pe: 'M', cF: 32, kF: -10, cT: -32, kT: 10, bP: 30, aP: 120, bola: { m: 'peito' }, hl: PERNAS }]],
    ['Arremesse limpo', 'Ninguém na frente: pés firmes e arremesso alto.', [{ d: 280, x: 260, pe: 'M', ar: 24, cF: 6, kF: 0, cT: -6, kT: 0, eF: 1, eT: 1, bP: 165, aP: 180, bL: -150, aL: -170, bola: { m: 'cima' }, hl: PERNAS }, { d: 200, x: 260, pe: 'M', ar: 28, bola: voo(0.5, 90), hl: ['bP'] }, { d: 320, x: 260, pe: 'M', ar: 8, bola: voo(1, 90) }, { d: 360, x: 260, pe: 'M', ar: 0, ...F_BASE, bola: voo(1.4, 90) }, { d: 700, bola: voo(1.94, 90) }]],
  ]),
  'Três pontos em série': ex('lado', { cesta: 'lado', linhas: [125, 60] }, [
    ['Primeiro ponto', 'Arremesse com a bola já pronta no seu pé da frente.', [{ x: 100, ...EM_PE, ...PEITO, bola: { m: 'peito' } }, carga(100), armar(100, 24), ...soltura(100, 28)]],
    ['Corra para o próximo', 'Saia em sprint assim que soltar, sem ver se entrou.', [{ d: 180, dir: -1, ...BASE, t: 20, ...SOLTOS, bola: voo(1.94) }, ...passadas([85, 70, 55], { bola: null, d: 170 })]],
    ['Receba e repita', 'Freie atrás da linha e repita, com a mesma forma.', [{ d: 220, x: 55, dir: 1, ...CARGA, ...PRONTO, bola: em(640, 240), hl: PERNAS }, { d: 480, bola: { m: 'voo', para: 'mao', p: 1, alt: 22 } }, { d: 200, ...PEITO, bola: { m: 'peito' } }, armar(55, 26), ...soltura(55, 30)]],
  ]),
  'Lance livre decisivo': ex('lado', { cesta: 'lado', linhas: [80, 320] }, [
    ['Sprint completo', 'Corra até a linha de fundo e volte em velocidade máxima.', passadas(trecho(310, 90, 7), { bola: null, d: 150 })],
    ['Volte à rotina', 'Na linha, faça exatamente a rotina de sempre, mesmo ofegante.', [{ d: 200, dir: 1, ...BASE, ...SOLTOS }, ...passadas(trecho(100, 280, 5), { bola: null, d: 150 }), { d: 300, x: 320, pe: 'M', t: 10, cF: 20, kF: 0, cT: -5, kT: -15, ...DRIBLE, bola: mao(0) }, { d: 320, x: 320, pe: 'M', bola: mao(1) }, { d: 320, x: 320, pe: 'M', bola: mao(0) }]],
    ['Respire e arremesse', 'Solte o ar e arremesse como se o jogo dependesse disso.', [{ d: 400, x: 320, pe: 'M', ...NA_POSE, hl: PERNAS }, { d: 340, x: 320, pe: 'M', ...SALTO, ar: 3, ...ARMAR, bola: { m: 'cima' }, hl: PERNAS }, ...soltura(320, 5).map((q) => ({ ...q, pe: 'M' as const }))]],
  ]),
  'Passo de canguru': ex('lado', { cesta: 'lado' }, [
    ['Ataque', 'Saia driblando em direção ao aro.', [{ x: 340, ...ATAQUE }, ...passadas(trecho(340, 450, 3), { d: 180 })]],
    ['Salto de um pé', 'Recolha a bola e salte de um pé só, à frente.', [{ d: 260, x: 495, ar: 26, t: 10, cF: 50, kF: 10, cT: -10, kT: -40, ...PEITO, bola: { m: 'peito' }, hl: ['pT'] }]],
    ['Caia com os dois', 'Caia com os dois pés juntos, forte, na frente do defensor.', [{ d: 220, x: 540, ar: 0, ...NA_POSE, hl: PERNAS }]],
    ['Suba de novo', 'Sem pausa, suba de novo com as duas pernas e finalize.', [{ d: 260, x: 560, ar: 36, ...SALTO, bP: 165, aP: 170, bL: 110, aL: 150, bola: { m: 'cima' }, hl: PERNAS }, ...fimVoo(560, 36)]],
  ]),
  'Finger roll': ex('lado', { cesta: 'lado' }, [
    ['Velocidade', 'Ataque em velocidade, com a bola à frente.', [{ x: 300, ...ATAQUE }, ...passadas(trecho(300, 430, 3), { d: 170 })]],
    ['Dois passos', 'Recolha e faça os dois passos, sem frear.', [{ ...passoUm(475), d: 200 }, { ...passoDois(525), d: 200 }]],
    ['Braço todo estendido', 'Suba o máximo possível, com a palma virada para cima.', [{ d: 260, x: 560, ar: 44, t: -2, cT: -10, kT: -15, cF: 95, kF: 5, bP: 175, aP: 172, bL: 60, aL: 100, bola: { m: 'cima' }, hl: ['pT', 'bP'] }]],
    ['Deixe rolar', 'A bola sai rolando pelos dedos, sem empurrão.', fimVoo(560, 44, 20)],
  ]),
  'Bandeja por baixo': ex('lado', { cesta: 'lado', parceiro: { dir: -1, x: 590, pose: { t: 0, cF: 8, kF: 0, cT: -5, kT: -10, bP: 175, aP: 180, bL: 170, aL: 175 } } }, [
    ['Ataque', 'Vá em direção ao protetor do aro, que já subiu o braço.', [{ x: 340, ...ATAQUE }, ...passadas(trecho(340, 450, 3), { d: 180 })]],
    ['Dois passos baixos', 'Mantenha a bola baixa, longe das mãos dele.', [{ ...passoUm(490), d: 210 }, { ...passoDois(530), d: 210 }]],
    ['Palma para cima', 'Suba com o braço saindo por baixo do dele, com a palma para cima.', [{ d: 260, x: 552, ar: 24, t: 5, cT: -10, kT: -15, cF: 90, kF: 5, bP: 85, aP: 110, bL: 40, aL: 70, bola: { m: 'mao', d: 0 }, hl: ['bP'] }, { d: 200, x: 560, ar: 30, bP: 110, aP: 140, bola: voo(0.5, 50), hl: ['bP'] }, { d: 260, ar: 12, bola: voo(1, 50) }, { d: 320, ar: 0, ...ATERRISSA, ...SOLTOS, bola: voo(1.4, 50) }, { d: 700, bola: voo(1.94, 50) }]],
  ]),
  'Reversa em velocidade': ex('lado', { cesta: 'lado' }, [
    ['Linha de fundo', 'Sprint colado na linha, com a bola na mão de fora.', [{ x: 280, ...ATAQUE }, ...passadas(trecho(280, 460, 4), { d: 160 })]],
    ['Passe por baixo', 'Recolha e passe por baixo do aro, sem frear.', [{ ...passoUm(510), d: 190 }, { ...passoDois(565), d: 190 }]],
    ['Termine de costas', 'Solte do outro lado, com o giro do punho.', [{ d: 240, x: 612, ar: 40, t: -5, cT: -10, kT: -15, cF: 90, kF: 5, bP: 170, aP: 175, bL: 60, aL: 100, bola: { m: 'cima' }, hl: ['pT', 'bP'] }, { d: 200, x: 628, dir: -1, ar: 44, bP: 165, aP: 150, bola: voo(0.5, 25), hl: ['bP'] }, { d: 220, x: 636, ar: 22, bola: voo(1, 25) }, { d: 320, x: 640, ar: 0, ...ATERRISSA, ...SOLTOS, bola: voo(1.4, 25) }, { d: 700, bola: voo(1.94, 25) }]],
  ]),
  'Giro e bandeja': ex('lado', { cesta: 'lado', parceiro: { dir: -1, x: 470, pose: DEFENSOR } }, [
    ['Ataque', 'Ataque o defensor, com a bola do lado dele.', [{ x: 280, ...ATAQUE }, ...passadas(trecho(280, 390, 3), { d: 180 })]],
    ['Plante e gire', 'Plante o pé e gire de costas, com a bola colada ao corpo.', [{ d: 220, x: 425, ...NA_POSE, hl: ['pF'] }, { d: 240, x: 450, dir: -1, t: 15, hl: ['pF'] }, { d: 220, x: 490, dir: 1, ...passoDois(490), bola: { m: 'peito' } }]],
    ['Finalize com a mão de fora', 'Saia do giro já subindo, longe do defensor.', subidaBandeja(535, { ar: 36 })],
  ]),
  'Duas subidas na tabela': ex('lado', { cesta: 'lado', parceiro: { dir: -1, x: 590, pose: { t: 0, cF: 8, kF: 0, cT: -5, kT: -10, bP: 175, aP: 180, bL: 170, aL: 175 } } }, [
    ['Suba', 'Suba como numa bandeja normal, mostrando a bola.', [{ x: 460, ...ANDA_A, ...PEITO, bola: { m: 'peito' } }, { ...passoUm(495), d: 220 }, { ...passoDois(530), d: 220 }, { d: 240, x: 550, ar: 40, ...SALTO, bP: 165, aP: 170, bL: 150, aL: 170, bola: { m: 'cima' }, hl: ['pF', 'pT'] }]],
    ['Abaixe no ar', 'O defensor pula: abaixe a bola ainda no ar, para o peito.', [{ d: 200, x: 558, ar: 44, ...PEITO, bola: { m: 'peito' } }]],
    ['Solte na descida', 'Já descendo, suba a bola de novo e solte longe do braço dele.', [{ d: 200, x: 564, ar: 28, bP: 165, aP: 150, bL: 60, aL: 100, bola: { m: 'cima' }, hl: ['bP'] }, { d: 180, x: 568, ar: 20, bola: voo(0.5, 20), hl: ['bP'] }, { d: 200, ar: 6, bola: voo(1, 20) }, { d: 300, ar: 0, ...ATERRISSA, ...SOLTOS, bola: voo(1.4, 20) }, { d: 700, bola: voo(1.94, 20) }]],
  ]),
  'Toque de rebote': ex('lado', { cesta: 'lado' }, [
    ['Jogue na tabela', 'Bem perto, jogue a bola no alto da tabela.', [{ x: 575, ...EM_PE, ...ARMAR, bola: { m: 'cima' } }, { d: 300, bola: { m: 'voo', para: { x: 650, y: 40 }, p: 1, alt: 30 }, hl: ['bP', 'bL'] }]],
    ['Suba e toque', 'Salte e, com os dedos, empurre de volta sem segurar a bola.', ciclo([
      { x: 590, ar: 42, ...SALTO, ...SOLTAR, bola: { m: 'voo', para: { x: 610, y: 58 }, p: 1, alt: 8 }, hl: ['bP', 'pF', 'pT'] },
      { x: 590, ar: 8, bola: { m: 'voo', para: { x: 650, y: 40 }, p: 1, alt: 8 } },
    ], 3, 240)],
    ['Termine dentro', 'Depois de algumas repetições, deixe a bola entrar.', [{ d: 260, x: 590, ar: 42, hl: ['bP'], bola: voo(0.6, 15) }, { d: 240, ar: 12, bola: voo(1, 15) }, { d: 320, ar: 0, ...ATERRISSA, ...SOLTOS, bola: voo(1.4, 15) }, { d: 700, bola: voo(1.94, 15) }]],
  ]),
  'Pega no alto e finaliza': ex('lado', { cesta: 'lado' }, [
    ['Corra para o aro', 'Saia em velocidade, olhando para a bola no ar.', [{ x: 370, ...CORRE_A, bP: -35, aP: 10, bL: 40, aL: 110, bola: em(300, 90) }, ...passadas(trecho(370, 500, 3), { bola: null, d: 170 })]],
    ['Suba de um pé', 'Salte alto, com as duas mãos prontas acima da cabeça.', [{ d: 240, x: 545, ar: 44, t: 0, cT: -10, kT: -15, cF: 95, kF: 5, ...ARMAR, bola: { m: 'voo', para: 'maoCima', p: 1, alt: 30 }, hl: ['pT', 'bP', 'bL'] }]],
    ['Solte antes de cair', 'Pegue e solte no mesmo salto, sem levar a bola para baixo.', [{ d: 170, x: 560, ar: 46, ...SOLTAR, bola: voo(0.5, 12), hl: ['bP'] }, { d: 210, x: 568, ar: 20, bola: voo(1, 12) }, { d: 320, x: 572, ar: 0, ...ATERRISSA, ...SOLTOS, bola: voo(1.4, 12) }, { d: 700, bola: voo(1.94, 12) }]],
  ]),
  'Passe sem olhar': ex('lado', { parceiro: { dir: -1, x: 540, pose: PARCEIRO } }, [
    ['Olhe para o outro lado', 'Vire o rosto e os ombros para longe do alvo.', [{ x: 300, ...BASE, ...PEITO, bola: { m: 'peito' } }, { d: 320, dir: -1, t: 8 }]],
    ['Solte do peito', 'Sem girar de volta, solte o passe rápido, só com os punhos.', [{ d: 240, dir: 1, bP: 70, aP: 80, bL: 70, aL: 82, bola: { m: 'voo', para: { x: 525, y: 205 }, p: 1 }, hl: ['bP', 'bL'] }]],
    ['Prepare-se', 'Volte às mãos prontas: o passe pode voltar.', [{ d: 400, ...PRONTO }, { d: 420, bola: { m: 'voo', para: 'mao', p: 1 } }, { d: 300, ...PEITO, bola: { m: 'peito' } }]],
  ]),
  'Passe por trás das costas': ex('lado', { parceiro: { dir: -1, x: 540, pose: PARCEIRO } }, [
    ['Ataque', 'Dois dribles em direção ao defensor imaginário.', [{ x: 170, ...ATAQUE }, ...passadas(trecho(170, 290, 3), { d: 190 })]],
    ['Leve por trás', 'Pegue a bola com uma mão e leve-a por trás do quadril.', [{ d: 240, x: 320, t: 15, bP: -45, aP: -20, bL: 40, aL: 90, bola: em(292, 245), hl: ['bP'] }]],
    ['Solte com o punho', 'Um giro de punho manda a bola para a frente, passando pelo corpo.', [{ d: 280, x: 340, bP: -15, aP: 35, bola: { m: 'voo', para: { x: 525, y: 225 }, p: 1, alt: 12 }, hl: ['bP'] }, { d: 500, ...BASE, ...SOLTOS }]],
  ]),
  'Passe curto no bloqueio': ex('lado', { cesta: 'lado', cadeira: 300, parceiro: { dir: 1, x: 470, pose: { t: 8, cF: 18, kF: 0, cT: -8, kT: -20, bP: 55, aP: 100, bL: 55, aL: 100 } } }, [
    ['Saia do bloqueio', 'Saia raspando a cadeira, em drible.', [{ x: 160, ...ATAQUE }, ...passadas(trecho(160, 360, 5), { d: 180 })]],
    ['Atraia o defensor', 'Dois dribles a mais, atraindo quem marca o pivô.', [{ d: 220, x: 395, ...BASE, t: 20, bola: mao(1) }, { d: 200, bola: mao(0) }]],
    ['Passe curto picado', 'Com uma mão, no espaço entre os dois, para o pivô que corta.', [{ d: 260, x: 410, bP: 50, aP: 55, bola: { m: 'voo', para: { x: 440, y: 293 }, p: 1 }, hl: ['bP'], px: 485 }, { d: 200, bola: { m: 'voo', para: { x: 482, y: 225 }, p: 1 } }, { d: 500, ...BASE, ...SOLTOS }]],
  ]),
  'Passe de saída rápida': ex('lado', { cesta: 'lado', parceiro: { dir: -1, x: 60, pose: { ...CORRE_A, ...PRONTO } } }, [
    ['Rebote no alto', 'Salte e pegue a bola com as duas mãos, bem no alto.', [{ x: 560, ...BASE, ...PRONTO, bola: em(600, 80) }, { d: 300, ar: 34, ...SALTO, ...ARMAR, bola: { m: 'voo', para: 'maoCima', p: 1 }, hl: PERNAS }]],
    ['Gire no ar', 'Ainda subindo, gire o corpo em direção à outra cesta.', [{ d: 220, dir: -1, ar: 22, bP: 150, aP: 245, bola: { m: 'cima' } }]],
    ['Solte antes de descer os braços', 'Passe longo, com a bola saindo de cima da cabeça.', [{ d: 260, ar: 6, bP: 110, aP: 95, bola: { m: 'voo', para: { x: 72, y: 200 }, p: 1, alt: 60 }, hl: ['bP'] }, { d: 400, ar: 0, ...ATERRISSA, ...SOLTOS }, { d: 500 }]],
  ]),
  'Passe alto para o pivô': ex('lado', { cesta: 'lado', parceiro: { dir: -1, x: 560, pose: { t: 0, cF: 8, kF: 0, cT: -5, kT: -10, bP: 170, aP: 175, bL: 165, aL: 170 } } }, [
    ['Veja a vantagem', 'Pare a bola no alto, olhando o pivô com o defensor nas costas.', [{ x: 320, ...BASE, ...PEITO, bola: { m: 'peito' } }, { d: 320, bP: 175, aP: 205, bL: 170, aL: 200, bola: { m: 'cima' } }]],
    ['Bola alta', 'Mire acima da cabeça dele, onde o defensor não alcança.', [{ d: 280, x: 335, cF: 40, kF: 10, bP: 130, aP: 120, bL: 128, aL: 118, bola: { m: 'voo', para: { x: 548, y: 118 }, p: 1, alt: 55 }, hl: ['bP', 'bL'] }]],
    ['Fique pronto', 'Corte para o outro lado, caso a bola volte.', [{ d: 500, x: 340, ...BASE, ...SOLTOS }, { d: 300 }]],
  ]),
  'Passe longo em corrida': ex('lado', { parceiro: { dir: 1, x: 620, pose: { ...CORRE_B, ...PRONTO } } }, [
    ['Corra driblando', 'Em plena corrida, com a cabeça erguida.', [{ x: 60, ...ATAQUE }, ...passadas(trecho(60, 240, 4), { d: 170 })]],
    ['Recolha no passo', 'Pegue a bola sem frear, armando atrás da orelha.', [{ d: 220, x: 280, t: 5, cF: 30, kF: 5, cT: -30, kT: -70, bP: 150, aP: 245, bL: 80, aL: 100, bola: { m: 'cima' }, hl: ['pF'] }]],
    ['Solte em movimento', 'Solte à frente do companheiro, para ele receber correndo.', [{ d: 240, x: 320, t: 15, cT: 30, kT: 5, cF: -30, kF: -70, bP: 110, aP: 95, bola: { m: 'voo', para: { x: 605, y: 200 }, p: 1, alt: 70 }, hl: ['bP', 'pT'] }, { d: 500, x: 350, ...BASE, ...SOLTOS }]],
  ]),
  'Closeout com saída': ex('frente', { linhas: [150, 560] }, [
    ['Feche com a mão alta', 'Chegue com passos curtos e a mão no rosto da bola.', [{ x: 340, pe: 'M', ...F_DEFESA, bP: 170, aP: 178, bL: -60, aL: -100, hl: ['bP'] }, { d: 500 }]],
    ['Ele finta', 'Não salte na finta: mantenha os pés no chão.', [{ d: 200, x: 340, pe: 'M', ar: 0, ...F_DEFESA, bP: 75, aP: 140, bL: -75, aL: -140 }]],
    ['Deslize na saída', 'Quando ele driblar, empurre com a perna de trás e corte o caminho.', VIRA_DESLIZE.quadros.map((q) => ({ ...q, x: q.x + 160, fase: 2, d: 180 }))],
  ]),
  'Toco na perseguição': ex('lado', { cesta: 'lado', parceiro: { dir: 1, x: 520, pose: { t: 0, cT: -10, kT: -15, cF: 95, kF: 5, bP: 165, aP: 160, bL: 60, aL: 100 } } }, [
    ['Persiga sem desistir', 'O atacante escapou: corra atrás dele em sprint.', passadas(trecho(170, 440, 6), { bola: null, d: 150 })],
    ['Último passo', 'Calcule o tempo pela subida dele e impulsione.', [{ d: 220, x: 480, t: 5, cF: 25, kF: 5, cT: -30, kT: -60, bP: 90, aP: 120, bL: 30, aL: 60, hl: ['pF'] }]],
    ['Bata na bola', 'Suba com a mão de fora e prense a bola na tabela, sem tocar no braço.', [{ d: 240, x: 525, ar: 50, t: 0, cT: -10, kT: -15, cF: 85, kF: 10, bP: 175, aP: 178, bL: 30, aL: 70, bola: em(558, 120), hl: ['bP', 'pT'] }, { d: 300, x: 545, ar: 18, bola: em(610, 90) }, { d: 320, ar: 0, ...ATERRISSA, ...SOLTOS, bola: em(600, 293) }, { d: 500 }]],
  ]),
  'Defesa do bloqueio': ex('lado', { cadeira: 340, parceiro: { dir: 1, x: 240, pose: { ...BASE, ...DRIBLE } } }, [
    ['Veja o bloqueio', 'Quem está atrás avisa: encoste no atacante.', [{ x: 270, ...DEFESA, dir: -1, bP: 65, aP: 110, bL: 40, aL: 90 }]],
    ['Passe por cima', 'Vire o quadril e passe colado, por cima da cadeira, ombro à frente.', [{ d: 260, x: 300, dir: 1, ...BASE, t: 25, ...SOLTOS, hl: ['pF'], px: 280 }, { d: 240, x: 345, prof: 1, ...CORRE_A, px: 320 }, { d: 240, x: 390, prof: 0, ...CORRE_B, px: 360 }]],
    ['Volte para a frente', 'Coloque o peito de volta na frente da bola.', [{ d: 300, x: 450, dir: -1, ...DEFESA, bP: 65, aP: 110, bL: 40, aL: 90, hl: PERNAS, px: 400 }, { d: 700 }]],
  ]),
  'Tomar a falta de ataque': ex('lado', { parceiro: { dir: 1, x: 260, pose: { ...CORRE_A, ...PEITO } } }, [
    ['Chegue antes', 'Corra para o ponto e chegue antes do atacante.', [{ x: 520, dir: -1, ...BASE, ...SOLTOS }, ...passadas(trecho(520, 420, 3), { bola: null })]],
    ['Pés firmes', 'Pare com os pés plantados, de frente para ele, mãos protegendo o corpo.', [{ d: 300, x: 400, ...EM_PE, t: 8, bP: 20, aP: 145, bL: 20, aL: 145, hl: PERNAS, px: 340 }, { d: 300, px: 372 }]],
    ['Caia para trás', 'No contato, caia para trás e deslize, sem se machucar.', [{ d: 300, x: 420, t: -55, cF: 80, kF: 20, cT: 70, kT: 20, bP: 40, aP: 60, bL: 40, aL: 60, px: 376 }, { d: 300, x: 450, t: -80, cF: 85, kF: 60, cT: 80, kT: 50, bP: -70, aP: -80, bL: -70, aL: -80 }, { d: 700 }]],
  ]),
  'Roubo no drible': ex('lado', { parceiro: { dir: 1, x: 240, pose: { ...CORRE_A, ...DRIBLE } } }, [
    ['Corra ao lado', 'Fique um passo à frente dele, mantendo a mão perto da bola.', [{ x: 320, dir: -1, ...DEFESA, bP: 40, aP: 45, bL: 40, aL: 90, bola2: em(280, 280) }, { d: 300, bola2: em(275, 293) }]],
    ['Espere a subida', 'A bola é mais fácil de pegar quando volta para a mão dele.', [{ d: 300, bola2: em(275, 240), px: 245 }, { d: 300, bola2: em(278, 293), px: 250 }]],
    ['Toque de baixo', 'Toque de baixo para cima, sem bater no braço.', [{ d: 240, x: 300, bP: 60, aP: 70, bola2: em(285, 245), hl: ['bP'] }, { d: 320, x: 300, ...BASE, t: 25, bola2: em(350, 290) }, ...passadas([330, 365], { bola: null }).map((q) => ({ ...q, dir: 1 as const })), { d: 300, bola2: em(420, 290) }]],
  ]),
  'Salto de profundidade': ex('lado', { caixa: CAIXA }, [
    ['Em cima da caixa', 'Fique na beirada, sem saltar para cima.', [{ x: 285, solo: 45, ...EM_PE, ...SOLTOS }]],
    ['Dê um passo', 'Dê um passo para fora, deixando o corpo cair.', [{ d: 300, x: 330, solo: 0, ar: 20, ...SALTO, bP: 30, aP: 40, bL: 25, aL: 40 }]],
    ['Toque e salte', 'Assim que tocar o chão, salte o mais alto possível.', [{ d: 180, x: 345, ...AGACHA, t: 25, bP: -50, aP: -30, bL: -45, aL: -30, hl: PERNAS }, { d: 280, x: 355, ar: 56, ...SALTO, bP: 165, aP: 175, bL: 160, aL: 170, hl: PERNAS }, { d: 320, ar: 0, ...ATERRISSA, bP: 70, aP: 80, bL: 70, aL: 80, hl: PERNAS }, { d: 700, ...EM_PE, ...SOLTOS }]],
  ]),
  'Agachamento com salto': ex('frente', {}, [
    ['Agache fundo', 'Desça o quadril abaixo dos joelhos, com os braços para baixo.', [{ x: 340, pe: 'M', t: 0, cF: 12, kF: 0, cT: -12, kT: 0, eF: 1, eT: 1, bP: 8, aP: 12, bL: -8, aL: -12 }, { d: 420, x: 340, pe: 'M', cF: 45, kF: -25, cT: -45, kT: 25, eF: 0.6, eT: 0.6, bP: 30, aP: 20, bL: -30, aL: -20, hl: PERNAS }]],
    ['Salte com tudo', 'Empurre o chão e estenda o corpo inteiro no ar.', [{ d: 280, x: 340, pe: 'M', ar: 56, cF: 6, kF: 0, cT: -6, kT: 0, eF: 1, eT: 1, bP: 170, aP: 180, bL: -170, aL: -180, hl: PERNAS }]],
    ['Aterrisse macio', 'Caia na ponta dos pés e desça já para a próxima repetição.', [{ d: 300, x: 340, pe: 'M', ar: 0, cF: 45, kF: -25, cT: -45, kT: 25, eF: 0.6, eT: 0.6, bP: 30, aP: 20, bL: -30, aL: -20, hl: PERNAS }, { d: 280, x: 340, pe: 'M', ar: 56, cF: 6, kF: 0, cT: -6, kT: 0, eF: 1, eT: 1, bP: 170, aP: 180, bL: -170, aL: -180, hl: PERNAS }, { d: 300, x: 340, pe: 'M', ar: 0, cF: 45, kF: -25, cT: -45, kT: 25, eF: 0.6, eT: 0.6, bP: 30, aP: 20, bL: -30, aL: -20, hl: PERNAS }]],
  ]),
  'Saltos em uma perna': ex('lado', {}, [
    ['Um pé só', 'Fique em uma perna, com o joelho da outra à frente.', [{ x: 120, pe: 'T', t: 12, cF: 70, kF: 10, cT: 10, kT: -25, ...{ bP: -30, aP: 20, bL: -30, aL: 20 }, hl: ['pT'] }]],
    ['Salto longo', 'Salte longe e alto, jogando os braços para a frente.', [{ d: 300, x: 190, ar: 34, t: 5, cF: 40, kF: -10, cT: -30, kT: -50, bP: 90, aP: 110, bL: 90, aL: 110, hl: ['pT'] }, { d: 240, x: 240, pe: 'T', ar: 0, t: 12, cF: 70, kF: 10, cT: 10, kT: -25, bP: -30, aP: 20, bL: -30, aL: 20, hl: ['pT'] }, { d: 300, x: 310, ar: 34, t: 5, cF: 40, kF: -10, cT: -30, kT: -50, bP: 90, aP: 110, bL: 90, aL: 110, hl: ['pT'] }, { d: 240, x: 360, pe: 'T', ar: 0, t: 12, cF: 70, kF: 10, cT: 10, kT: -25, bP: -30, aP: 20, bL: -30, aL: 20, hl: ['pT'] }]],
    ['Segure a última', 'Na última aterrissagem, fique parado dois segundos sem perder o equilíbrio.', [{ d: 1500, x: 360, pe: 'T', bP: 50, aP: 80, bL: 50, aL: 80 }]],
  ]),
  'Skipping explosivo': ex('lado', {}, [
    ['Impulsão', 'Empurre o chão com uma perna e suba o joelho da outra.', [{ x: 100, ...JOELHO_A, bP: -30, aP: 20, bL: 130, aL: 170, ar: 26, hl: ['pT', 'bL'] }]],
    ['Ganhe altura', 'Quanto mais alto o joelho e o braço, mais longe você vai.', ciclo([
      { x: 170, ...JOELHO_B, bP: 130, aP: 170, bL: -30, aL: 20, ar: 34, hl: ['pF', 'bP'] },
      { x: 240, ...JOELHO_A, bP: -30, aP: 20, bL: 130, aL: 170, ar: 34, hl: ['pT', 'bL'] },
    ], 1, 340).concat([
      { x: 310, d: 340, ...JOELHO_B, bP: 130, aP: 170, bL: -30, aL: 20, ar: 34, hl: ['pF', 'bP'] },
      { x: 380, d: 340, ...JOELHO_A, bP: -30, aP: 20, bL: 130, aL: 170, ar: 34, hl: ['pT', 'bL'] },
      { x: 450, d: 340, ...JOELHO_B, bP: 130, aP: 170, bL: -30, aL: 20, ar: 34, hl: ['pF', 'bP'] },
    ])],
    ['Desacelere', 'Termine em trote, sem parar de repente.', passadas(trecho(450, 560, 3), { bola: null, d: 240 })],
  ]),
  'Prancha com toque no ombro': ex('lado', {}, [
    ['Posição de flexão', 'Mãos embaixo dos ombros, com o corpo em linha reta.', [{ x: 320, t: 70, cF: -60, kF: -60, cT: -62, kT: -58, bP: 0, aP: 0, bL: 0, aL: 0 }]],
    ['Toque um ombro', 'Tire uma mão do chão e toque o ombro oposto, sem girar o quadril.', [{ d: 420, bL: 60, aL: -60, hl: ['bP'] }, { d: 420, bL: 0, aL: 0 }]],
    ['Troque de mão', 'Volte a mão ao chão e repita com o outro braço, bem devagar.', [{ d: 420, bP: 60, aP: -60, hl: ['bL'] }, { d: 420, bP: 0, aP: 0 }, { d: 420, bL: 60, aL: -60, hl: ['bP'] }, { d: 420, bL: 0, aL: 0 }]],
  ]),
  'Desliza e arranca': ex('frente', { linhas: [150, 560] }, [
    ['Base', 'Comece na base baixa, de frente para a linha.', [{ x: 170, pe: 'M', ...F_DEFESA }]],
    ['Três deslizamentos', 'Deslize para o lado, sem cruzar os pés.', VIRA_DESLIZE.quadros.map((q) => ({ ...q, d: 180 }))],
    ['Plante e arranque', 'Empurre com a perna de fora e saia correndo até a outra linha.', trecho(VIRA_DESLIZE.fim, 540, 6).map((x, i): Q => ({ d: 170, x, t: 0, cF: i % 2 ? 25 : -6, kF: i % 2 ? -20 : 0, cT: i % 2 ? 6 : -25, kT: i % 2 ? 0 : 20, eF: i % 2 ? 0.6 : 1, eT: i % 2 ? 1 : 0.6, bP: i % 2 ? 50 : 20, aP: i % 2 ? 120 : 30, bL: i % 2 ? -20 : -50, aL: i % 2 ? -30 : -120, hl: PERNAS }))],
  ]),
  'Sprint com salto no final': ex('lado', { cesta: 'lado' }, [
    ['Sprint', 'Saia em velocidade máxima, com a passada longa.', passadas(trecho(100, 460, 7), { bola: null, d: 150 })],
    ['Freie em dois tempos', 'Converta a velocidade: pise, baixe o quadril e carregue o salto.', [{ d: 200, x: 510, t: 20, cF: 40, kF: 5, cT: -30, kT: -60, bP: -30, aP: -20, bL: -25, aL: -20, hl: ['pF'] }, { d: 200, x: 535, ...CARGA, t: 25, bP: -50, aP: -30, bL: -50, aL: -30, hl: PERNAS }]],
    ['Salto máximo', 'Suba com os dois braços, como numa disputa de rebote.', [{ d: 280, x: 550, ar: 58, ...SALTO, ...ARMAR, hl: PERNAS }, { d: 360, ar: 0, ...ATERRISSA, ...PEITO }, { d: 700, ...SOLTOS }]],
  ]),
}



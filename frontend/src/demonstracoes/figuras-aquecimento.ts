// Figuras do aquecimento de cada nível: do geral ao específico e, no arremesso, de perto para longe da cesta.
import type { Coreografia } from './motor'
import {
  AFUNDO, AGACHA, ANDA_A, ANDA_B, armar, arremessoParado, ATERRISSA, BASE, carga, ciclo, deslizar, EM_PE, ex, F_ABERTO, F_AGACHA, F_ALTO, F_BASE, F_PE, F_SOLTOS,
  JOELHO_A, JOELHO_B, mao, MAO_LIVRE, passadas, passe, passoDois, passoUm, PEITO, PERNAS, quiques, SALTO, SOLTOS, soltura, subidaBandeja, trecho, voo,
} from './pecas'

const DESLIZE = deslizar(180, 4, 1, [1, 1])

export const AQUECIMENTOS: Record<string, Coreografia> = {
  // Iniciante
  'Polichinelo leve': ex('frente', {}, [
    ['Pés juntos', 'Comece em pé, com os braços soltos ao lado do corpo.', [{ x: 340, pe: 'M', ...F_PE, ...F_SOLTOS }, { d: 300 }]],
    ['Abra', 'Salte abrindo as pernas e leve os braços para o alto, sem pressa.', [{ d: 320, ...F_ABERTO, ...F_ALTO, hl: ['bP', 'bL'] }]],
    ['Feche', 'Volte à posição inicial, caindo macio na ponta dos pés.', ciclo([{ ...F_PE, ...F_SOLTOS }, { ...F_ABERTO, ...F_ALTO, hl: ['bP', 'bL'] }], 3).concat({ ...F_PE, ...F_SOLTOS })],
  ]),
  'Círculos com os braços': ex('lado', {}, [
    ['Postura', 'Em pé, abdômen firme e braços estendidos ao lado do corpo.', [{ x: 340, pe: 'M', ...EM_PE, bP: 0, aP: 0, bL: 0, aL: 0 }]],
    ['Para a frente', 'Gire os dois braços em círculos amplos, passando por cima da cabeça.', [
      { d: 400, bP: 90, aP: 90, bL: 90, aL: 90, hl: ['bP', 'bL'] }, { d: 400, bP: 180, aP: 180, bL: 180, aL: 180, hl: ['bP', 'bL'] }, { d: 400, bP: 270, aP: 270, bL: 270, aL: 270, hl: ['bP', 'bL'] }, { d: 400, bP: 360, aP: 360, bL: 360, aL: 360, hl: ['bP', 'bL'] },
    ]],
    ['Para trás', 'Inverta o sentido, mantendo o círculo grande e os ombros soltos.', [
      { d: 400, bP: 270, aP: 270, bL: 270, aL: 270, hl: ['bP', 'bL'] }, { d: 400, bP: 180, aP: 180, bL: 180, aL: 180, hl: ['bP', 'bL'] }, { d: 400, bP: 90, aP: 90, bL: 90, aL: 90, hl: ['bP', 'bL'] }, { d: 400, bP: 0, aP: 0, bL: 0, aL: 0 },
    ]],
  ]),
  'Balanço de pernas': ex('lado', {}, [
    ['Apoio', 'Fique em uma perna, com o tronco reto e os braços abertos para equilibrar.', [{ x: 340, pe: 'T', t: 2, cF: 6, kF: 0, cT: -2, kT: -2, bP: 60, aP: 70, bL: 60, aL: 70 }]],
    ['Balance', 'Leve a perna solta para a frente e para trás, sem forçar e sem curvar as costas.', ciclo([
      { x: 340, pe: 'T', cF: 55, kF: 40, hl: ['pF'] },
      { x: 340, pe: 'T', cF: -35, kF: -50, hl: ['pF'] },
    ], 3, 480)],
  ]),
  'Caminhada com joelho alto': ex('lado', {}, [
    ['Puxe o joelho', 'Suba um joelho até a altura do quadril, com o pé de apoio firme no chão.', [{ x: 120, ...JOELHO_A, bP: 40, aP: 110, bL: -30, aL: 10, hl: ['pF'] }, { d: 300, x: 150, ...ANDA_B }]],
    ['Troque de perna', 'Dê um passo e suba o outro joelho, em ritmo de caminhada.', [
      { d: 340, x: 190, ...JOELHO_B, bP: -30, aP: 10, bL: 40, aL: 110, hl: ['pT'] }, { d: 300, x: 225, ...ANDA_A },
      { d: 340, x: 265, ...JOELHO_A, bP: 40, aP: 110, bL: -30, aL: 10, hl: ['pF'] }, { d: 300, x: 300, ...ANDA_B },
      { d: 340, x: 340, ...JOELHO_B, bP: -30, aP: 10, bL: 40, aL: 110, hl: ['pT'] }, { d: 300, x: 375, ...ANDA_A },
      { d: 340, x: 415, ...JOELHO_A, bP: 40, aP: 110, bL: -30, aL: 10, hl: ['pF'] }, { d: 300, x: 450, ...ANDA_B },
    ]],
  ]),
  'Corrida leve na quadra': ex('lado', { linhas: [70, 600] }, [
    ['Saia devagar', 'Passadas curtas, respiração solta e sem acelerar.', passadas(trecho(80, 330, 7), { bola: null, d: 240 })],
    ['Mantenha o trote', 'Continue no mesmo ritmo até a outra linha, olhando para a frente.', passadas(trecho(330, 590, 7), { bola: null, d: 240 })],
    ['Vire e recomece', 'Gire na linha, sem frear forte, e volte no mesmo trote.', [{ d: 300, dir: -1, ...BASE, ...SOLTOS }]],
  ]),
  'Quiques leves parado': ex('frente', {}, [
    ['Mão direita', 'Quiques altos e tranquilos, sentindo a bola na ponta dos dedos.', [{ x: 340, pe: 'M', ...F_BASE }, ...quiques('P', 4, { d: 340, alto: true })]],
    ['Mão esquerda', 'Agora com a outra mão, no mesmo ritmo calmo.', quiques('L', 4, { d: 340, alto: true })],
  ]),
  'Drible leve caminhando': ex('lado', { linhas: [80, 600] }, [
    ['Olhar para a frente', 'Caminhe driblando alto, sem olhar para a bola.', [{ x: 90, ...ANDA_A, bP: 30, aP: 75, bL: 40, aL: 110, bola: mao(0) }, ...passadas(trecho(90, 340, 7), { andar: true })]],
    ['Mesmo ritmo', 'A bola quica ao lado do pé da frente, sempre no mesmo tempo.', passadas(trecho(340, 590, 7), { andar: true })],
  ]),
  'Passe leve na parede': ex('lado', { parede: 470 }, [
    ['Bem perto', 'Fique a poucos passos da parede, com os pés paralelos.', [{ x: 390, pe: 'M', ...EM_PE, ...PEITO, bola: { m: 'peito' } }]],
    ['Passes suaves', 'Solte a bola com os polegares para baixo e receba com as duas mãos.', [...passe(390, { x: 463, y: 205 }), ...passe(390, { x: 463, y: 205 })]],
  ]),
  'Arremesso colado à cesta': arremessoParado(600, [
    ['Bem embaixo', 'Comece quase embaixo do aro: aqui ninguém erra, e é esse o objetivo.'],
    ['Empurre devagar', 'Quase sem usar as pernas, leve a bola para cima da testa.'],
    ['Solte e segure', 'Deixe a bola cair na cesta e segure o punho quebrado, sem pressa.'],
  ], { ar: 0, extra: MAO_LIVRE }),
  'Arremesso um passo atrás': arremessoParado(565, [
    ['Um passo', 'Dê um passo para trás da posição anterior, com os pés virados para a cesta.'],
    ['Pernas e braço', 'Use um pouco das pernas, sem pular, e suba a bola em linha reta.'],
    ['Mesma soltura', 'A mesma mão apontando para o aro: só a distância mudou.'],
  ], { ar: 0 }),
  'Arremesso dois passos atrás': arremessoParado(525, [
    ['Mais um passo', 'Mais longe, ainda dentro do garrafão, com o mesmo pé à frente.'],
    ['Mais pernas', 'Flexione um pouco mais os joelhos: a força extra vem das pernas, nunca do braço.'],
    ['Pronto para treinar', 'Depois de acertar daqui, o corpo está pronto para os exercícios do dia.'],
  ], { ar: 4 }),

  // Intermediário
  'Calcanhar no glúteo': ex('lado', {}, [
    ['Passadas curtas', 'Corra devagar, mantendo os joelhos apontados para baixo.', [{ x: 120, t: 5, cF: 5, kF: -110, cT: -3, kT: -3, ...{ bP: 40, aP: 110, bL: -30, aL: 10 }, hl: ['pF'] }]],
    ['Calcanhar sobe', 'Leve cada calcanhar em direção ao glúteo, alternando rápido.', [
      ...[160, 200, 240, 280, 320, 360, 400, 440].map((x, i) => (i % 2 === 0
        ? { d: 230, x, cF: -3, kF: -3, cT: 5, kT: -110, bP: -30, aP: 10, bL: 40, aL: 110, hl: ['pT' as const] }
        : { d: 230, x, cF: 5, kF: -110, cT: -3, kT: -3, bP: 40, aP: 110, bL: -30, aL: 10, hl: ['pF' as const] })),
    ]],
  ]),
  'Afundo com giro do tronco': ex('lado', {}, [
    ['Passo longo', 'Dê um passo grande e desça até o joelho de trás ficar perto do chão.', [{ x: 200, ...EM_PE, ...PEITO }, { d: 520, x: 250, ...AFUNDO, ...PEITO, hl: PERNAS }]],
    ['Gire o tronco', 'Gire o tronco para o lado da perna da frente, sem perder o equilíbrio.', [{ d: 520, t: 15, bP: 90, aP: 40, bL: 10, aL: 100 }, { d: 520, t: 0, bP: 20, aP: 120, bL: 80, aL: 60 }]],
    ['Levante e troque', 'Empurre com o pé da frente, fique em pé e repita com a outra perna.', [{ d: 500, x: 310, ...EM_PE, ...PEITO }, { d: 520, x: 365, ...AFUNDO, ...PEITO, hl: PERNAS }, { d: 500, x: 420, ...EM_PE }]],
  ]),
  Skipping: ex('lado', {}, [
    ['Joelhos altos', 'Corra quase no lugar, subindo os joelhos até o quadril.', [{ x: 150, ...JOELHO_A, bP: -30, aP: 10, bL: 40, aL: 110, hl: ['pF'] }]],
    ['Ritmo rápido', 'Toque pouco o chão, na ponta dos pés, com os braços acompanhando.', [
      ...[175, 200, 225, 250, 275, 300, 325, 350, 375, 400].map((x, i) => (i % 2 === 0
        ? { d: 170, x, ...JOELHO_B, bP: 40, aP: 110, bL: -30, aL: 10, hl: ['pT' as const] }
        : { d: 170, x, ...JOELHO_A, bP: -30, aP: 10, bL: 40, aL: 110, hl: ['pF' as const] })),
    ]],
  ]),
  'Deslocamento lateral leve': ex('frente', { linhas: [150, Math.round(DESLIZE.fim + 30)] }, [
    ['Base média', 'Mais alta que a do treino: o objetivo é só aquecer as pernas.', [{ x: 180, pe: 'M', t: 0, cF: 35, kF: -5, cT: -35, kT: 5, eF: 0.8, eT: 0.8, bP: 75, aP: 140, bL: -75, aL: -140 }, { d: 300 }]],
    ['Deslize', 'Abra um pé e recolha o outro, sem cruzar e sem pressa.', DESLIZE.quadros],
  ]),
  'Drible em ritmo crescente': ex('lado', { linhas: [70, 620] }, [
    ['Devagar', 'Comece caminhando, com a bola sob controle.', [{ x: 80, ...ANDA_A, bP: 30, aP: 75, bL: 40, aL: 110, bola: mao(0) }, ...passadas(trecho(80, 240, 5), { andar: true })]],
    ['Trote', 'Passe para um trote, empurrando a bola um pouco mais à frente.', passadas(trecho(240, 420, 5), { d: 240 })],
    ['Acelere', 'Termine perto da sua velocidade de jogo, sem perder a bola.', passadas(trecho(420, 610, 4), { d: 180 })],
  ]),
  'Troca de mãos caminhando': ex('lado', {}, [
    ['Mão direita', 'Dê dois passos driblando com a direita.', [{ x: 120, ...ANDA_A, bP: 30, aP: 75, bL: 40, aL: 110, bola: mao(0) }, ...passadas([155, 190], { andar: true })]],
    ['Cruze', 'Um quique baixo pela frente do corpo, sem parar de andar.', [{ d: 240, x: 225, ...ANDA_A, bola: em2(232), bP: 20, aP: 0 }, ...passadas([260, 295], { andar: true, bola: 'L' })]],
    ['Volte', 'Cruze de novo e siga trocando a cada dois passos.', [{ d: 240, x: 330, ...ANDA_B, bola: em2(337), bL: 20, aL: 0 }, ...passadas([365, 400], { andar: true }), { d: 240, x: 435, ...ANDA_A, bola: em2(442) }, ...passadas([470, 505], { andar: true, bola: 'L' })]],
  ]),
  'Passe e recebe em movimento leve': ex('lado', { parede: 520 }, [
    ['De frente para a parede', 'Passe e receba enquanto anda devagar para o lado.', [{ x: 400, pe: 'M', ...EM_PE, ...PEITO, bola: { m: 'peito' } }]],
    ['Solte e ande', 'Solte a bola, dê um passo curto e receba já no próximo lugar.', [...passe(400, { x: 513, y: 205 }), { d: 260, x: 385, ...ANDA_A }, ...passe(385, { x: 513, y: 205 }), { d: 260, x: 370, ...ANDA_B }]],
  ]),
  'Bandeja sem salto': ex('lado', { cesta: 'lado' }, [
    ['Caminhe', 'Caminhe até a cesta com a bola nas duas mãos.', [{ x: 440, ...ANDA_A, ...PEITO, bola: { m: 'peito' } }, { d: 320, x: 470, ...ANDA_B }]],
    ['Direita, esquerda', 'Os dois passos da bandeja, bem devagar.', [{ ...passoUm(510), d: 340 }, { ...passoDois(550), d: 340 }]],
    ['Deixe na tabela', 'Suba o joelho quase sem sair do chão e deixe a bola no quadrado.', subidaBandeja(585, { ar: 8, alt: 20 })],
  ]),
  'Arremesso do garrafão curto': arremessoParado(520, [
    ['Perto do aro', 'Comece dentro do garrafão, com os pés na largura dos ombros.'],
    ['Sem pressa', 'Encontre o ritmo: pernas e braço subindo juntos.'],
    ['Conte os acertos', 'Só afaste depois de acertar três seguidos daqui.'],
  ], { ar: 10 }),
  'Arremesso da linha de lance livre leve': arremessoParado(320, [
    ['Na linha', 'Sem cobrança: o objetivo é só encontrar o alcance do dia.'],
    ['Sem salto', 'Suba a bola estendendo as pernas, com os pés quase no chão.'],
    ['Veja o arco', 'Observe a altura da bola e ajuste antes de começar o treino.'],
  ], { ar: 3, cena: { linhas: [300] } }),

  // Avançado
  'Mobilidade de quadril em pé': ex('frente', {}, [
    ['Fique em um pé', 'Equilibre-se, com o tronco reto e as mãos na cintura.', [{ x: 340, pe: 'T', ...F_PE, bP: 40, aP: -60, bL: -40, aL: 60 }]],
    ['Abra o joelho', 'Suba o joelho e leve-o para o lado, passando por cima de uma barreira imaginária.', ciclo([
      { x: 340, pe: 'T', cF: 40, kF: 0, eF: 0.45, hl: ['pF'] },
      { x: 340, pe: 'T', cF: 70, kF: -10, eF: 0.8, hl: ['pF'] },
      { x: 340, pe: 'T', cF: 6, kF: 0, eF: 1 },
    ], 2, 420)],
    ['Troque de lado', 'Repita com a outra perna, no mesmo ritmo.', ciclo([
      { x: 340, pe: 'F', cT: -40, kT: 0, eT: 0.45, cF: 6, kF: 0, hl: ['pT'] },
      { x: 340, pe: 'F', cT: -70, kT: 10, eT: 0.8, hl: ['pT'] },
      { x: 340, pe: 'F', cT: -6, kT: 0, eT: 1 },
    ], 2, 420)],
  ]),
  'Agachamento com braços acima': ex('frente', {}, [
    ['Braços no alto', 'Pés na largura dos ombros e braços estendidos acima da cabeça.', [{ x: 340, pe: 'M', ...F_PE, cF: 12, cT: -12, ...F_ALTO }]],
    ['Desça devagar', 'Desça o quadril sem deixar os braços caírem para a frente.', [{ d: 800, x: 340, pe: 'M', ...F_AGACHA, hl: PERNAS }, { d: 500 }]],
    ['Suba', 'Suba empurrando o chão, com os braços ainda no alto.', [{ d: 700, x: 340, pe: 'M', ...F_PE, cF: 12, cT: -12 }, { d: 800, x: 340, pe: 'M', ...F_AGACHA, hl: PERNAS }, { d: 700, x: 340, pe: 'M', ...F_PE, cF: 12, cT: -12 }]],
  ]),
  'Saltos curtos de tornozelo': ex('lado', {}, [
    ['Pernas quase retas', 'Quase sem dobrar os joelhos, toda a força vem dos tornozelos.', [{ x: 340, pe: 'M', ...EM_PE, ...SOLTOS }]],
    ['Saltite', 'Saltos curtos e rápidos, tocando pouco o chão.', ciclo([{ x: 340, pe: 'M', ar: 12, hl: PERNAS }, { x: 340, pe: 'M', ar: 0 }], 6, 170)],
  ]),
  'Aceleração progressiva': ex('lado', { linhas: [50, 630] }, [
    ['Comece em 50%', 'Saia em ritmo de trote, com passadas soltas.', passadas(trecho(60, 230, 5), { bola: null, d: 250 })],
    ['Suba para 70%', 'Aumente aos poucos o tamanho e a frequência da passada.', passadas(trecho(230, 420, 5), { bola: null, d: 210 })],
    ['Termine em 90%', 'Chegue perto do sprint e desacelere depois da linha, sem freada brusca.', passadas(trecho(420, 620, 5), { bola: null, d: 170 })],
  ]),
  'Mudança de direção leve': ex('lado', { linhas: [120, 470] }, [
    ['Corra', 'Saia em velocidade média até a linha.', [...passadas(trecho(130, 420, 7), { bola: null })]],
    ['Freie baixo', 'Baixe o quadril, com o pé da frente passando da linha e o peso para trás.', [{ d: 260, x: 450, t: 25, cF: 55, kF: 15, cT: -25, kT: -65, bP: 40, aP: 90, bL: -30, aL: 30, hl: ['pF'] }]],
    ['Volte', 'Empurre com a perna da frente e saia para o outro lado.', [{ d: 240, x: 440, dir: -1, ...BASE, ...SOLTOS }, ...passadas(trecho(420, 160, 6), { bola: null })]],
  ]),
  'Saltos com aterrissagem controlada': ex('lado', {}, [
    ['Carregue', 'Agache rápido e leve os braços para trás.', [{ x: 340, pe: 'M', ...EM_PE, ...SOLTOS }, { d: 380, x: 340, pe: 'M', ...AGACHA, bP: -60, aP: -40, bL: -55, aL: -35, hl: PERNAS }]],
    ['Suba', 'Salte em altura média, com os braços puxando para cima.', [{ d: 260, x: 340, pe: 'M', ar: 34, ...SALTO, bP: 160, aP: 170, bL: 155, aL: 165, hl: PERNAS }]],
    ['Segure', 'Caia macio, joelhos alinhados com os pés, e fique parado por dois segundos.', [{ d: 280, x: 340, pe: 'M', ar: 0, ...ATERRISSA, bP: 70, aP: 80, bL: 70, aL: 80, hl: PERNAS }, { d: 1100 }, { d: 500, x: 340, pe: 'M', ...EM_PE, ...SOLTOS }]],
  ]),
  'Duas bolas em ritmo leve': ex('frente', {}, [
    ['Base', 'Pés afastados, joelhos flexionados e uma bola em cada mão.', [{ x: 340, pe: 'M', ...F_BASE, bP: 30, aP: 10, bL: -30, aL: -10, bola: mao(0), bola2: mao(0, 'L') }]],
    ['Juntas', 'As duas bolas sobem e descem juntas, em ritmo bem tranquilo.', [1, 0, 1, 0, 1, 0, 1, 0].map((d) => ({ d: 340, x: 340, pe: 'M' as const, bola: mao(d), bola2: mao(d, 'L') }))],
  ]),
  'Finalização progressiva': ex('lado', { cesta: 'lado' }, [
    ['Velocidade baixa', 'Primeira bandeja quase caminhando, só para acertar os passos.', [{ x: 360, ...ANDA_A, bP: 30, aP: 75, bL: 40, aL: 110, bola: mao(0) }, ...passadas(trecho(360, 450, 3), { andar: true })]],
    ['Dois passos', 'Recolha a bola e faça os dois passos, ganhando altura.', [{ ...passoUm(495), d: 280 }, { ...passoDois(540), d: 280 }]],
    ['Suba cada vez mais', 'A cada repetição, acelere um pouco e suba mais alto.', subidaBandeja(570, { ar: 30 })],
  ]),
  'Escada de arremesso': ex('lado', { cesta: 'lado', linhas: [300, 125] }, [
    ['Colado à cesta', 'O primeiro arremesso é bem perto, só para sentir a mão.', [{ x: 590, ...EM_PE, ...PEITO, bola: { m: 'peito' } }, carga(590), armar(590, 2), ...soltura(590, 3)]],
    ['Lance livre', 'Ande até a linha de lance livre e mantenha a mesma mecânica.', [{ d: 900, x: 320, ...BASE, ...PEITO, bola: { m: 'peito' } }, carga(320), armar(320, 6), ...soltura(320, 8)]],
    ['Linha de três', 'Só depois de acertar de perto, recue até a linha de três.', [{ d: 900, x: 100, ...BASE, ...PEITO, bola: { m: 'peito' } }, carga(100), armar(100, 20), ...soltura(100, 24)]],
  ]),
  'Arremesso de três sem salto': ex('lado', { cesta: 'lado', linhas: [125] }, [
    ['Na linha', 'Pés atrás da linha e joelhos flexionados, sem pular.', [{ x: 100, ...EM_PE, ...PEITO, bola: { m: 'peito' } }, carga(100)]],
    ['Suba com as pernas', 'A força vem toda das pernas, que quase não saem do chão.', [armar(100, 4)]],
    ['Ajuste o alcance', 'Veja onde a bola caiu e corrija antes de arremessar em velocidade.', [{ d: 140, x: 100, ...SALTO, ar: 5, bola: { m: 'cima' }, hl: ['bP'] }, { d: 340, ar: 0, bola: voo(0.6, 130) }, { d: 380, ...ATERRISSA, bola: voo(1, 130) }, { d: 800, ...SOLTOS, bola: voo(1.94, 130) }]],
  ]),
}

function em2(x: number) {
  return { m: 'em' as const, x, y: 293 }
}

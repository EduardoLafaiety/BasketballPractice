// Quais exercícios têm movimento real (captura de movimento da CMU) e como o clipe entra na cena.
// Gravações: CMU Graphics Lab Motion Capture Database (http://mocap.cs.cmu.edu), conversão BVH de Bruce Hahne.
import { ARO } from './motor'
import { ESCALA, v3 } from './corpo3d'
import { construirBola, duracao, momentoDaSoltura, momentoDoPasse, poseEm, toques, yawParaOlharAMais, type Arremesso, type BolaMocap, type Clipe, type Colocacao3D } from './mocap'

export type IdClipe = '22_15' | '22_14' | '141_11' | '06_02' | '06_08' | '06_13' | '06_14' | '06_15' | '124_06' | '124_05' | '124_11' | '13_40' | '118_01'

/** Exercício (pelo nome do catálogo) → clipe real que o mostra. */
export const MOCAP_DE_EXERCICIO: Record<string, IdClipe> = {
  'Drible em linha reta': '06_02',
  'Drible caminhando com a mão forte': '06_02',
  'Drible leve caminhando': '06_02',
  'Troca de mão entre cones': '06_08',
  'Entre as pernas em movimento': '06_13',
  'Oito entre as pernas': '06_13',
  'Cruzado em movimento': '06_14',
  'Pull-up de três': '06_14',
  'Arremesso após drible': '06_15',
  'Bandeja de um passo': '124_06',
  'Bandeja com a mão forte': '124_06',
  'Arremesso de média distância': '124_05',
  'Arremesso de três': '124_05',
  'Agachamento com salto': '13_40',
  'Saltos com aterrissagem controlada': '118_01',
  'Saltos curtos de tornozelo': '124_11',
  'Passe de peito no alvo': '141_11',
  'Polichinelo leve': '22_15',
  'Agachamento livre': '22_14',
  'Agachamento com braços acima': '22_14',
}

/** Clipes de passe de peito: a bola vai nas duas mãos, sai no empurrão e voa reta até o alvo. */
const PASSE: IdClipe[] = ['141_11']

/** Clipes em que o jogador só leva a bola (sem quicar): bandeja e arremesso em suspensão. */
const SEM_QUIQUE: IdClipe[] = ['124_06', '124_05', '141_11']
/** Clipes de saltos: sem bola. */
const SEM_BOLA: IdClipe[] = ['124_11', '13_40', '118_01', '22_15', '22_14']
/** Distância (m) do jogador à cesta na hora da soltura: bandeja perto, arremesso em suspensão de média distância. */
const DISTANCIA_DA_CESTA: Partial<Record<IdClipe, number>> = { '124_06': 1.15, '124_05': 4.6 }

export const CREDITO_MOCAP = 'Movimento real: CMU Graphics Lab Motion Capture Database (mocap.cs.cmu.edu)'

const CARREGADORES: Record<IdClipe, () => Promise<{ default: unknown }>> = {
  '06_02': () => import('./mocap/06_02.json'),
  '06_08': () => import('./mocap/06_08.json'),
  '06_13': () => import('./mocap/06_13.json'),
  '06_14': () => import('./mocap/06_14.json'),
  '06_15': () => import('./mocap/06_15.json'),
  '124_06': () => import('./mocap/124_06.json'),
  '124_05': () => import('./mocap/124_05.json'),
  '124_11': () => import('./mocap/124_11.json'),
  '13_40': () => import('./mocap/13_40.json'),
  '118_01': () => import('./mocap/118_01.json'),
  '141_11': () => import('./mocap/141_11.json'),
  '22_15': () => import('./mocap/22_15.json'),
  '22_14': () => import('./mocap/22_14.json'),
}

export async function carregarClipe(id: IdClipe): Promise<Clipe> {
  return (await CARREGADORES[id]()).default as Clipe
}

/** Tempo depois da soltura em que a bola voa e cai pela rede, para a cena não terminar no meio do arremesso. */
const DEPOIS_DA_SOLTURA = 1900

export interface CenaMocap {
  clipe: Clipe
  colocacao: Colocacao3D
  bola: ((t: number) => BolaMocap) | null
  arremesso: Arremesso | null
  /** Duração total (ms), já com o voo da bola quando há arremesso. */
  total: number
}

/** Prepara o clipe para a cena: vira o jogador para a cesta (+x) e o leva para onde o arremesso é de uns 5 m. */
export function prepararCena(clipe: Clipe, id?: IdClipe, deFrente = false): CenaMocap {
  const semBola = !!id && SEM_BOLA.includes(id)
  const ev = id && SEM_QUIQUE.includes(id) ? [] : toques(clipe)
  const ehPasse = !!id && PASSE.includes(id)
  const soltura = semBola ? null : ehPasse ? momentoDoPasse(clipe) : momentoDaSoltura(clipe, ev)
  // De frente (exercícios de frente para a câmera), o jogador olha para quem assiste (+z); senão, para a cesta (+x).
  const yaw = yawParaOlharAMais(clipe, soltura ?? 0) - (deFrente ? Math.PI / 2 : 0)
  const cestaX = ARO.lado.x * ESCALA
  let origemX = deFrente ? 4.4 : 1.5
  let pelveNaSoltura = 0
  if (soltura !== null) {
    const p0 = poseEm(clipe, 0).Hips
    const ps = poseEm(clipe, soltura).Hips
    const dx = ps.x - p0.x
    const dz = ps.z - p0.z
    pelveNaSoltura = dx * Math.cos(-yaw) - dz * Math.sin(-yaw)
    // Arremesso: a uma distância da cesta. Passe: no meio da quadra, com o alvo a 5 m à frente.
    origemX = (ehPasse ? 3 : cestaX - ((id && DISTANCIA_DA_CESTA[id]) || 5.2)) - pelveNaSoltura
  }
  const colocacao: Colocacao3D = { yaw, origem: v3(origemX, 0, 0) }
  let arremesso: Arremesso | null = null
  if (soltura !== null) {
    arremesso = ehPasse
      ? { t: soltura, cesta: v3(origemX + pelveNaSoltura + 5, 1.15, 0), pico: 0.12, voo: 620 }
      : { t: soltura, cesta: v3(cestaX, 3.05, 0) }
  }
  return { clipe, colocacao, bola: semBola ? null : construirBola(clipe, ev), arremesso, total: duracao(clipe) + (soltura === null ? 0 : DEPOIS_DA_SOLTURA) }
}

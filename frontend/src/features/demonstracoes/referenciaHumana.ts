import captura from './mocap/124_05.json'

/** CMU 124_05: direções de ombro–cotovelo–punho, projetadas no plano sagital.
 * A captura orienta os braços; passos, saltos e bola continuam específicos de cada exercício.
 * Não contém captura dos dedos, nem certifica as variações sentadas/deitadas.
 */
export function bracosDoArremesso(tempo: number) {
  const ponto = (nome: string) => {
    const i = (Math.round(tempo / 1000 * captura.fps) * captura.juntas.length + captura.juntas.indexOf(nome)) * 3
    return captura.dados.slice(i, i + 3)
  }
  const l = ponto('LeftUpLeg'), r = ponto('RightUpLeg')
  const frente = [r[2] - l[2], 0, l[0] - r[0]]
  const n = Math.hypot(...frente)
  const angulo = (inicio: string, fim: string) => {
    const a = ponto(inicio), b = ponto(fim)
    const graus = Math.atan2(((b[0] - a[0]) * frente[0] + (b[2] - a[2]) * frente[2]) / n, a[1] - b[1]) * 180 / Math.PI
    return graus < -90 ? graus + 360 : graus
  }
  return {
    bP: angulo('RightArm', 'RightForeArm'), aP: angulo('RightForeArm', 'RightHand'),
    bL: angulo('LeftArm', 'LeftForeArm'), aL: angulo('LeftForeArm', 'LeftHand'),
  }
}

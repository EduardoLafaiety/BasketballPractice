import * as THREE from 'three'
import type { Corpo3D } from '../corpo3d'

const v = (p: { x: number; y: number; z: number }) => new THREE.Vector3(p.x, p.y, p.z)
const suave = (a: number, b: number, x: number) => THREE.MathUtils.smoothstep(x, a, b)

/** Orientação da palma e dos dedos, independente da taxa de quadros e da ordem de reprodução. */
export function gestoDaMao(c: Corpo3D, lado: 'P' | 'L') {
  const braco = c.braco[lado]
  const palma = v(braco.ponta)
  const antebraco = palma.clone().sub(v(braco.meio)).normalize()
  const direita = v(braco.raiz).sub(v(c.pelve)).dot(v(c.torax.lado)) > 0
  let normal = v(c.torax.lado).multiplyScalar(direita ? -1 : 1)
  let dedos = antebraco.clone()
  let curvar = 0.12
  let contato = 0
  const bola = c.bolas.filter(b => !b.quique || b.quique.lado === lado).sort((a, b) => palma.distanceToSquared(v(a.centro)) - palma.distanceToSquared(v(b.centro)))[0]
  if (bola) {
    const ateBola = v(bola.centro).sub(palma)
    const distancia = ateBola.length()
    contato = 1 - suave(0.18, 0.4, distancia)
    if (contato > 0) {
      const virar = new THREE.Quaternion().setFromUnitVectors(normal, ateBola.clone().normalize())
      normal.applyQuaternion(new THREE.Quaternion().slerp(virar, contato)).normalize()
      // Os dedos contornam a bola: apontá-los diretamente para o centro atravessaria a superfície.
      const tangente = antebraco.clone().addScaledVector(normal, -antebraco.dot(normal))
      if (tangente.lengthSq() < 0.01) {
        tangente.copy(v(c.torax.frente)).addScaledVector(normal, -v(c.torax.frente).dot(normal))
      }
      if (tangente.lengthSq() < 0.01) tangente.copy(v(c.torax.cima)).addScaledVector(normal, -v(c.torax.cima).dot(normal))
      dedos.lerp(tangente.normalize(), contato * 0.85).normalize()
      curvar += contato * (0.28 + bola.presa * 0.38)
    }
    // Sustenta o acabamento do arremesso enquanto o braço permanece alto.
    const alto = suave(c.cabeca.y - 0.05, c.cabeca.y + 0.12, palma.y)
    const estendido = suave(0.8, 0.97, antebraco.dot(v(braco.meio).sub(v(braco.raiz)).normalize()))
    const livre = 1 - suave(0.05, 0.45, bola.presa)
    const principal = !bola.pegada || bola.pegada.lado === lado
    const soltura = alto * estendido * livre * (1 - contato) * (principal ? 1 : 0)
    dedos.lerp(v(c.torax.frente), soltura * 0.92).normalize()
    normal.lerp(v(c.torax.frente).addScaledVector(v(c.torax.cima), -0.8).normalize(), soltura).normalize()
    curvar = THREE.MathUtils.lerp(curvar, 0.65, soltura)
    if (bola.quique?.lado === lado) {
      // Drible: contato por cima e soltura para o piso, sem carregar pela lateral.
      normal.set(0, -1, 0)
      dedos.copy(antebraco).setY(0)
      if (dedos.lengthSq() < 0.02) dedos.copy(v(c.torax.frente)).setY(0)
      dedos.normalize()
      curvar = 0.12 + (1 - suave(0.03, 0.3, bola.quique.d)) * 0.24
    }
    if (bola.pegada && bola.pegada.peso > 0 && bola.pegada.tipo !== 'gancho') {
      const peso = bola.pegada.peso
      const alvoNormal = ateBola.clone().normalize()
      const tangente = v(c.torax.cima).addScaledVector(alvoNormal, -v(c.torax.cima).dot(alvoNormal)).normalize()
      normal.lerp(alvoNormal, peso).normalize()
      dedos.lerp(tangente, peso).normalize()
      curvar = THREE.MathUtils.lerp(curvar, principal ? 0.28 : 0.16, peso)
    }
  }
  // Limita o punho; evita uma quebra brusca de 90° no fim de um quique.
  const angulo = antebraco.angleTo(dedos)
  const limite = THREE.MathUtils.degToRad(bola?.quique?.lado === lado ? 35 : 55)
  if (angulo > limite) {
    const giro = new THREE.Quaternion().setFromUnitVectors(antebraco, dedos)
    dedos = antebraco.clone().applyQuaternion(new THREE.Quaternion().slerp(giro, limite / angulo))
  }
  return { palma, dedos, normal, curvar, contato }
}

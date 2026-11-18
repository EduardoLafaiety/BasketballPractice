// @vitest-environment node
import { readFile } from 'node:fs/promises'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { COREOGRAFIAS } from '../coreografias'
import { corpoNoTempo } from '../corpo3d'
import { preparar } from '../motor'
import { RigHumano } from './atletaRealista'
import { gestoDaMao } from './maos'

let modelo: THREE.Group
let rig: RigHumano
const indicesPalma = new Map<string, number[]>()

beforeAll(async () => {
  // O teste valida a malha e o esqueleto reais, sem GPU nem decodificação das texturas.
  vi.stubGlobal('self', globalThis)
  vi.stubGlobal('ProgressEvent', class {})
  vi.stubGlobal('createImageBitmap', async () => ({ width: 4096, height: 4096, close() {} }))
  const arquivo = await readFile(new URL('../../../../public/modelos/atleta/atleta.glb', import.meta.url))
  const gltf = await new GLTFLoader().parseAsync(arquivo.buffer.slice(arquivo.byteOffset, arquivo.byteOffset + arquivo.byteLength), '')
  modelo = gltf.scene
  modelo.updateMatrixWorld(true)
  const mesh = modelo.getObjectByProperty('type', 'SkinnedMesh') as THREE.SkinnedMesh
  mesh.skeleton.update()
  for (const lado of ['Left', 'Right']) {
    const j = mesh.skeleton.bones.findIndex(b => b.name === `${lado}Hand`)
    const punho = mesh.skeleton.bones[j].getWorldPosition(new THREE.Vector3())
    const vertices: { i: number; ponto: THREE.Vector3 }[] = []
    const eixo = new THREE.Vector3()
    for (let i = 0; i < mesh.geometry.attributes.position.count; i += 3) {
      if (mesh.geometry.attributes.skinIndex.getX(i) !== j || mesh.geometry.attributes.skinWeight.getX(i) < 0.95) continue
      const ponto = mesh.localToWorld(mesh.getVertexPosition(i, new THREE.Vector3())).sub(punho)
      vertices.push({ i, ponto }); eixo.add(ponto)
    }
    eixo.normalize()
    indicesPalma.set(lado, vertices.filter(p => p.ponto.dot(eixo) > 0.045 && p.ponto.dot(eixo) < 0.105).map(p => p.i))
  }
  rig = new RigHumano(modelo)
})

describe('modelo humano realista', () => {
  it('a malha dos dedos permanece fora da bola no preparo e na soltura de arremessos e bandejas', () => {
    const mesh = modelo.getObjectByProperty('type', 'SkinnedMesh') as THREE.SkinnedMesh
    const indices: number[] = []
    for (let i = 0; i < mesh.geometry.attributes.position.count; i += 5) {
      const j = mesh.geometry.attributes.skinIndex.getX(i)
      if (/Hand$/.test(mesh.skeleton.bones[j].name) && mesh.geometry.attributes.skinWeight.getX(i) > 0.95) indices.push(i)
    }
    for (const nome of ['Lance livre', 'Arremesso de uma mão', 'Arremesso sentado na cadeira', 'Bandeja com a mão forte', 'Bandeja com a mão fraca']) {
      const c = COREOGRAFIAS[nome], anim = preparar(c)
      for (const k of anim.chaves.filter(k => k.bola?.m === 'cima')) {
        const corpo = corpoNoTempo(anim, k.tempo, c.cena)
        rig.atualizar(corpo); mesh.skeleton.update()
        const centro = new THREE.Vector3().copy(corpo.bolas[0].centro)
        let minimo = Infinity
        for (const i of indices) minimo = Math.min(minimo, mesh.localToWorld(mesh.getVertexPosition(i, new THREE.Vector3())).distanceTo(centro))
        expect(minimo, `${nome} em ${k.tempo}ms`).toBeGreaterThanOrEqual(0.119)
      }
    }
  })
  it('não atravessa as bolas nas poses e transições de todo o catálogo', () => {
    const mesh = modelo.getObjectByProperty('type', 'SkinnedMesh') as THREE.SkinnedMesh
    const indices: number[] = []
    for (let i = 0; i < mesh.geometry.attributes.position.count; i += 19) {
      const j = mesh.geometry.attributes.skinIndex.getX(i)
      if (/Hand$/.test(mesh.skeleton.bones[j].name) && mesh.geometry.attributes.skinWeight.getX(i) > 0.95) indices.push(i)
    }
    const erros: string[] = []
    for (const [nome, c] of Object.entries(COREOGRAFIAS)) {
      const anim = preparar(c)
      for (const t of anim.chaves.flatMap((k, i) => [k.tempo, (k.tempo + (anim.chaves[i + 1]?.tempo ?? k.tempo)) / 2])) {
        const corpo = corpoNoTempo(anim, t, c.cena)
        if (!corpo.bolas.length) continue
        rig.atualizar(corpo); mesh.skeleton.update()
        for (const bola of corpo.bolas) {
          const centro = new THREE.Vector3().copy(bola.centro)
          let minimo = Infinity
          for (const i of indices) minimo = Math.min(minimo, mesh.localToWorld(mesh.getVertexPosition(i, new THREE.Vector3())).distanceTo(centro))
          if (minimo < 0.116) erros.push(`${nome}: ${t}ms (${minimo.toFixed(3)}m)`)
        }
      }
    }
    expect(erros).toEqual([])
  }, 60000)
  it('a superfície real da palma fica horizontal sobre a bola no contato do drible', () => {
    const c = COREOGRAFIAS['Quiques leves parado']
    const anim = preparar(c)
    for (const lado of ['P', 'L'] as const) {
      const corpo = anim.chaves.map(k => corpoNoTempo(anim, k.tempo, c.cena)).find(p => p.bolas[0]?.quique?.lado === lado && p.bolas[0].quique!.d < 0.001)!
      expect(corpo).toBeDefined()
      rig.atualizar(corpo)
      const mesh = modelo.getObjectByProperty('type', 'SkinnedMesh') as THREE.SkinnedMesh
      mesh.skeleton.update()
      const direitaPerto = new THREE.Vector3().subVectors(corpo.braco.P.raiz, corpo.pelve).dot(corpo.torax.lado) > 0
      const nome = ((lado === 'P') === direitaPerto) ? 'Right' : 'Left'
      const pontos = indicesPalma.get(nome)!.map(i => mesh.localToWorld(mesh.getVertexPosition(i, new THREE.Vector3())))
      const centro = pontos.reduce((s, p) => s.add(p), new THREE.Vector3()).divideScalar(pontos.length)
      let xx = 0, zz = 0, xz = 0, xy = 0, yz = 0
      pontos.forEach(p => { const x = p.x - centro.x, y = p.y - centro.y, z = p.z - centro.z; xx += x*x; zz += z*z; xz += x*z; xy += x*y; yz += y*z })
      const determinante = xx * zz - xz * xz
      const inclinacaoX = (xy * zz - yz * xz) / determinante
      const inclinacaoZ = (yz * xx - xy * xz) / determinante
      // A mão é curva: aceita leve inclinação sobre o hemisfério superior, sem contato lateral.
      expect(Math.atan(Math.hypot(inclinacaoX, inclinacaoZ))).toBeLessThan(20 * Math.PI / 180)
      expect(centro.y).toBeGreaterThan(corpo.bolas[0].centro.y + 0.09)
    }
  })
  it('vira a palma para a bola no quique, sem dobrar o punho além do limite anatômico adotado', () => {
    const c = COREOGRAFIAS['Quiques leves parado']
    const corpo = corpoNoTempo(preparar(c), 0, c.cena)
    const palma = new THREE.Vector3().copy(corpo.braco.P.ponta)
    corpo.bolas[0] = { ...corpo.bolas[0], centro: palma.clone().add(new THREE.Vector3(0, -0.121, 0)), presa: 1 }
    const gesto = gestoDaMao(corpo, 'P')
    expect(gesto.normal.dot(new THREE.Vector3(0, -1, 0))).toBeGreaterThan(0.95)
    const ante = new THREE.Vector3().subVectors(corpo.braco.P.ponta, corpo.braco.P.meio).normalize()
    expect(gesto.dedos.angleTo(ante)).toBeLessThanOrEqual(THREE.MathUtils.degToRad(65.01))
  })

  it('curva os dedos da malha na pegada, sem deslocar a cabeça ou criar dedos desproporcionais', () => {
    const c = COREOGRAFIAS['Quiques leves parado']
    const corpo = corpoNoTempo(preparar(c), 0, c.cena)
    corpo.bolas[0] = { ...corpo.bolas[0], centro: new THREE.Vector3().copy(corpo.braco.P.ponta).add(new THREE.Vector3(0, -0.121, 0)), presa: 1 }
    rig.atualizar(corpo)
    const mesh = modelo.getObjectByProperty('type', 'SkinnedMesh') as THREE.SkinnedMesh
    mesh.skeleton.update()
    const influencias = [...mesh.morphTargetInfluences!]
    expect(Math.max(...influencias)).toBeGreaterThan(0.5)
    const antes = Array.from({ length: mesh.geometry.attributes.position.count }, (_, i) => i).filter(i => i % 13 === 0).map(i => ({ i, p: mesh.localToWorld(mesh.getVertexPosition(i, new THREE.Vector3())) }))
    mesh.morphTargetInfluences!.fill(0)
    let maior = 0
    let movidos = 0
    for (const { i, p } of antes) {
      const d = p.distanceTo(mesh.localToWorld(mesh.getVertexPosition(i, new THREE.Vector3())))
      const junta = mesh.geometry.attributes.skinIndex.getX(i)
      if (mesh.skeleton.bones[junta].name === 'Head') expect(d).toBeLessThan(0.000001)
      maior = Math.max(maior, d)
      if (d > 0.001) movidos++
    }
    expect(maior).toBeGreaterThan(0.005)
    expect(maior).toBeLessThan(0.08)
    expect(movidos).toBeGreaterThan(10)
    mesh.morphTargetInfluences = influencias
  })
  it('mantém matrizes válidas nas fases de todos os exercícios, inclusive braços apontados para a frente', () => {
    for (const [nome, c] of Object.entries(COREOGRAFIAS)) {
      const anim = preparar(c)
      const tempos = anim.chaves.flatMap((k, i) => [k.tempo, (k.tempo + (anim.chaves[i + 1]?.tempo ?? k.tempo)) / 2])
      for (const t of tempos) {
        rig.atualizar(corpoNoTempo(anim, t, c.cena))
        modelo.traverse((o) => {
          if (!(o instanceof THREE.Bone)) return
          expect(o.matrixWorld.elements.every(Number.isFinite), `${nome}: ${o.name}`).toBe(true)
          expect(Math.abs(o.matrixWorld.determinant()), `${nome}: ${o.name}`).toBeGreaterThan(1e-9)
        })
      }
    }
  })
  it('leva a mão da malha até a mão da coreografia, em vez de manter a pose de importação', () => {
    const c = COREOGRAFIAS['Quiques leves parado']
    const corpo = corpoNoTempo(preparar(c), 0, c.cena)
    rig.atualizar(corpo)
    const mesh = modelo.getObjectByProperty('type', 'SkinnedMesh') as THREE.SkinnedMesh
    mesh.skeleton.update()
    for (const nome of ['LeftHand', 'RightHand']) {
      const j = mesh.skeleton.bones.findIndex(b => b.name === nome)
      const centro = new THREE.Vector3()
      let n = 0
      for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
        if (mesh.geometry.attributes.skinIndex.getX(i) !== j || mesh.geometry.attributes.skinWeight.getX(i) < 0.9) continue
        centro.add(mesh.localToWorld(mesh.getVertexPosition(i, new THREE.Vector3())))
        n++
      }
      const perto = (nome === 'RightHand') === (new THREE.Vector3().subVectors(corpo.braco.P.raiz, corpo.pelve).dot(corpo.torax.lado) > 0)
      expect(n).toBeGreaterThan(100)
      expect(centro.divideScalar(n).distanceTo(corpo.braco[perto ? 'P' : 'L'].ponta)).toBeLessThan(0.2)
    }
  })
  it('acompanha ombros, cotovelos, quadris, joelhos e tornozelos nos dois lados', () => {
    for (const nome of ['Polichinelo leve', 'Drible estacionário', 'Bandeja com a mão fraca', 'Arremesso colado à cesta']) {
      const c = COREOGRAFIAS[nome]
      const anim = preparar(c)
      for (let t = 0; t < anim.total; t += 250) {
        const corpo = corpoNoTempo(anim, t, c.cena)
        rig.atualizar(corpo)
        const direitaPerto = new THREE.Vector3().subVectors(corpo.braco.P.raiz, corpo.pelve).dot(corpo.torax.lado) > 0
        for (const lado of ['Left', 'Right']) {
          const perto = (lado === 'Right') === direitaPerto
          const b = corpo.braco[perto ? 'P' : 'L']
          const p = corpo.perna[perto ? 'F' : 'T']
          for (const [osso, alvo] of [[`${lado}Arm`, b.raiz], [`${lado}ForeArm`, b.meio], [`${lado}UpLeg`, p.raiz], [`${lado}Leg`, p.meio], [`${lado}Foot`, p.ponta]] as const) {
            const atual = modelo.getObjectByName(osso)!.getWorldPosition(new THREE.Vector3())
            expect(atual.distanceTo(alvo), `${nome}: ${osso} em ${t}ms`).toBeLessThan(0.0001)
          }
        }
      }
    }
  })

  it('preserva a superfície da cabeça junto ao rosto durante a animação', () => {
    const c = COREOGRAFIAS['Polichinelo leve']
    const anim = preparar(c)
    const mesh = modelo.getObjectByProperty('type', 'SkinnedMesh') as THREE.SkinnedMesh
    const cabeca = mesh.skeleton.bones.findIndex((b) => b.name === 'Head')
    const pesos = mesh.geometry.getAttribute('skinWeight')
    const indices = mesh.geometry.getAttribute('skinIndex')
    const pontos: number[] = []
    for (let i = 0; i < pesos.count; i += 9) if (indices.getX(i) === cabeca && pesos.getX(i) > 0.95) pontos.push(i)
    expect(pontos.length).toBeGreaterThan(50)
    for (const t of [0, anim.total * 0.25, anim.total * 0.5]) {
      const corpo = corpoNoTempo(anim, t, c.cena)
      rig.atualizar(corpo)
      mesh.skeleton.update()
      for (const i of pontos) {
        const p = mesh.localToWorld(mesh.getVertexPosition(i, new THREE.Vector3()))
        expect(p.distanceTo(corpo.cabeca)).toBeLessThan(0.3)
      }
    }
  })
})

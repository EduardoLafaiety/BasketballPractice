import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MEDIDAS, type Corpo3D, type Eixos, type V3 } from '../corpo3d'
import { Boneco, Tenis, type Cores } from './boneco'
import { gestoDaMao } from './maos'

const v = (p: V3) => new THREE.Vector3(p.x, p.y, p.z)
const Y = new THREE.Vector3(0, 1, 0)
const Z = new THREE.Vector3(0, 0, 1)
const base = (e: Eixos) => new THREE.Quaternion().setFromRotationMatrix(
  new THREE.Matrix4().makeBasis(v(e.lado).negate(), v(e.cima), v(e.frente)),
)

function referencial(direcao: THREE.Vector3, frente: THREE.Vector3) {
  const y = direcao.clone().normalize()
  const z = frente.clone().addScaledVector(y, -frente.dot(y))
  if (z.lengthSq() < 0.001) {
    z.copy(Math.abs(y.x) < 0.8 ? new THREE.Vector3(1, 0, 0) : Z)
    z.addScaledVector(y, -z.dot(y))
  }
  z.normalize()
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(y, z).normalize(), y, z))
}

interface Repouso {
  osso: THREE.Bone
  posicao: THREE.Vector3
  rotacao: THREE.Quaternion
  escala: THREE.Vector3
  correcao?: THREE.Quaternion
  comprimento?: number
}

interface MaoCalibrada {
  centro: THREE.Vector3
  correcao: THREE.Quaternion
  malha: THREE.SkinnedMesh
  morph: number
  superficie: Float32Array
}

/** Retarget da malha contínua para as articulações da coreografia, em metros. */
export class RigHumano {
  private repouso = new Map<string, Repouso>()
  private frente = Z.clone()
  private maos = new Map<string, MaoCalibrada>()

  constructor(readonly modelo: THREE.Group) {
    modelo.updateMatrixWorld(true)
    modelo.traverse((o) => {
      if (!(o instanceof THREE.Bone)) return
      const posicao = o.getWorldPosition(new THREE.Vector3())
      const rotacao = o.getWorldQuaternion(new THREE.Quaternion())
      const escala = o.getWorldScale(new THREE.Vector3())
      const filhoPrincipal = o.name === 'Spine' ? 'neck' : o.name === 'Hips' ? 'Spine02' : undefined
      const filho = o.children.find((f) => f instanceof THREE.Bone && (!filhoPrincipal || f.name === filhoPrincipal))
      const r: Repouso = { osso: o, posicao, rotacao, escala }
      if (filho) {
        const direcao = filho.getWorldPosition(new THREE.Vector3()).sub(posicao)
        r.comprimento = direcao.length()
        r.correcao = referencial(direcao, Z).invert().multiply(rotacao)
      }
      this.repouso.set(o.name, r)
      o.matrixAutoUpdate = false
    })
    for (const nome of ['Hips', 'Spine02', 'Spine01', 'Spine', 'neck', 'Head', 'LeftArm', 'RightArm', 'LeftUpLeg', 'RightUpLeg']) {
      if (!this.repouso.has(nome)) throw new Error(`Articulação ausente no atleta: ${nome}`)
    }
    this.calibrarMaos()
  }

  private calibrarMaos() {
    this.modelo.traverse((o) => {
      if (!(o instanceof THREE.SkinnedMesh)) return
      o.skeleton.update()
      const g = o.geometry
      const pesos = g.getAttribute('skinWeight')
      const juntas = g.getAttribute('skinIndex')
      const posicoes = g.getAttribute('position')
      if (!pesos || !juntas) return
      const morphs = g.morphAttributes.position ?? []
      for (const lado of ['Left', 'Right']) {
        const nome = `${lado}Hand`
        const j = o.skeleton.bones.findIndex((b) => b.name === nome)
        if (j < 0) continue
        const r = this.repouso.get(nome)!
        const vertices: { indice: number; ponto: THREE.Vector3; peso: number }[] = []
        const medio = new THREE.Vector3()
        for (let i = 0; i < posicoes.count; i++) {
          const peso = [0, 1, 2, 3].reduce((s, k) => s + (juntas.getComponent(i, k) === j ? pesos.getComponent(i, k) : 0), 0)
          if (peso < 0.5) continue
          const ponto = o.localToWorld(o.getVertexPosition(i, new THREE.Vector3())).sub(r.posicao)
          vertices.push({ indice: i, ponto, peso })
          medio.addScaledVector(ponto, peso)
        }
        if (!vertices.length) continue
        const eixo = medio.normalize()
        const amostras = vertices.map(({ ponto }) => ponto).filter(p => p.dot(eixo) >= 0.045 && p.dot(eixo) <= 0.105)
        const media = amostras.reduce((s, p) => s.add(p), new THREE.Vector3()).divideScalar(Math.max(1, amostras.length))
        let xx = 1e-9, yy = 1e-9, zz = 1e-9, xy = 0, xz = 0, yz = 0
        for (const p of amostras) {
          const x = p.x - media.x, y = p.y - media.y, z = p.z - media.z
          xx += x * x; yy += y * y; zz += z * z; xy += x * y; xz += x * z; yz += y * z
        }
        // Eixo de menor espessura da palma, medido na malha (não no eixo arbitrário do osso importado).
        const inversaCovariancia = new THREE.Matrix3().set(xx, xy, xz, xy, yy, yz, xz, yz, zz).invert()
        const normal = Z.clone()
        for (let i = 0; i < 14; i++) normal.applyMatrix3(inversaCovariancia).normalize()
        if (normal.z < 0) normal.negate()
        normal.addScaledVector(eixo, -normal.dot(eixo)).normalize()
        const quadro = referencial(eixo, normal)
        const inverso = quadro.clone().invert()
        const centro = new THREE.Vector3()
        let n = 0
        for (const { ponto } of vertices) {
          const local = ponto.clone().applyQuaternion(inverso)
          if (local.y >= 0.045 && local.y <= 0.105 && Math.abs(local.x) < 0.035) { centro.add(ponto); n++ }
        }
        if (n) centro.divideScalar(n)
        else centro.copy(eixo).multiplyScalar(0.08)
        const deslocamentos = new Float32Array(posicoes.count * 3)
        // No glTF skinned, bindMatrixInverse já compensa a escala da raiz.
        // Converte apenas o deslocamento pela matriz de skin em repouso.
        const skinEmRepouso = r.osso.matrixWorld.clone().multiply(o.skeleton.boneInverses[j])
        const paraGeometria = new THREE.Matrix3().setFromMatrix4(skinEmRepouso).invert()
        for (const { indice, ponto, peso } of vertices) {
          const p = ponto.clone().applyQuaternion(inverso)
          const s = Math.max(0, p.y - 0.09)
          if (s === 0) continue
          // Curvatura distribuída entre as falanges; o polegar conserva uma abertura maior.
          const k = (Math.abs(p.x) > 0.037 ? 0.3 : 1) * 13
          const dobrado = p.clone()
          dobrado.x *= 1 + Math.min(1, s / 0.05) * 0.14
          dobrado.y = 0.09 + Math.sin(s * k) / k
          dobrado.z += (1 - Math.cos(s * k)) / k
          const delta = dobrado.applyQuaternion(quadro).sub(ponto).applyMatrix3(paraGeometria).multiplyScalar(peso)
          deslocamentos.set(delta.toArray(), indice * 3)
        }
        const atributo = new THREE.Float32BufferAttribute(deslocamentos, 3)
        atributo.name = `curvar${lado}`
        const morph = morphs.length
        morphs.push(atributo)
        // O centro é armazenado no referencial do osso, em metros.
        const superficie = new Float32Array(vertices.length * 6)
        const paraMao = r.rotacao.clone().invert()
        const paraMundo = new THREE.Matrix3().setFromMatrix4(skinEmRepouso)
        vertices.forEach(({ indice, ponto }, i) => {
          superficie.set(ponto.clone().applyQuaternion(paraMao).toArray(), i * 6)
          superficie.set(new THREE.Vector3().fromArray(deslocamentos, indice * 3).applyMatrix3(paraMundo).applyQuaternion(paraMao).toArray(), i * 6 + 3)
        })
        this.maos.set(nome, { centro: centro.applyQuaternion(paraMao), correcao: inverso.multiply(r.rotacao), malha: o, morph, superficie })
      }
      g.morphAttributes.position = morphs
      g.morphTargetsRelative = true
      o.updateMorphTargets()
    })
  }

  private colocar(nome: string, p: THREE.Vector3, q: THREE.Quaternion, esticar = 1) {
    const r = this.repouso.get(nome)
    if (!r) return
    const escala = r.escala.clone()
    escala.y *= esticar
    const mundo = new THREE.Matrix4().compose(p, q, escala)
    r.osso.matrix.copy(r.osso.parent!.matrixWorld).invert().multiply(mundo)
    r.osso.updateMatrixWorld(true)
  }

  private apontar(nome: string, inicio: THREE.Vector3, fim: THREE.Vector3, frente = this.frente) {
    const r = this.repouso.get(nome)!
    const direcao = fim.clone().sub(inicio)
    const q = referencial(direcao, frente).multiply(r.correcao!)
    this.colocar(nome, inicio, q, direcao.length() / r.comprimento!)
  }

  atualizar(c: Corpo3D) {
    this.modelo.updateMatrixWorld(true)
    this.frente.copy(v(c.torax.frente))
    const pelve = v(c.pelve)
    const pescoco = v(c.pescoco)
    const pelvia = base(c.pelvia)
    const topo = v(c.cabeca).addScaledVector(v(c.cabecaEixos.cima), -0.115)
    this.colocar('Hips', pelve, pelvia.clone().multiply(this.repouso.get('Hips')!.rotacao))
    const nomes = ['Spine02', 'Spine01', 'Spine']
    const alturas = [0.27, 0.54, 0.81]
    nomes.forEach((nome, i) => {
      const p = pelve.clone().lerp(pescoco, alturas[i])
      const fim = i === 2 ? pescoco : pelve.clone().lerp(pescoco, alturas[i + 1])
      this.apontar(nome, p, fim)
    })
    this.apontar('neck', pescoco, topo)
    this.colocar('Head', topo, base(c.cabecaEixos))

    const pertoADireita = v(c.braco.P.raiz).sub(pelve).dot(v(c.torax.lado)) > 0
    for (const lado of ['Left', 'Right']) {
      const direita = lado === 'Right'
      const perto = direita === pertoADireita
      const braco = c.braco[perto ? 'P' : 'L']
      const perna = c.perna[perto ? 'F' : 'T']
      const ombro = v(braco.raiz)
      const clavicula = pelve.clone().lerp(pescoco, 0.86).lerp(ombro, 0.12)
      const cotovelo = v(braco.meio)
      const dirMao = v(braco.ponta).sub(cotovelo).normalize()
      let punho = cotovelo.clone().addScaledVector(dirMao, MEDIDAS.antebracoAteOPunho)
      const gesto = gestoDaMao(c, perto ? 'P' : 'L')
      const calibrada = this.maos.get(`${lado}Hand`)
      const qMao = calibrada ? referencial(gesto.dedos, gesto.normal).multiply(calibrada.correcao) : null
      if (calibrada && qMao) {
        punho = gesto.palma.clone().sub(calibrada.centro.clone().applyQuaternion(qMao))
        calibrada.malha.morphTargetInfluences![calibrada.morph] = gesto.curvar
        // A malha tem volume: a palma central pode estar fora e os dedos ainda dentro.
        // Afasta o conjunto pela normal de contato até liberar toda a superfície.
        const ponto = new THREE.Vector3()
        const afastar = gesto.normal.clone().negate().normalize()
        for (const bola of c.bolas) {
          const centroBola = v(bola.centro)
          if (punho.distanceTo(centroBola) > 0.45) continue
          let distancia = 0
          const s = calibrada.superficie
          const raio = MEDIDAS.raioBola + 0.003
          for (let i = 0; i < s.length; i += 6) {
            ponto.set(s[i] + s[i + 3] * gesto.curvar, s[i + 1] + s[i + 4] * gesto.curvar, s[i + 2] + s[i + 5] * gesto.curvar)
            ponto.applyQuaternion(qMao).add(punho).sub(centroBola)
            const proj = ponto.dot(afastar)
            const discriminante = proj * proj + raio * raio - ponto.lengthSq()
            // Considera também vértices logo adiante, que entrariam na esfera ao afastar.
            if (discriminante > 0 && proj - Math.sqrt(discriminante) < 0) distancia = Math.max(distancia, -proj + Math.sqrt(discriminante))
          }
          punho.addScaledVector(afastar, distancia)
        }
      }
      this.apontar(`${lado}Shoulder`, clavicula, ombro)
      this.apontar(`${lado}Arm`, ombro, cotovelo)
      // O eixo da mão preserva a orientação de repouso sem inverter o polegar.
      const mao = this.repouso.get(`${lado}Hand`)!
      const ante = this.repouso.get(`${lado}ForeArm`)!
      if (qMao) {
        // Conserva a relação anatômica mão–antebraço da malha e distribui a pronação
        // pelo antebraço, em vez de compensar um eixo importado torcendo o punho.
        const qFore = qMao.clone().multiply(mao.rotacao.clone().invert()).multiply(ante.rotacao)
        const eixoAtual = Y.clone().applyQuaternion(qFore).normalize()
        const eixoAlvo = punho.clone().sub(cotovelo).normalize()
        qFore.premultiply(new THREE.Quaternion().setFromUnitVectors(eixoAtual, eixoAlvo))
        this.colocar(`${lado}ForeArm`, cotovelo, qFore, punho.distanceTo(cotovelo) / ante.comprimento!)
      } else this.apontar(`${lado}ForeArm`, cotovelo, punho)
      const qAnte = ante.osso.getWorldQuaternion(new THREE.Quaternion())
      const relativa = ante.rotacao.clone().invert().multiply(mao.rotacao)
      this.colocar(`${lado}Hand`, punho, qMao ?? qAnte.multiply(relativa))
      this.apontar(`${lado}UpLeg`, v(perna.raiz), v(perna.meio), v(c.pelvia.frente))
      this.apontar(`${lado}Leg`, v(perna.meio), v(perna.ponta), v(c.pelvia.frente))
      const pe = c.pe[perto ? 'F' : 'T']
      const orientacaoPe = referencial(Y, v(pe.frente))
      const eixoPe = new THREE.Vector3().crossVectors(v(pe.frente), Y).normalize()
      const flexaoPe = new THREE.Quaternion().setFromAxisAngle(eixoPe, pe.inclinacao)
      this.colocar(`${lado}Foot`, v(pe.tornozelo), flexaoPe.multiply(orientacaoPe).multiply(this.repouso.get(`${lado}Foot`)!.rotacao))
    }
  }
}

function liberarModelo(raiz: THREE.Object3D) {
  const materiais = new Set<THREE.Material>()
  const texturas = new Set<THREE.Texture>()
  raiz.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return
    o.geometry.dispose()
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) materiais.add(m)
    if (o instanceof THREE.SkinnedMesh) o.skeleton.dispose()
  })
  materiais.forEach((m) => {
    Object.values(m).forEach((t) => { if (t instanceof THREE.Texture) texturas.add(t) })
    m.dispose()
  })
  texturas.forEach((t) => t.dispose())
}

export class AtletaRealista {
  readonly raiz = new THREE.Group()
  private modelo?: THREE.Group
  private rig?: RigHumano
  private corpo?: Corpo3D
  private didatico: Boneco
  private calcados: Record<'F' | 'T', THREE.Group>
  private encerrado = false
  private carregamento = new AbortController()
  private camadas = { musculos: false, esqueleto: false }

  constructor(cores: Cores, pronto: () => void, falhou: () => void) {
    this.didatico = new Boneco(cores)
    this.didatico.raiz.visible = false
    this.calcados = { F: new Tenis(cores).grupo, T: new Tenis(cores).grupo }
    this.raiz.add(this.didatico.raiz, this.calcados.F, this.calcados.T)
    this.calcados.F.visible = this.calcados.T.visible = false
    void this.carregar(pronto, falhou)
  }

  private async carregar(pronto: () => void, falhou: () => void) {
    try {
      const resposta = await fetch(`${import.meta.env.BASE_URL}modelos/atleta/atleta.glb`, { signal: this.carregamento.signal })
      if (!resposta.ok) throw new Error('Não foi possível carregar o atleta')
      const { scene } = await new GLTFLoader().parseAsync(await resposta.arrayBuffer(), '')
      if (this.encerrado) { liberarModelo(scene); return }
      scene.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return
        o.castShadow = o.receiveShadow = true
        o.frustumCulled = false
        // O modelo original é descalço. As pontas dos pés são cobertas pelos tênis de basquete.
        const g = o.geometry
        const idx = g.index
        if (idx) {
          const p = g.getAttribute('position')
          const manter: number[] = []
          for (let i = 0; i < idx.count; i += 3) {
            const a = idx.getX(i), b = idx.getX(i + 1), c = idx.getX(i + 2)
            if (Math.max(p.getY(a), p.getY(b), p.getY(c)) >= 0.145) manter.push(a, b, c)
          }
          g.setIndex(manter)
        }
      })
      this.modelo = scene
      this.rig = new RigHumano(scene)
      this.raiz.add(scene)
      this.definirModos(this.camadas)
      if (this.corpo) this.atualizar(this.corpo)
      pronto()
    } catch {
      if (!this.encerrado) falhou()
    }
  }

  definirModos(m: { musculos: boolean; esqueleto: boolean }) {
    this.camadas = m
    const didatico = m.musculos || m.esqueleto
    this.didatico.raiz.visible = didatico
    this.didatico.definirModos(m)
    if (this.modelo) this.modelo.visible = !didatico
    this.calcados.F.visible = this.calcados.T.visible = !!this.modelo && !didatico
  }

  atualizar(c: Corpo3D, t = 0) {
    this.corpo = c
    if (this.didatico.raiz.visible) this.didatico.atualizar(c, t)
    this.rig?.atualizar(c)
    for (const lado of ['F', 'T'] as const) {
      const pe = c.pe[lado]
      const g = this.calcados[lado]
      const x = v(pe.frente)
      g.position.copy(v(pe.tornozelo))
      g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, Y, new THREE.Vector3().crossVectors(x, Y)))
      g.rotateZ(pe.inclinacao)
    }
  }

  liberar() {
    this.encerrado = true
    this.carregamento.abort()
    this.didatico.liberar()
    if (this.modelo) liberarModelo(this.modelo)
    liberarModelo(this.calcados.F)
    liberarModelo(this.calcados.T)
  }
}

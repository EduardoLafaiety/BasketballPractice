// O corpo do atleta em three.js: membros com perfil de músculo, tronco por seções, mãos com dedos, tênis,
// cabeça, uma camada de músculos (com os que trabalham acesos) e uma camada de esqueleto.
// Tudo é montado uma vez; `atualizar` só move e gira as peças a cada quadro.
import * as THREE from 'three'
import { MEDIDAS, type Corpo3D, type Eixos, type V3 } from '../corpo3d'

export interface Cores {
  pele: number
  camisa: number
  short: number
  detalhe: number
  cabelo: number
}
export const CORES_ATLETA: Cores = { pele: 0xc98f66, camisa: 0xff6a13, short: 0x161616, detalhe: 0xffffff, cabelo: 0x1d1914 }
export const CORES_PARCEIRO: Cores = { pele: 0x9a6a4a, camisa: 0x5b6575, short: 0x2b323d, detalhe: 0xdcdfe4, cabelo: 0x120f0c }

const DESTAQUE = new THREE.Color(0xff7a1a)
const vec = (p: V3) => new THREE.Vector3(p.x, p.y, p.z)
const DEG = Math.PI / 180

/** Perfil (posição 0–1 ao longo do osso, raio em m) suavizado e revolvido em torno do eixo Y. */
function lathe(perfil: [number, number][], L: number, segmentos = 20, aberto = false) {
  const curva = new THREE.SplineCurve(perfil.map(([t, r]) => new THREE.Vector2(t, r)))
  const pts = curva.getPoints(18).map((p) => new THREE.Vector2(Math.max(0.001, p.y), p.x * L))
  const g = new THREE.LatheGeometry(pts, segmentos)
  if (aberto) g.deleteAttribute('uv')
  return g
}

/** Trama discreta da roupa, compartilhada pelas peças do uniforme. */
function tecido() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#b8b8b8'
    ctx.fillRect(0, 0, 128, 128)
    for (let y = 0; y < 128; y += 4) for (let x = 0; x < 128; x += 4) {
      ctx.fillStyle = (x + y) % 8 === 0 ? '#dddddd' : '#999999'
      ctx.fillRect(x, y, 1, 2)
    }
  }
  const t = new THREE.CanvasTexture(canvas)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(3, 3)
  return t
}

/** Cabeça contínua: crânio, maçãs do rosto, mandíbula e nariz na mesma superfície. */
function cabecaHumana() {
  // altura, frente, nuca, meia largura
  const secoes = [
    [-0.108, 0.056, -0.018, 0.023], [-0.093, 0.073, -0.044, 0.043],
    [-0.07, 0.082, -0.067, 0.062], [-0.045, 0.086, -0.081, 0.069],
    [-0.005, 0.088, -0.09, 0.077], [0.035, 0.084, -0.09, 0.078],
    [0.075, 0.074, -0.079, 0.072], [0.105, 0.049, -0.052, 0.049],
    [0.124, 0.002, -0.005, 0.003],
  ]
  const curvas = [1, 2, 3].map((i) => new THREE.SplineCurve(secoes.map((s) => new THREE.Vector2(s[0], s[i]))).getPoints(48))
  const vertices: number[] = []
  const indices: number[] = []
  const lados = 64
  for (let i = 0; i <= 48; i++) {
    const y = curvas[0][i].x
    const frente = curvas[0][i].y
    const nuca = curvas[1][i].y
    const largura = curvas[2][i].y
    for (let j = 0; j <= lados; j++) {
      const a = j / lados * Math.PI * 2
      const z = Math.sin(a) * largura
      let x = (frente + nuca) / 2 + Math.cos(a) * (frente - nuca) / 2
      if (Math.cos(a) > 0) {
        const ponte = 0.021 * Math.exp(-Math.pow((y + 0.006) / 0.029, 2)) * Math.exp(-Math.pow(z / 0.012, 2))
        const olhos = 0.003 * Math.exp(-Math.pow((y - 0.025) / 0.012, 2)) * Math.exp(-Math.pow((Math.abs(z) - 0.031) / 0.014, 2))
        x += ponte - olhos
      }
      vertices.push(x, y, z)
      if (i < 48 && j < lados) {
        const n = i * (lados + 1) + j
        indices.push(n, n + lados + 1, n + 1, n + 1, n + lados + 1, n + lados + 2)
      }
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

interface Secao {
  t: number
  rx: number
  rz: number
  cx: number
}

/** Tronco por seções elípticas empilhadas (eixo Y para cima; X para a frente; Z para o lado). */
function tronco(secoes: Secao[], H: number, lados = 32) {
  const pos: number[] = []
  const idx: number[] = []
  secoes.forEach((s) => {
    for (let j = 0; j <= lados; j++) {
      const a = (j / lados) * Math.PI * 2
      pos.push(s.cx + s.rx * Math.cos(a), s.t * H, s.rz * Math.sin(a))
    }
  })
  const col = lados + 1
  for (let i = 0; i < secoes.length - 1; i++) {
    for (let j = 0; j < lados; j++) {
      const a = i * col + j
      idx.push(a, a + col, a + 1, a + 1, a + col, a + col + 1)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  // Emenda: a primeira e a última coluna têm de ter a mesma normal, senão aparece uma costura.
  const n = g.getAttribute('normal') as THREE.BufferAttribute
  for (let i = 0; i < secoes.length; i++) {
    const a = i * col
    const b = a + lados
    const m = new THREE.Vector3(n.getX(a) + n.getX(b), n.getY(a) + n.getY(b), n.getZ(a) + n.getZ(b)).normalize()
    n.setXYZ(a, m.x, m.y, m.z)
    n.setXYZ(b, m.x, m.y, m.z)
  }
  return g
}

const PERFIL = {
  coxa: [[0, 0.088], [0.18, 0.094], [0.45, 0.083], [0.75, 0.064], [1, 0.051]] as [number, number][],
  canela: [[0, 0.05], [0.2, 0.058], [0.42, 0.049], [0.8, 0.036], [1, 0.031]] as [number, number][],
  braco: [[0, 0.05], [0.22, 0.054], [0.55, 0.047], [1, 0.037]] as [number, number][],
  antebraco: [[0, 0.038], [0.22, 0.041], [0.65, 0.031], [1, 0.025]] as [number, number][],
  short: [[0, 0.11], [0.5, 0.118], [1, 0.126]] as [number, number][],
  meia: [[0, 0.054], [1, 0.036]] as [number, number][],
}

const SECOES_TRONCO: Secao[] = [
  { t: 0, rx: 0.105, rz: 0.155, cx: 0 },
  { t: 0.12, rx: 0.1, rz: 0.15, cx: 0 },
  { t: 0.3, rx: 0.092, rz: 0.135, cx: 0.005 },
  { t: 0.5, rx: 0.115, rz: 0.165, cx: 0.01 },
  { t: 0.68, rx: 0.12, rz: 0.185, cx: 0.012 },
  { t: 0.84, rx: 0.1, rz: 0.21, cx: 0 },
  { t: 0.94, rx: 0.075, rz: 0.15, cx: -0.005 },
  { t: 1, rx: 0.055, rz: 0.07, cx: -0.005 },
]

type Material = THREE.MeshStandardMaterial
const material = (cor: number, rug = 0.7, metal = 0): Material => new THREE.MeshStandardMaterial({ color: cor, roughness: rug, metalness: metal })

function malha(g: THREE.BufferGeometry, m: THREE.Material, sombra = true) {
  const o = new THREE.Mesh(g, m)
  o.castShadow = sombra
  o.receiveShadow = true
  return o
}

function elipsoide(m: THREE.Material, rx: number, ry: number, rz: number, x = 0, y = 0, z = 0) {
  const o = malha(new THREE.SphereGeometry(1, 20, 14), m)
  o.scale.set(rx, ry, rz)
  o.position.set(x, y, z)
  return o
}

/** Orienta um objeto com origem em `a` e eixo Y apontando para `b`; `ref` diz para onde fica a "frente" do osso. */
function orientarOsso(obj: THREE.Object3D, a: V3, b: V3, ref: V3, comprimento: number) {
  const Y = vec(b).sub(vec(a))
  const d = Y.length()
  Y.normalize()
  const R = vec(ref)
  const X = R.sub(Y.clone().multiplyScalar(R.dot(Y)))
  if (X.lengthSq() < 1e-6) X.set(Y.y > 0.9 ? 1 : 0, 0, Y.y > 0.9 ? 0 : 1)
  X.normalize()
  const Z = new THREE.Vector3().crossVectors(X, Y)
  obj.position.copy(vec(a))
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z))
  obj.scale.set(1, d / comprimento, 1)
}

function orientarEixos(obj: THREE.Object3D, p: V3, e: Eixos) {
  obj.position.copy(vec(p))
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(vec(e.frente), vec(e.cima), vec(e.lado)))
}

// ---------------------------------------------------------------------------------------------------------------

interface DefMusculo {
  nome: string
  /** Posição ao longo do osso (0–1), deslocamento para a frente (+) / trás (−) e para o lado, e raios (ao longo, frente-trás, lado). */
  t: number
  f: number
  z: number
  a: number
  b: number
  c: number
}

const MUSCULOS: Record<'coxa' | 'canela' | 'braco' | 'antebraco', DefMusculo[]> = {
  coxa: [
    { nome: 'Quadríceps', t: 0.45, f: 0.043, z: 0, a: 0.2, b: 0.052, c: 0.064 },
    { nome: 'Posteriores da coxa', t: 0.42, f: -0.04, z: 0, a: 0.19, b: 0.046, c: 0.058 },
  ],
  canela: [
    { nome: 'Panturrilha', t: 0.28, f: -0.034, z: 0.016, a: 0.14, b: 0.044, c: 0.034 },
    { nome: 'Panturrilha', t: 0.28, f: -0.034, z: -0.016, a: 0.14, b: 0.044, c: 0.034 },
    { nome: 'Tibial', t: 0.42, f: 0.028, z: 0, a: 0.15, b: 0.02, c: 0.026 },
  ],
  braco: [
    { nome: 'Deltoide', t: 0.1, f: 0, z: 0, a: 0.09, b: 0.058, c: 0.058 },
    { nome: 'Bíceps', t: 0.52, f: 0.032, z: 0, a: 0.12, b: 0.034, c: 0.038 },
    { nome: 'Tríceps', t: 0.5, f: -0.034, z: 0, a: 0.13, b: 0.038, c: 0.04 },
  ],
  antebraco: [
    { nome: 'Antebraço', t: 0.3, f: 0.026, z: 0, a: 0.11, b: 0.028, c: 0.034 },
    { nome: 'Antebraço', t: 0.32, f: -0.022, z: 0, a: 0.11, b: 0.026, c: 0.032 },
  ],
}

class Dedos {
  readonly grupo = new THREE.Group()
  private falanges: { prox: THREE.Group; dist: THREE.Group; base: number; spread: number; tam: number }[] = []
  private polegar: { prox: THREE.Group; dist: THREE.Group }

  constructor(pele: Material, lado: 1 | -1) {
    const palma = malha(new THREE.BoxGeometry(0.088, 0.09, 0.03), pele)
    palma.position.set(0, 0.04, 0)
    this.grupo.add(palma)
    const larguras = [-0.033, -0.011, 0.011, 0.033]
    const tamanhos = [0.062, 0.07, 0.066, 0.052]
    larguras.forEach((x, i) => {
      const prox = new THREE.Group()
      prox.position.set(x, 0.085, 0)
      const dist = new THREE.Group()
      const t = tamanhos[i]
      const a = malha(new THREE.CapsuleGeometry(0.0095, t * 0.55, 3, 8), pele)
      a.position.y = t * 0.275
      prox.add(a)
      dist.position.y = t * 0.55
      const b = malha(new THREE.CapsuleGeometry(0.0085, t * 0.45, 3, 8), pele)
      b.position.y = t * 0.225
      dist.add(b)
      prox.add(dist)
      this.grupo.add(prox)
      this.falanges.push({ prox, dist, base: x, spread: (i - 1.5) * 0.9, tam: t })
    })
    const pProx = new THREE.Group()
    pProx.position.set(lado * 0.04, 0.025, 0)
    const pDist = new THREE.Group()
    const a = malha(new THREE.CapsuleGeometry(0.011, 0.035, 3, 8), pele)
    a.position.y = 0.025
    pProx.add(a)
    pDist.position.y = 0.05
    const b = malha(new THREE.CapsuleGeometry(0.0095, 0.03, 3, 8), pele)
    b.position.y = 0.02
    pDist.add(b)
    pProx.add(pDist)
    this.grupo.add(pProx)
    this.polegar = { prox: pProx, dist: pDist }
    this.lado = lado
  }
  private lado: 1 | -1

  /** curva: 0 = mão relaxada (dedos levemente dobrados); 1 = abraçando a bola (dedos abertos e curvos). */
  ajustar(abraco: number) {
    const relaxada = 0.45
    const curva = relaxada + (0.55 - relaxada) * abraco
    const abre = abraco * 0.26
    this.falanges.forEach((f, i) => {
      f.prox.rotation.set(-curva * (0.8 + i * 0.03), 0, -f.spread * abre * this.lado)
      f.dist.rotation.x = -curva * 1.1
    })
    this.polegar.prox.rotation.set(-0.35 - 0.2 * abraco, 0, this.lado * (0.7 + 0.4 * abraco))
    this.polegar.dist.rotation.x = -0.4 - 0.3 * abraco
  }
}

export class Tenis {
  readonly grupo = new THREE.Group()
  constructor(cores: Cores) {
    const branco = material(0xf4f4f4, 0.55)
    const sola = material(0x1e1e1e, 0.9)
    const faixa = material(cores.camisa, 0.6)
    const g = this.grupo
    const base = malha(new THREE.BoxGeometry(0.29, 0.03, 0.108), sola)
    base.position.set(0.04, -0.073, 0)
    const entressola = malha(new THREE.BoxGeometry(0.28, 0.026, 0.104), branco)
    entressola.position.set(0.04, -0.052, 0)
    g.add(base, entressola)
    g.add(elipsoide(branco, 0.13, 0.05, 0.05, 0.075, -0.026, 0))
    g.add(elipsoide(branco, 0.06, 0.062, 0.052, -0.045, -0.012, 0))
    g.add(elipsoide(faixa, 0.045, 0.012, 0.052, 0.07, -0.001, 0))
    const colar = malha(new THREE.CylinderGeometry(0.047, 0.043, 0.075, 16), branco)
    colar.position.set(-0.012, 0.022, 0)
    g.add(colar)
    g.add(elipsoide(sola, 0.02, 0.008, 0.052, 0.185, -0.07, 0))
  }
}

/** Um atleta inteiro. */
export class Boneco {
  readonly raiz = new THREE.Group()
  private cores: Cores
  private pele: Record<'base' | 'F' | 'T' | 'P' | 'L', Material>
  private roupa = new THREE.Group()
  private musculos = new THREE.Group()
  private esqueleto = new THREE.Group()
  private matMusculo = { ocioso: material(0x8c2b26, 0.55), ativo: material(0xff7a1a, 0.4) }
  private grupoMusculo = new Map<string, { mat: Material; malhas: THREE.Mesh[] }>()
  private partes: Record<string, THREE.Object3D> = {}
  private maos: Record<'P' | 'L', Dedos>
  private pes = {} as Record<'F' | 'T', THREE.Group>
  /** Peças de roupa presas aos ossos (calção, meia, pulseira): somem nos modos músculos e esqueleto. */
  private vestes: THREE.Object3D[] = []
  private ossos: { malha: THREE.Mesh; a: () => V3; b: () => V3 }[] = []
  private juntas: { malha: THREE.Mesh; p: () => V3 }[] = []
  private atual?: Corpo3D
  private modoMusculos = false
  private modoEsqueleto = false

  constructor(cores: Cores = CORES_ATLETA) {
    this.cores = cores
    const base = new THREE.MeshPhysicalMaterial({ color: cores.pele, roughness: 0.57, clearcoat: 0.12, clearcoatRoughness: 0.7 })
    this.pele = { base, F: base.clone(), T: base.clone(), P: base.clone(), L: base.clone() }
    const camisa = material(cores.camisa, 0.8)
    const short = material(cores.short, 0.85)
    const trama = tecido()
    camisa.bumpMap = short.bumpMap = trama
    camisa.bumpScale = short.bumpScale = 0.0008
    camisa.roughness = 0.82
    const detalhe = material(cores.detalhe, 0.7)
    const cabelo = material(cores.cabelo, 0.9)

    // --- Tronco, pelve e pescoço ---
    const torso = malha(tronco(SECOES_TRONCO, 0.631), camisa)
    this.partes.torso = torso
    const gola = malha(new THREE.TorusGeometry(0.062, 0.011, 8, 24), detalhe)
    gola.rotation.x = Math.PI / 2
    gola.position.set(-0.005, 0.625, 0)
    torso.add(gola)
    const barra = malha(new THREE.TorusGeometry(0.15, 0.007, 6, 28), detalhe)
    barra.rotation.x = Math.PI / 2
    barra.scale.set(0.8, 1, 1)
    barra.position.set(0, 0.012, 0)
    torso.add(barra)
    const numero = this.texturaNumero(cores)
    for (const lado of [1, -1]) {
      const decal = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.17), new THREE.MeshStandardMaterial({ map: numero, transparent: true, roughness: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }))
      decal.position.set(lado * 0.138, 0.375, 0)
      decal.rotation.y = lado === 1 ? Math.PI / 2 : -Math.PI / 2
      torso.add(decal)
    }
    this.roupa.add(torso)
    const pelvis = elipsoide(short, 0.118, 0.105, 0.172, 0, -0.025, 0)
    this.partes.pelve = pelvis
    this.roupa.add(pelvis)
    const pescoco = malha(new THREE.CylinderGeometry(0.046, 0.066, 1, 24), this.pele.base)
    this.partes.pescoco = pescoco
    this.raiz.add(pescoco)

    // Pele no lugar da roupa: ombros, abdômen e quadris também têm uma base de pele (para o modo músculos).
    const peleTorso = malha(tronco(SECOES_TRONCO.map((s) => ({ ...s, rx: s.rx * 0.97, rz: s.rz * 0.97 })), 0.631), this.pele.base)
    this.partes.peleTorso = peleTorso
    this.musculos.add(peleTorso)

    // --- Cabeça ---
    const cabeca = new THREE.Group()
    this.partes.cabeca = cabeca
    cabeca.add(malha(cabecaHumana(), this.pele.base))
    // Cabelo curto só no topo: a esfera inteira escondia têmporas e parte do rosto.
    const cap = malha(new THREE.SphereGeometry(1, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.53), cabelo)
    cap.scale.set(0.088, 0.092, 0.079)
    cap.position.set(-0.008, 0.035, 0)
    cabeca.add(cap)
    this.vestes.push(cap)
    for (const lado of [1, -1]) {
      cabeca.add(elipsoide(this.pele.base, 0.011, 0.019, 0.006, -0.009, -0.005, lado * 0.079))
      cabeca.add(elipsoide(material(0x9b6147, 0.8), 0.005, 0.01, 0.002, -0.005, -0.005, lado * 0.084))
    }
    const rosto = material(0x120e0b, 0.5)
    const branco = material(0xf6f2ea, 0.4)
    for (const lado of [1, -1]) {
      // Olhos encaixados no rosto; pálpebras recobrem o globo e deixam uma abertura estreita.
      cabeca.add(elipsoide(this.pele.base, 0.004, 0.008, 0.013, 0.074, 0.025, lado * 0.031))
      cabeca.add(elipsoide(branco, 0.002, 0.002, 0.008, 0.078, 0.025, lado * 0.031))
      cabeca.add(elipsoide(material(0x634432, 0.62), 0.0015, 0.002, 0.0028, 0.08, 0.025, lado * 0.031))
      cabeca.add(elipsoide(rosto, 0.001, 0.0016, 0.0016, 0.081, 0.025, lado * 0.031))
      const sobrancelha = elipsoide(cabelo, 0.002, 0.0015, 0.011, 0.078, 0.037, lado * 0.032)
      cabeca.add(sobrancelha)
      this.vestes.push(sobrancelha)
    }
    const labios = material(0xa06851, 0.75)
    cabeca.add(elipsoide(labios, 0.003, 0.003, 0.016, 0.087, -0.058, 0))
    cabeca.add(elipsoide(material(0x684237, 0.85), 0.0015, 0.0008, 0.014, 0.09, -0.058, 0))
    this.raiz.add(cabeca)

    // --- Pernas ---
    const pernas = (['F', 'T'] as const).map((qual) => {
      const coxa = new THREE.Group()
      const coxaPele = malha(lathe(PERFIL.coxa, MEDIDAS.coxa), this.pele[qual])
      coxa.add(coxaPele)
      const calcao = malha(lathe(PERFIL.short, MEDIDAS.coxa * 0.7, 22, true), short)
      calcao.scale.set(1, 1, 1)
      coxa.add(calcao)
      this.vestes.push(calcao)
      this.partes[`coxa${qual}`] = coxa
      const canela = new THREE.Group()
      canela.add(malha(lathe(PERFIL.canela, MEDIDAS.canela), this.pele[qual]))
      const meia = malha(lathe(PERFIL.meia, MEDIDAS.canela * 0.36), detalhe)
      meia.position.y = MEDIDAS.canela * 0.66
      meia.scale.set(1.06, 1, 1.06)
      canela.add(meia)
      this.vestes.push(meia)
      this.partes[`canela${qual}`] = canela
      const joelho = malha(new THREE.SphereGeometry(0.053, 16, 12), this.pele[qual])
      this.partes[`joelho${qual}`] = joelho
      const quadril = malha(new THREE.SphereGeometry(0.088, 16, 12), short)
      this.partes[`quadril${qual}`] = quadril
      const tenis = new Tenis(cores)
      this.pes[qual] = tenis.grupo
      this.raiz.add(canela, joelho, tenis.grupo)
      this.roupa.add(quadril)
      this.musculosDoOsso(coxa, 'coxa', MEDIDAS.coxa, qual === 'F' ? 'pF' : 'pT')
      this.musculosDoOsso(canela, 'canela', MEDIDAS.canela, qual === 'F' ? 'pF' : 'pT')
      return coxa
    })
    pernas.forEach((c) => this.raiz.add(c))

    // --- Braços ---
    this.maos = { P: new Dedos(this.pele.P, 1), L: new Dedos(this.pele.L, -1) }
    ;(['P', 'L'] as const).forEach((qual) => {
      const braco = new THREE.Group()
      braco.add(malha(lathe(PERFIL.braco, MEDIDAS.braco), this.pele[qual]))
      this.partes[`braco${qual}`] = braco
      const ante = new THREE.Group()
      ante.add(malha(lathe(PERFIL.antebraco, MEDIDAS.antebraco), this.pele[qual]))
      const pulseira = malha(new THREE.CylinderGeometry(0.036, 0.036, 0.04, 14), detalhe)
      pulseira.position.y = MEDIDAS.antebraco * 0.74
      if (qual === 'P') {
        ante.add(pulseira)
        this.vestes.push(pulseira)
      }
      this.partes[`ante${qual}`] = ante
      const cotovelo = malha(new THREE.SphereGeometry(0.039, 14, 10), this.pele[qual])
      this.partes[`cotovelo${qual}`] = cotovelo
      const ombro = malha(new THREE.SphereGeometry(0.056, 16, 12), this.pele[qual])
      this.partes[`ombro${qual}`] = ombro
      this.raiz.add(braco, ante, cotovelo, ombro, this.maos[qual].grupo)
      this.musculosDoOsso(braco, 'braco', MEDIDAS.braco, qual === 'P' ? 'bP' : 'bL')
      this.musculosDoOsso(ante, 'antebraco', MEDIDAS.antebracoAteOPunho, qual === 'P' ? 'bP' : 'bL')
    })

    this.musculosDoTronco()
    this.construirEsqueleto()
    this.raiz.add(this.roupa, this.musculos, this.esqueleto)
    this.definirModos({ musculos: false, esqueleto: false })
  }

  private texturaNumero(cores: Cores) {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const g = c.getContext('2d')
    if (g) {
      g.fillStyle = '#' + cores.detalhe.toString(16).padStart(6, '0')
      g.font = 'bold 96px sans-serif'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText('23', 64, 70)
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }

  private grupo(id: string) {
    let g = this.grupoMusculo.get(id)
    if (!g) {
      g = { mat: this.matMusculo.ocioso.clone(), malhas: [] }
      this.grupoMusculo.set(id, g)
    }
    return g
  }

  private musculosDoOsso(osso: THREE.Group, tipo: keyof typeof MUSCULOS, L: number, id: string) {
    const g = this.grupo(id)
    for (const d of MUSCULOS[tipo]) {
      const m = elipsoide(g.mat, d.b, d.a, d.c, d.f, d.t * L, d.z)
      m.userData.musculo = true
      m.visible = false
      g.malhas.push(m)
      osso.add(m)
    }
  }

  private musculosDoTronco() {
    const g = this.grupo('tronco')
    const torso = this.partes.peleTorso
    const itens: [number, number, number, number, number, number, number][] = [
      [0.64, 0.105, 0.17, 0.04, 0.1, 0.1, 0.075],
      [0.64, -0.105, 0.17, 0.04, 0.1, 0.1, 0.075],
    ]
    void itens
    for (const lado of [1, -1]) {
      const peito = elipsoide(g.mat, 0.045, 0.085, 0.085, 0.1, 0.5, lado * 0.075)
      const abdomen = elipsoide(g.mat, 0.035, 0.12, 0.06, 0.085, 0.22, lado * 0.045)
      const costas = elipsoide(g.mat, 0.05, 0.17, 0.09, -0.095, 0.52, lado * 0.085)
      const trapezio = elipsoide(g.mat, 0.04, 0.08, 0.1, -0.05, 0.86, lado * 0.075)
      for (const m of [peito, abdomen, costas, trapezio]) {
        m.visible = false
        g.malhas.push(m)
        torso.add(m)
      }
    }
    const glutes = this.grupo('gluteos')
    const pelve = new THREE.Group()
    this.partes.pelveM = pelve
    this.musculos.add(pelve)
    for (const lado of [1, -1]) {
      const m = elipsoide(glutes.mat, 0.085, 0.085, 0.085, -0.075, -0.045, lado * 0.075)
      m.visible = false
      glutes.malhas.push(m)
      pelve.add(m)
    }
  }

  private costelas = new THREE.Group()
  private pelvisOsso = new THREE.Group()
  private craniOsso = new THREE.Group()

  private construirEsqueleto() {
    const osso = material(0xf0ead6, 0.45)
    const junta = material(0xff6a13, 0.4)
    const ligar = (a: () => V3, b: () => V3, r = 0.012) => {
      const m = malha(new THREE.CylinderGeometry(r * 0.8, r, 1, 10), osso, false)
      this.esqueleto.add(m)
      this.ossos.push({ malha: m, a, b })
    }
    const ponto = (p: () => V3, r = 0.026, cor = junta) => {
      const m = malha(new THREE.SphereGeometry(r, 14, 10), cor, false)
      this.esqueleto.add(m)
      this.juntas.push({ malha: m, p })
    }
    const c = () => this.atual!
    for (const l of ['F', 'T'] as const) {
      ligar(() => c().perna[l].raiz, () => c().perna[l].meio, 0.018)
      ligar(() => c().perna[l].meio, () => c().perna[l].ponta, 0.014)
      ligar(() => c().perna[l].ponta, () => c().pe[l].ponta, 0.01)
      ligar(() => c().perna[l].ponta, () => c().pe[l].calcanhar, 0.01)
      ponto(() => c().perna[l].raiz, 0.032, osso)
      ponto(() => c().perna[l].meio, 0.03)
      ponto(() => c().perna[l].ponta, 0.024)
    }
    for (const l of ['P', 'L'] as const) {
      ligar(() => c().braco[l].raiz, () => c().braco[l].meio, 0.014)
      ligar(() => c().braco[l].meio, () => c().braco[l].ponta, 0.011)
      ligar(() => c().pescoco, () => c().ombro[l], 0.01)
      ponto(() => c().braco[l].raiz, 0.028)
      ponto(() => c().braco[l].meio, 0.024)
      ponto(() => c().braco[l].ponta, 0.018)
    }
    ligar(() => c().pescoco, () => c().cabeca, 0.012)
    // Caixa torácica: anéis (costelas), esterno e coluna, no referencial do tórax.
    const rz = [0.1, 0.125, 0.145, 0.155, 0.157, 0.148, 0.132, 0.11]
    rz.forEach((r, i) => {
      const anel = malha(new THREE.TorusGeometry(1, 0.0055, 6, 28), osso, false)
      anel.rotation.x = Math.PI / 2
      anel.scale.set(r * 0.68, r, r)
      const g = new THREE.Group()
      g.add(anel)
      g.position.set(0.005, (0.36 + i * 0.065) * 0.631, 0)
      this.costelas.add(g)
    })
    const esterno = malha(new THREE.BoxGeometry(0.012, 0.19, 0.04), osso, false)
    esterno.position.set(0.105, 0.5 * 0.631 + 0.07, 0)
    this.costelas.add(esterno)
    for (let i = 0; i < 12; i++) {
      const v = malha(new THREE.SphereGeometry(0.013, 8, 6), osso, false)
      v.scale.set(1.1, 0.75, 1)
      const u = i / 11
      v.position.set(-0.075 - Math.sin(u * Math.PI) * 0.012, 0.03 * 0.631 + u * 0.93 * 0.631, 0)
      this.costelas.add(v)
    }
    this.esqueleto.add(this.costelas)
    // Bacia
    const bacia = malha(new THREE.TorusGeometry(1, 0.012, 8, 30), osso, false)
    bacia.rotation.x = Math.PI / 2
    bacia.scale.set(0.085, 0.14, 0.14)
    this.pelvisOsso.add(bacia)
    for (const lado of [1, -1]) {
      const asa = malha(new THREE.SphereGeometry(1, 14, 10), osso, false)
      asa.scale.set(0.035, 0.075, 0.085)
      asa.position.set(-0.01, 0.045, lado * 0.105)
      this.pelvisOsso.add(asa)
    }
    const sacro = malha(new THREE.SphereGeometry(1, 12, 8), osso, false)
    sacro.scale.set(0.02, 0.06, 0.05)
    sacro.position.set(-0.075, 0.0, 0)
    this.pelvisOsso.add(sacro)
    this.esqueleto.add(this.pelvisOsso)
    // Crânio
    const cranio = malha(new THREE.SphereGeometry(1, 20, 14), osso, false)
    cranio.scale.set(0.093, 0.105, 0.077)
    cranio.position.set(0, 0.012, 0)
    const mandibula = malha(new THREE.SphereGeometry(1, 14, 10), osso, false)
    mandibula.scale.set(0.058, 0.032, 0.05)
    mandibula.position.set(0.035, -0.085, 0)
    this.craniOsso.add(cranio, mandibula)
    this.esqueleto.add(this.craniOsso)
  }

  definirModos(m: { musculos: boolean; esqueleto: boolean }) {
    this.modoMusculos = m.musculos
    this.modoEsqueleto = m.esqueleto
    this.roupa.visible = !m.musculos && !m.esqueleto
    for (const v of this.vestes) v.visible = this.roupa.visible
    this.musculos.visible = m.musculos
    this.esqueleto.visible = m.esqueleto
    // Músculos: a pele fica quase transparente para deixar ver o que está por baixo.
    for (const mat of Object.values(this.pele)) {
      mat.transparent = m.musculos || m.esqueleto
      mat.opacity = m.esqueleto ? 0.07 : m.musculos ? 0.16 : 1
      mat.depthWrite = !(m.musculos || m.esqueleto)
    }
    for (const g of this.grupoMusculo.values()) for (const mesh of g.malhas) mesh.visible = m.musculos
    for (const k of ['peleTorso']) this.partes[k].visible = m.musculos
    this.partes.cabeca.visible = !m.esqueleto
    if (this.atual) this.atualizar(this.atual)
  }

  /** Move e gira todas as peças para o corpo de um instante. */
  atualizar(c: Corpo3D, _tempo = 0) {
    this.atual = c
    const p = this.partes
    const frente = c.torax.frente
    const fr = { x: frente.x, y: frente.y, z: frente.z }
    for (const qual of ['F', 'T'] as const) {
      const perna = c.perna[qual]
      orientarOsso(p[`coxa${qual}`], perna.raiz, perna.meio, fr, MEDIDAS.coxa)
      orientarOsso(p[`canela${qual}`], perna.meio, perna.ponta, fr, MEDIDAS.canela)
      p[`joelho${qual}`].position.copy(vec(perna.meio))
      p[`quadril${qual}`].position.copy(vec(perna.raiz))
      const pe = c.pe[qual]
      const g = this.pes[qual]
      g.position.copy(vec(pe.tornozelo))
      const X = vec(pe.frente)
      const Y = new THREE.Vector3(0, 1, 0)
      const Z = new THREE.Vector3().crossVectors(X, Y)
      g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z))
      g.rotateZ(pe.inclinacao)
    }
    for (const qual of ['P', 'L'] as const) {
      const b = c.braco[qual]
      orientarOsso(p[`braco${qual}`], b.raiz, b.meio, fr, MEDIDAS.braco)
      // Antebraço até o punho; a mão continua na mesma direção e fica com a palma voltada para a bola ou para o corpo.
      const dir = vec(b.ponta).sub(vec(b.meio)).normalize()
      const punho = vec(b.meio).add(dir.clone().multiplyScalar(MEDIDAS.antebracoAteOPunho))
      orientarOsso(p[`ante${qual}`], b.meio, { x: punho.x, y: punho.y, z: punho.z }, fr, MEDIDAS.antebracoAteOPunho)
      p[`cotovelo${qual}`].position.copy(vec(b.meio))
      p[`ombro${qual}`].position.copy(vec(b.raiz))
      this.orientarMao(qual, punho, dir, c)
    }
    orientarEixos(p.torso, c.pelve, c.torax)
    orientarEixos(p.peleTorso, c.pelve, c.torax)
    orientarEixos(p.pelve, c.pelve, c.pelvia)
    orientarEixos(p.pelveM, c.pelve, c.pelvia)
    p.torso.scale.y = c.pescoco.y > 0 ? vec(c.pescoco).sub(vec(c.pelve)).length() / 0.631 : 1
    p.peleTorso.scale.y = p.torso.scale.y
    // A escala do corpo permanece estável; só a coreografia move as articulações.
    const ar = 1
    p.torso.scale.x = ar
    p.torso.scale.z = ar
    p.peleTorso.scale.x = ar
    p.peleTorso.scale.z = ar
    const base = vec(c.pescoco)
    const topo = vec(c.cabeca).sub(vec(c.cabecaEixos.cima).multiplyScalar(0.085))
    p.pescoco.position.copy(base.clone().add(topo).multiplyScalar(0.5))
    p.pescoco.scale.set(1, Math.max(0.01, base.distanceTo(topo)), 1)
    p.pescoco.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), topo.clone().sub(base).normalize())
    orientarEixos(p.cabeca, c.cabeca, c.cabecaEixos)

    // Músculos em ação ficam laranja (na roupa, só o braço/perna; no modo músculos, o músculo).
    const ativos = new Set(c.hl)
    const cor = (a: boolean) => (a ? new THREE.Color(this.cores.pele).lerp(DESTAQUE, 0.7).getHex() : this.cores.pele)
    this.pele.F.color.setHex(cor(ativos.has('pF')))
    this.pele.T.color.setHex(cor(ativos.has('pT')))
    this.pele.P.color.setHex(cor(ativos.has('bP')))
    this.pele.L.color.setHex(cor(ativos.has('bL')))
    if (this.modoMusculos) {
      for (const [id, g] of this.grupoMusculo) {
        const ativo = ativos.has(id as 'pF') || (id === 'tronco' && false)
        g.mat.color.setHex(ativo ? 0xff7a1a : 0x8c2b26)
        g.mat.emissive.setHex(ativo ? 0x7a2a00 : 0x000000)
      }
    }
    if (this.modoEsqueleto) this.atualizarEsqueleto()
  }

  private orientarMao(qual: 'P' | 'L', punho: THREE.Vector3, dir: THREE.Vector3, c: Corpo3D) {
    const mao = this.maos[qual].grupo
    mao.position.copy(punho)
    // A palma olha para a bola, se a mão está nela; senão, para o corpo.
    let alvo = vec(c.torax.lado).multiplyScalar(qual === 'P' ? -1 : 1)
    let abraco = 0
    for (const b of c.bolas) {
      const centro = vec(b.centro)
      const d = centro.clone().sub(punho)
      if (d.length() < 0.3 && b.presa > 0.05) {
        alvo = d.normalize()
        abraco = b.presa
        break
      }
    }
    const normal = alvo.clone().sub(dir.clone().multiplyScalar(alvo.dot(dir)))
    if (normal.lengthSq() < 1e-6) normal.copy(vec(c.torax.lado))
    normal.normalize()
    const Z = normal.clone().multiplyScalar(-1)
    const X = new THREE.Vector3().crossVectors(dir, Z).normalize()
    const Zc = new THREE.Vector3().crossVectors(X, dir)
    mao.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, dir, Zc))
    // Punho: logo depois de soltar a bola (arremesso, passe), a mão dobra para baixo e os dedos seguem a bola
    // (o "pescoço de ganso" do arremesso); relaxada, o punho fica levemente estendido.
    let solta = 0
    for (const b of c.bolas) {
      if (b.presa > 0.3) continue
      const d = vec(b.centro).distanceTo(punho)
      if (d < 0.7) solta = Math.max(solta, 1 - d / 0.7)
    }
    // Mantém o punho relaxado à frente após o arremesso, mesmo com a bola distante.
    const braco = c.braco[qual]
    const estendido = vec(braco.meio).sub(vec(braco.raiz)).normalize().dot(dir) > 0.88
    if (abraco < 0.05 && punho.y > c.cabeca.y && estendido && c.bolas.some((b) => b.presa < 0.05)) solta = Math.max(solta, 0.85)
    const flexao = abraco > 0.3 ? 0 : solta * 0.9 - 0.08
    mao.rotateX(-flexao)
    this.maos[qual].ajustar(Math.max(abraco, solta * 0.6))
  }

  private atualizarEsqueleto() {
    const c = this.atual!
    orientarEixos(this.costelas, c.pelve, c.torax)
    this.costelas.scale.y = vec(c.pescoco).sub(vec(c.pelve)).length() / 0.631
    orientarEixos(this.pelvisOsso, c.pelve, c.pelvia)
    orientarEixos(this.craniOsso, c.cabeca, c.cabecaEixos)
    const Y = new THREE.Vector3(0, 1, 0)
    for (const o of this.ossos) {
      const a = vec(o.a())
      const b = vec(o.b())
      const d = b.clone().sub(a)
      const L = d.length()
      o.malha.position.copy(a.clone().add(b).multiplyScalar(0.5))
      o.malha.scale.set(1, Math.max(0.001, L), 1)
      o.malha.quaternion.setFromUnitVectors(Y, L > 1e-6 ? d.normalize() : Y)
    }
    for (const j of this.juntas) j.malha.position.copy(vec(j.p()))
  }

  /** Nomes dos músculos de cada grupo, para a legenda do modo músculos. */
  static readonly GRUPOS_MUSCULARES = ['Quadríceps', 'Posteriores da coxa', 'Panturrilha', 'Glúteos', 'Deltoide', 'Bíceps', 'Tríceps', 'Peitoral', 'Abdômen', 'Dorsais']

  liberar() {
    const materiais = new Set<THREE.Material>()
    const texturas = new Set<THREE.Texture>()
    this.raiz.traverse((o) => {
      const m = o as THREE.Mesh
      m.geometry?.dispose?.()
      if (m.material) for (const mat of Array.isArray(m.material) ? m.material : [m.material]) materiais.add(mat)
    })
    for (const mat of materiais) {
      for (const valor of Object.values(mat)) if (valor instanceof THREE.Texture) texturas.add(valor)
      mat.dispose()
    }
    texturas.forEach((t) => t.dispose())
  }
}

export { DEG }

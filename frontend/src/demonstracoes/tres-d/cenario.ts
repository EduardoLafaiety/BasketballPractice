// Cenário 3D das demonstrações: quadra de madeira, cesta, cones, parede, caixa, cadeira, bola, pegadas e trajetórias.
import * as THREE from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { ESCALA, MEDIDAS, corpoNoTempo, type V3 } from '../corpo3d'
import { ARO, pegadas, type Animacao } from '../motor'

const DEG = Math.PI / 180

function tex(largura: number, altura: number, desenhar: (c: CanvasRenderingContext2D) => void, repetir?: [number, number]) {
  const canvas = document.createElement('canvas')
  canvas.width = largura
  canvas.height = altura
  const c = canvas.getContext('2d')
  if (c) desenhar(c)
  const t = new THREE.CanvasTexture(canvas)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  if (repetir) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(...repetir)
  }
  return t
}

/** Tábuas de madeira, com veios e emendas. */
function texturaPiso() {
  return tex(1024, 1024, (c) => {
    const tons = ['#c89a64', '#c19259', '#cfa36f', '#b98a55', '#c69b66']
    const larg = 1024 / 12
    for (let i = 0; i < 12; i++) {
      c.fillStyle = tons[i % tons.length]
      c.fillRect(i * larg, 0, larg, 1024)
      // veios
      for (let k = 0; k < 14; k++) {
        c.strokeStyle = `rgba(80,45,15,${0.05 + (k % 3) * 0.03})`
        c.lineWidth = 1
        c.beginPath()
        const x = i * larg + 4 + ((k * 37) % (larg - 8))
        c.moveTo(x, 0)
        c.bezierCurveTo(x + 6, 300, x - 5, 700, x + 2, 1024)
        c.stroke()
      }
      // emendas das pontas das tábuas, desencontradas
      c.fillStyle = 'rgba(60,32,10,0.45)'
      c.fillRect(i * larg, 0, 1.5, 1024)
      const desloc = (i * 211) % 512
      c.fillRect(i * larg, desloc, larg, 1.5)
      c.fillRect(i * larg, desloc + 512, larg, 1.5)
    }
  }, [14, 6])
}

function texturaBola() {
  return tex(512, 256, (c) => {
    c.fillStyle = '#e8651a'
    c.fillRect(0, 0, 512, 256)
    // granulado
    for (let i = 0; i < 2600; i++) {
      c.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`
      c.fillRect(Math.random() * 512, Math.random() * 256, 1.6, 1.6)
    }
    c.strokeStyle = '#1a0d05'
    c.lineWidth = 5
    c.beginPath()
    c.moveTo(0, 128)
    c.lineTo(512, 128)
    c.moveTo(128, 0)
    c.lineTo(128, 256)
    c.moveTo(384, 0)
    c.lineTo(384, 256)
    c.stroke()
    c.beginPath()
    c.arc(128, 128, 150, -Math.PI / 2.4, Math.PI / 2.4)
    c.arc(384, 128, 150, Math.PI - Math.PI / 2.4, Math.PI + Math.PI / 2.4)
    c.stroke()
  })
}

/** Linha desenhada no chão, como uma fita fina (linhas do GL não têm espessura). */
function fita(pontos: [number, number][], largura = 0.05, cor = 0xf4f1e8, y = 0.003) {
  const pos: number[] = []
  const idx: number[] = []
  const n = pontos.length
  for (let i = 0; i < n; i++) {
    const a = pontos[Math.max(0, i - 1)]
    const b = pontos[Math.min(n - 1, i + 1)]
    const dx = b[0] - a[0]
    const dz = b[1] - a[1]
    const l = Math.hypot(dx, dz) || 1
    const nx = (-dz / l) * (largura / 2)
    const nz = (dx / l) * (largura / 2)
    pos.push(pontos[i][0] + nx, y, pontos[i][1] + nz, pontos[i][0] - nx, y, pontos[i][1] - nz)
    if (i < n - 1) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: cor, roughness: 0.6, side: THREE.DoubleSide }))
  m.receiveShadow = true
  return m
}

const arco = (cx: number, cz: number, r: number, de: number, ate: number, passos = 48): [number, number][] =>
  Array.from({ length: passos + 1 }, (_, i) => {
    const a = de + ((ate - de) * i) / passos
    return [cx + Math.cos(a) * r, cz + Math.sin(a) * r]
  })

export interface Pegada3D {
  malha: THREE.Mesh
  tempo: number
}

export class Cenario {
  readonly raiz = new THREE.Group()
  readonly bolas: THREE.Mesh[] = []
  readonly pegadas: Pegada3D[] = []
  readonly trajetorias = new THREE.Group()
  private materiaisLinha: LineMaterial[] = []
  private texturaDaBola = texturaBola()

  constructor(readonly anim: Animacao) {
    const { cena } = anim.coreografia
    const frente = anim.frente
    this.piso(frente)
    if (cena.cesta === 'lado') {
      this.quadraDeLado()
      this.cesta(ARO.lado.x * ESCALA, 0, -1)
    }
    if (cena.cesta === 'frente') this.cesta(ARO.frente.x * ESCALA, 3.4, 1, true)
    for (const x of cena.linhas ?? []) this.marcaNoChao(x * ESCALA)
    for (const c of cena.cones ?? []) this.cone(c.x * ESCALA, (c.prof ?? 0) * 0.9)
    if (cena.parede !== undefined) this.parede(cena.parede * ESCALA)
    if (cena.caixa) this.caixa(cena.caixa.x * ESCALA, cena.caixa.w * ESCALA, cena.caixa.h * ESCALA)
    if (cena.cadeira !== undefined) this.cadeira(cena.cadeira * ESCALA)
    for (let i = 0; i < 2; i++) {
      const b = new THREE.Mesh(
        new THREE.SphereGeometry(MEDIDAS.raioBola, 32, 24),
        new THREE.MeshStandardMaterial({ map: this.texturaDaBola, roughness: 0.62, bumpMap: this.texturaDaBola, bumpScale: 0.6 }),
      )
      b.castShadow = true
      b.visible = false
      this.bolas.push(b)
      this.raiz.add(b)
    }
    this.pegadasNoChao()
    this.raiz.add(this.trajetorias)
  }

  private piso(frente: boolean) {
    const t = texturaPiso()
    const largura = 34
    const fundo = 20
    t.repeat.set(largura / 2.4, fundo / 2.4)
    const m = new THREE.Mesh(new THREE.PlaneGeometry(largura, fundo), new THREE.MeshStandardMaterial({ map: t, roughness: 0.55, metalness: 0.02 }))
    m.rotation.x = -Math.PI / 2
    m.position.set(frente ? 4.4 : 5.2, 0, 0)
    m.receiveShadow = true
    this.raiz.add(m)
  }

  /** Marcações de meia quadra, com a cesta à direita: garrafão, lance livre e linha de três. */
  private quadraDeLado() {
    const aroX = ARO.lado.x * ESCALA
    const base = aroX + 0.38 + 1.2 // linha de fundo (a cesta fica 1,2 m dentro da quadra)
    const L = (p: [number, number][], w = 0.05) => this.raiz.add(fita(p, w))
    const lance = base - 5.8
    L([[base, -7.5], [base, 7.5]])
    L([[base, -2.45], [lance, -2.45], [lance, 2.45], [base, 2.45]])
    L(arco(lance, 0, 1.8, -Math.PI / 2, Math.PI / 2))
    // linha de três: cantos retos e um arco de 6,75 m em volta da cesta
    const cantoZ = 6.6
    const xCanto = aroX - Math.sqrt(6.75 ** 2 - cantoZ ** 2)
    const a = Math.asin(cantoZ / 6.75)
    L([[base, -cantoZ], [xCanto, -cantoZ]])
    L([[base, cantoZ], [xCanto, cantoZ]])
    L(arco(aroX, 0, 6.75, Math.PI - a, Math.PI + a, 72))
    // semicírculo sob a cesta (área de não colisão)
    L(arco(aroX, 0, 1.25, Math.PI / 2, (3 * Math.PI) / 2, 24), 0.04)
  }

  private cesta(x: number, z: number, sentido: 1 | -1, deFrente = false) {
    const g = new THREE.Group()
    const branco = new THREE.MeshStandardMaterial({ color: 0xf2f4f6, roughness: 0.3, transparent: true, opacity: 0.55 })
    const aro = new THREE.MeshStandardMaterial({ color: 0xe0561b, roughness: 0.35, metalness: 0.5 })
    const aco = new THREE.MeshStandardMaterial({ color: 0x4a4d52, roughness: 0.5, metalness: 0.6 })
    const tabela = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.07, 1.83), branco)
    tabela.position.set(0.38, 3.43 - 3.05, 0)
    tabela.castShadow = true
    g.add(tabela)
    const quadro = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(0.01, 0.45, 0.59)),
      new THREE.LineBasicMaterial({ color: 0xe0561b }),
    )
    quadro.position.set(0.41, 0.0, 0)
    g.add(quadro)
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2285, 0.009, 10, 48), aro)
    ring.rotation.x = Math.PI / 2
    ring.position.set(0, 0, 0)
    ring.castShadow = true
    g.add(ring)
    const suporte = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, 0.06), aco)
    suporte.position.set(0.3, 0, 0)
    g.add(suporte)
    // rede: fios do aro até a boca de baixo, mais três voltas
    const fios: number[] = []
    const N = 16
    const altura = 0.42
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2
      const a2 = ((i + 0.5) / N) * Math.PI * 2
      fios.push(Math.cos(a) * 0.2285, 0, Math.sin(a) * 0.2285, Math.cos(a2) * 0.13, -altura, Math.sin(a2) * 0.13)
      fios.push(Math.cos(a2) * 0.2285, 0, Math.sin(a2) * 0.2285, Math.cos(a) * 0.13, -altura, Math.sin(a) * 0.13)
    }
    for (const f of [0.35, 0.65, 1]) {
      const r = 0.2285 + (0.13 - 0.2285) * f
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2
        const b = ((i + 1) / N) * Math.PI * 2
        fios.push(Math.cos(a) * r, -altura * f, Math.sin(a) * r, Math.cos(b) * r, -altura * f, Math.sin(b) * r)
      }
    }
    const rede = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(fios, 3)), new THREE.LineBasicMaterial({ color: 0xf2f4f6 }))
    g.add(rede)
    // poste e braço
    const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.4, 16), aco)
    poste.position.set(1.7, -3.05 + 1.7, 0)
    poste.castShadow = true
    g.add(poste)
    const braco = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.1, 0.12), aco)
    braco.position.set(1.05, 0.3, 0)
    g.add(braco)
    g.position.set(x, 3.05, z)
    // A tabela fica atrás do aro, vista pelo atleta: sentido -1 = atleta à esquerda (vai de +x para a cesta).
    g.rotation.y = sentido === -1 ? 0 : Math.PI / 2
    if (deFrente) g.rotation.y = -Math.PI / 2
    this.raiz.add(g)
  }

  private marcaNoChao(x: number) {
    this.raiz.add(fita([[x, -0.3], [x, 0.3]], 0.04, 0xe0561b, 0.004))
  }

  private cone(x: number, z: number) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.32, 24), new THREE.MeshStandardMaterial({ color: 0xff6a13, roughness: 0.5 }))
    m.position.set(x, 0.16, z)
    m.castShadow = true
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.02, 0.25), new THREE.MeshStandardMaterial({ color: 0xff6a13, roughness: 0.5 }))
    base.position.set(x, 0.01, z)
    const faixa = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.07, 0.05, 24), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }))
    faixa.position.set(x, 0.14, z)
    this.raiz.add(m, base, faixa)
  }

  private parede(x: number) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3, 6), new THREE.MeshStandardMaterial({ color: 0xd7d3c8, roughness: 0.9 }))
    m.position.set(x + 0.1, 1.5, 0)
    m.receiveShadow = true
    m.castShadow = true
    this.raiz.add(m)
  }

  private caixa(x: number, w: number, h: number) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.9), new THREE.MeshStandardMaterial({ color: 0xb08457, roughness: 0.7 }))
    m.position.set(x + w / 2, h / 2, 0)
    m.castShadow = true
    m.receiveShadow = true
    this.raiz.add(m)
  }

  private cadeira(x: number) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x4a4d52, roughness: 0.5, metalness: 0.5 })
    const assento = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.42), mat)
    assento.position.set(x, 0.46, 0)
    const encosto = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.42), mat)
    encosto.position.set(x + 0.19, 0.68, 0)
    this.raiz.add(assento, encosto)
    for (const dx of [-0.18, 0.18]) for (const dz of [-0.18, 0.18]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.46, 8), mat)
      p.position.set(x + dx, 0.23, dz)
      this.raiz.add(p)
    }
    for (const m of this.raiz.children.slice(-6)) m.castShadow = true
  }

  /** Pegadas numeradas, vistas de cima: aparecem quando o atleta pisa ali. */
  private pegadasNoChao() {
    for (const m of pegadas(this.anim)) {
      const cor = m.pe === 'F' ? '#ff6a13' : '#8d8b82'
      const mapa = tex(128, 128, (c) => {
        c.clearRect(0, 0, 128, 128)
        c.fillStyle = cor
        c.beginPath()
        c.ellipse(64, 64, 30, 58, 0, 0, Math.PI * 2)
        c.fill()
        c.strokeStyle = '#0b0b0b'
        c.lineWidth = 6
        c.stroke()
        c.fillStyle = '#0b0b0b'
        c.font = 'bold 56px sans-serif'
        c.textAlign = 'center'
        c.textBaseline = 'middle'
        c.fillText(String(m.fase + 1), 64, 66)
      })
      const malha = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ map: mapa, transparent: true, depthWrite: false }))
      malha.rotation.x = -Math.PI / 2
      malha.rotation.z = Math.PI / 2
      malha.position.set(m.x * ESCALA, 0.006, (m.y / 14) * 0.9)
      malha.visible = false
      this.raiz.add(malha)
      this.pegadas.push({ malha, tempo: m.tempo })
    }
  }

  mostrarPegadas(t: number, ligado: boolean) {
    for (const p of this.pegadas) p.malha.visible = ligado && t >= p.tempo - 1
  }

  /** Linhas com todo o caminho que a mão, a bola e a pelve fazem durante a demonstração. */
  construirTrajetorias(resolucao: THREE.Vector2) {
    this.trajetorias.clear()
    this.materiaisLinha = []
    const series: { cor: number; pontos: number[] }[] = [
      { cor: 0xff6a13, pontos: [] },
      { cor: 0x3a86ff, pontos: [] },
      { cor: 0xf4f1e8, pontos: [] },
      { cor: 0xa8f0b8, pontos: [] },
    ]
    for (let t = 0; t <= this.anim.total; t += 30) {
      const c = corpoNoTempo(this.anim, t, this.anim.coreografia.cena)
      const add = (i: number, p: V3 | undefined) => p && series[i].pontos.push(p.x, p.y, p.z)
      add(0, c.braco.P.ponta)
      add(1, c.braco.L.ponta)
      add(2, c.bolas[0]?.centro)
      add(3, c.pelve)
    }
    for (const s of series) {
      if (s.pontos.length < 12) continue
      const g = new LineGeometry()
      g.setPositions(s.pontos)
      const m = new LineMaterial({ color: s.cor, linewidth: 2.2, transparent: true, opacity: 0.85 })
      m.resolution.copy(resolucao)
      this.materiaisLinha.push(m)
      this.trajetorias.add(new Line2(g, m))
    }
  }

  redimensionar(resolucao: THREE.Vector2) {
    for (const m of this.materiaisLinha) m.resolution.copy(resolucao)
  }

  /** Coloca a bola no mundo (centro, giro e achatamento). */
  pousarBola(i: number, b: { centro: V3; giro: number; amasso: number } | undefined) {
    const m = this.bolas[i]
    if (!b) {
      m.visible = false
      return
    }
    m.visible = true
    m.position.set(b.centro.x, b.centro.y, b.centro.z)
    m.rotation.set(0, 0, -b.giro * DEG)
    m.scale.set(1 / Math.sqrt(b.amasso), b.amasso, 1 / Math.sqrt(b.amasso))
    if (b.amasso < 0.99) m.position.y -= MEDIDAS.raioBola * (1 - b.amasso)
  }

  liberar() {
    this.raiz.traverse((o) => {
      const m = o as THREE.Mesh
      m.geometry?.dispose?.()
      const mat = m.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
      else mat?.dispose?.()
    })
    this.texturaDaBola.dispose()
  }
}

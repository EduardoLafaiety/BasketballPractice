// Converte gravações de captura de movimento (BVH) da CMU Graphics Lab Motion Capture Database
// (http://mocap.cs.cmu.edu, dados livres para qualquer uso; conversão BVH de Bruce Hahne / cgspeed)
// em arquivos JSON pequenos com as posições das articulações, na escala do nosso atleta.
//
// Uso: node scripts/gerar-mocap.mjs <pasta com os .bvh> <pasta de saída>
// Saída (por clipe): { fps, juntas: [...], quadros: N, dados: [N * juntas * 3 inteiros, em milímetros], bola: [...] }
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const [, , pastaBvh, pastaSaida] = process.argv
if (!pastaBvh || !pastaSaida) throw new Error('uso: node scripts/gerar-mocap.mjs <pasta bvh> <pasta saída>')
mkdirSync(pastaSaida, { recursive: true })

// Articulações que o corpo 3D usa (nomes do esqueleto da CMU).
const JUNTAS = ['Hips', 'LowerBack', 'Spine1', 'Neck', 'Head', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase', 'LeftHandIndex1', 'RightHandIndex1']

const CLIPES_PADRAO = {
  '06_02': { de: 0.3, ate: 5.2 },
  '06_08': { de: 0.2, ate: 2.7 },
  '06_13': { de: 8, ate: 20 },
  '06_14': { de: 0.2, ate: 3.7 },
  '06_15': { de: 0.2, ate: 4.1 },
  // bandeja, arremesso em suspensão e saltos (sem a pose em T do começo de cada gravação)
  '124_06': { de: 0.45, ate: 4.6 },
  '124_05': { de: 0.45, ate: 4.6 },
  '124_11': { de: 1.0, ate: 5.2 },
  '13_40': { de: 0.1, ate: 2.7 },
  '118_01': { de: 2.7, ate: 5.0 },
}
// Clipes: arquivo, intervalo (s) aproveitado. CLIPES (JSON no ambiente) troca a lista, para experimentar.
const CLIPES = process.env.CLIPES ? JSON.parse(process.env.CLIPES) : CLIPES_PADRAO

function lerBvh(texto) {
  const linhas = texto.split(/\r?\n/).map((l) => l.trim())
  const juntas = []
  const pilha = []
  let i = 0
  while (!linhas[i].startsWith('MOTION')) {
    const l = linhas[i]
    if (l.startsWith('ROOT') || l.startsWith('JOINT')) {
      const j = { nome: l.split(/\s+/)[1], pai: pilha.length ? pilha[pilha.length - 1] : -1, offset: [0, 0, 0], canais: [] }
      juntas.push(j)
      pilha.push(juntas.length - 1)
    } else if (l.startsWith('End Site')) {
      pilha.push(-2)
    } else if (l.startsWith('OFFSET')) {
      const alvo = pilha[pilha.length - 1]
      if (alvo >= 0) juntas[alvo].offset = l.split(/\s+/).slice(1).map(Number)
    } else if (l.startsWith('CHANNELS')) {
      const p = l.split(/\s+/)
      juntas[pilha[pilha.length - 1]].canais = p.slice(2)
    } else if (l === '}') {
      pilha.pop()
    }
    i++
  }
  const quadros = Number(linhas[i + 1].split(':')[1])
  const dt = Number(linhas[i + 2].split(':')[1])
  const dados = linhas.slice(i + 3, i + 3 + quadros).map((l) => l.split(/\s+/).map(Number))
  return { juntas, quadros, dt, dados }
}

const mat = {
  X: (a) => [1, 0, 0, 0, Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a)],
  Y: (a) => [Math.cos(a), 0, Math.sin(a), 0, 1, 0, -Math.sin(a), 0, Math.cos(a)],
  Z: (a) => [Math.cos(a), -Math.sin(a), 0, Math.sin(a), Math.cos(a), 0, 0, 0, 1],
}
const mul = (a, b) => {
  const r = new Array(9)
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]
  return r
}
const aplica = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]]

function posicoes(bvh, q) {
  const linha = bvh.dados[q]
  let k = 0
  const mundo = new Array(bvh.juntas.length)
  const rot = new Array(bvh.juntas.length)
  bvh.juntas.forEach((j, idx) => {
    let pos = [0, 0, 0]
    let R = [1, 0, 0, 0, 1, 0, 0, 0, 1]
    for (const c of j.canais) {
      const v = linha[k++]
      if (c.endsWith('position')) pos['XYZ'.indexOf(c[0])] = v
      else R = mul(R, mat[c[0]]((v * Math.PI) / 180))
    }
    if (j.pai < 0) {
      mundo[idx] = pos
      rot[idx] = R
    } else {
      const d = aplica(rot[j.pai], j.offset)
      const p = mundo[j.pai]
      mundo[idx] = [p[0] + d[0], p[1] + d[1], p[2] + d[2]]
      rot[idx] = mul(rot[j.pai], R)
    }
  })
  return mundo
}

for (const [id, { de, ate }] of Object.entries(CLIPES)) {
  const bvh = lerBvh(readFileSync(join(pastaBvh, id + '.bvh'), 'utf8'))
  const nomes = bvh.juntas.map((j) => j.nome)
  const idx = JUNTAS.map((n) => {
    const i = nomes.indexOf(n)
    if (i < 0) throw new Error('falta ' + n)
    return i
  })
  // Escala: a perna do esqueleto da CMU (quadril–tornozelo) vira a nossa (0,885 m).
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
  const t0 = posicoes(bvh, 0)
  const perna = dist(t0[nomes.indexOf('LeftUpLeg')], t0[nomes.indexOf('LeftLeg')]) + dist(t0[nomes.indexOf('LeftLeg')], t0[nomes.indexOf('LeftFoot')])
  const escala = 0.885 / perna
  const passo = Math.round(1 / 30 / bvh.dt)
  const inicio = Math.round(de / bvh.dt)
  const fim = Math.min(bvh.quadros - 1, Math.round(ate / bvh.dt))
  const quadros = []
  for (let q = inicio; q <= fim; q += passo) quadros.push(posicoes(bvh, q))
  // Origem: pelve do primeiro quadro; chão = menor altura do pé em todo o clipe.
  const ori = quadros[0][idx[0]]
  const iPes = [idx[13], idx[14], idx[17], idx[18]]
  let chao = Infinity
  for (const f of quadros) for (const p of iPes) chao = Math.min(chao, f[p][1])
  const dados = []
  for (const f of quadros) {
    for (const j of idx) {
      const p = f[j]
      dados.push(Math.round((p[0] - ori[0]) * escala * 1000), Math.round((p[1] - chao) * escala * 1000), Math.round((p[2] - ori[2]) * escala * 1000))
    }
  }
  writeFileSync(join(pastaSaida, id + '.json'), JSON.stringify({ fps: 30, juntas: JUNTAS, quadros: quadros.length, dados }))
  console.log(id, quadros.length, 'quadros', (dados.length / 1000).toFixed(0), 'mil números; escala', escala.toFixed(4))
}

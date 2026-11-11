// Sorteios "do dia": a mesma data dá sempre o mesmo resultado, em qualquer servidor e na demonstração.

/** FNV-1a de 32 bits. */
export function hash(text: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Gerador pseudoaleatório (mulberry32) a partir de uma semente. */
function generator(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Embaralha uma cópia da lista com a semente `key` (Fisher-Yates). */
export function seededShuffle<T>(items: readonly T[], key: string) {
  const random = generator(hash(key))
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

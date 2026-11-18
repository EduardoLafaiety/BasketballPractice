/** Intervalos só pedem um redesenho: a passagem do tempo vem do relógio. */
export function segundosPassados(desde: number, agora: number) {
  return Math.max(0, Math.floor((agora - desde) / 1000))
}
